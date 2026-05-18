import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const offenders = await prisma.offenderRiskProfile.findMany({
      orderBy: [{ riskStatus: "desc" }, { toxicityRatio: "desc" }],
      take: 100,
    });
    return NextResponse.json({ offenders });
  } catch (error) {
    console.error("Offenders fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch offenders" },
      { status: 500 }
    );
  }
}
