import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  depositRequests,
  ledger,
  orders,
  positions,
  users,
  watchlist,
  type Account,
  type Order,
} from "@/db/schema";
import { accountIdFor } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getCandles, getInstrument, getQuote, getQuotes, type ChartRange, type Instrument } from "@/lib/markets";
import type {
  DashboardState,
  DepositView,
  LedgerView,
  OrderKind,
  OrderSide,
  OrderView,
  TimeInForce,
} from "@/lib/trading-types";

const EPSILON = 0.00000001;

export class EngineError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function feeRate(instrument: Instrument): number {
  if (instrument.category === "crypto") return 0.001;
  if (instrument.category === "forex") return 0.0002;
  if (instrument.category === "etf") return 0.00025;
  return 0.0005;
}

function commission(notional: number, instrument: Instrument): number {
  return Math.max(0.01, notional * feeRate(instrument));
}

function validateOrderInput(symbol: string, side: OrderSide, kind: OrderKind, quantity: number, limitPrice?: number) {
  const instrument = getInstrument(symbol);
  if (!instrument) throw new EngineError("الأداة المختارة غير موجودة في كتالوج مِدار.", 404);
  if (!(side === "buy" || side === "sell")) throw new EngineError("اتجاه الأمر غير صالح.");
  if (!(kind === "market" || kind === "limit")) throw new EngineError("نوع الأمر غير صالح.");
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 10_000_000) throw new EngineError("أدخل كمية صحيحة أكبر من صفر.");
  const referencePrice = kind === "limit" ? limitPrice : getQuote(symbol).price;
  if (!referencePrice || !Number.isFinite(referencePrice) || referencePrice <= 0) throw new EngineError("أدخل سعراً صحيحاً أكبر من صفر.");
  if (quantity * referencePrice < 1) throw new EngineError("الحد الأدنى لقيمة الأمر هو 1 دولار.");
  return instrument;
}

export async function ensureAccount(userId: string): Promise<Account> {
  const accountId = accountIdFor(userId);
  const existing = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (existing[0]) return existing[0];
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new EngineError("المستخدم غير موجود.", 404);
  await db.transaction(async (tx) => {
    const inserted = await tx.insert(accounts).values({
      id: accountId,
      userId,
      name: `محفظة ${user.name}`,
      cash: 0,
      netDeposits: 0,
      startingBalance: 0,
      baseCurrency: "USD",
    }).onConflictDoNothing().returning();
    if (inserted[0]) {
      await tx.insert(watchlist).values(
        ["NVDA", "AAPL", "BTCUSD", "XAUUSD", "EURUSD", "VOO"].map((symbol) => ({ accountId, symbol })),
      ).onConflictDoNothing();
    }
  });
  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (!account) throw new EngineError("تعذر تجهيز حساب المستخدم.", 500);
  return account;
}

interface FillInput {
  symbol: string;
  side: OrderSide;
  kind: OrderKind;
  quantity: number;
  limitPrice?: number;
  timeInForce: TimeInForce;
}

async function executeFill(userId: string, input: FillInput, existingOrderId?: number): Promise<Order> {
  await ensureAccount(userId);
  const accountId = accountIdFor(userId);
  const instrument = validateOrderInput(input.symbol, input.side, input.kind, input.quantity, input.limitPrice);
  return db.transaction(async (tx) => {
    const [account] = await tx.select().from(accounts).where(eq(accounts.id, accountId)).for("update");
    if (!account) throw new EngineError("الحساب غير متاح.", 404);
    let existingOrder: Order | undefined;
    if (existingOrderId) {
      const [row] = await tx.select().from(orders).where(eq(orders.id, existingOrderId)).for("update");
      if (!row || row.accountId !== accountId) throw new EngineError("الأمر غير موجود.", 404);
      if (row.status !== "open") return row;
      existingOrder = row;
    }
    const openOrders = await tx.select().from(orders).where(and(eq(orders.accountId, accountId), eq(orders.status, "open")));
    const otherOpenOrders = openOrders.filter((order) => order.id !== existingOrderId);
    const reservedCash = otherOpenOrders.reduce((sum, order) => {
      if (order.side !== "buy" || !order.limitPrice) return sum;
      const item = getInstrument(order.symbol);
      if (!item) return sum;
      const value = order.limitPrice * (order.quantity - order.filledQuantity);
      return sum + value + commission(value, item);
    }, 0);
    const [position] = await tx.select().from(positions)
      .where(and(eq(positions.accountId, accountId), eq(positions.symbol, input.symbol))).for("update");
    const reservedQuantity = otherOpenOrders.reduce((sum, order) => {
      if (order.side === "sell" && order.symbol === input.symbol) return sum + order.quantity - order.filledQuantity;
      return sum;
    }, 0);
    const now = Date.now();
    const quote = getQuote(input.symbol, now);
    if (input.kind === "limit") {
      const marketable = input.side === "buy" ? quote.ask <= input.limitPrice! : quote.bid >= input.limitPrice!;
      if (!marketable) {
        if (existingOrder) return existingOrder;
        throw new EngineError("أمر الحد لم يصل إلى سعر التنفيذ بعد.");
      }
    }
    const rawPrice = input.side === "buy" ? quote.ask : quote.bid;
    const rawNotional = rawPrice * input.quantity;
    const impactBps = Math.min(9, Math.sqrt(rawNotional / 100000) * 1.8);
    const slippageBps = 0.6 + instrument.volatility * 0.45 + impactBps;
    let fillPrice = rawPrice * (1 + (input.side === "buy" ? 1 : -1) * slippageBps / 10000);
    if (input.kind === "limit") {
      fillPrice = input.side === "buy" ? Math.min(input.limitPrice!, fillPrice) : Math.max(input.limitPrice!, fillPrice);
    }
    const notional = fillPrice * input.quantity;
    const fee = commission(notional, instrument);
    const oldQuantity = position?.quantity ?? 0;
    const oldAverage = position?.avgPrice ?? 0;
    let cashAfter = account.cash;
    let realizedPnl = 0;
    let nextQuantity = oldQuantity;
    let nextAverage = oldAverage;
    if (input.side === "buy") {
      const totalDebit = notional + fee;
      const availableCash = account.cash - reservedCash;
      if (totalDebit > availableCash + EPSILON) throw new EngineError(`القوة الشرائية المتاحة غير كافية. المتاح ${Math.max(0, availableCash).toFixed(2)} دولار.`);
      cashAfter -= totalDebit;
      nextQuantity = oldQuantity + input.quantity;
      nextAverage = nextQuantity > EPSILON ? (oldQuantity * oldAverage + notional) / nextQuantity : 0;
    } else {
      const availableQuantity = oldQuantity - reservedQuantity;
      if (input.quantity > availableQuantity + EPSILON) throw new EngineError(`الكمية المتاحة للبيع غير كافية. المتاح ${Math.max(0, availableQuantity).toFixed(8)}.`);
      cashAfter += notional - fee;
      realizedPnl = (fillPrice - oldAverage) * input.quantity - fee;
      nextQuantity = Math.max(0, oldQuantity - input.quantity);
      nextAverage = nextQuantity > EPSILON ? oldAverage : 0;
    }
    if (position) {
      await tx.update(positions).set({
        quantity: nextQuantity,
        avgPrice: nextAverage,
        realizedPnl: position.realizedPnl + realizedPnl,
        updatedAt: new Date(now),
      }).where(eq(positions.id, position.id));
    } else {
      await tx.insert(positions).values({ accountId, symbol: input.symbol, quantity: nextQuantity, avgPrice: nextAverage, realizedPnl });
    }
    await tx.update(accounts).set({ cash: cashAfter, updatedAt: new Date(now) }).where(eq(accounts.id, accountId));
    let savedOrder: Order;
    if (existingOrder) {
      const [updated] = await tx.update(orders).set({
        status: "filled",
        filledQuantity: existingOrder.filledQuantity + input.quantity,
        fillPrice,
        notional,
        fee,
        realizedPnl,
        executedAt: new Date(now),
        updatedAt: new Date(now),
        note: "نُفّذ عند ملامسة سعر الحد في دفتر مِدار",
      }).where(eq(orders.id, existingOrder.id)).returning();
      savedOrder = updated;
    } else {
      const [inserted] = await tx.insert(orders).values({
        accountId,
        symbol: input.symbol,
        side: input.side,
        kind: input.kind,
        quantity: input.quantity,
        filledQuantity: input.quantity,
        limitPrice: input.limitPrice,
        status: "filled",
        fillPrice,
        notional,
        fee,
        realizedPnl,
        timeInForce: input.timeInForce,
        executedAt: new Date(now),
        updatedAt: new Date(now),
        note: "تنفيذ داخلي وفق السبريد والانزلاق المحسوبين",
      }).returning();
      savedOrder = inserted;
    }
    await tx.insert(ledger).values({
      accountId,
      type: "trade",
      symbol: input.symbol,
      amount: input.side === "buy" ? -(notional + fee) : notional - fee,
      balanceAfter: cashAfter,
      description: `${input.side === "buy" ? "شراء" : "بيع"} ${input.quantity} ${instrument.displaySymbol} — دفتر مِدار`,
      reference: `MD-${savedOrder.id}`,
      createdAt: new Date(now),
    });
    return savedOrder;
  });
}

export async function placeOrder(userId: string, input: FillInput): Promise<Order> {
  const instrument = validateOrderInput(input.symbol, input.side, input.kind, input.quantity, input.limitPrice);
  if (!(input.timeInForce === "GTC" || input.timeInForce === "DAY")) throw new EngineError("مدة صلاحية الأمر غير صالحة.");
  const config = await getSettings();
  if (config.maintenanceMode || !config.tradingEnabled) throw new EngineError("التداول متوقف مؤقتاً بقرار إدارة المنصة.", 503);
  if (input.kind === "market" && !config.marketOrdersEnabled) throw new EngineError("أوامر السوق متوقفة حالياً؛ يمكنك استخدام أمر حدّ.", 403);
  if (input.kind === "limit" && !config.limitOrdersEnabled) throw new EngineError("أوامر الحدّ متوقفة حالياً.", 403);
  const estimatedValue = input.quantity * (input.kind === "limit" ? input.limitPrice! : getQuote(input.symbol).ask);
  if (estimatedValue > config.maxOrderValueUsd) throw new EngineError(`قيمة الأمر تتجاوز الحد المسموح (${config.maxOrderValueUsd.toLocaleString("en-US")} دولار).`);
  if (input.kind === "market") return executeFill(userId, input);
  await ensureAccount(userId);
  const accountId = accountIdFor(userId);
  const inserted = await db.transaction(async (tx) => {
    const [account] = await tx.select().from(accounts).where(eq(accounts.id, accountId)).for("update");
    const openOrders = await tx.select().from(orders).where(and(eq(orders.accountId, accountId), eq(orders.status, "open")));
    if (input.side === "buy") {
      const reservedCash = openOrders.reduce((sum, order) => {
        if (order.side !== "buy" || !order.limitPrice) return sum;
        const item = getInstrument(order.symbol);
        if (!item) return sum;
        const value = order.limitPrice * order.quantity;
        return sum + value + commission(value, item);
      }, 0);
      const value = input.limitPrice! * input.quantity;
      if (account.cash - reservedCash < value + commission(value, instrument) - EPSILON) throw new EngineError("لا توجد قوة شرائية كافية بعد حجز الأوامر المفتوحة.");
    } else {
      const [position] = await tx.select().from(positions).where(and(eq(positions.accountId, accountId), eq(positions.symbol, input.symbol))).for("update");
      const reserved = openOrders.filter((order) => order.side === "sell" && order.symbol === input.symbol).reduce((sum, order) => sum + order.quantity, 0);
      if ((position?.quantity ?? 0) - reserved < input.quantity - EPSILON) throw new EngineError("الكمية الحرة أقل من كمية أمر البيع.");
    }
    const [order] = await tx.insert(orders).values({
      accountId,
      symbol: input.symbol,
      side: input.side,
      kind: "limit",
      quantity: input.quantity,
      limitPrice: input.limitPrice,
      status: "open",
      notional: input.limitPrice! * input.quantity,
      timeInForce: input.timeInForce,
      note: "بانتظار ملامسة سعر الحد في دفتر مِدار",
    }).returning();
    return order;
  });
  await settleOpenOrders(userId);
  const [latest] = await db.select().from(orders).where(eq(orders.id, inserted.id)).limit(1);
  return latest ?? inserted;
}

export async function settleOpenOrders(userId: string): Promise<number> {
  const config = await getSettings();
  if (!config.tradingEnabled || config.maintenanceMode) return 0;
  await ensureAccount(userId);
  const accountId = accountIdFor(userId);
  const openOrders = await db.select().from(orders)
    .where(and(eq(orders.accountId, accountId), eq(orders.status, "open"))).orderBy(asc(orders.createdAt));
  let filled = 0;
  for (const order of openOrders) {
    if (order.timeInForce === "DAY" && Date.now() - order.createdAt.getTime() > 86400000) {
      await db.update(orders).set({ status: "cancelled", note: "انتهت صلاحية أمر اليوم", updatedAt: new Date() }).where(eq(orders.id, order.id));
      continue;
    }
    if (!order.limitPrice || !getInstrument(order.symbol)) continue;
    const quote = getQuote(order.symbol);
    const marketable = order.side === "buy" ? quote.ask <= order.limitPrice : quote.bid >= order.limitPrice;
    if (!marketable) continue;
    try {
      const result = await executeFill(userId, {
        symbol: order.symbol,
        side: order.side as OrderSide,
        kind: "limit",
        quantity: order.quantity - order.filledQuantity,
        limitPrice: order.limitPrice,
        timeInForce: order.timeInForce as TimeInForce,
      }, order.id);
      if (result.status === "filled") filled += 1;
    } catch (error) {
      await db.update(orders).set({ status: "rejected", note: error instanceof Error ? error.message : "تعذر التنفيذ", updatedAt: new Date() })
        .where(and(eq(orders.id, order.id), eq(orders.status, "open")));
    }
  }
  return filled;
}

export async function cancelOrder(userId: string, orderId: number): Promise<Order> {
  const accountId = accountIdFor(userId);
  const [updated] = await db.update(orders).set({ status: "cancelled", note: "ألغاه المستخدم قبل التنفيذ", updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.accountId, accountId), eq(orders.status, "open"))).returning();
  if (!updated) throw new EngineError("لا يمكن إلغاء الأمر؛ ربما نُفّذ أو أُلغي بالفعل.", 409);
  return updated;
}

function mapOrder(order: Order): OrderView {
  return {
    id: order.id,
    symbol: order.symbol,
    side: order.side as OrderSide,
    kind: order.kind as OrderKind,
    quantity: order.quantity,
    filledQuantity: order.filledQuantity,
    limitPrice: order.limitPrice,
    status: order.status as OrderView["status"],
    fillPrice: order.fillPrice,
    notional: order.notional,
    fee: order.fee,
    realizedPnl: order.realizedPnl,
    timeInForce: order.timeInForce as TimeInForce,
    note: order.note,
    createdAt: order.createdAt.toISOString(),
    executedAt: order.executedAt?.toISOString() ?? null,
  };
}

export async function getDashboardState(userId: string, chartSymbol = "NVDA", chartRange: ChartRange = "1D", settle = true): Promise<DashboardState> {
  if (settle) await settleOpenOrders(userId);
  else await ensureAccount(userId);
  const accountId = accountIdFor(userId);
  const selected = getInstrument(chartSymbol) ?? getInstrument("NVDA")!;
  const serverTime = Date.now();
  const [accountRows, positionRows, orderRows, openOrderRows, ledgerRows, depositRows, watchRows] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1),
    db.select().from(positions).where(eq(positions.accountId, accountId)),
    db.select().from(orders).where(eq(orders.accountId, accountId)).orderBy(desc(orders.createdAt)).limit(80),
    db.select().from(orders).where(and(eq(orders.accountId, accountId), eq(orders.status, "open"))),
    db.select().from(ledger).where(eq(ledger.accountId, accountId)).orderBy(desc(ledger.createdAt)).limit(60),
    db.select().from(depositRequests).where(eq(depositRequests.accountId, accountId)).orderBy(desc(depositRequests.createdAt)).limit(40),
    db.select().from(watchlist).where(eq(watchlist.accountId, accountId)).orderBy(asc(watchlist.createdAt)),
  ]);
  const account = accountRows[0];
  if (!account) throw new EngineError("الحساب غير موجود.", 404);
  const quotes = getQuotes(serverTime);
  const quoteMap = new Map(quotes.map((quote) => [quote.symbol, quote]));
  const reservedCash = openOrderRows.reduce((sum, order) => {
    if (order.side !== "buy" || !order.limitPrice) return sum;
    const item = getInstrument(order.symbol);
    if (!item) return sum;
    const value = order.limitPrice * (order.quantity - order.filledQuantity);
    return sum + value + commission(value, item);
  }, 0);
  const enriched = positionRows.filter((position) => position.quantity > EPSILON).map((position) => {
    const quote = quoteMap.get(position.symbol) ?? getQuote(position.symbol, serverTime);
    const reservedQuantity = openOrderRows.filter((order) => order.side === "sell" && order.symbol === position.symbol)
      .reduce((sum, order) => sum + order.quantity - order.filledQuantity, 0);
    const marketValue = position.quantity * quote.price;
    const costBasis = position.quantity * position.avgPrice;
    const unrealizedPnl = marketValue - costBasis;
    return {
      symbol: position.symbol,
      quantity: position.quantity,
      availableQuantity: Math.max(0, position.quantity - reservedQuantity),
      avgPrice: position.avgPrice,
      currentPrice: quote.price,
      marketValue,
      costBasis,
      unrealizedPnl,
      unrealizedPnlPct: costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0,
      realizedPnl: position.realizedPnl,
      dayPnl: position.quantity * quote.change,
      weight: 0,
    };
  }).sort((a, b) => b.marketValue - a.marketValue);
  const marketValue = enriched.reduce((sum, position) => sum + position.marketValue, 0);
  const equity = account.cash + marketValue;
  const totalPnl = equity - account.netDeposits;
  const ledgerView: LedgerView[] = ledgerRows.map((entry) => ({
    id: entry.id,
    type: entry.type,
    symbol: entry.symbol,
    amount: entry.amount,
    balanceAfter: entry.balanceAfter,
    description: entry.description,
    reference: entry.reference,
    createdAt: entry.createdAt.toISOString(),
  }));
  const deposits: DepositView[] = depositRows.map((request) => ({
    id: request.id,
    amountEgp: request.amountEgp,
    walletNumber: request.walletNumber,
    senderNumber: request.senderNumber,
    transferReference: request.transferReference,
    status: request.status as DepositView["status"],
    creditedUsd: request.creditedUsd,
    note: request.note,
    createdAt: request.createdAt.toISOString(),
  }));
  return {
    account: {
      id: account.id,
      name: account.name,
      cash: account.cash,
      availableCash: Math.max(0, account.cash - reservedCash),
      reservedCash,
      startingBalance: account.netDeposits,
      baseCurrency: account.baseCurrency,
      equity,
      marketValue,
      unrealizedPnl: enriched.reduce((sum, position) => sum + position.unrealizedPnl, 0),
      realizedPnl: positionRows.reduce((sum, position) => sum + position.realizedPnl, 0),
      totalPnl,
      totalPnlPct: account.netDeposits > 0 ? (totalPnl / account.netDeposits) * 100 : 0,
      dayPnl: enriched.reduce((sum, position) => sum + position.dayPnl, 0),
    },
    positions: enriched.map((position) => ({ ...position, weight: equity > 0 ? (position.marketValue / equity) * 100 : 0 })),
    orders: orderRows.map(mapOrder),
    ledger: ledgerView,
    deposits,
    watchlist: watchRows.map((row) => row.symbol),
    quotes,
    chart: { symbol: selected.symbol, range: chartRange, candles: getCandles(selected.symbol, chartRange, serverTime) },
    serverTime,
  };
}
