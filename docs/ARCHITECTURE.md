# Creator Safety Studio - Architecture & Build Guide

## A. Architecture Overview

Creator Safety Studio is a Next.js 14 application using the App Router. It ingests comments from YouTube, Instagram, and Facebook via official APIs, scores them with a local moderation engine, and presents a creator-friendly dashboard.

**Key Design Principles:**
- **Privacy-first:** Author handles are hashed with HMAC-SHA256. Display names are encrypted separately.
- **No paid AI:** All moderation runs locally using deterministic rules and configurable dictionaries.
- **Modular:** The moderation pipeline is swappable. Replace `src/lib/moderation/engine.ts` with a local ML model later without changing the database schema.
- **Transparent:** Every comment stores its moderation reason, matched phrases, and confidence score.

**Data Flow:**
1. OAuth login (NextAuth + Google)
2. Platform connection (store tokens securely)
3. Comment ingestion (webhook or sync job)
4. Normalization -> Dictionary matching -> Scoring
5. Author profiling and offender aggregation
6. Dashboard display and evidence pack generation
7. Retention purge (daily cron)

## B. Folder Structure

```
├── prisma/
│   └── schema.prisma          # Database schema
├── scripts/
│   └── seed.ts                # Demo data seeding
├── src/
│   ├── app/
│   │   ├── api/               # Route handlers
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── comments/
│   │   │   ├── offenders/
│   │   │   ├── evidence/
│   │   │   ├── settings/
│   │   │   └── retention/
│   │   ├── auth/signin/
│   │   ├── dashboard/
│   │   ├── offenders/
│   │   ├── videos/
│   │   ├── evidence/
│   │   ├── settings/
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Landing page
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                # shadcn/ui components (Button, Card, Badge, etc.)
│   │   ├── dashboard/         # Sidebar, Shell, Charts, Ticker
│   │   ├── providers.tsx
│   ├── lib/
│   │   ├── moderation/        # Engine, normalizer, dictionaries
│   │   ├── db/prisma.ts       # Prisma client singleton
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── hash.ts            # HMAC + encryption utilities
│   │   └── utils.ts           # cn() and formatters
│   └── types/index.ts         # Shared TypeScript types
├── docs/
│   └── ARCHITECTURE.md
├── .env.example
├── components.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
└── package.json
```

## C. Database Schema

**Users & Auth:**
- `users` - NextAuth-managed users with roles (CREATOR, ADMIN)
- `accounts` - NextAuth OAuth account links
- `creator_profiles` - Extended profile info

**Platform Connections:**
- `connected_platform_tokens` - Stores OAuth tokens, sync status, expiry

**Comments Pipeline:**
- `comments` - Core normalized comment records with moderation scores
- `comment_terms` - Individual term matches per comment
- `author_profiles` - Encrypted display names + hashed handles

**Analytics & Risk:**
- `offender_risk_profiles` - Aggregated cross-video behavior per author hash

**Evidence & Compliance:**
- `evidence_packs` - Generated reports (markdown, JSON, text)
- `audit_logs` - Every destructive action logged
- `deletion_requests` - Data erasure workflow

**Configuration:**
- `dictionary_terms` - Editable abuse pattern dictionary
- `system_settings` - Retention thresholds, feature flags

**Indexes:**
- `comments.authorHandleHash` - For offender lookups
- `comments.videoId` - For video grouping
- `comments.riskLabel` - For dashboard filtering
- `comments.evidenceExpiresAt` - For retention purge
- `offender_risk_profiles.riskStatus` - For high-risk listings

## D. API Route List

| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | `/api/auth/[...nextauth]` | Authentication |
| POST | `/api/comments` | Ingest + moderate a comment |
| GET | `/api/comments` | List recent comments |
| GET | `/api/offenders` | List repeat offenders |
| POST | `/api/evidence` | Generate evidence pack |
| GET | `/api/evidence` | List evidence packs |
| GET | `/api/settings` | Get system settings |
| POST | `/api/settings` | Update setting |
| POST | `/api/retention` | Run daily purge job |

## E. Component List

**UI Primitives (shadcn/ui style):**
- Button, Card, Badge, Avatar, Slider, Tabs

**Dashboard Components:**
- Sidebar - Navigation with active state
- DashboardShell - Layout wrapper with sidebar + header
- DashboardHeader - Top bar with user avatar + sign out
- OverviewCards - Stat cards (comments, flagged, risk users, safety score)
- AbuseTicker - Live feed of latest flagged comments
- SafetyScoreChart - Recharts area chart of daily activity

## F. Moderation Logic

**Three-Stage Pipeline:**

1. **Normalization (Stage A):**
   - Lowercase, trim
   - Remove URLs, mentions, hashtags
   - Collapse repeated punctuation
   - Detect repeated characters (e.g., "sooooo")
   - Detect language: English, Tamil (Unicode range), or Tanglish (mixed)

2. **Dictionary Matching (Stage B):**
   - Exact substring matching against configurable term list
   - Variation generation for Tanglish (vowel substitutions, consonant swaps)
   - Regex support for pattern matching
   - Categories: spam, fraud, harassment, insult

3. **Scoring (Stage C):**
   - Sum severity of matched terms
   - Apply amplifiers (repeated chars +0.1)
   - Cap at 1.0
   - Confidence = 0.5 base + maxSeverity*0.4 + matchCount*0.05
   - Risk label: low (<0.4), medium (0.4-0.7), high (>0.7)

**Swappable Design:**
Replace `moderate()` in `engine.ts` with a call to a local ONNX/TensorFlow model. The return shape (`ModerationResult`) remains the same.

## G. Evidence Pack Format

Each pack contains:
- **Markdown summary** - Human-readable report with headers and comment blocks
- **Structured JSON** - Array of items with timestamps, hashes, scores, links
- **Copy-ready text** - Compact plain text format for pasting into report forms

Fields per item:
- timestamp (ISO 8601)
- hashedUserId (HMAC-SHA256, first 8 chars shown in preview)
- commentText (raw, with note if purged)
- toxicScore (0.0 - 1.0)
- matchedPhrases (array)
- platformLink (direct URL where possible)

## H. Retention Logic

**Automatic Purge:**
- Daily cron hits `POST /api/retention`
- Finds comments where `evidenceExpiresAt < now()`
- Sets `commentTextRaw = null`, `commentTextNormalized = null`
- Sets `isRetained = false`, `purgedAt = now()`
- Keeps forever: hashed user ID, scores, labels, keywords, timestamps

**Manual Erasure:**
- Creator/admins can request deletion by `authorHandleHash`
- Creates `DeletionRequest` record
- All comments for that hash are hard-deleted or anonymized
- Audit log entry created

**Configurable:**
- `DEFAULT_RETENTION_DAYS` env var (default 30)
- Admin slider can override per-creator (stored in system_settings)

## I. Deployment Steps

1. **Provision Supabase:**
   - Create project
   - Copy connection strings to `.env` (DATABASE_URL, DIRECT_URL)

2. **Configure Auth:**
   - Set up Google OAuth app
   - Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to `.env`
   - Set NEXTAUTH_SECRET to a random 32+ char string

3. **Install & Migrate:**
   ```bash
   npm install
   npx prisma generate
   npx prisma migrate dev --name init
   npm run db:seed
   ```

4. **Configure Environment:**
   - Set AUTHOR_HASH_SALT (random string, never change after first use)
   - Set ENCRYPTION_KEY (32 chars)
   - Set platform API keys for connectors (optional for MVP)

5. **Run Locally:**
   ```bash
   npm run dev
   ```

6. **Deploy to Vercel:**
   - Connect Git repo
   - Add all environment variables in Vercel dashboard
   - Add `vercel.json` cron if using Vercel Cron (daily retention job)

7. **Set up Cron:**
   - Option A: Vercel Cron calling `/api/retention`
   - Option B: GitHub Actions workflow hitting the same endpoint with a secure token

## J. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | Supabase pooled connection string |
| DIRECT_URL | Yes | Supabase direct connection for migrations |
| NEXTAUTH_URL | Yes | Base URL of the app |
| NEXTAUTH_SECRET | Yes | Random secret for JWT signing |
| GOOGLE_CLIENT_ID | Yes | OAuth client ID |
| GOOGLE_CLIENT_SECRET | Yes | OAuth client secret |
| YOUTUBE_API_KEY | No | For YouTube Data API sync |
| META_APP_ID | No | For Meta Graph API |
| META_APP_SECRET | No | For Meta Graph API |
| META_WEBHOOK_VERIFY_TOKEN | No | Meta webhook verification |
| AUTHOR_HASH_SALT | Yes | HMAC salt for author hashing |
| ENCRYPTION_KEY | Yes | 32-char key for display name encryption |
| DEFAULT_RETENTION_DAYS | No | Default retention (default: 30) |

## K. Acceptance Checklist

- [x] OAuth login works (Google)
- [x] Dashboard shows overview cards with real DB counts
- [x] Abuse ticker displays recent flagged comments
- [x] Charts render from database data
- [x] Comment ingestion API normalizes, scores, and stores comments
- [x] Author handles are hashed (not stored plain in analytics)
- [x] Display names are encrypted separately
- [x] Offender profiles aggregate cross-video behavior
- [x] Evidence packs generate markdown, JSON, and text
- [x] Retention purge removes raw text while keeping hashes/scores
- [x] Dictionary terms are seeded and editable (via API)
- [x] Settings page shows threshold slider and retention config
- [x] Responsive layout with sidebar navigation
- [x] Seed script creates demo data
- [x] All destructive actions have audit log entries
- [x] No paid AI APIs are called anywhere
- [x] No protected attributes are tracked

## L. Known Limitations

1. **Local Moderation Accuracy:** The current engine is rule-based. It will not match all forms of abuse, coded language, or novel harassment. Mark this as "needs legal review" if used for compliance purposes.

2. **Platform Connectors:** The MVP includes token storage schemas but full OAuth flows for YouTube, Instagram, and Facebook require individual developer app registrations and approval processes.

3. **Webhook Handling:** Meta webhooks require a public HTTPS endpoint with verification. Local development requires tunneling (e.g., ngrok).

4. **Encryption Key Management:** `ENCRYPTION_KEY` is env-based. Production should use a KMS or hardware security module.

5. **Scale:** The offender aggregation runs inline during ingestion. At very high comment volumes, this should be moved to a background queue (e.g., Inngest, QStash, or a message queue).

6. **No Automated Reporting:** The app only generates evidence for *manual* reporting. Platforms do not offer APIs for automated abuse reporting, and we do not attempt to provide that.

7. **Tamil/Tanglish Dictionaries:** Included dictionary is minimal (placeholders). A production deployment MUST populate comprehensive, culturally-informed dictionaries via the admin panel.

8. **Legal Disclaimer:** This tool is for moderation support and evidence organization. It is not surveillance software. All usage should comply with platform Terms of Service and local privacy laws. Mark as "needs legal review" for specific jurisdictions.
