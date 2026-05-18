"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Shield, BookOpen, Settings, BarChart3 } from "lucide-react";

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-bold">Admin Access Required</h2>
            <p className="text-sm text-muted-foreground mt-2">
              This area is restricted to administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Admin Panel</h1>
      <p className="text-muted-foreground">Manage dictionaries, settings, and system configuration.</p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => router.push("/admin/dictionary")}>
          <CardHeader>
            <BookOpen className="h-8 w-8 text-primary" />
            <CardTitle className="mt-2">Dictionary Editor</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Manage abuse detection patterns across English, Tamil, and Tanglish.</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => router.push("/settings")}>
          <CardHeader>
            <Settings className="h-8 w-8 text-primary" />
            <CardTitle className="mt-2">System Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Configure retention windows, thresholds, and platform connections.</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => router.push("/dashboard")}>
          <CardHeader>
            <BarChart3 className="h-8 w-8 text-primary" />
            <CardTitle className="mt-2">Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">View system-wide moderation analytics and export data.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
