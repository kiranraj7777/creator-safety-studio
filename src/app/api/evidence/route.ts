import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/hash";
import { z } from "zod";

const evidenceSchema = z.object({
  platform: z.enum(["youtube", "instagram", "facebook"]),
  videoId: z.string(),
  authorHandleHash: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  try {
    const body = await req.json();
    const parsed = evidenceSchema.parse(body);

    const connectedPlatforms = await prisma.connectedPlatform.findMany({
      where: { userId, platform: parsed.platform, status: "ACTIVE" },
      select: { id: true },
    });
    const platformIds = connectedPlatforms.map((p) => p.id);
    if (platformIds.length === 0) {
      return NextResponse.json({ success: false, error: "No connected platform found" }, { status: 400 });
    }

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
        platformLink: parsed.authorHandleHash ? "" : makeUrl(c.videoId || parsed.videoId, c.commentId),
      };
    });

    const flaggedWords = [...new Set(items.flatMap((i) => i.matchedPhrases as string[]))];

    const title = parsed.authorHandleHash
      ? `Repeat Offender Report`
      : `Evidence Pack: ${parsed.videoId}`;

    const markdown = generateMarkdown(parsed.platform, parsed.authorHandleHash || parsed.videoId, items, flaggedWords);
    const reportText = generateReportText(parsed.platform, parsed.authorHandleHash || parsed.videoId, items, flaggedWords);

    const pack = await prisma.evidencePack.create({
      data: {
        userId,
        platform: parsed.platform,
        videoId: parsed.authorHandleHash || parsed.videoId,
        videoUrl: parsed.authorHandleHash ? "" : makeUrl(parsed.videoId),
        title,
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

    return NextResponse.json({ success: true, pack }, { status: 201 });
  } catch (error) {
    console.error("Evidence generation error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate evidence" }, { status: 400 });
  }
}

function generateMarkdown(platform: string, videoId: string, items: any[], flaggedWords: string[]): string {
  const lines = [
    `# Evidence Pack for Platform Reporting`,
    ``,
    `- **Platform:** ${platform}`,
    `- **Video/Media ID:** ${videoId}`,
    `- **Generated:** ${new Date().toISOString()}`,
    `- **Total Flagged Comments:** ${items.length}`,
    ``,
    flaggedWords.length > 0 ? `## Flagged Words / Phrases Detected\n${flaggedWords.map((w) => `- \`${w}\``).join("\n")}\n` : "",
    `---`,
    ``,
    ...items.map((item, idx) => [
      `### Item ${idx + 1}`,
      `- **Author:** ${item.authorDisplayName}`,
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

function generateReportText(platform: string, videoId: string, items: any[], flaggedWords: string[]): string {
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
      `${i + 1}. Author: ${item.authorDisplayName}${phrases}`,
      `   Score: ${Math.round(item.toxicScore * 100)}%`,
      `   Date: ${item.timestamp}`,
      `   Comment: "${item.commentText}"`,
      item.platformLink ? `   Link: ${item.platformLink}` : "",
      ``,
    ].join("\n");
  }).join("\n");

  return header + body + "\n=========================================\nReport generated by Creator Safety Studio\n";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  try {
    const packs = await prisma.evidencePack.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ packs });
  } catch (error) {
    console.error("Evidence fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch evidence" }, { status: 500 });
  }
}
