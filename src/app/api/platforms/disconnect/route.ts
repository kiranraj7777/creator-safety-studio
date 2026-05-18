import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { platformId } = await req.json();
  if (!platformId) return NextResponse.json({ error: "platformId required" }, { status: 400 });

  const platform = await prisma.connectedPlatform.findFirst({
    where: { id: platformId, userId: (session.user as any).id },
  });
  if (!platform) return NextResponse.json({ error: "Platform not found" }, { status: 404 });

  await prisma.connectedPlatform.update({
    where: { id: platformId },
    data: { status: "REVOKED", accessToken: null, refreshToken: null },
  });

  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      action: "PLATFORM_DISCONNECTED",
      target: `${platform.platform}:${platform.accountId}`,
    },
  });

  return NextResponse.json({ success: true });
}
