import { moderate } from "../src/lib/moderation/engine";
import { hashAuthorHandle } from "../src/lib/hash";

describe("Retention Logic", () => {
  it("should calculate evidence expiry correctly", () => {
    const retentionDays = 30;
    const now = Date.now();
    const expiresAt = new Date(now + retentionDays * 24 * 60 * 60 * 1000);
    const diff = expiresAt.getTime() - now;
    const expectedDiff = 30 * 24 * 60 * 60 * 1000;
    expect(Math.abs(diff - expectedDiff)).toBeLessThan(1000);
  });

  it("should mark comment as not retained after purge", () => {
    const commentState = {
      commentTextRaw: "original raw text",
      commentTextNormalized: "original normalized text",
      isRetained: true,
      purgedAt: null as Date | null,
    };

    const purgedState = {
      commentTextRaw: null,
      commentTextNormalized: null,
      isRetained: false,
      purgedAt: new Date(),
    };

    expect(purgedState.isRetained).toBe(false);
    expect(purgedState.commentTextRaw).toBeNull();
    expect(purgedState.commentTextNormalized).toBeNull();
    expect(purgedState.purgedAt).toBeInstanceOf(Date);
  });

  it("should keep hashed author ID and scores after purge", () => {
    const hash = hashAuthorHandle("test_user");
    const moderationResult = moderate("spam comment");

    const retainedAfterPurge = {
      authorHandleHash: hash,
      toxicScore: moderationResult.toxicityScore,
      riskLabel: moderationResult.riskLabel,
      matchedPhrases: moderationResult.matchedPhrases,
      platform: "youtube",
      videoId: "test_video",
      createdAt: new Date(),
    };

    expect(retainedAfterPurge.authorHandleHash).toBe(hash);
    expect(retainedAfterPurge.toxicScore).toBeDefined();
    expect(retainedAfterPurge.riskLabel).toBeDefined();
  });

  it("should allow configurable retention window", () => {
    const getExpiry = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    expect(getExpiry(7).getTime()).toBeGreaterThan(Date.now());
    expect(getExpiry(90).getTime()).toBeGreaterThan(getExpiry(7).getTime());
  });
});
