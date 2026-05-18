"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

interface DailyStat {
  createdAt: Date;
  _count?: { id: number };
  _avg?: { toxicScore: number | null };
  created_date?: Date;
  comment_count?: number;
  avg_toxicity?: number | null;
}

export function SafetyScoreChart({ data }: { data: DailyStat[] }) {
  const chartData = data.map((d) => ({
    date: format(new Date(d.createdAt || d.created_date!), "MMM dd"),
    comments: d._count?.id || d.comment_count || 0,
    avgToxicity: Math.round(((d._avg?.toxicScore || d.avg_toxicity) || 0) * 100),
  }));

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
        No data available yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="comments"
          stroke="#8884d8"
          fillOpacity={1}
          fill="url(#colorComments)"
          name="Comments"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
