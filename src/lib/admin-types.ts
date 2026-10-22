import type { SafeUser, UserStatus } from "@/lib/auth-types";
import type { PlatformConfig } from "@/lib/settings";

export interface AdminUserView extends SafeUser {
  status: UserStatus;
  cash: number;
  netDeposits: number;
  orderCount: number;
  codeStatus: string | null;
  codeExpiresAt: string | null;
}

export interface AdminDepositView {
  id: number;
  userId: string;
  userName: string;
  userEmail: string;
  amountEgp: number;
  walletNumber: string;
  senderNumber: string;
  transferReference: string;
  status: string;
  creditedUsd: number;
  note: string | null;
  createdAt: string;
}

export interface AuditView {
  id: number;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: string;
  createdAt: string;
}

export interface AdminOverview {
  users: AdminUserView[];
  deposits: AdminDepositView[];
  settings: PlatformConfig;
  logs: AuditView[];
  metrics: {
    totalUsers: number;
    pendingUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    pendingDeposits: number;
    pendingDepositsEgp: number;
    totalCreditedUsd: number;
  };
}
