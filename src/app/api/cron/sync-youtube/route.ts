import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { moderateAsync } from "@/lib/moderation/engine";
import { hashAuthorHandle, encrypt } from "@/lib/hash";

export async function POST() {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return NextResponse.json({ success: false, error: "YouTube API key not configured" }, { status: 400 });

    const connectedAccounts = await prisma.connectedPlatform.findMany({
      where: { platform: "youtube", status: "ACTIVE" },
    });

    let totalSynced = 0;
    for (const account of connectedAccounts) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&allThreadsRelatedToChannelId=${account.accountId}&key=${apiKey}&maxResults=100`
        );
        if (!response.ok) continue;
        const data = await response.json();

        const retentionDays = Number(process.env.DEFAULT_RETENTION_DAYS || 30);

        for (const item of (data.items || []) as any[]) {
          const snippet = item.snippet?.topLevelComment?.snippet;
          if (!snippet) continue;

          const authorHash = hashAuthorHandle(snippet.authorChannelId?.value || snippet.authorDisplayName || "");
          const displayNameEnc = encrypt(snippet.authorDisplayName || "Unknown");
          const modResult = await moderateAsync(snippet.textDisplay || "");

          await prisma.comment.upsert({
            where: { commentId: item.id },
            update: { toxicScore: modResult.toxicityScore, riskLabel: modResult.riskLabel, matchedPhrases: JSON.stringify(modResult.matchedPhrases) },
            create: {
              platform: "youtube",
              connectedPlatformId: account.id,
              accountId: account.accountId,
              videoId: item.snippet?.videoId || item.snippet?.topLevelComment?.snippet?.videoId || "",
              commentId: item.id,
              authorDisplayNameEnc: displayNameEnc,
              authorHandleHash: authorHash,
              commentTextRaw: snippet.textDisplay || "",
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
          totalSynced++;
        }

        await prisma.connectedPlatform.update({
          where: { id: account.id },
          data: { lastSyncAt: new Date() },
        });
      } catch (err) {
        console.error(`YouTube sync error for account ${account.accountId}:`, err);
      }
    }

    await prisma.auditLog.create({
      data: { action: "YOUTUBE_SYNC", target: "comments", details: JSON.stringify({ commentsSynced: totalSynced, accounts: connectedAccounts.length }) },
    });

    return NextResponse.json({ success: true, commentsSynced: totalSynced, accountsProcessed: connectedAccounts.length });
  } catch (error) {
    console.error("YouTube sync job error:", error);
    return NextResponse.json({ success: false, error: "Sync failed" }, { status: 500 });
  }
}
