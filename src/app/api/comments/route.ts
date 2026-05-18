import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { moderate, moderateAsync } from "@/lib/moderation/engine";
import { hashAuthorHandle, encrypt } from "@/lib/hash";
import { z } from "zod";

const commentSchema = z.object({
  platform: z.enum(["youtube", "instagram", "facebook"]),
  accountId: z.string(),
  videoId: z.string(),
  commentId: z.string(),
  parentCommentId: z.string().optional(),
  authorDisplayName: z.string(),
  authorHandle: z.string(),
  commentTextRaw: z.string(),
  createdAt: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = commentSchema.parse(body);

    // 1. Moderate the comment locally
    const moderation = await moderateAsync(parsed.commentTextRaw);

    // 2. Hash and encrypt sensitive fields
    const authorHash = hashAuthorHandle(parsed.authorHandle);
    const displayNameEnc = encrypt(parsed.authorDisplayName);

    // 3. Calculate retention window
    const retentionDays = Number(process.env.DEFAULT_RETENTION_DAYS || 30);
    const evidenceExpiresAt = new Date(
      Date.now() + retentionDays * 24 * 60 * 60 * 1000
    );

    // 4. Store comment
    const comment = await prisma.comment.create({
      data: {
        platform: parsed.platform,
        connectedPlatformId: null, // Simplified; in real use, lookup ConnectedPlatform
        accountId: parsed.accountId,
        videoId: parsed.videoId,
        commentId: parsed.commentId,
        parentCommentId: parsed.parentCommentId,
        authorDisplayNameEnc: displayNameEnc,
        authorHandleHash: authorHash,
        commentTextRaw: parsed.commentTextRaw,
        commentTextNormalized: moderation.languageDetected,
        languageDetected: moderation.languageDetected,
        toxicScore: moderation.toxicityScore,
        riskLabel: moderation.riskLabel,
        matchedPhrases: JSON.stringify(moderation.matchedPhrases),
        confidence: moderation.confidence,
        reason: moderation.reason,
        createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date(),
        evidenceExpiresAt,
      },
    });

    // 5. Upsert author profile
    await prisma.authorProfile.upsert({
      where: { authorHandleHash: authorHash },
      update: { lastSeen: new Date() },
      create: {
        authorHandleHash: authorHash,
        displayNameEnc,
      },
    });

    // 6. Update offender risk profile asynchronously-friendly
    await updateOffenderProfile(authorHash);

    return NextResponse.json({ success: true, commentId: comment.id, moderation }, { status: 201 });
  } catch (error) {
    console.error("Comment ingestion error:", error);
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}

async function updateOffenderProfile(authorHash: string) {
  const comments = await prisma.comment.findMany({
    where: { authorHandleHash: authorHash },
  });

  const uniqueVideos = new Set(comments.map((c) => c.videoId)).size;
  const totalComments = comments.length;
  const toxicComments = comments.filter((c) =>
    ["medium", "high"].includes(c.riskLabel)
  ).length;
  const toxicityRatio = totalComments > 0 ? toxicComments / totalComments : 0;

  // Aggregate top keywords
  const keywordCounts: Record<string, number> = {};
  comments.forEach((c) => {
    JSON.parse(c.matchedPhrases).forEach((p: string) => {
      keywordCounts[p] = (keywordCounts[p] || 0) + 1;
    });
  });
  const topKeywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);

  // Repeated phrases
  const textCounts: Record<string, number> = {};
  comments.forEach((c) => {
    const text = c.commentTextNormalized || "";
    if (text.length > 5) {
      textCounts[text] = (textCounts[text] || 0) + 1;
    }
  });
  const repeatedPhrases = Object.entries(textCounts)
    .filter(([_, count]) => count > 1)
    .map(([phrase, count]) => ({ phrase, count }));

  let riskStatus: "low" | "medium" | "high" = "low";
  if (toxicityRatio >= 0.5 && uniqueVideos >= 2) riskStatus = "high";
  else if (toxicityRatio >= 0.3) riskStatus = "medium";

  await prisma.offenderRiskProfile.upsert({
    where: { authorHandleHash: authorHash },
    update: {
      uniqueVideos,
      totalComments,
      toxicComments,
      toxicityRatio,
      lastSeen: new Date(),
      topKeywords: JSON.stringify(topKeywords),
      repeatedPhrases: JSON.stringify(repeatedPhrases),
      riskStatus,
    },
    create: {
      authorHandleHash: authorHash,
      uniqueVideos,
      totalComments: totalComments,
      toxicComments: toxicComments,
      toxicityRatio: toxicityRatio,
      topKeywords: JSON.stringify(topKeywords),
      repeatedPhrases: JSON.stringify(repeatedPhrases),
      riskStatus: riskStatus,
    },
  });
}

export async function GET() {
  const comments = await prisma.comment.findMany({
    orderBy: { ingestedAt: "desc" },
    take: 100,
    select: {
      id: true,
      platform: true,
      videoId: true,
      riskLabel: true,
      toxicScore: true,
      matchedPhrases: true,
      ingestedAt: true,
      authorHandleHash: true,
    },
  });

  return NextResponse.json({ comments });
}
