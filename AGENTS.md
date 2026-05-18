# Creator Safety Studio — Session Summary

## Current State
- Next.js 14 App Router project with shadcn/ui, Prisma + Supabase Postgres, NextAuth v4
- Google OAuth + Demo provider both working
- YouTube Data API v3 integration with Settings page (connect/edit/disconnect/sync)
- Groq AI (free LLaMA 3.3 70B) integrated (optional, falls back gracefully)
- Dictionary auto-loads from DB into in-memory engine
- Three-stage moderation pipeline: normalizer → dictionary matcher → scorer
- HMAC-SHA256 hashing + AES-256-GCM encryption
- 30/30 tests pass, `npx next build` succeeds

## Recent Changes (this session)
- **Groq AI replaces Perspective API**: Created `src/lib/moderation/groq.ts` using free LLaMA 3.3 70B. Prompt engineered for Tamil/Tanglish/English toxicity. Falls back gracefully to dictionary-only if missing.
- **Vercel deployment**: Live at https://creator-safety-studio.vercel.app. Added `vercel-build` script for Prisma generate. All env vars set.
- **BLOCKER**: Supabase only supports IPv6. Vercel can't reach it. Pooler also doesn't recognize project. Fix: migrate to Neon.tech (free) tomorrow. Create account at neon.tech → get connection string → update Vercel DATABASE_URL → deploy.
- **Google OAuth**: New client created (ID: 1096370763692-...). Redirect URI + test user added. Login works if DB connects.
- **Dashboard data isolation**: Only shows data from the logged-in user's ACTIVE connected platforms
  - `getDashboardStats()` now filters by `status: "ACTIVE"` on `ConnectedPlatform`
  - `getVideos()` also filters by `status: "ACTIVE"`
  - `highRiskUsers` count scoped to only offenders found in the current user's comments (no global leak)
  - Added "No data yet" empty state card when no comments ingested
- **Evidence & Export overhaul**: No more hash codes in report output
  - Evidence API (`/api/evidence/route.ts`): Added auth check, scoped to user's ACTIVE platforms, decrypts `authorDisplayNameEnc` to show real commenter names (not hashes), highlights toxic words/phrases prominently in report, fixed `userId: "system"` bug
  - Evidence page: Shows toxic words as red badges, flagged comments with author name, toxic words, score, and comment text; auto-generates evidence pack when navigating from Videos page via `?hash=` parameter
  - Export API (`/api/export/route.ts`): Includes decrypted author names, actual comment text, and matched phrases; CSV properly escapes fields
  - Server action (`actions.ts`): Same evidence improvements for server-side generation
- Installed Rust 1.95.0, CMake 4.3.2, LLVM 22.1.5 (for future opencode-voice build)
- Installed Playwright Chromium (headless browser automation available)

## Voice Input
- **Windows+H** voice typing (built into Windows 11) — press Win+H anywhere to dictate. Works in opencode's terminal.

## Known Issues
- Groq free API has rate limits (30 req/min on free tier) — app runs in dictionary-only fallback mode after timeout

## Build & Test
- Build: `npx next build` — zero errors
- Tests: `npx jest --config tests/jest.config.js` — 30/30 passing
- Dev: `npx next dev -p 3000`
