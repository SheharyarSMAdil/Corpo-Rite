import { NextResponse } from "next/server";
import { z } from "zod";
import { deductCreditForRewrite } from "@/lib/credits";
import {
  getBearerToken,
  validateExtensionToken,
} from "@/lib/extension-auth";
import { rewriteText } from "@/lib/openai";

const rewriteSchema = z.object({
  text: z.string().min(1).max(10000),
  formality: z
    .enum(["casual", "professional", "formal", "executive"])
    .optional(),
  preserveTone: z.boolean().optional(),
  lengthMode: z.enum(["extend", "shorten"]).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    const auth = await validateExtensionToken(token);

    if (!auth) {
      return NextResponse.json(
        { ok: false, error: "NO_TOKEN" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = rewriteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid request" },
        { status: 400 },
      );
    }

    const creditResult = await deductCreditForRewrite(auth.userId);
    if (!creditResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "NO_CREDITS",
          balance: creditResult.balance,
        },
        { status: 402 },
      );
    }

    const suggestion = await rewriteText(
      parsed.data.text,
      {
        formality: parsed.data.formality,
        preserveTone: parsed.data.preserveTone,
      },
      parsed.data.lengthMode ?? null,
    );

    return NextResponse.json({
      ok: true,
      suggestion,
      creditsRemaining: creditResult.balance,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Rewrite failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
