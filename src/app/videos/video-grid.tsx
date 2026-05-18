"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Film, MessageSquare, AlertTriangle, ExternalLink, Search, Clock, FileText } from "lucide-react";
import Link from "next/link";

interface VideoData {
  videoId: string;
  platform: string;
  total: number;
  flagged: number;
  avgToxicity: number;
  lastCommentAt: Date;
  topComment: string;
}

function platformUrl(platform: string, videoId: string): string {
  const urls: Record<string, string> = {
    youtube: `https://www.youtube.com/watch?v=${videoId}`,
    instagram: `https://www.instagram.com/p/${videoId}/`,
    facebook: `https://www.facebook.com/${videoId}`,
  };
  return urls[platform] || "#";
}

function timeAgo(d: Date): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString();
}

type SortKey = "comments" | "toxicity" | "recent";

export function VideoGrid({ videos }: { videos: VideoData[] }) {
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("recent");

  const platforms = useMemo(() => {
    const s = new Set(videos.map((v) => v.platform));
    return Array.from(s);
  }, [videos]);

  const filtered = useMemo(() => {
    let list = [...videos];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((v) => v.videoId.toLowerCase().includes(q));
    }

    if (platform !== "all") {
      list = list.filter((v) => v.platform === platform);
    }

    list.sort((a, b) => {
      if (sort === "comments") return b.total - a.total;
      if (sort === "toxicity") return b.avgToxicity - a.avgToxicity;
      return new Date(b.lastCommentAt).getTime() - new Date(a.lastCommentAt).getTime();
    });

    return list;
  }, [videos, search, platform, sort]);

  if (videos.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Videos</h1>
          <p className="text-muted-foreground">Safety overview for each video or post across your connected accounts.</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Film className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No videos found</h3>
            <p className="text-sm text-muted-foreground mt-1">Connect a platform and sync your comments to see videos here.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Videos</h1>
        <p className="text-muted-foreground">Safety overview for each video or post across your connected accounts.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by video ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
        >
          <option value="all">All Platforms</option>
          {platforms.map((p) => (
            <option key={p} value={p} className="capitalize">{p}</option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          <option value="recent">Most Recent</option>
          <option value="comments">Most Comments</option>
          <option value="toxicity">Highest Toxicity</option>
        </select>
        <span className="text-sm text-muted-foreground">
          {filtered.length} of {videos.length} videos
        </span>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No videos match your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((video) => (
            <Card key={video.videoId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="capitalize">{video.platform}</Badge>
                  {video.avgToxicity > 0.5 && <AlertTriangle className="h-4 w-4 text-destructive" />}
                </div>
                <CardTitle className="text-sm font-mono truncate" title={video.videoId}>
                  {video.videoId}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MessageSquare className="h-3 w-3" />
                    {video.total} comments
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <AlertTriangle className="h-3 w-3" />
                    {video.flagged} flagged
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Last comment {timeAgo(video.lastCommentAt)}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Safety Score</span>
                    <span className={video.avgToxicity > 0.5 ? "text-destructive" : "text-green-600"}>
                      {Math.round((1 - video.avgToxicity) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all ${video.avgToxicity > 0.5 ? "bg-destructive" : "bg-primary"}`}
                      style={{ width: `${Math.round((1 - video.avgToxicity) * 100)}%` }}
                    />
                  </div>
                </div>

                {video.topComment && (
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground line-clamp-2">{video.topComment}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" asChild>
                    <Link href={`/evidence?hash=${video.videoId}`}>
                      <FileText className="h-3 w-3 mr-1" />
                      View Details
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" className="px-2" asChild>
                    <a href={platformUrl(video.platform, video.videoId)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
