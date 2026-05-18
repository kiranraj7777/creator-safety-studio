"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, AlertCircle } from "lucide-react";
import Link from "next/link";

const errorMessages: Record<string, string> = {
  Signin: "The sign-in link was invalid or has expired.",
  OAuthSignin: "There was a problem signing in with the OAuth provider.",
  OAuthCallback: "The OAuth provider denied this request.",
  OAuthCreateAccount: "Could not create an account with this provider.",
  EmailCreateAccount: "Could not create an account with this email.",
  Callback: "There was a problem completing the sign-in callback.",
  OAuthAccountNotLinked: "This account is already linked to another sign-in method.",
  EmailSignin: "The email sign-in link was invalid.",
  CredentialsSignin: "Your sign-in details could not be verified.",
  default: "An unexpected authentication error occurred.",
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <CardTitle className="text-2xl">Authentication Error</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          {error ? errorMessages[error] || errorMessages.default : errorMessages.default}
        </p>
        <Button asChild>
          <Link href="/auth/signin">
            <Shield className="mr-2 h-4 w-4" />
            Try signing in again
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Authentication Error</CardTitle>
          </CardHeader>
        </Card>
      }>
        <ErrorContent />
      </Suspense>
    </div>
  );
}
