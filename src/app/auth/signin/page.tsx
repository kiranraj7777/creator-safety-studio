"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, PlayCircle } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign in to access your Creator Safety Studio dashboard.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true" && (
            <Button
              className="w-full"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            >
              Sign in with Google
            </Button>
          )}
          <Button
            className="w-full"
            variant="secondary"
            onClick={() =>
              signIn("demo", {
                email: "demo@creator.studio",
                callbackUrl: "/dashboard",
              })
            }
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Launch Demo Mode
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Demo mode creates a local account for testing. No real credentials needed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
