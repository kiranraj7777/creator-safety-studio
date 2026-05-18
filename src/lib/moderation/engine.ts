/**
 * Local Moderation Engine
 * Three-stage pipeline: Normalization -> Dictionary Match -> Confidence Score
 *
 * Uses local dictionary scoring, optionally boosted by Groq AI (free LLaMA 3.3 70B).
 */

import { normalizeText, type NormalizedText } from "./normalizer";
import { matchDictionary, getDictionary, loadDictionaryFromDB } from "./dictionaries";
import { analyzeWithGroq, blendScores } from "./groq";
import type { ModerationResult, RiskLabel } from "@/types";

loadDictionaryFromDB();

export interface EngineOptions {
  thresholdHigh?: number; // default 0.7
  thresholdMedium?: number; // default 0.4
  maxScore?: number; // default 1.0
}

const DEFAULT_OPTIONS: EngineOptions = {
  thresholdHigh: 0.7,
  thresholdMedium: 0.4,
  maxScore: 1.0,
};

/**
 * Stage A + B + C combined pipeline (async, with Groq AI)
 */
export async function moderateAsync(
  rawText: string,
  options: EngineOptions = {}
): Promise<ModerationResult> {
  const base = moderate(rawText, options);

  const groq = await analyzeWithGroq(rawText);
  if (!groq) return base;

  const blendedToxicity = blendScores(base.toxicityScore, groq.toxicityScore);
  const combinedPhrases = [...base.matchedPhrases];
  if (groq.detected) {
    combinedPhrases.push("groq-toxicity");
    if (groq.insult >= 0.5) combinedPhrases.push("groq-insult");
    if (groq.profanity >= 0.5) combinedPhrases.push("groq-profanity");
    if (groq.threat >= 0.5) combinedPhrases.push("groq-threat");
  }

  let riskLabel: RiskLabel = base.riskLabel;
  if (blendedToxicity >= (options.thresholdHigh ?? 0.7)) riskLabel = "high";
  else if (blendedToxicity >= (options.thresholdMedium ?? 0.4)) riskLabel = "medium";
  else riskLabel = "low";

  const confidence = Math.min(base.confidence + 0.15, 1.0);
  const reason = groq.detected
    ? `${base.reason} AI also flagged toxicity (${Math.round(groq.toxicityScore * 100)}%): ${groq.explanation}`
    : base.reason;

  return {
    toxicityScore: Math.round(blendedToxicity * 100) / 100,
    riskLabel,
    matchedPhrases: combinedPhrases,
    confidence: Math.round(confidence * 100) / 100,
    reason,
    languageDetected: base.languageDetected,
  };
}

/**
 * Stage A + B + C combined pipeline (sync, dictionary only)
 */
export function moderate(
  rawText: string,
  options: EngineOptions = {}
): ModerationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Stage A: Normalize
  const normalized = normalizeText(rawText);

  // Stage B: Dictionary matching
  const dictionaryMatches = matchDictionary(normalized.normalized);

  // Stage C: Score computation
  let score = 0;
  const matchedPhrases: string[] = [];

  for (const match of dictionaryMatches) {
    score += match.severity;
    matchedPhrases.push(match.term);
  }

  // Amplifiers
  if (normalized.hasRepeatedChars) {
    score += 0.1; // Slight boost for intentional obfuscation
  }

  // Cap score
  score = Math.min(score, opts.maxScore || 1.0);

  // Confidence calculation:
  // Higher if we have many matched phrases or very high severity matches.
  let confidence = 0.5;
  if (dictionaryMatches.length > 0) {
    const maxSeverity = Math.max(...dictionaryMatches.map((m) => m.severity));
    confidence = 0.5 + maxSeverity * 0.4 + Math.min(dictionaryMatches.length * 0.05, 0.1);
  }
  confidence = Math.min(confidence, 1.0);

  // Risk label
  let riskLabel: RiskLabel = "low";
  if (score >= opts.thresholdHigh!) riskLabel = "high";
  else if (score >= opts.thresholdMedium!) riskLabel = "medium";

  // Reason summary
  const reason = buildReason(normalized, dictionaryMatches, riskLabel);

  return {
    toxicityScore: Math.round(score * 100) / 100,
    riskLabel,
    matchedPhrases: [...new Set(matchedPhrases)],
    confidence: Math.round(confidence * 100) / 100,
    reason,
    languageDetected: normalized.languageDetected,
  };
}

function buildReason(
  normalized: NormalizedText,
  matches: Array<{ term: string; category: string; severity: number }>,
  riskLabel: RiskLabel
): string {
  if (matches.length === 0) {
    return "No abusive patterns detected.";
  }

  const categories = [...new Set(matches.map((m) => m.category))];
  const topMatches = matches.slice(0, 3).map((m) => `"${m.term}"`);

  let reason = `Matched ${matches.length} pattern(s) in categories: ${categories.join(", ")}. `;
  reason += `Top matches: ${topMatches.join(", ")}. `;

  if (normalized.hasRepeatedChars) {
    reason += "Detected repeated character patterns. ";
  }

  if (riskLabel === "high") {
    reason += "Overall risk is high due to strong pattern matches.";
  } else if (riskLabel === "medium") {
    reason += "Overall risk is medium due to partial pattern matches.";
  } else {
    reason += "Overall risk is low.";
  }

  return reason;
}

/**
 * Batch moderation helper for incoming comment streams.
 */
export function moderateBatch(
  texts: string[],
  options?: EngineOptions
): ModerationResult[] {
  return texts.map((text) => moderate(text, options));
}

/**
 * Re-evaluate a comment with fresh dictionaries.
 */
export function reModerate(rawText: string, options?: EngineOptions): ModerationResult {
  return moderate(rawText, options);
}
