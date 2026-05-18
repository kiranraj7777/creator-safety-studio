import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const channelSchema = z.object({
  handle: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = channelSchema.parse(body);
    const handle = parsed.handle.trim().replace("@", "");

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "YouTube API not configured" }, { status: 400 });

    // Resolve handle to channel ID
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&forHandle=${handle}&key=${apiKey}`
    );
    if (!channelRes.ok) return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
    
    const channelData = await channelRes.json();
    if (!channelData.items?.length) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const channel = channelData.items[0];
    const channelId = channel.id;
    const channelName = channel.snippet.title;
    const channelThumbnail = channel.snippet.thumbnails?.default?.url;

    // Check if already connected
    const existing = await prisma.connectedPlatform.findFirst({
      where: { userId: (session.user as any).id, platform: "youtube" },
    });

    // Remove old connection if exists
    if (existing) {
      await prisma.connectedPlatform.delete({ where: { id: existing.id } });
    }

    // Create new connection
    const platform = await prisma.connectedPlatform.create({
      data: {
        userId: (session.user as any).id,
        platform: "youtube",
        accountId: channelId,
        accountName: channelName,
        channelHandle: handle,
        status: "ACTIVE",
        lastSyncAt: new Date(),
      },
    });

    // Fetch last 10 videos
    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
    const videosRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&key=${apiKey}&maxResults=10`
    );
    const videosData = await videosRes.json();

    // Store videos
    const videoRecords = [];
    for (const item of (videosData.items || []) as any[]) {
      const videoSnippet = item.snippet;
      if (!videoSnippet) continue;

      const videoRecord = await prisma.youTubeVideo.upsert({
        where: { videoId: videoSnippet.resourceId.videoId },
        update: {
          connectedPlatformId: platform.id,
          title: videoSnippet.title,
          thumbnailUrl: videoSnippet.thumbnails?.medium?.url || videoSnippet.thumbnails?.default?.url,
          publishedAt: videoSnippet.publishedAt ? new Date(videoSnippet.publishedAt) : null,
          fetchedAt: new Date(),
        },
        create: {
          connectedPlatformId: platform.id,
          videoId: videoSnippet.resourceId.videoId,
          title: videoSnippet.title,
          thumbnailUrl: videoSnippet.thumbnails?.medium?.url || videoSnippet.thumbnails?.default?.url,
          publishedAt: videoSnippet.publishedAt ? new Date(videoSnippet.publishedAt) : null,
          synced: false,
        },
      });
      videoRecords.push(videoRecord);
    }

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "YOUTUBE_CONNECTED",
        target: `channel:${channelId}`,
        details: JSON.stringify({ handle, videosFound: videoRecords.length }),
      },
    });

    return NextResponse.json({ 
      success: true, 
      platform,
      videos: videoRecords,
      channelName,
      channelThumbnail,
    }, { status: 201 });
  } catch (error) {
    console.error("YouTube connect error:", error);
    return NextResponse.json({ error: "Failed to connect channel" }, { status: 400 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const platforms = await prisma.connectedPlatform.findMany({
    where: { userId: (session.user as any).id, status: "ACTIVE" },
    select: { 
      id: true, platform: true, accountId: true, accountName: true, channelHandle: true,
      status: true, lastSyncAt: true, createdAt: true 
    },
  });

  // Get video counts for each platform
  const platformsWithCounts = await Promise.all(platforms.map(async (p) => {
    const videoCount = await prisma.youTubeVideo.count({ where: { connectedPlatformId: p.id } });
    const syncedVideos = await prisma.youTubeVideo.count({ where: { connectedPlatformId: p.id, synced: true } });
    return { ...p, videoCount, syncedVideos };
  }));

  return NextResponse.json({ platforms: platformsWithCounts });
}