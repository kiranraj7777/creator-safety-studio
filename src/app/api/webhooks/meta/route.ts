import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { moderateAsync } from "@/lib/moderation/engine";
import { hashAuthorHandle, encrypt } from "@/lib/hash";

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "creator-safety-verify";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const entries = body?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const comment = change?.value;
        if (!comment?.id || !comment?.text || !comment?.from?.id) continue;

        const retentionDays = Number(process.env.DEFAULT_RETENTION_DAYS || 30);
        const authorHash = hashAuthorHandle(comment.from.id);
        const displayNameEnc = encrypt(comment.from.name || "Unknown");
        const modResult = await moderateAsync(comment.text);

        await prisma.comment.create({
          data: {
            platform: entry?.platform === "instagram" ? "instagram" : "facebook",
            connectedPlatformId: entry?.id || "webhook",
            accountId: entry?.id || "",
            videoId: change?.value?.media?.id || comment.id,
            commentId: comment.id,
            authorDisplayNameEnc: displayNameEnc,
            authorHandleHash: authorHash,
            commentTextRaw: comment.text,
            commentTextNormalized: modResult.languageDetected,
            languageDetected: modResult.languageDetected,
            toxicScore: modResult.toxicityScore,
            riskLabel: modResult.riskLabel,
            matchedPhrases: JSON.stringify(modResult.matchedPhrases),
            confidence: modResult.confidence,
            reason: modResult.reason,
            evidenceExpiresAt: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000),
          },
        });
      }
    }

    await prisma.auditLog.create({
      data: { action: "META_WEBHOOK_RECEIVED", details: JSON.stringify({ entries: entries.length }) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Meta webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
