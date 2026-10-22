import "server-only";

import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, activationCodes, auditLogs, depositRequests, orders, users } from "@/db/schema";
import { getSettings } from "@/lib/settings";
import type { AdminOverview } from "@/lib/admin-types";
import type { UserRole, UserStatus } from "@/lib/auth-types";

export async function getAdminOverview(): Promise<AdminOverview> {
  const [userRows, accountRows, codeRows, orderStats, depositRows, logRows, settings] = await Promise.all([
    db.select().from(users).orderBy(desc(users.createdAt)).limit(500),
    db.select().from(accounts),
    db.select().from(activationCodes),
    db.select({ accountId: orders.accountId, value: sql<number>`count(*)::int` }).from(orders).groupBy(orders.accountId),
    db.select({ deposit: depositRequests, userName: users.name, userEmail: users.email, userId: users.id })
      .from(depositRequests).innerJoin(accounts, eq(accounts.id, depositRequests.accountId)).innerJoin(users, eq(users.id, accounts.userId))
      .orderBy(desc(depositRequests.createdAt)).limit(150),
    db.select({ log: auditLogs, actorName: users.name }).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.actorId)).orderBy(desc(auditLogs.createdAt)).limit(100),
    getSettings(),
  ]);
  const accountMap = new Map(accountRows.map((account) => [account.userId, account]));
  const codeMap = new Map(codeRows.map((code) => [code.userId, code]));
  const orderMap = new Map(orderStats.map((row) => [row.accountId, Number(row.value)]));
  const regularUsers = userRows.filter((user) => user.role !== "developer");
  return {
    users: userRows.map((user) => {
      const account = accountMap.get(user.id);
      const code = codeMap.get(user.id);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as UserRole,
        status: user.status as UserStatus,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        cash: account?.cash ?? 0,
        netDeposits: account?.netDeposits ?? 0,
        orderCount: account ? orderMap.get(account.id) ?? 0 : 0,
        codeStatus: code?.status ?? null,
        codeExpiresAt: code?.expiresAt.toISOString() ?? null,
      };
    }),
    deposits: depositRows.map(({ deposit, userName, userEmail, userId }) => ({
      id: deposit.id,
      userId,
      userName,
      userEmail,
      amountEgp: deposit.amountEgp,
      walletNumber: deposit.walletNumber,
      senderNumber: deposit.senderNumber,
      transferReference: deposit.transferReference,
      status: deposit.status,
      creditedUsd: deposit.creditedUsd,
      note: deposit.note,
      createdAt: deposit.createdAt.toISOString(),
    })),
    settings,
    logs: logRows.map(({ log, actorName }) => ({
      id: log.id,
      actorName: actorName ?? "النظام",
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      details: log.details,
      createdAt: log.createdAt.toISOString(),
    })),
    metrics: {
      totalUsers: regularUsers.length,
      pendingUsers: regularUsers.filter((user) => user.status === "pending").length,
      activeUsers: regularUsers.filter((user) => user.status === "active").length,
      suspendedUsers: regularUsers.filter((user) => user.status === "suspended").length,
      pendingDeposits: depositRows.filter((row) => row.deposit.status === "pending").length,
      pendingDepositsEgp: depositRows.filter((row) => row.deposit.status === "pending").reduce((sum, row) => sum + row.deposit.amountEgp, 0),
      totalCreditedUsd: depositRows.filter((row) => row.deposit.status === "approved").reduce((sum, row) => sum + row.deposit.creditedUsd, 0),
    },
  };
}
