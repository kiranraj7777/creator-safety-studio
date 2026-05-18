"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Film, MessageSquare, AlertTriangle, ExternalLink, Search, Clock, FileText, Loader2, Youtube, ChevronRight } from "lucide-react";
import Link from "next/link";

interface VideoData {
  id: string;
  videoId: string;
  title: string | null;
  thumbnailUrl: string | null;
  publishedAt: Date | null;
  synced: boolean;
  totalComments: number;
  badComments: number;
}

function platformUrl(platform: string, videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
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

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [channelName, setChannelName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showBadOnly, setShowBadOnly] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, []);

  function fetchVideos() {
    setLoading(true);
    fetch("/api/cron/sync-youtube")
      .then((r) => r.json())
      .then((d) => {
        setVideos(d.videos || []);
        setChannelName(d.channelName);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    
    setSearching(true);
    const res = await fetch("/api/cron/sync-youtube", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: search }),
    });
    const data = await res.json();
    setSearchResults(data.videos || []);
    setSearching(false);
  }

  const filteredVideos = videos.filter((v) => {
    if (showBadOnly && v.badComments === 0) return false;
    if (!v.title) return true;
    if (search) return v.title.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Videos</h1>
          <p className="text-muted-foreground">Safety overview for each video from your channel.</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Loading videos...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Videos</h1>
        <p className="text-muted-foreground">
          {channelName ? (
            <>Safety overview for <span className="font-semibold text-primary">{channelName}</span> channel</>
          ) : (
            "Connect your YouTube channel in Settings to see videos"
          )}
        </p>
      </div>

      {videos.length === 0 && !channelName ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Youtube className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No channel connected</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Go to Settings and connect your YouTube channel to start monitoring.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/settings">Go to Settings</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search video titles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={showBadOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowBadOnly(!showBadOnly)}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Bad Comments Only
            </Button>
            <span className="text-sm text-muted-foreground">
              {filteredVideos.length} of {videos.length} videos
            </span>
          </div>

          {filteredVideos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No videos match your filters.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredVideos.map((video) => (
                <Card key={video.id} className="overflow-hidden">
                  {video.thumbnailUrl && (
                    <div className="relative aspect-video bg-muted">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title || "Video thumbnail"}
                        className="w-full h-full object-cover"
                      />
                      {video.badComments > 0 && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                          {video.badComments} bad
                        </div>
                      )}
                    </div>
                  )}
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-semibold line-clamp-2 text-sm" title={video.title || ""}>
                      {video.title || video.videoId}
                    </h3>

                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        {video.totalComments} comments
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <AlertTriangle className="h-3 w-3" />
                        {video.badComments} flagged
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {video.publishedAt ? timeAgo(video.publishedAt) : "Unknown date"}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Safety Score</span>
                        <span className={video.badComments > video.totalComments * 0.3 ? "text-destructive" : "text-green-600"}>
                          {video.totalComments > 0
                            ? Math.round((1 - video.badComments / video.totalComments) * 100)
                            : 100}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full transition-all ${video.badComments > video.totalComments * 0.3 ? "bg-destructive" : "bg-primary"}`}
                          style={{
                            width: `${video.totalComments > 0
                              ? Math.round((1 - video.badComments / video.totalComments) * 100)
                              : 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" asChild>
                        <Link href={`/evidence?hash=${video.videoId}`}>
                          <FileText className="h-3 w-3 mr-1" />
                          View Bad Comments
                        </Link>
                      </Button>
                      <Button size="sm" variant="ghost" className="px-2" asChild>
                        <a href={platformUrl("youtube", video.videoId)} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card className="border-dashed">
            <CardContent className="p-4">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Any Video on YouTube
              </h3>
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Search videos by title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
              </form>
              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto">
                  {searchResults.map((v) => (
                    <div key={v.videoId} className="flex items-center gap-3 p-2 rounded-md border">
                      {v.thumbnailUrl && (
                        <img src={v.thumbnailUrl} alt="" className="w-24 h-auto rounded" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{v.title}</p>
                        <p className="text-xs text-muted-foreground">{v.channelTitle}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}