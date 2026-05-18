import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const tamilWords = [
  { term: "otha", language: "ta", category: "insult", severity: 0.8 },
  { term: "baadu", language: "ta", category: "insult", severity: 0.7 },
  { term: "mairu", language: "ta", category: "insult", severity: 0.8 },
  { term: "thayoli", language: "ta", category: "insult", severity: 0.9 },
  { term: "munda", language: "ta", category: "insult", severity: 0.7 },
  { term: "punda", language: "ta", category: "insult", severity: 0.8 },
  { term: "dai", language: "ta", category: "insult", severity: 0.4 },
  { term: "dei", language: "ta", category: "insult", severity: 0.4 },
  { term: "patti", language: "ta", category: "insult", severity: 0.5 },
  { term: "kundu", language: "ta", category: "insult", severity: 0.5 },
  { term: "vaya moodu", language: "ta", category: "insult", severity: 0.5 },
  { term: "sutha mairu", language: "ta", category: "insult", severity: 0.8 },
  { term: "otha dai", language: "ta", category: "insult", severity: 0.8 },
  { term: "otha", language: "tanglish", category: "insult", severity: 0.8 },
  { term: "baadu da", language: "tanglish", category: "insult", severity: 0.7 },
  { term: "mairu da", language: "tanglish", category: "insult", severity: 0.8 },
  { term: "thayoli da", language: "tanglish", category: "insult", severity: 0.9 },
  { term: "punda da", language: "tanglish", category: "insult", severity: 0.8 },
  { term: "nee yaaru da", language: "tanglish", category: "insult", severity: 0.4 },
];

for (const w of tamilWords) {
  await prisma.dictionaryTerm.upsert({
    where: { term_language: { term: w.term, language: w.language } },
    update: w,
    create: { ...w, isRegex: false, active: true },
  });
}
console.log(`Seeded ${tamilWords.length} Tamil/Tanglish words`);

const count = await prisma.dictionaryTerm.count({ where: { active: true } });
console.log(`Total active dictionary terms: ${count}`);

// Reload the in-memory dictionary
// The in-memory dictionary will reload on next API call
// (loadDictionaryFromDB is called on every term add/delete via the API)

await prisma.$disconnect();
