import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST() {
  try {
    const now = new Date();
    const expiredComments = await prisma.comment.findMany({
      where: { evidenceExpiresAt: { lt: now }, isRetained: true },
      select: { id: true },
    });
    const ids = expiredComments.map((c) => c.id);

    if (ids.length > 0) {
      await prisma.comment.updateMany({
        where: { id: { in: ids } },
        data: { commentTextRaw: null, commentTextNormalized: null, isRetained: false, purgedAt: now },
      });
    }

    await prisma.auditLog.create({
      data: { action: "RETENTION_PURGE", target: "comments", details: JSON.stringify({ count: ids.length }) },
    });

    return NextResponse.json({ success: true, purgedCount: ids.length });
  } catch (error) {
    console.error("Retention purge error:", error);
    return NextResponse.json({ success: false, error: "Purge failed" }, { status: 500 });
  }
}
