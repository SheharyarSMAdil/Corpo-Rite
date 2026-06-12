import { createHash, randomBytes } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { EXTENSION_TOKEN_TTL_DAYS } from "./constants";
import { requireDb } from "./db";
import { extensionTokens } from "./db/schema";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateExtensionToken() {
  return randomBytes(32).toString("hex");
}

export async function createExtensionToken(userId: string) {
  const database = requireDb();
  const rawToken = generateExtensionToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + EXTENSION_TOKEN_TTL_DAYS);

  await database.insert(extensionTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return { rawToken, expiresAt };
}

export async function validateExtensionToken(
  bearerToken: string | null | undefined,
) {
  if (!bearerToken?.trim()) return null;

  const database = requireDb();
  const tokenHash = hashToken(bearerToken.trim());
  const now = new Date();

  const record = await database.query.extensionTokens.findFirst({
    where: and(
      eq(extensionTokens.tokenHash, tokenHash),
      gt(extensionTokens.expiresAt, now),
    ),
    with: undefined,
  });

  if (!record) return null;
  return { userId: record.userId, tokenId: record.id };
}

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim();
}
