import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { moderateAsync } from "@/lib/moderation/engine";
import { hashAuthorHandle, encrypt } from "@/lib/hash";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return NextResponse.json({ success: false, error: "YouTube API not configured" }, { status: 400 });

  try {
    // Get user's YouTube platform
    const platform = await prisma.connectedPlatform.findFirst({
      where: { userId, platform: "youtube", status: "ACTIVE" },
      include: { videos: true },
    });

    if (!platform) {
      return NextResponse.json({ error: "No YouTube channel connected" }, { status: 400 });
    }

    const retentionDays = Number(process.env.DEFAULT_RETENTION_DAYS || 30);
    let totalSynced = 0;
    let videosWithBadComments = 0;

    // Sync comments for each video
    for (const video of platform.videos) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${video.videoId}&key=${apiKey}&maxResults=100`
        );
        if (!response.ok) continue;

        const data = await response.json();
        let badCommentFound = false;

        for (const item of (data.items || []) as any[]) {
          const snippet = item.snippet?.topLevelComment?.snippet;
          if (!snippet) continue;

          const authorHash = hashAuthorHandle(snippet.authorChannelId?.value || snippet.authorDisplayName || "");
          const displayNameEnc = encrypt(snippet.authorDisplayName || "Unknown");
          const rawCommentText = snippet.textDisplay || "";
          const modResult = await moderateAsync(rawCommentText);

          await prisma.comment.upsert({
            where: { commentId: item.id },
            update: {
              youtubeVideoId: video.id,
              toxicScore: modResult.toxicityScore,
              riskLabel: modResult.riskLabel,
              matchedPhrases: JSON.stringify(modResult.matchedPhrases),
              commentTextRaw: rawCommentText,
              commentTextNormalized: modResult.normalizedText || modResult.languageDetected,
            },
            create: {
              platform: "youtube",
              connectedPlatformId: platform.id,
              youtubeVideoId: video.id,
              accountId: platform.accountId,
              videoId: video.videoId,
              commentId: item.id,
              authorDisplayNameEnc: displayNameEnc,
              authorHandleHash: authorHash,
              commentTextRaw: rawCommentText,
              commentTextNormalized: modResult.normalizedText || modResult.languageDetected,
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
          if (modResult.riskLabel !== "low") {
            badCommentFound = true;
          }
        }

        // Mark video as synced
        await prisma.youTubeVideo.update({
          where: { id: video.id },
          data: { synced: true },
        });

        if (badCommentFound) {
          videosWithBadComments++;
        }
      } catch (err) {
        console.error(`Sync error for video ${video.videoId}:`, err);
      }
    }

    // Update last sync time
    await prisma.connectedPlatform.update({
      where: { id: platform.id },
      data: { lastSyncAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "YOUTUBE_SYNC",
        target: "comments",
        details: JSON.stringify({ commentsSynced: totalSynced, videosWithBadComments }),
      },
    });

    return NextResponse.json({
      success: true,
      commentsSynced: totalSynced,
      videosWithBadComments,
      totalVideos: platform.videos.length,
    });
  } catch (error) {
    console.error("YouTube sync error:", error);
    return NextResponse.json({ success: false, error: "Sync failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const searchParams = req.nextUrl.searchParams;
  const videoId = searchParams.get("videoId");

  if (videoId) {
    // Get comments for specific video
    const video = await prisma.youTubeVideo.findUnique({
      where: { videoId },
      include: {
        comments: {
          where: { riskLabel: { not: "low" } },
          orderBy: { toxicScore: "desc" },
          take: 50,
        },
      },
    });
    return NextResponse.json({ video });
  }

  // Get all videos for user
  const platform = await prisma.connectedPlatform.findFirst({
    where: { userId, platform: "youtube", status: "ACTIVE" },
    include: {
      videos: {
        orderBy: { publishedAt: "desc" },
        include: {
          _count: { select: { comments: true } },
          comments: {
            where: { riskLabel: { not: "low" } },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!platform) return NextResponse.json({ videos: [] });

  const videosWithStats = platform.videos.map((v) => ({
    id: v.id,
    videoId: v.videoId,
    title: v.title,
    thumbnailUrl: v.thumbnailUrl,
    publishedAt: v.publishedAt,
    synced: v.synced,
    totalComments: v._count.comments,
    badComments: v.comments.length,
  }));

  return NextResponse.json({ videos: videosWithStats, channelName: platform.accountName });
}