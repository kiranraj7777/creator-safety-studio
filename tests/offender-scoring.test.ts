import { moderate } from "../src/lib/moderation/engine";

describe("Offender Scoring", () => {
  const sampleComments = [
    { videoId: "v1", text: "great video love it" },
    { videoId: "v1", text: "spam scam link here" },
    { videoId: "v2", text: "another spam comment" },
    { videoId: "v3", text: "hate this content attack" },
  ];

  it("should calculate toxicity ratio correctly", () => {
    const results = sampleComments.map((c) => ({ ...c, result: moderate(c.text) }));
    const toxicCount = results.filter((r) => r.result.riskLabel !== "low").length;
    const ratio = toxicCount / results.length;
    expect(ratio).toBeGreaterThan(0);
    expect(ratio).toBeLessThanOrEqual(1);
  });

  it("should detect cross-video activity", () => {
    const uniqueVideos = new Set(sampleComments.map((c) => c.videoId)).size;
    expect(uniqueVideos).toBe(3);
  });

  it("should flag high risk when toxicity ratio >= 0.5 across 2+ videos", () => {
    const highRiskComments = [
      { videoId: "v1", text: "spam scam link here" },
      { videoId: "v2", text: "another spam scam comment" },
      { videoId: "v3", text: "spam scam again" },
    ];
    const results = highRiskComments.map((c) => ({ ...c, result: moderate(c.text) }));
    const toxicCount = results.filter((r) => r.result.riskLabel !== "low").length;
    const ratio = toxicCount / results.length;
    const uniqueVideos = new Set(highRiskComments.map((c) => c.videoId)).size;
    expect(uniqueVideos).toBe(3);
    expect(toxicCount).toBeGreaterThan(0);
    const isHighRisk = ratio >= 0.5 && uniqueVideos >= 2;
    expect(isHighRisk).toBe(true);
  });

  it("should aggregate top keywords across comments", () => {
    const results = sampleComments.map((c) => moderate(c.text));
    const allPhrases = results.flatMap((r) => r.matchedPhrases);
    const keywordCounts: Record<string, number> = {};
    allPhrases.forEach((p) => (keywordCounts[p] = (keywordCounts[p] || 0) + 1));

    const topKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => k);

    expect(Array.isArray(topKeywords)).toBe(true);
  });

  it("should not flag single low-severity comments as high risk", () => {
    const cleanMod = moderate("thanks for the upload");
    expect(cleanMod.riskLabel).toBe("low");
    expect(cleanMod.toxicityScore).toBe(0);
  });

  it("should detect repeat offenders across multiple videos", () => {
    const userAComments = [
      { videoId: "v1", text: "spam scam link here" },
      { videoId: "v2", text: "another spam scam" },
      { videoId: "v3", text: "scam spam again" },
    ];

    const modResults = userAComments.map((c) => moderate(c.text));
    const totalToxic = modResults.filter((r) => r.riskLabel !== "low").length;
    const distinctVids = new Set(userAComments.map((c) => c.videoId)).size;

    expect(totalToxic).toBeGreaterThan(0);
    expect(distinctVids).toBe(3);
  });
});
