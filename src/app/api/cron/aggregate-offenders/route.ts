import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST() {
  try {
    const hashes = await prisma.comment.groupBy({
      by: ["authorHandleHash"],
      _count: { id: true },
    });

    let updated = 0;
    for (const group of hashes) {
      const hash = group.authorHandleHash;
      const comments = await prisma.comment.findMany({ where: { authorHandleHash: hash } });

      const uniqueVideos = new Set(comments.map((c) => c.videoId)).size;
      const totalComments = comments.length;
      const toxicComments = comments.filter((c) => c.riskLabel !== "low").length;
      const toxicityRatio = totalComments > 0 ? toxicComments / totalComments : 0;

      const keywordCounts: Record<string, number> = {};
      comments.forEach((c) => {
        let phrases: string[] = [];
        try { phrases = JSON.parse(c.matchedPhrases); } catch { phrases = []; }
        phrases.forEach((p) => (keywordCounts[p] = (keywordCounts[p] || 0) + 1));
      });
      const topKeywords = Object.entries(keywordCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);

      const textCounts: Record<string, number> = {};
      comments.forEach((c) => {
        const t = c.commentTextNormalized || "";
        if (t.length > 5) textCounts[t] = (textCounts[t] || 0) + 1;
      });

      let riskStatus: "low" | "medium" | "high" = "low";
      if (toxicityRatio >= 0.5 && uniqueVideos >= 2) riskStatus = "high";
      else if (toxicityRatio >= 0.3) riskStatus = "medium";

      await prisma.offenderRiskProfile.upsert({
        where: { authorHandleHash: hash },
        update: { uniqueVideos, totalComments, toxicComments, toxicityRatio, topKeywords: JSON.stringify(topKeywords), riskStatus, lastSeen: new Date() },
        create: { authorHandleHash: hash, uniqueVideos, totalComments, toxicComments, toxicityRatio, topKeywords: JSON.stringify(topKeywords), riskStatus },
      });
      updated++;
    }

    await prisma.auditLog.create({
      data: { action: "OFFENDER_AGGREGATION", target: "offender_risk_profiles", details: JSON.stringify({ profilesUpdated: updated }) },
    });

    return NextResponse.json({ success: true, profilesUpdated: updated });
  } catch (error) {
    console.error("Offender aggregation error:", error);
    return NextResponse.json({ success: false, error: "Aggregation failed" }, { status: 500 });
  }
}
