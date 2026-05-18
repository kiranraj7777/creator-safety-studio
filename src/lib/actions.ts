"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./db/prisma";
import { moderate, moderateAsync, moderateBatch } from "./moderation/engine";
import { hashAuthorHandle, encrypt, decrypt } from "./hash";
import { revalidatePath } from "next/cache";
import { z } from "zod";

function requireAuth() {
  return getServerSession(authOptions);
}

const moderateSchema = z.object({
  text: z.string().min(1).max(5000),
});

export async function moderateComment(formData: FormData) {
  const session = await requireAuth();
  if (!session?.user) throw new Error("Unauthorized");

  const text = formData.get("text") as string;
  const parsed = moderateSchema.parse({ text });
  const result = await moderateAsync(parsed.text);
  revalidatePath("/dashboard");
  return result;
}

export async function moderateCommentText(text: string) {
  const session = await requireAuth();
  if (!session?.user) throw new Error("Unauthorized");
  return moderateAsync(text);
}

const evidenceSchema = z.object({
  platform: z.enum(["youtube", "instagram", "facebook"]),
  videoId: z.string().min(1),
  authorHandleHash: z.string().optional(),
});

export async function generateEvidenceAction(formData: FormData) {
  const session = await requireAuth();
  if (!session?.user) throw new Error("Unauthorized");
  const userId = (session.user as any).id;

  const platform = formData.get("platform") as string;
  const videoId = formData.get("videoId") as string;
  const authorHandleHash = formData.get("authorHandleHash") as string | undefined;

  const parsed = evidenceSchema.parse({ platform, videoId, authorHandleHash });

  const connectedPlatforms = await prisma.connectedPlatform.findMany({
    where: { userId, platform: parsed.platform, status: "ACTIVE" },
    select: { id: true },
  });
  const platformIds = connectedPlatforms.map((p) => p.id);

  const where: any = {
    connectedPlatformId: { in: platformIds },
    riskLabel: { in: ["medium", "high"] },
  };
  if (parsed.authorHandleHash) {
    where.authorHandleHash = parsed.authorHandleHash;
  } else {
    where.videoId = parsed.videoId;
  }

  const comments = await prisma.comment.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: {
      createdAt: true,
      authorHandleHash: true,
      authorDisplayNameEnc: true,
      commentTextRaw: true,
      commentTextNormalized: true,
      toxicScore: true,
      matchedPhrases: true,
      commentId: true,
      videoId: true,
    },
  });

  const platformUrls: Record<string, (v: string, c?: string) => string> = {
    youtube: (v, c) => `https://www.youtube.com/watch?v=${v}${c ? `&lc=${c}` : ""}`,
    instagram: (v) => `https://www.instagram.com/p/${v}/`,
    facebook: (v) => `https://www.facebook.com/${v}`,
  };
  const makeUrl = platformUrls[parsed.platform] || (() => "");

  const items = comments.map((c) => {
    let displayName = "[Anonymous]";
    try {
      if (c.authorDisplayNameEnc) displayName = decrypt(c.authorDisplayNameEnc);
    } catch {}
    return {
      timestamp: c.createdAt.toISOString(),
      authorDisplayName: displayName,
      authorHandleHash: c.authorHandleHash,
      commentText: c.commentTextRaw || c.commentTextNormalized || "[Purged]",
      toxicScore: c.toxicScore,
      matchedPhrases: JSON.parse(c.matchedPhrases || "[]"),
      platformLink: makeUrl(c.videoId || parsed.videoId, c.commentId),
    };
  });

  const flaggedWords = [...new Set(items.flatMap((i) => i.matchedPhrases as string[]))];

  const markdown = generateMarkdown(parsed.platform, parsed.videoId, items, flaggedWords);
  const reportText = generateReportText(parsed.platform, parsed.videoId, items, flaggedWords);

  const pack = await prisma.evidencePack.create({
    data: {
      userId,
      platform: parsed.platform,
      videoId: parsed.videoId,
      videoUrl: makeUrl(parsed.videoId),
      title: `Evidence Pack: ${parsed.videoId}`,
      markdown,
      jsonExport: JSON.stringify(items),
      reportText,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "EVIDENCE_GENERATED",
      target: `evidence:${pack.id}`,
      details: JSON.stringify({ platform: parsed.platform, videoId: parsed.videoId, items: items.length }),
    },
  });

  revalidatePath("/evidence");
  return { success: true, packId: pack.id };
}

function generateMarkdown(platform: string, videoId: string, items: any[], flaggedWords: string[] = []): string {
  const lines = [
    `# Evidence Pack`,
    ``,
    `- **Platform:** ${platform}`,
    `- **Video/Media ID:** ${videoId}`,
    `- **Generated:** ${new Date().toISOString()}`,
    `- **Total Items:** ${items.length}`,
    ``,
    flaggedWords.length > 0 ? `## Flagged Words / Phrases Detected\n${flaggedWords.map((w) => `- \`${w}\``).join("\n")}\n` : "",
    `---`,
    ``,
    ...items.map((item, idx) => [
      `### Item ${idx + 1}`,
      `- **Author:** ${item.authorDisplayName || "Anonymous"}`,
      `- **Timestamp:** ${item.timestamp}`,
      `- **Toxicity Score:** ${Math.round(item.toxicScore * 100)}%`,
      item.matchedPhrases.length > 0 ? `- **Matched Phrases:** ${item.matchedPhrases.join(", ")}` : "",
      item.platformLink ? `- **Link:** ${item.platformLink}` : "",
      ``,
      `> ${item.commentText}`,
      ``,
    ].filter(Boolean)),
    `---`,
    ``,
    `*This report was generated by Creator Safety Studio for manual platform reporting.*`,
  ];
  return lines.flat().join("\n");
}

function generateReportText(platform: string, videoId: string, items: any[], flaggedWords: string[] = []): string {
  const now = new Date().toLocaleString();
  const header = [
    `CREATOR SAFETY STUDIO - EVIDENCE REPORT`,
    `=========================================`,
    `Platform: ${platform}`,
    `Video: ${videoId}`,
    `Generated: ${now}`,
    `Flagged Comments: ${items.length}`,
    ``,
    flaggedWords.length > 0 ? [
      `FLAGGED WORDS / PHRASES:`,
      flaggedWords.map((w) => `  - ${w}`).join("\n"),
      ``,
    ].join("\n") : "",
    `-----------------------------------------`,
    ``,
  ].join("\n");

  const body = items.map((item, i) => {
    const phrases = (item.matchedPhrases as string[]).length > 0
      ? ` [TOXIC WORDS: ${(item.matchedPhrases as string[]).join(", ")}]`
      : "";
    return [
      `${i + 1}. Author: ${item.authorDisplayName || "Anonymous"}${phrases}`,
      `   Score: ${Math.round(item.toxicScore * 100)}%`,
      `   Date: ${item.timestamp}`,
      `   Comment: "${item.commentText}"`,
      item.platformLink ? `   Link: ${item.platformLink}` : "",
      ``,
    ].join("\n");
  }).join("\n");

  return header + body + "\n=========================================\nReport generated by Creator Safety Studio\n";
}

export async function updateSettingsAction(formData: FormData) {
  const session = await requireAuth();
  if (!session?.user) throw new Error("Unauthorized");

  const flagThreshold = formData.get("flagThreshold");
  const retentionDays = formData.get("retentionDays");

  if (flagThreshold) {
    await prisma.systemSetting.upsert({
      where: { key: "flagging_threshold" },
      update: { value: String(Number(flagThreshold) / 100) },
      create: { key: "flagging_threshold", value: String(Number(flagThreshold) / 100) },
    });
  }
  if (retentionDays) {
    await prisma.systemSetting.upsert({
      where: { key: "retention_days" },
      update: { value: String(Number(retentionDays)) },
      create: { key: "retention_days", value: String(Number(retentionDays)) },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      action: "SETTINGS_UPDATED",
      details: JSON.stringify({ flagThreshold, retentionDays }),
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function deleteSubjectData(formData: FormData) {
  const session = await requireAuth();
  if (!session?.user) throw new Error("Unauthorized");

  const authorHandleHash = formData.get("authorHandleHash") as string;
  if (!authorHandleHash || authorHandleHash.length < 10) throw new Error("Invalid hash");

  const result = await prisma.comment.updateMany({
    where: { authorHandleHash },
    data: {
      commentTextRaw: null,
      commentTextNormalized: null,
      isRetained: false,
      purgedAt: new Date(),
    },
  });

  await prisma.deletionRequest.create({
    data: {
      userId: (session.user as any).id,
      authorHandleHash,
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      action: "SUBJECT_DATA_DELETED",
      target: authorHandleHash,
      details: JSON.stringify({ commentsAffected: result.count }),
    },
  });

  revalidatePath("/settings");
  return { success: true, commentsAffected: result.count };
}

export async function addDictionaryTermAction(formData: FormData) {
  const session = await requireAuth();
  if (!session?.user) throw new Error("Unauthorized");

  const term = formData.get("term") as string;
  const language = formData.get("language") as string;
  const category = formData.get("category") as string;
  const severity = Number(formData.get("severity"));

  if (!term || !language || !category) throw new Error("Missing required fields");

  await prisma.dictionaryTerm.upsert({
    where: { term_language: { term, language } },
    update: { category, severity, active: true },
    create: { term, language, category, severity, active: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      action: "DICTIONARY_TERM_ADDED",
      target: term,
      details: JSON.stringify({ language, category, severity }),
    },
  });

  revalidatePath("/settings");
  return { success: true };
}
