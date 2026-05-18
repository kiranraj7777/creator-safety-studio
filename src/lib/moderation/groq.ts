/**
 * Groq AI Moderation — free LLaMA 3.3 70B via Groq API
 * Replaces Google Perspective API (being sunset Feb 2026).
 * Sign up for free API key: https://console.groq.com
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 5000;
const MODEL = "llama-3.3-70b-versatile";

export interface GroqResult {
  toxicityScore: number;
  insult: number;
  profanity: number;
  threat: number;
  detected: boolean;
  explanation: string;
}

const SYSTEM_PROMPT = `You are a content moderation classifier. Analyze the given text for toxicity.
The text may be in English, Tamil, or Tanglish (Tamil+English mix).

Return ONLY valid JSON with these fields:
- "toxic": boolean (true if text contains any abuse, harassment, insult, threat, or profanity)
- "toxicityScore": number 0.0 to 1.0 (overall toxicity)
- "insult": number 0.0 to 1.0
- "profanity": number 0.0 to 1.0  
- "threat": number 0.0 to 1.0
- "explanation": string (brief reason, one sentence)

Examples:
Input: "otha dai baadu" → {"toxic":true,"toxicityScore":0.85,"insult":0.9,"profanity":0.7,"threat":0.1,"explanation":"Contains Tamil abusive language"}
Input: "great video!" → {"toxic":false,"toxicityScore":0.0,"insult":0.0,"profanity":0.0,"threat":0.0,"explanation":"Positive comment"}
Input: "nee romba mosam ah iruka" → {"toxic":true,"toxicityScore":0.6,"insult":0.7,"profanity":0.0,"threat":0.2,"explanation":"Insulting tone in Tamil"}

Respond with ONLY the JSON object, no other text.`;

export async function analyzeWithGroq(text: string): Promise<GroqResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const MAX_CHARS = 2000;
  const truncated = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + "..." : text;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: truncated },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!response.ok) return null;

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);

    return {
      toxicityScore: Math.min(Math.max(parsed.toxicityScore ?? 0, 0), 1),
      insult: Math.min(Math.max(parsed.insult ?? 0, 0), 1),
      profanity: Math.min(Math.max(parsed.profanity ?? 0, 0), 1),
      threat: Math.min(Math.max(parsed.threat ?? 0, 0), 1),
      detected: parsed.toxic ?? false,
      explanation: parsed.explanation || "",
    };
  } catch {
    return null;
  }
}

export function blendScores(
  dictionaryScore: number,
  groqScore: number | null
): number {
  if (groqScore === null || groqScore === undefined) {
    return dictionaryScore;
  }
  const blended = groqScore * 0.7 + dictionaryScore * 0.3;
  return Math.max(dictionaryScore, blended);
}
