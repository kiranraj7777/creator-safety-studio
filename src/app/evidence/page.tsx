"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useRef, useState } from "react";
import { FileText, Copy, ExternalLink, Check, Download, Loader2, AlertTriangle } from "lucide-react";

interface EvidencePack {
  id: string;
  platform: string;
  videoId: string;
  title: string;
  markdown: string;
  reportText: string | null;
  jsonExport: string | null;
  createdAt: string;
}

export default function EvidencePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hash = searchParams.get("hash");
  const generate = searchParams.get("generate");
  const packId = searchParams.get("packId");
  const [packs, setPacks] = useState<EvidencePack[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [autoGenTriggered, setAutoGenTriggered] = useState(false);
  const packRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (generate && !generating) {
      setGenerating(true);
      setLoading(true);
      fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "youtube", videoId: "", authorHandleHash: generate }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setPacks([data.pack]);
            setGenerating(false);
            setLoading(false);
          } else {
            setGenerating(false);
            setLoading(false);
            setPacks([]);
          }
        })
        .catch(() => { setGenerating(false); setLoading(false); });
    }
  }, [generate, generating]);

  useEffect(() => {
    if (!generate) {
      fetch("/api/evidence")
        .then((r) => r.json())
        .then((data) => {
          const fetched = data.packs || [];
          setPacks(fetched);
          setLoading(false);

          if (hash && !autoGenTriggered) {
            const match = fetched.find((p: EvidencePack) => p.videoId === hash || p.title.includes(hash));
            if (!match) {
              setAutoGenTriggered(true);
              setGenerating(true);
              setLoading(true);
              fetch("/api/evidence", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ platform: "youtube", videoId: hash }),
              })
                .then((r) => r.json())
                .then((d) => {
                  if (d.success) {
                    setPacks([d.pack]);
                    setGenerating(false);
                    setLoading(false);
                  } else {
                    setGenerating(false);
                    setLoading(false);
                  }
                })
                .catch(() => { setGenerating(false); setLoading(false); });
            }
          }
        });
    }
  }, [generate, hash]);

  useEffect(() => {
    if (packId && packRefs.current[packId]) {
      packRefs.current[packId]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [packs, packId]);

  const handleCopy = async (text: string, id: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownload = (pack: EvidencePack) => {
    const text = pack.reportText || pack.markdown;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evidence-${pack.platform}-${pack.videoId || pack.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredPacks = hash ? packs.filter((p) => p.videoId === hash || p.title.includes(hash)) : packs;

  function extractFlaggedWords(pack: EvidencePack): string[] {
    try {
      if (!pack.jsonExport) return [];
      const items = JSON.parse(pack.jsonExport);
      const words = new Set<string>();
      for (const item of items) {
        if (item.matchedPhrases) {
          for (const phrase of item.matchedPhrases) words.add(phrase);
        }
      }
      return Array.from(words);
    } catch {
      return [];
    }
  }

  function extractItems(pack: EvidencePack): any[] {
    try {
      if (!pack.jsonExport) return [];
      return JSON.parse(pack.jsonExport);
    } catch {
      return [];
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Evidence Packs</h1>
        <p className="text-muted-foreground">
          Detailed evidence reports showing exactly which toxic words/phrases were detected. Download a report to submit to platform support.
        </p>
      </div>

      {loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              {generating ? "Generating evidence report for this video..." : "Loading..."}
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && filteredPacks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No evidence packs yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Flagged comments will automatically appear here once detected. Go to the Videos page and click &ldquo;View Details&rdquo; on a video to generate evidence on the fly.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && filteredPacks.length > 0 && (
        <div className="grid gap-4">
          {filteredPacks.map((pack) => {
            const flaggedWords = extractFlaggedWords(pack);
            const items = extractItems(pack);
            return (
              <div key={pack.id} ref={(el) => { packRefs.current[pack.id] = el; }}>
              <Card className={pack.id === packId ? "ring-2 ring-primary" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant="outline" className="mb-2 capitalize">
                        {pack.platform}
                      </Badge>
                      <CardTitle className="text-base">{pack.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {items.length} flagged comment{items.length !== 1 ? "s" : ""}
                        {hash && items.length > 0 && " — showing results for this video"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(pack.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {flaggedWords.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        Toxic Words / Phrases Detected:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {flaggedWords.map((word) => (
                          <Badge key={word} variant="destructive">{word}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {items.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Flagged Comments:</p>
                      {items.map((item: any, idx: number) => (
                        <div key={idx} className="rounded-md border p-3 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-xs">
                              {item.authorDisplayName || "Anonymous"}
                            </span>
                            <div className="flex items-center gap-2">
                              {item.matchedPhrases?.length > 0 && (
                                <div className="flex gap-1">
                                  {item.matchedPhrases.map((p: string) => (
                                    <Badge key={p} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                      {p}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              <Badge variant={item.toxicScore > 0.7 ? "destructive" : "secondary"} className="text-xs">
                                {Math.round(item.toxicScore * 100)}%
                              </Badge>
                            </div>
                          </div>
                          <p className="text-muted-foreground whitespace-pre-wrap break-words">
                            &ldquo;{item.commentText}&rdquo;
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                            {item.platformLink && (
                              <a href={item.platformLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" />
                                View on Platform
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rounded-md bg-muted p-4 text-sm font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                    {pack.reportText || pack.markdown}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(pack.reportText || pack.markdown, pack.id)}
                    >
                      {copied === pack.id ? (
                        <Check className="h-4 w-4 mr-2" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      {copied === pack.id ? "Copied" : "Copy Report"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(pack)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download .txt
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={getReportUrl(pack.platform)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Reporting Form
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getReportUrl(platform: string): string {
  const urls: Record<string, string> = {
    youtube: "https://support.google.com/youtube/answer/2802027",
    instagram: "https://help.instagram.com/2922068211434638",
    facebook: "https://www.facebook.com/help/212722115425932",
  };
  return urls[platform] || "#";
}
