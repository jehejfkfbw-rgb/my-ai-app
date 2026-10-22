import "server-only";

import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type Session, type User } from "@/db/schema";
import type { SafeUser, UserRole, UserStatus } from "@/lib/auth-types";

const scryptAsync = promisify(scrypt);
const COOKIE_NAME = "midar_session";
const SESSION_DAYS = 30;

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    status: user.status as UserStatus,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt.toString("base64")}:${derived.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltValue, hashValue] = stored.split(":");
  if (!saltValue || !hashValue) return false;
  const expected = Buffer.from(hashValue, "base64");
  const derived = (await scryptAsync(password, Buffer.from(saltValue, "base64"), 64)) as Buffer;
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new AuthError("إعداد أمان الخادم غير مكتمل.", 500);
  return value;
}

export function activationHash(userId: string, code: string): string {
  return createHmac("sha256", secret()).update(`${userId}:${code}`).digest("hex");
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function accountIdFor(userId: string): string {
  return `acc_${userId}`;
}

export async function createSession(userId: string, scope: "pending" | "active") {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ userId, tokenHash: tokenHash(token), scope, expiresAt });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser(): Promise<{ user: User; session: Session } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const rows = await db.select({ user: users, session: sessions }).from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

export async function requireActiveUser(): Promise<User> {
  const current = await getCurrentUser();
  if (!current || current.session.scope !== "active") throw new AuthError("سجّل الدخول للوصول إلى حسابك.", 401);
  if (current.user.status !== "active") throw new AuthError("الحساب غير نشط. أكمل التفعيل أو تواصل مع الإدارة.", 403);
  return current.user;
}

export async function requireDeveloper(): Promise<User> {
  const user = await requireActiveUser();
  if (user.role !== "developer") throw new AuthError("هذه المنطقة مخصصة للمطور فقط.", 403);
  return user;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash(token)));
  cookieStore.delete(COOKIE_NAME);
}

let developerReady: Promise<void> | null = null;

export async function ensureDeveloper() {
  if (!developerReady) {
    developerReady = (async () => {
      const email = (process.env.DEVELOPER_EMAIL ?? "developer@midar.app").trim().toLowerCase();
      const password = process.env.DEVELOPER_INITIAL_PASSWORD;
      if (!password) throw new AuthError("كلمة مرور المطور الابتدائية غير مضبوطة في الخادم.", 500);
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existing[0]) return;
      const passwordHash = await hashPassword(password);
      await db.insert(users).values({
        name: "مطور مِدار",
        email,
        passwordHash,
        role: "developer",
        status: "active",
      }).onConflictDoNothing();
    })().catch((error) => {
      developerReady = null;
      throw error;
    });
  }
  await developerReady;
}

export async function writeAudit(input: { actorId?: string | null; action: string; targetType: string; targetId?: string | null; details: string }) {
  const { auditLogs } = await import("@/db/schema");
  await db.insert(auditLogs).values({
    actorId: input.actorId ?? null,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    details: input.details,
  });
}
