import { prisma } from "./prisma";

export async function getDashboardStats(userId: string) {
  const connectedPlatforms = await prisma.connectedPlatform.findMany({
    where: { userId, status: "ACTIVE" },
    select: { id: true },
  });
  const platformIds = connectedPlatforms.map((p) => p.id);

  const totalComments = await prisma.comment.count({
    where: { connectedPlatformId: { in: platformIds } },
  });
  const flaggedComments = await prisma.comment.count({
    where: {
      connectedPlatformId: { in: platformIds },
      riskLabel: { in: ["medium", "high"] },
    },
  });

  const userAuthorHashes = platformIds.length > 0
    ? (await prisma.comment.findMany({
        where: { connectedPlatformId: { in: platformIds } },
        select: { authorHandleHash: true },
        distinct: ["authorHandleHash"],
      })).map(c => c.authorHandleHash)
    : [];

  const highRiskUsers = await prisma.offenderRiskProfile.count({
    where: { riskStatus: "high", authorHandleHash: { in: userAuthorHashes } },
  });

  const recentComments = (await prisma.comment.findMany({
    where: {
      connectedPlatformId: { in: platformIds },
      riskLabel: { in: ["medium", "high"] },
    },
    orderBy: { ingestedAt: "desc" },
    take: 10,
    select: {
      id: true,
      platform: true,
      riskLabel: true,
      toxicScore: true,
      commentTextNormalized: true,
      ingestedAt: true,
      videoId: true,
    },
  })).map(c => ({ ...c, platform: c.platform as "youtube" | "instagram" | "facebook", riskLabel: c.riskLabel as "low" | "medium" | "high" }));

  interface DailyStatRow {
    created_date: Date;
    comment_count: bigint;
    avg_toxicity: number | null;
  }

  const startDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  
  const rawStats = await prisma.$queryRawUnsafe<DailyStatRow[]>(
    `SELECT 
      DATE(created_at AT TIME ZONE 'UTC') as created_date,
      COUNT(*) as comment_count,
      AVG(toxic_score)::float8 as avg_toxicity
    FROM "Comment"
    WHERE connected_platform_id = ANY($1)
      AND created_at >= $2
    GROUP BY DATE(created_at AT TIME ZONE 'UTC')
    ORDER BY created_date ASC`,
    platformIds,
    startDate
  );

  const dailyStats = rawStats.map(r => ({
    createdAt: r.created_date,
    _count: { id: Number(r.comment_count) },
    _avg: { toxicScore: r.avg_toxicity },
  }));

  const safetyScore =
    totalComments > 0
      ? Math.round(
          ((totalComments - flaggedComments) / totalComments) * 100
        )
      : 100;

  return { totalComments, flaggedComments, highRiskUsers, safetyScore, recentComments, dailyStats };
}

export async function getOffenders() {
  return prisma.offenderRiskProfile.findMany({
    orderBy: [{ riskStatus: "desc" }, { toxicityRatio: "desc" }],
    take: 50,
  });
}

export async function getVideos(userId: string) {
  const connectedPlatforms = await prisma.connectedPlatform.findMany({
    where: { userId, status: "ACTIVE" },
    select: { id: true, platform: true },
  });
  const platformIds = connectedPlatforms.map((p) => p.id);

  const comments = await prisma.comment.findMany({
    where: { connectedPlatformId: { in: platformIds } },
    select: {
      videoId: true,
      platform: true,
      riskLabel: true,
      toxicScore: true,
      commentTextNormalized: true,
      ingestedAt: true,
    },
    orderBy: { ingestedAt: "desc" },
  });

  const videoMap = new Map<string, {
    videoId: string;
    platform: string;
    total: number;
    flagged: number;
    avgToxicity: number;
    lastCommentAt: Date;
    topComment: string;
  }>();
  for (const c of comments) {
    const existing = videoMap.get(c.videoId);
    if (existing) {
      existing.total += 1;
      if (c.riskLabel !== "low") {
        existing.flagged += 1;
        if (!existing.topComment) existing.topComment = c.commentTextNormalized || "";
      }
      existing.avgToxicity += c.toxicScore;
    } else {
      videoMap.set(c.videoId, {
        videoId: c.videoId,
        platform: c.platform,
        total: 1,
        flagged: c.riskLabel !== "low" ? 1 : 0,
        avgToxicity: c.toxicScore,
        lastCommentAt: c.ingestedAt,
        topComment: c.riskLabel !== "low" ? (c.commentTextNormalized || "") : "",
      });
    }
  }

  return Array.from(videoMap.values()).map((v) => ({
    ...v,
    avgToxicity: v.total > 0 ? v.avgToxicity / v.total : 0,
  }));
}

export async function getEvidencePacks(userId: string) {
  return prisma.evidencePack.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function createAuditLog(params: { userId?: string; action: string; target?: string; details?: Record<string, unknown> }) {
  return prisma.auditLog.create({
    data: { ...params, details: params.details ? JSON.stringify(params.details) : undefined } as any,
  });
}

export async function getSystemSetting(key: string) {
  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

export async function upsertSystemSetting(key: string, value: unknown, description?: string) {
  return prisma.systemSetting.upsert({
    where: { key },
    update: { value: value as any },
    create: { key, value: value as any, description },
  });
}

export async function getDictionaryTerms(language?: string) {
  const where = language ? { language, active: true } : { active: true };
  return prisma.dictionaryTerm.findMany({ where, orderBy: [{ language: "asc" }, { term: "asc" }] });
}

export async function upsertDictionaryTerm(data: { term: string; language: string; category: string; severity: number; isRegex?: boolean }) {
  return prisma.dictionaryTerm.upsert({
    where: { term_language: { term: data.term, language: data.language } },
    update: data,
    create: { ...data, active: true },
  });
}
