import {
  doublePrecision,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 16 }).notNull().default("user"),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    scope: varchar("scope", { length: 16 }).notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_user_idx").on(table.userId), index("sessions_expiry_idx").on(table.expiresAt)],
);

export const activationCodes = pgTable("activation_codes", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  codeHash: varchar("code_hash", { length: 64 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export const accounts = pgTable("accounts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  cash: doublePrecision("cash").notNull().default(0),
  netDeposits: doublePrecision("net_deposits").notNull().default(0),
  startingBalance: doublePrecision("starting_balance").notNull().default(0),
  baseCurrency: varchar("base_currency", { length: 3 }).notNull().default("USD"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const positions = pgTable(
  "positions",
  {
    id: serial("id").primaryKey(),
    accountId: varchar("account_id", { length: 64 }).notNull().references(() => accounts.id, { onDelete: "cascade" }),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    quantity: doublePrecision("quantity").notNull(),
    avgPrice: doublePrecision("avg_price").notNull(),
    realizedPnl: doublePrecision("realized_pnl").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("positions_account_symbol_idx").on(table.accountId, table.symbol)],
);

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    accountId: varchar("account_id", { length: 64 }).notNull().references(() => accounts.id, { onDelete: "cascade" }),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    side: varchar("side", { length: 8 }).notNull(),
    kind: varchar("kind", { length: 12 }).notNull(),
    quantity: doublePrecision("quantity").notNull(),
    filledQuantity: doublePrecision("filled_quantity").notNull().default(0),
    limitPrice: doublePrecision("limit_price"),
    status: varchar("status", { length: 16 }).notNull(),
    fillPrice: doublePrecision("fill_price"),
    notional: doublePrecision("notional").notNull().default(0),
    fee: doublePrecision("fee").notNull().default(0),
    realizedPnl: doublePrecision("realized_pnl").notNull().default(0),
    timeInForce: varchar("time_in_force", { length: 8 }).notNull().default("GTC"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    executedAt: timestamp("executed_at", { withTimezone: true }),
  },
  (table) => [index("orders_account_created_idx").on(table.accountId, table.createdAt)],
);

export const ledger = pgTable(
  "ledger",
  {
    id: serial("id").primaryKey(),
    accountId: varchar("account_id", { length: 64 }).notNull().references(() => accounts.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 20 }).notNull(),
    symbol: varchar("symbol", { length: 20 }),
    amount: doublePrecision("amount").notNull(),
    balanceAfter: doublePrecision("balance_after").notNull(),
    description: text("description").notNull(),
    reference: varchar("reference", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ledger_account_created_idx").on(table.accountId, table.createdAt)],
);

export const watchlist = pgTable(
  "watchlist",
  {
    id: serial("id").primaryKey(),
    accountId: varchar("account_id", { length: 64 }).notNull().references(() => accounts.id, { onDelete: "cascade" }),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("watchlist_account_symbol_idx").on(table.accountId, table.symbol)],
);

export const depositRequests = pgTable(
  "deposit_requests",
  {
    id: serial("id").primaryKey(),
    accountId: varchar("account_id", { length: 64 }).notNull().references(() => accounts.id, { onDelete: "cascade" }),
    amountEgp: doublePrecision("amount_egp").notNull(),
    walletNumber: varchar("wallet_number", { length: 20 }).notNull(),
    senderNumber: varchar("sender_number", { length: 20 }).notNull(),
    transferReference: text("transfer_reference").notNull(),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    creditedUsd: doublePrecision("credited_usd").notNull().default(0),
    note: text("note"),
    reviewedBy: uuid("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("deposits_account_created_idx").on(table.accountId, table.createdAt)],
);

export const platformSettings = pgTable("platform_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
  updatedBy: uuid("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actorId: uuid("actor_id"),
    action: varchar("action", { length: 64 }).notNull(),
    targetType: varchar("target_type", { length: 32 }).notNull(),
    targetId: varchar("target_id", { length: 80 }),
    details: text("details").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_created_idx").on(table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Position = typeof positions.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type DepositRequest = typeof depositRequests.$inferSelect;
