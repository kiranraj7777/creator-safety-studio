const PERSPECTIVE_URL = "https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze";
const REQUEST_TIMEOUT_MS = 3000;

interface PerspectiveResult {
  toxicityScore: number;
  attributeScores: Record<string, number>;
  detected: boolean;
}

export async function analyzeWithPerspective(text: string): Promise<PerspectiveResult | null> {
  const apiKey = process.env.PERSPECTIVE_API_KEY;
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(PERSPECTIVE_URL + "?key=" + apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        comment: { text },
        languages: ["en"],
        requestedAttributes: {
          TOXICITY: {},
          INSULT: {},
          PROFANITY: {},
          THREAT: {},
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!response.ok) return null;

    const data = await response.json();
    const scores = data.attributeScores || {};

    const attributeScores: Record<string, number> = {};
    for (const [key, val] of Object.entries(scores)) {
      attributeScores[key] = (val as any)?.summaryScore?.value ?? 0;
    }

    const toxicityScore = attributeScores.TOXICITY ?? 0;

    return {
      toxicityScore,
      attributeScores,
      detected: toxicityScore >= 0.5,
    };
  } catch {
    return null;
  }
}

export function blendScores(
  dictionaryScore: number,
  perspectiveScore: number | null
): number {
  if (perspectiveScore === null || perspectiveScore === undefined) {
    return dictionaryScore;
  }
  const blended = perspectiveScore * 0.8 + dictionaryScore * 0.2;
  return Math.max(dictionaryScore, blended);
}
