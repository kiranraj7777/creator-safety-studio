/**
 * Database Seed Script
 * Run with: npx tsx scripts/seed.ts
 *
 * Seeds demo dictionary terms, system settings, and sample comments
 * for local development and testing.
 */

import { PrismaClient } from "@prisma/client";
import { moderate } from "../src/lib/moderation/engine";
import { hashAuthorHandle, encrypt } from "../src/lib/hash";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Seed dictionary terms
  const dictionaryTerms = [
    { term: "spam", language: "en", category: "spam", severity: 0.3, isRegex: false },
    { term: "scam link", language: "en", category: "fraud", severity: 0.6, isRegex: false },
    { term: "fake giveaway", language: "en", category: "fraud", severity: 0.5, isRegex: false },
    { term: "bot account", language: "en", category: "spam", severity: 0.3, isRegex: false },
    { term: "hate", language: "en", category: "harassment", severity: 0.7, isRegex: false },
    { term: "attack", language: "en", category: "harassment", severity: 0.6, isRegex: false },
    { term: "stupid", language: "en", category: "insult", severity: 0.4, isRegex: false },
    { term: "worst channel", language: "en", category: "insult", severity: 0.4, isRegex: false },
  ];

  for (const term of dictionaryTerms) {
    await prisma.dictionaryTerm.upsert({
      where: { term_language: { term: term.term, language: term.language } },
      update: {},
      create: term,
    });
  }
  console.log(`Seeded ${dictionaryTerms.length} dictionary terms.`);

  // Seed system settings
  await prisma.systemSetting.upsert({
    where: { key: "retention_days" },
    update: {},
    create: {
      key: "retention_days",
      value: JSON.stringify(30),
      description: "Days to retain raw comment text before purging",
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: "flagging_threshold" },
    update: {},
    create: {
      key: "flagging_threshold",
      value: JSON.stringify(0.5),
      description: "Toxicity score threshold for flagging comments",
    },
  });
  console.log("Seeded system settings.");

  // Seed sample comments for demo mode
  const sampleComments = [
    { platform: "youtube" as const, handle: "user_a", text: "Great video, thanks!", videoId: "demo_vid_1" },
    { platform: "youtube" as const, handle: "user_b", text: "This is spam, visit my scam link", videoId: "demo_vid_1" },
    { platform: "youtube" as const, handle: "user_b", text: "Fake giveaway here, totally scam", videoId: "demo_vid_2" },
    { platform: "youtube" as const, handle: "user_c", text: "I hate this content so much attack", videoId: "demo_vid_1" },
    { platform: "youtube" as const, handle: "user_c", text: "You are stupid and this is the worst channel", videoId: "demo_vid_3" },
    { platform: "instagram" as const, handle: "user_d", text: "Love the colors!", videoId: "demo_post_1" },
    { platform: "instagram" as const, handle: "user_b", text: "Another scam link in bio", videoId: "demo_post_1" },
  ];

  for (const sc of sampleComments) {
    const mod = moderate(sc.text);
    const hash = hashAuthorHandle(sc.handle);
    const enc = encrypt(sc.handle);
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.comment.create({
      data: {
        platform: sc.platform,
        connectedPlatformId: null,
        accountId: "demo_account",
        videoId: sc.videoId,
        commentId: `comment_${Math.random().toString(36).slice(2)}`,
        authorDisplayNameEnc: enc,
        authorHandleHash: hash,
        commentTextRaw: sc.text,
        commentTextNormalized: mod.languageDetected,
        languageDetected: mod.languageDetected,
        toxicScore: mod.toxicityScore,
        riskLabel: mod.riskLabel,
        matchedPhrases: JSON.stringify(mod.matchedPhrases),
        confidence: mod.confidence,
        reason: mod.reason,
        evidenceExpiresAt: expires,
      },
    });
  }
  console.log(`Seeded ${sampleComments.length} sample comments.`);

  // Recalculate offender profiles
  const hashes = Array.from(new Set(sampleComments.map((c) => hashAuthorHandle(c.handle))));
  for (const h of hashes) {
    const comments = await prisma.comment.findMany({
      where: { authorHandleHash: h },
    });
    const uniqueVideos = new Set(comments.map((c) => c.videoId)).size;
    const total = comments.length;
    const toxic = comments.filter((c) => c.riskLabel !== "low").length;
    const ratio = total > 0 ? toxic / total : 0;

    const kws: Record<string, number> = {};
    comments.forEach((c) => (JSON.parse(c.matchedPhrases) as string[]).forEach((p: string) => (kws[p] = (kws[p] || 0) + 1)));
    const topKeywords = Object.entries(kws)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => k);

    let riskStatus: "low" | "medium" | "high" = "low";
    if (ratio >= 0.5 && uniqueVideos >= 2) riskStatus = "high";
    else if (ratio >= 0.3) riskStatus = "medium";

    await prisma.offenderRiskProfile.upsert({
      where: { authorHandleHash: h },
      update: {
        uniqueVideos,
        totalComments: total,
        toxicComments: toxic,
        toxicityRatio: ratio,
        topKeywords: JSON.stringify(topKeywords),
        riskStatus,
        lastSeen: new Date(),
      },
      create: {
        authorHandleHash: h,
        uniqueVideos,
        totalComments: total,
        toxicComments: toxic,
        toxicityRatio: ratio,
        topKeywords: JSON.stringify(topKeywords),
        riskStatus,
      },
    });
  }
  console.log("Recalculated offender profiles.");

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
