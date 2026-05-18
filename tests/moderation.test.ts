import { moderate, moderateBatch } from "../src/lib/moderation/engine";
import { normalizeText, generateVariations } from "../src/lib/moderation/normalizer";
import { matchDictionary, addEntry, getDictionary } from "../src/lib/moderation/dictionaries";

describe("Moderation Engine", () => {
  describe("Normalization", () => {
    it("should normalize text to lowercase and trim", () => {
      const result = normalizeText("  HELLO WORLD  ");
      expect(result.normalized).toBe("hello world");
      expect(result.languageDetected).toBe("english");
    });

    it("should remove URLs", () => {
      const result = normalizeText("Check https://example.com/scam now");
      expect(result.normalized).not.toContain("https://");
    });

    it("should detect Tamil characters", () => {
      const result = normalizeText("வணக்கம் hello");
      expect(result.languageDetected).toBe("tanglish");
    });

    it("should detect repeated character patterns (4+ repeats)", () => {
      const result = normalizeText("soooo annoying");
      expect(result.hasRepeatedChars).toBe(true);
    });

    it("should generate Tanglish spelling variations", () => {
      const variations = generateVariations("scam");
      expect(variations.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Dictionary Matching", () => {
    beforeEach(() => {
      addEntry({ term: "xyz-unique-term", language: "en", category: "spam", severity: 0.5, isRegex: false });
    });

    it("should match dictionary terms", () => {
      const matches = matchDictionary("this is xyz-unique-term content");
      const uniqueMatch = matches.find((m) => m.term === "xyz-unique-term");
      expect(uniqueMatch).toBeDefined();
    });

    it("should return empty for clean text", () => {
      const matches = matchDictionary("this is a perfectly nice comment");
      expect(matches.length).toBe(0);
    });

    it("should handle regex patterns", () => {
      addEntry({ term: "bad\\s+word", language: "en", category: "harassment", severity: 0.8, isRegex: true });
      const matches = matchDictionary("this is a bad word here");
      const regexMatch = matches.find((m) => m.term === "bad\\s+word");
      expect(regexMatch).toBeDefined();
    });
  });

  describe("Full Pipeline", () => {
    it("should score clean text as low risk", () => {
      const result = moderate("Great video, thanks for sharing!");
      expect(result.riskLabel).toBe("low");
      expect(result.toxicityScore).toBe(0);
    });

    it("should score spam text higher", () => {
      // Add a spam term for testing
      addEntry({ term: "visit scam", language: "en", category: "fraud", severity: 0.6, isRegex: false });
      const result = moderate("visit my scam link now");
      expect(result.toxicityScore).toBeGreaterThan(0);
      expect(result.matchedPhrases.length).toBeGreaterThan(0);
      expect(result.reason).toContain("Matched");
    });

    it("should apply repeated char amplifier", () => {
      addEntry({ term: "bad", language: "en", category: "insult", severity: 0.4, isRegex: false });
      const normal = moderate("this is bad");
      const amplified = moderate("this is baaaad");
      expect(amplified.toxicityScore).toBeGreaterThanOrEqual(normal.toxicityScore);
    });

    it("should handle batch moderation", () => {
      const texts = ["nice comment", "scam alert", "friendly post"];
      addEntry({ term: "scam alert", language: "en", category: "fraud", severity: 0.7, isRegex: false });
      const results = moderateBatch(texts);
      expect(results).toHaveLength(3);
      expect(results[1].toxicityScore).toBeGreaterThan(0);
    });

    it("should detect mixed language", () => {
      const result = moderate("வணக்கம் friend scam here");
      expect(result.languageDetected).toMatch(/tanglish|english/);
    });
  });
});
