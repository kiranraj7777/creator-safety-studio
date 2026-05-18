export type Platform = "youtube" | "instagram" | "facebook";

export type RiskLabel = "low" | "medium" | "high";

export interface ModerationResult {
  toxicityScore: number;
  riskLabel: RiskLabel;
  matchedPhrases: string[];
  confidence: number;
  reason: string;
  languageDetected: string;
  normalizedText?: string;
}

export interface CommentEvent {
  platform: Platform;
  accountId: string;
  videoId: string;
  commentId: string;
  parentCommentId?: string;
  authorDisplayName: string;
  authorHandle: string;
  commentTextRaw: string;
  createdAt: Date;
}

export interface OffenderProfile {
  authorHash: string;
  uniqueVideos: number;
  totalComments: number;
  toxicComments: number;
  toxicityRatio: number;
  firstSeen: Date;
  lastSeen: Date;
  topKeywords: string[];
  riskStatus: RiskLabel;
}

export interface EvidencePack {
  id: string;
  platform: Platform;
  videoUrl: string;
  createdAt: Date;
  items: EvidenceItem[];
}

export interface EvidenceItem {
  timestamp: string;
  hashedUserId: string;
  commentText: string;
  toxicScore: number;
  matchedPhrases: string[];
  platformLink: string;
}
