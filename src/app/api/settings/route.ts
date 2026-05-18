import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const settingsSchema = z.object({
  key: z.string(),
  value: z.any(),
});

export async function GET() {
  const settings = await prisma.systemSetting.findMany();
  const parsed = settings.map((s) => ({
    ...s,
    value: JSON.parse(s.value),
  }));
  return NextResponse.json({ settings: parsed });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = settingsSchema.parse(body);

    const setting = await prisma.systemSetting.upsert({
      where: { key: parsed.key },
      update: { value: JSON.stringify(parsed.value) },
      create: { key: parsed.key, value: JSON.stringify(parsed.value) },
    });

    return NextResponse.json({
      success: true,
      setting: { ...setting, value: JSON.parse(setting.value) },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Invalid setting" },
      { status: 400 }
    );
  }
}
