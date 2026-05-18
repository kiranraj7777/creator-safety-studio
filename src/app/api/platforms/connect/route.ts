import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const connectSchema = z.object({
  platform: z.enum(["youtube", "instagram", "facebook"]),
  accountId: z.string().min(1),
  accountName: z.string().optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = connectSchema.parse(body);

    const platform = await prisma.connectedPlatform.upsert({
      where: { userId_platform_accountId: { userId: (session.user as any).id, platform: parsed.platform, accountId: parsed.accountId } },
      update: {
        accountName: parsed.accountName,
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
        status: "ACTIVE",
        lastSyncAt: new Date(),
      },
      create: {
        userId: (session.user as any).id,
        platform: parsed.platform,
        accountId: parsed.accountId,
        accountName: parsed.accountName,
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
        status: "ACTIVE",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "PLATFORM_CONNECTED",
        target: `${parsed.platform}:${parsed.accountId}`,
      },
    });

    return NextResponse.json({ success: true, platform }, { status: 201 });
  } catch (error) {
    console.error("Platform connect error:", error);
    return NextResponse.json({ error: "Failed to connect platform" }, { status: 400 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const platforms = await prisma.connectedPlatform.findMany({
    where: { userId: (session.user as any).id, status: "ACTIVE" },
    select: { id: true, platform: true, accountId: true, accountName: true, status: true, lastSyncAt: true, expiresAt: true, createdAt: true },
  });

  return NextResponse.json({ platforms });
}
