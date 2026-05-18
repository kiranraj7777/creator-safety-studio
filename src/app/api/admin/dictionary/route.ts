import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { loadDictionaryFromDB } from "@/lib/moderation/dictionaries";
import { z } from "zod";

const termSchema = z.object({
  term: z.string().min(1),
  language: z.string(),
  category: z.string(),
  severity: z.number().min(0).max(1),
  isRegex: z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const terms = await prisma.dictionaryTerm.findMany({
    where: { active: true },
    orderBy: [{ language: "asc" }, { term: "asc" }],
  });
  return NextResponse.json({ terms });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = termSchema.parse(body);

    const term = await prisma.dictionaryTerm.upsert({
      where: { term_language: { term: parsed.term, language: parsed.language } },
      update: { category: parsed.category, severity: parsed.severity, isRegex: parsed.isRegex ?? false, active: true },
      create: { ...parsed, isRegex: parsed.isRegex ?? false, active: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "DICTIONARY_TERM_UPSERTED",
        target: parsed.term,
        details: JSON.stringify({ language: parsed.language, category: parsed.category, severity: parsed.severity }),
      },
    });

    await loadDictionaryFromDB();

    return NextResponse.json({ success: true, term }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Invalid term data" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const term = req.nextUrl.searchParams.get("term");
  const language = req.nextUrl.searchParams.get("language");
  if (!term || !language) return NextResponse.json({ error: "term and language required" }, { status: 400 });

  await prisma.dictionaryTerm.update({
    where: { term_language: { term, language } },
    data: { active: false },
  });

  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      action: "DICTIONARY_TERM_DEACTIVATED",
      target: term,
      details: JSON.stringify({ language }),
    },
  });

  await loadDictionaryFromDB();

  return NextResponse.json({ success: true });
}
