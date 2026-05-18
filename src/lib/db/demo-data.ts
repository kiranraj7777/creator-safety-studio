export const demoDashboardStats = {
  totalComments: 847,
  flaggedComments: 163,
  highRiskUsers: 12,
  safetyScore: 81,
  recentComments: [
    {
      id: "demo-1",
      platform: "youtube" as const,
      riskLabel: "high" as const,
      toxicScore: 0.82,
      commentTextNormalized: "this is spam, visit my scam link",
      ingestedAt: new Date(Date.now() - 60000),
      videoId: "video_abc123",
    },
    {
      id: "demo-2",
      platform: "youtube" as const,
      riskLabel: "high" as const,
      toxicScore: 0.75,
      commentTextNormalized: "i hate this content so much attack",
      ingestedAt: new Date(Date.now() - 300000),
      videoId: "video_def456",
    },
    {
      id: "demo-3",
      platform: "instagram" as const,
      riskLabel: "medium" as const,
      toxicScore: 0.55,
      commentTextNormalized: "another scam link in bio",
      ingestedAt: new Date(Date.now() - 900000),
      videoId: "post_789",
    },
    {
      id: "demo-4",
      platform: "youtube" as const,
      riskLabel: "medium" as const,
      toxicScore: 0.48,
      commentTextNormalized: "you are stupid and this is the worst channel",
      ingestedAt: new Date(Date.now() - 1800000),
      videoId: "video_ghi789",
    },
    {
      id: "demo-5",
      platform: "youtube" as const,
      riskLabel: "high" as const,
      toxicScore: 0.91,
      commentTextNormalized: "fake giveaway here totally scam",
      ingestedAt: new Date(Date.now() - 3600000),
      videoId: "video_def456",
    },
  ],
  dailyStats: Array.from({ length: 14 }, (_, i) => ({
    createdAt: new Date(Date.now() - (13 - i) * 86400000),
    _count: { id: Math.floor(Math.random() * 40) + 10 },
    _avg: { toxicScore: Math.random() * 0.3 },
  })),
};

export const demoOffenders = [
  {
    id: "off-1",
    authorHandleHash: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
    uniqueVideos: 5,
    totalComments: 23,
    toxicComments: 18,
    toxicityRatio: 0.78,
    firstSeen: new Date(Date.now() - 30 * 86400000),
    lastSeen: new Date(),
    topKeywords: ["spam", "scam link", "fake giveaway"],
    riskStatus: "high" as const,
  },
  {
    id: "off-2",
    authorHandleHash: "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    uniqueVideos: 3,
    totalComments: 12,
    toxicComments: 8,
    toxicityRatio: 0.67,
    firstSeen: new Date(Date.now() - 14 * 86400000),
    lastSeen: new Date(Date.now() - 3600000),
    topKeywords: ["hate", "attack", "stupid"],
    riskStatus: "high" as const,
  },
  {
    id: "off-3",
    authorHandleHash: "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
    uniqueVideos: 2,
    totalComments: 7,
    toxicComments: 4,
    toxicityRatio: 0.57,
    firstSeen: new Date(Date.now() - 7 * 86400000),
    lastSeen: new Date(Date.now() - 7200000),
    topKeywords: ["spam", "scam link"],
    riskStatus: "medium" as const,
  },
  {
    id: "off-4",
    authorHandleHash: "d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
    uniqueVideos: 4,
    totalComments: 15,
    toxicComments: 8,
    toxicityRatio: 0.53,
    firstSeen: new Date(Date.now() - 21 * 86400000),
    lastSeen: new Date(Date.now() - 86400000),
    topKeywords: ["bot account", "spam"],
    riskStatus: "medium" as const,
  },
  {
    id: "off-5",
    authorHandleHash: "e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
    uniqueVideos: 1,
    totalComments: 3,
    toxicComments: 2,
    toxicityRatio: 0.67,
    firstSeen: new Date(Date.now() - 3 * 86400000),
    lastSeen: new Date(Date.now() - 43200000),
    topKeywords: ["worst channel"],
    riskStatus: "medium" as const,
  },
];

export const demoVideos = [
  {
    videoId: "video_abc123",
    platform: "youtube",
    total: 234,
    flagged: 45,
    avgToxicity: 0.32,
  },
  {
    videoId: "video_def456",
    platform: "youtube",
    total: 187,
    flagged: 52,
    avgToxicity: 0.41,
  },
  {
    videoId: "video_ghi789",
    platform: "youtube",
    total: 156,
    flagged: 28,
    avgToxicity: 0.25,
  },
  {
    videoId: "post_123",
    platform: "instagram",
    total: 89,
    flagged: 12,
    avgToxicity: 0.18,
  },
  {
    videoId: "post_456",
    platform: "instagram",
    total: 72,
    flagged: 8,
    avgToxicity: 0.15,
  },
  {
    videoId: "post_789",
    platform: "instagram",
    total: 109,
    flagged: 18,
    avgToxicity: 0.21,
  },
];

export const demoEvidencePacks = [
  {
    id: "ep-1",
    platform: "youtube",
    videoId: "video_abc123",
    title: "Evidence Pack: video_abc123",
    markdown: `# Evidence Pack

- **Platform:** youtube
- **Video/Media ID:** video_abc123
- **Generated:** ${new Date().toISOString()}
- **Total Items:** 3

---

### Item 1
- **Timestamp:** ${new Date(Date.now() - 86400000).toISOString()}
- **Hashed User ID:** a1b2c3d4e5f6...
- **Toxicity Score:** 82%
- **Matched Phrases:** spam, scam link
- **Link:** https://www.youtube.com/watch?v=video_abc123

> this is spam, visit my scam link

### Item 2
- **Timestamp:** ${new Date(Date.now() - 172800000).toISOString()}
- **Hashed User ID:** b2c3d4e5f6a7...
- **Toxicity Score:** 75%
- **Matched Phrases:** hate, attack
- **Link:** https://www.youtube.com/watch?v=video_abc123

> i hate this content so much attack

### Item 3
- **Timestamp:** ${new Date(Date.now() - 259200000).toISOString()}
- **Hashed User ID:** c3d4e5f6a7b8...
- **Toxicity Score:** 91%
- **Matched Phrases:** fake giveaway, scam
- **Link:** https://www.youtube.com/watch?v=video_abc123

> fake giveaway here totally scam

---

*This report was generated by Creator Safety Studio for manual platform reporting.*`,
    reportText: `Creator Safety Studio - Evidence Summary
Platform: youtube
Video: video_abc123
Generated: ${new Date().toLocaleDateString()}
Items: 3
----------------------------------------

1. [${new Date(Date.now() - 86400000).toISOString()}] User: a1b2c3d4... | Score: 82% | Phrases: spam, scam link
   Comment: "this is spam, visit my scam link"
   Link: https://www.youtube.com/watch?v=video_abc123

2. [${new Date(Date.now() - 172800000).toISOString()}] User: b2c3d4e5... | Score: 75% | Phrases: hate, attack
   Comment: "i hate this content so much attack"
   Link: https://www.youtube.com/watch?v=video_abc123

3. [${new Date(Date.now() - 259200000).toISOString()}] User: c3d4e5f6... | Score: 91% | Phrases: fake giveaway, scam
   Comment: "fake giveaway here totally scam"
   Link: https://www.youtube.com/watch?v=video_abc123

----------------------------------------`,
    createdAt: new Date().toISOString(),
  },
];
