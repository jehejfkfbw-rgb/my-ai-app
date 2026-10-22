import type { Candle, ChartRange, Quote } from "@/lib/markets";

export type OrderSide = "buy" | "sell";
export type OrderKind = "market" | "limit";
export type OrderStatus = "open" | "filled" | "cancelled" | "rejected";
export type TimeInForce = "GTC" | "DAY";

export interface AccountView {
  id: string;
  name: string;
  cash: number;
  availableCash: number;
  reservedCash: number;
  startingBalance: number;
  baseCurrency: string;
  equity: number;
  marketValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalPnl: number;
  totalPnlPct: number;
  dayPnl: number;
}

export interface PositionView {
  symbol: string;
  quantity: number;
  availableQuantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  realizedPnl: number;
  dayPnl: number;
  weight: number;
}

export interface OrderView {
  id: number;
  symbol: string;
  side: OrderSide;
  kind: OrderKind;
  quantity: number;
  filledQuantity: number;
  limitPrice: number | null;
  status: OrderStatus;
  fillPrice: number | null;
  notional: number;
  fee: number;
  realizedPnl: number;
  timeInForce: TimeInForce;
  note: string | null;
  createdAt: string;
  executedAt: string | null;
}

export interface LedgerView {
  id: number;
  type: string;
  symbol: string | null;
  amount: number;
  balanceAfter: number;
  description: string;
  reference: string | null;
  createdAt: string;
}

export interface DepositView {
  id: number;
  amountEgp: number;
  walletNumber: string;
  senderNumber: string;
  transferReference: string;
  status: "pending" | "cancelled" | "approved" | "rejected";
  creditedUsd: number;
  note: string | null;
  createdAt: string;
}

export interface DashboardState {
  account: AccountView;
  positions: PositionView[];
  orders: OrderView[];
  ledger: LedgerView[];
  deposits: DepositView[];
  watchlist: string[];
  quotes: Quote[];
  chart: { symbol: string; range: ChartRange; candles: Candle[] };
  serverTime: number;
}
