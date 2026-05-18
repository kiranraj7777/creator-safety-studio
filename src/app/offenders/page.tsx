import { getOffenders } from "@/lib/db/data-access";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertTriangle, UserX, MessageCircle, Film, FileText } from "lucide-react";

const riskBadgeStyles: Record<string, string> = {
  high: "bg-red-100 text-red-800 hover:bg-red-100",
  medium: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  low: "bg-green-100 text-green-800 hover:bg-green-100",
};

export default async function OffendersPage() {
  const offenders = await getOffenders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Repeat Offenders</h1>
        <p className="text-muted-foreground">
          Users with toxic activity across multiple videos.
        </p>
      </div>

      {offenders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserX className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No offenders detected yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Offenders are flagged when a user posts toxic comments across multiple videos.
              Keep monitoring your connected platforms.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {offenders.map((offender: any) => {
            let keywords: string[] = [];
            try { keywords = JSON.parse(offender.topKeywords || "[]"); } catch { keywords = []; }
            return (
            <Card key={offender.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-mono text-sm">
                        {offender.authorHandleHash.slice(0, 16)}...
                      </h3>
                      <Badge className={riskBadgeStyles[offender.riskStatus]}>
                        {offender.riskStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {offender.totalComments} comments
                      </span>
                      <span className="flex items-center gap-1">
                        <Film className="h-3 w-3" />
                        {offender.uniqueVideos} videos
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {Math.round(offender.toxicityRatio * 100)}% toxic
                      </span>
                    </div>
                    {keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2">
                        {keywords.map((kw: string) => (
                          <Badge key={kw} variant="outline" className="text-xs">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="default" asChild>
                      <Link href={`/evidence?generate=${offender.authorHandleHash}`}>
                        <FileText className="h-4 w-4 mr-1" />
                        Generate Report
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/evidence?hash=${offender.authorHandleHash}`}>
                        View Evidence
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
