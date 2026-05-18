import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, MessageSquare, BarChart3, FileCheck } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b px-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">Creator Safety Studio</span>
        </div>
        <div>
          <Button asChild>
            <Link href="/api/auth/signin">Get Started</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-6 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Protect your creative space.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Monitor comments, detect repeat offenders, and generate evidence packs
            for manual reporting—across YouTube, Instagram, and Facebook.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/api/auth/signin">Sign in with Google</Link>
            </Button>
          </div>
        </section>

        <section className="container mx-auto px-6 py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
              <MessageSquare className="h-10 w-10 text-primary" />
              <h3 className="mt-4 text-xl font-semibold">Comment Monitoring</h3>
              <p className="mt-2 text-muted-foreground">
                Ingest and score comments in real time using a local moderation engine
                with support for English, Tamil, and Tanglish patterns.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
              <BarChart3 className="h-10 w-10 text-primary" />
              <h3 className="mt-4 text-xl font-semibold">Repeat Offender Detection</h3>
              <p className="mt-2 text-muted-foreground">
                Identify users who spread toxicity across multiple videos with hashed
                privacy-safe tracking and risk scoring.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
              <FileCheck className="h-10 w-10 text-primary" />
              <h3 className="mt-4 text-xl font-semibold">Evidence Packs</h3>
              <p className="mt-2 text-muted-foreground">
                Generate formatted reports with timestamps, links, and toxic scores
                ready for manual platform reporting.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>Creator Safety Studio. Built for creator safety and comment moderation.</p>
      </footer>
    </div>
  );
}
