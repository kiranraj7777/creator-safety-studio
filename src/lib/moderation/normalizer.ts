/**
 * Text Normalization for Moderation
 * Stage A: Clean text, normalize repeated characters, detect language mix.
 */

export interface NormalizedText {
  raw: string;
  normalized: string;
  languageDetected: string;
  hasRepeatedChars: boolean;
  charRepeats: Map<string, number>;
}

const REPEATED_CHAR_REGEX = /(.)\1{3,}/gi;
const PUNCTUATION_NOISE = /[\!\?\.\,\;\:\-\_\*\#\@\$\%\^\&\(\)\[\]\{\}\|\+\=\~\`\"\'\\\/\<\>]{2,}/g;
const EXTRA_SPACES = /\s+/g;
const URL_REGEX = /https?:\/\/[^\s]+/g;
const MENTION_HASHTAG = /[@#]\w+/g;

const TAMIL_RANGE = /[\u0B80-\u0BFF]/;
const LATIN_RANGE = /[a-zA-Z]/;

export function normalizeText(input: string): NormalizedText {
  const raw = input.trim();

  // Remove URLs and mentions early
  let cleaned = raw.replace(URL_REGEX, " [link] ");
  cleaned = cleaned.replace(MENTION_HASHTAG, " [tag] ");

  // Replace repeated punctuation noise with single instance
  cleaned = cleaned.replace(PUNCTUATION_NOISE, (match) => match[0]);

  // Detect repeated characters (e.g., "soooo" -> "so")
  const charRepeats = new Map<string, number>();
  const hasRepeatedChars = REPEATED_CHAR_REGEX.test(cleaned);
  if (hasRepeatedChars) {
    cleaned = cleaned.replace(REPEATED_CHAR_REGEX, (match, char) => {
      const count = match.length;
      charRepeats.set(char.toLowerCase(), (charRepeats.get(char.toLowerCase()) || 0) + count);
      return char.toLowerCase();
    });
  }

  // Normalize whitespace
  cleaned = cleaned.replace(EXTRA_SPACES, " ").trim().toLowerCase();

  // Detect language
  const hasTamil = TAMIL_RANGE.test(cleaned);
  const hasLatin = LATIN_RANGE.test(cleaned);
  let languageDetected = "unknown";
  if (hasTamil && hasLatin) languageDetected = "tanglish";
  else if (hasTamil) languageDetected = "tamil";
  else if (hasLatin) languageDetected = "english";

  return {
    raw,
    normalized: cleaned,
    languageDetected,
    hasRepeatedChars,
    charRepeats,
  };
}

/**
 * Generate spelling variations for dictionary matching.
 * Handles common Tanglish transliteration variations.
 */
export function generateVariations(word: string): string[] {
  const variations = new Set<string>();
  variations.add(word);

  // Common Tanglish vowel substitutions
  const subs: [RegExp, string][] = [
    [/aa/g, "a"],
    [/ee/g, "e"],
    [/oo/g, "o"],
    [/uu/g, "u"],
    [/ii/g, "i"],
    [/k/g, "c"],
    [/c/g, "k"],
    [/s/g, "z"],
    [/z/g, "s"],
    [/f/g, "ph"],
    [/ph/g, "f"],
    [/v/g, "w"],
    [/w/g, "v"],
  ];

  subs.forEach(([pattern, replacement]) => {
    if (pattern.test(word)) {
      variations.add(word.replace(pattern, replacement));
    }
  });

  return Array.from(variations);
}
