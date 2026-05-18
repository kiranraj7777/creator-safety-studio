/**
 * Abuse Detection Dictionaries
 * Stage B: Rule-based phrase matching.
 *
 * IMPORTANT: This file contains only structural placeholders.
 * Actual abusive terms must be configured via the admin Dictionary Editor
 * or populated via seed scripts in your own deployment.
 * The examples here are benign placeholders to demonstrate pattern matching.
 */

export interface DictionaryEntry {
  term: string;
  language: string;
  category: string;
  severity: number; // 0.0 to 1.0
  isRegex: boolean;
  variants?: string[];
}

// These are safe placeholder examples ONLY.
// Replace with your organization's approved wordlists.
const DEFAULT_DICTIONARY: DictionaryEntry[] = [
  // English examples (benign placeholders)
  { term: "spam", language: "en", category: "spam", severity: 0.3, isRegex: false },
  { term: "scam", language: "en", category: "fraud", severity: 0.4, isRegex: false },
  { term: "bot", language: "en", category: "spam", severity: 0.2, isRegex: false },

  // Tamil examples (benign placeholders showing script support)
  { term: "விளம்பரம்", language: "ta", category: "spam", severity: 0.3, isRegex: false },

  // Tanglish examples (benign placeholders showing transliteration support)
  { term: "spam panra", language: "tanglish", category: "spam", severity: 0.3, isRegex: false },
];

let activeDictionary: DictionaryEntry[] = [...DEFAULT_DICTIONARY];
let dbLoaded = false;

export function loadDictionary(entries: DictionaryEntry[]) {
  activeDictionary = entries;
  dbLoaded = true;
}

export async function loadDictionaryFromDB() {
  try {
    const { prisma } = await import("@/lib/db/prisma");
    const terms = await prisma.dictionaryTerm.findMany({
      where: { active: true },
      select: { term: true, language: true, category: true, severity: true, isRegex: true },
    });
    if (terms.length > 0) {
      activeDictionary = terms.map((t) => ({
        term: t.term,
        language: t.language,
        category: t.category,
        severity: t.severity,
        isRegex: t.isRegex,
      }));
    }
    dbLoaded = true;
  } catch {
    activeDictionary = [...DEFAULT_DICTIONARY];
    dbLoaded = true;
  }
}

export function isDictionaryLoaded(): boolean {
  return dbLoaded;
}

export function getDictionary(): DictionaryEntry[] {
  return activeDictionary;
}

export function addEntry(entry: DictionaryEntry) {
  activeDictionary.push(entry);
}

export function removeEntry(term: string, language: string) {
  activeDictionary = activeDictionary.filter(
    (e) => !(e.term === term && e.language === language)
  );
}

/**
 * Check if a normalized text matches any dictionary entry.
 * Returns matches with severity scores.
 */
export function matchDictionary(
  normalizedText: string
): Array<{ term: string; category: string; severity: number; language: string }> {
  const matches: Array<{ term: string; category: string; severity: number; language: string }> = [];
  const seen = new Set<string>();

  for (const entry of activeDictionary) {
    if (!entry.isRegex) {
      // Exact or substring match
      if (normalizedText.includes(entry.term.toLowerCase())) {
        const key = `${entry.term}-${entry.language}`;
        if (!seen.has(key)) {
          seen.add(key);
          matches.push({
            term: entry.term,
            category: entry.category,
            severity: entry.severity,
            language: entry.language,
          });
        }
      }
      // Check variants
      if (entry.variants) {
        for (const variant of entry.variants) {
          if (normalizedText.includes(variant.toLowerCase())) {
            const key = `${variant}-${entry.language}`;
            if (!seen.has(key)) {
              seen.add(key);
              matches.push({
                term: `${entry.term}(${variant})`,
                category: entry.category,
                severity: entry.severity * 0.9,
                language: entry.language,
              });
            }
          }
        }
      }
    } else {
      try {
        const regex = new RegExp(entry.term, "gi");
        if (regex.test(normalizedText)) {
          const key = `${entry.term}-${entry.language}-regex`;
          if (!seen.has(key)) {
            seen.add(key);
            matches.push({
              term: entry.term,
              category: entry.category,
              severity: entry.severity,
              language: entry.language,
            });
          }
        }
      } catch {
        // Invalid regex, skip
      }
    }
  }

  return matches;
}
