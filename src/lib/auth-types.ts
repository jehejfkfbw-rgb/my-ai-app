export type UserRole = "user" | "developer";
export type UserStatus = "pending" | "active" | "suspended";

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: string;
  lastLoginAt?: string | null;
}
