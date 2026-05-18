"use client";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Platform, RiskLabel } from "@/types";

interface TickerItem {
  id: string;
  platform: Platform;
  riskLabel: RiskLabel;
  toxicScore: number;
  commentTextNormalized: string | null;
  ingestedAt: Date;
  videoId: string;
}

const riskColors: Record<RiskLabel, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

export function AbuseTicker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No flagged comments yet. Connect a platform to start monitoring.
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start justify-between rounded-md border p-3 text-sm"
        >
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium capitalize">{item.platform}</span>
              <Badge className={riskColors[item.riskLabel]}>
                {item.riskLabel}
              </Badge>
            </div>
            <p className="text-muted-foreground line-clamp-2">
              {item.commentTextNormalized || "[Content purged]"}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(item.ingestedAt)}
            </p>
          </div>
          <div className="ml-4 text-right">
            <div className="font-bold">{Math.round(item.toxicScore * 100)}%</div>
            <div className="text-xs text-muted-foreground">toxicity</div>
          </div>
        </div>
      ))}
    </div>
  );
}
