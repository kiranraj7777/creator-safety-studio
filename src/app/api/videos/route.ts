import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get("q");

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

  let videos = platform.videos.map((v) => ({
    id: v.id,
    videoId: v.videoId,
    title: v.title,
    thumbnailUrl: v.thumbnailUrl,
    publishedAt: v.publishedAt,
    synced: v.synced,
    totalComments: v._count.comments,
    badComments: v.comments.length,
  }));

  // Filter by search query if provided
  if (query && query.trim()) {
    const q = query.toLowerCase();
    videos = videos.filter((v) => v.title?.toLowerCase().includes(q));
  }

  return NextResponse.json({ videos, channelName: platform.accountName });
}

// POST - Search YouTube API for specific video
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "YouTube API not configured" }, { status: 400 });

  try {
    const { query } = await req.json();
    
    // Search for videos matching query
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&key=${apiKey}&maxResults=20`
    );
    const searchData = await searchRes.json();

    const videos = (searchData.items || []).map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      publishedAt: item.snippet.publishedAt,
      channelTitle: item.snippet.channelTitle,
    }));

    return NextResponse.json({ videos });
  } catch (error) {
    console.error("Video search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}