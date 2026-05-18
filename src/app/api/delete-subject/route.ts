import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const schema = z.object({
  authorHandleHash: z.string().min(10),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { authorHandleHash } = schema.parse(body);

    const commentsResult = await prisma.comment.updateMany({
      where: { authorHandleHash },
      data: { commentTextRaw: null, commentTextNormalized: null, isRetained: false, purgedAt: new Date() },
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
        details: JSON.stringify({ commentsAffected: commentsResult.count }),
      },
    });

    return NextResponse.json({ success: true, commentsAffected: commentsResult.count });
  } catch (error) {
    console.error("Delete subject error:", error);
    return NextResponse.json({ error: "Failed to delete subject data" }, { status: 400 });
  }
}
