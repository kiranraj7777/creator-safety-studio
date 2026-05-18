import { getDashboardStats } from "@/lib/db/data-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, MessageSquare, ShieldCheck } from "lucide-react";
import { AbuseTicker } from "@/components/dashboard/abuse-ticker";
import { SafetyScoreChart } from "@/components/dashboard/safety-chart";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface DailyStat {
  createdAt: Date;
  _count: { id: number };
  _avg: { toxicScore: number | null };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id || "";
  const stats = await getDashboardStats(userId);

  const noData = stats.totalComments === 0;

  const safetyScore =
    stats.totalComments > 0
      ? Math.round(((stats.totalComments - stats.flaggedComments) / stats.totalComments) * 100)
      : 100;

  const chartData: DailyStat[] = stats.dailyStats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Monitor your comment safety across all connected platforms.</p>
      </div>

      {noData && (
        <Card className="border-dashed border-2">
          <CardContent className="py-8 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h2 className="mt-4 text-xl font-semibold">No data yet</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Connect a YouTube channel in <strong>Settings</strong> and sync your comments to see your dashboard populated with your own data only.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalComments}</div>
            <p className="text-xs text-muted-foreground">All time ingested</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.flaggedComments}</div>
            <p className="text-xs text-muted-foreground">Medium or high risk</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High-Risk Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.highRiskUsers}</div>
            <p className="text-xs text-muted-foreground">In your channels only</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Safety Score</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safetyScore}%</div>
            <p className="text-xs text-muted-foreground">Based on clean ratio</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader><CardTitle>Safety Trend</CardTitle></CardHeader>
          <CardContent><SafetyScoreChart data={chartData} /></CardContent>
        </Card>
        <Card className="col-span-1">
          <CardHeader><CardTitle>Recent Flagged Comments</CardTitle></CardHeader>
          <CardContent><AbuseTicker items={stats.recentComments} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
