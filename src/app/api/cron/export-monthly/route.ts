import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const comments = await prisma.comment.findMany({
      where: { ingestedAt: { gte: thirtyDaysAgo } },
      select: {
        platform: true,
        videoId: true,
        toxicScore: true,
        riskLabel: true,
        matchedPhrases: true,
        confidence: true,
        ingestedAt: true,
        authorHandleHash: true,
      },
    });

    const summary = {
      exportedAt: new Date().toISOString(),
      period: { from: thirtyDaysAgo.toISOString(), to: new Date().toISOString() },
      totalComments: comments.length,
      flaggedComments: comments.filter((c) => c.riskLabel !== "low").length,
      platformBreakdown: comments.reduce<Record<string, number>>((acc, c) => {
        acc[c.platform] = (acc[c.platform] || 0) + 1;
        return acc;
      }, {}),
    };

    await prisma.auditLog.create({
      data: { action: "MONTHLY_EXPORT", target: "comments", details: JSON.stringify(summary) },
    });

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("Monthly export error:", error);
    return NextResponse.json({ success: false, error: "Export failed" }, { status: 500 });
  }
}
