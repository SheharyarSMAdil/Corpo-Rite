import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getCreditBalance,
  getRecentTransactions,
} from "@/lib/credits";
import { requireDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  getBearerToken,
  validateExtensionToken,
} from "@/lib/extension-auth";

export async function GET(request: Request) {
  try {
    const bearer = getBearerToken(request);
    const extensionAuth = bearer ? await validateExtensionToken(bearer) : null;
    const session = extensionAuth ? null : await auth();

    const userId = extensionAuth?.userId ?? session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { balance, freeResetAt } = await getCreditBalance(userId);
    const transactions = await getRecentTransactions(userId, 10);

    const database = requireDb();
    const user = await database.query.users.findFirst({
      where: eq(users.id, userId),
    });

    return NextResponse.json({
      balance,
      freeResetAt,
      email: user?.email ?? session?.user?.email ?? null,
      transactions: transactions.map((t) => ({
        id: t.id,
        delta: t.delta,
        reason: t.reason,
        createdAt: t.createdAt,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load credits";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
