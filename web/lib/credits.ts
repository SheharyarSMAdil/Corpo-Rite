import { and, desc, eq, gte, sql } from "drizzle-orm";
import {
  CREDIT_COST_PER_REWRITE,
  FREE_MONTHLY_CREDITS,
} from "./constants";
import { requireDb } from "./db";
import { creditTransactions, userCredits } from "./db/schema";

function startOfNextMonth(from = new Date()) {
  return new Date(from.getFullYear(), from.getMonth() + 1, 1);
}

export async function ensureUserCredits(userId: string) {
  const database = requireDb();
  const existing = await database.query.userCredits.findFirst({
    where: eq(userCredits.userId, userId),
  });

  if (existing) return existing;

  const now = new Date();
  const [created] = await database
    .insert(userCredits)
    .values({
      userId,
      balance: FREE_MONTHLY_CREDITS,
      freeResetAt: startOfNextMonth(now),
    })
    .returning();

  await database.insert(creditTransactions).values({
    userId,
    delta: FREE_MONTHLY_CREDITS,
    reason: "monthly_grant",
    metadata: JSON.stringify({ month: now.toISOString().slice(0, 7) }),
  });

  return created;
}

export async function grantMonthlyCreditsIfDue(userId: string) {
  const database = requireDb();
  const record = await ensureUserCredits(userId);
  const now = new Date();

  if (record.freeResetAt && record.freeResetAt > now) {
    return record;
  }

  const [updated] = await database
    .update(userCredits)
    .set({
      balance: sql`${userCredits.balance} + ${FREE_MONTHLY_CREDITS}`,
      freeResetAt: startOfNextMonth(now),
    })
    .where(eq(userCredits.userId, userId))
    .returning();

  await database.insert(creditTransactions).values({
    userId,
    delta: FREE_MONTHLY_CREDITS,
    reason: "monthly_grant",
    metadata: JSON.stringify({ month: now.toISOString().slice(0, 7) }),
  });

  return updated;
}

export async function getCreditBalance(userId: string) {
  const record = await grantMonthlyCreditsIfDue(userId);
  return {
    balance: record.balance,
    freeResetAt: record.freeResetAt,
  };
}

export async function deductCreditForRewrite(userId: string) {
  const database = requireDb();
  const record = await grantMonthlyCreditsIfDue(userId);

  if (record.balance < CREDIT_COST_PER_REWRITE) {
    return { ok: false as const, balance: record.balance };
  }

  const [updated] = await database
    .update(userCredits)
    .set({
      balance: sql`${userCredits.balance} - ${CREDIT_COST_PER_REWRITE}`,
    })
    .where(
      and(
        eq(userCredits.userId, userId),
        gte(userCredits.balance, CREDIT_COST_PER_REWRITE),
      ),
    )
    .returning();

  if (!updated) {
    return { ok: false as const, balance: record.balance };
  }

  await database.insert(creditTransactions).values({
    userId,
    delta: -CREDIT_COST_PER_REWRITE,
    reason: "rewrite",
  });

  return { ok: true as const, balance: updated.balance };
}

export async function addCredits(
  userId: string,
  amount: number,
  reason: string,
  metadata?: Record<string, unknown>,
) {
  const database = requireDb();
  await ensureUserCredits(userId);

  const [updated] = await database
    .update(userCredits)
    .set({ balance: sql`${userCredits.balance} + ${amount}` })
    .where(eq(userCredits.userId, userId))
    .returning();

  await database.insert(creditTransactions).values({
    userId,
    delta: amount,
    reason,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });

  return updated.balance;
}

export async function getRecentTransactions(userId: string, limit = 20) {
  const database = requireDb();
  return database.query.creditTransactions.findMany({
    where: eq(creditTransactions.userId, userId),
    orderBy: [desc(creditTransactions.createdAt)],
    limit,
  });
}

export async function getUsageLast30Days(userId: string) {
  const database = requireDb();
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const rows = await database
    .select({
      day: sql<string>`date_trunc('day', ${creditTransactions.createdAt})::date`,
      count: sql<number>`count(*)::int`,
    })
    .from(creditTransactions)
    .where(
      and(
        eq(creditTransactions.userId, userId),
        eq(creditTransactions.reason, "rewrite"),
        gte(creditTransactions.createdAt, since),
      ),
    )
    .groupBy(sql`date_trunc('day', ${creditTransactions.createdAt})::date`)
    .orderBy(sql`date_trunc('day', ${creditTransactions.createdAt})::date`);

  return rows;
}
