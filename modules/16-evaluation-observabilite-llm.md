# Module 16 — Évaluation & Observabilité LLM

## Objectifs du module

- Comprendre pourquoi évaluer un système LLM est indispensable
- Maîtriser les métriques classiques (BLEU, ROUGE, perplexité)
- Implémenter l'approche LLM-as-Judge pour l'évaluation automatique
- Connaître les métriques RAG (faithfulness, relevancy, context précision/recall)
- Utiliser RAGAS pour évaluer un pipeline RAG
- Détecter les hallucinations
- Mettre en place l'observabilité avec Langfuse/Langsmith
- Implémenter un logger d'interactions en TypeScript

---

## 1. Pourquoi évaluer un système LLM ?

### Le problème fondamental

Contrairement au code classique (test unitaire → pass/fail), les sorties d'un LLM sont **non-déterministes** et **subjectives**. Comment savoir si votre chatbot fonctionne bien ?

```
Code classique :        LLM :
add(2, 3) → 5 ✓        "Explique les closures" → ???
add(2, 3) → 6 ✗        Comment évaluer la qualité ?
                        La réponse est-elle correcte ?
                        Complète ? Claire ? Pertinente ?
```

> **Analogie** : Évaluer un LLM, c'est comme évaluer un restaurant. On ne peut pas juste vérifier si "plat = correct". Il faut mesurer le goût, la présentation, le service, le rapport qualité/prix, la constance. Et différents clients auront des avis différents.

### Les 3 niveaux d'évaluation

```
┌─────────────────────────────────────────────────────────────┐
│  Niveau 1 — OFFLINE (avant déploiement)                      │
│  Benchmarks, métriques automatiques, eval datasets           │
│  → "Le modèle est-il capable ?"                              │
├─────────────────────────────────────────────────────────────┤
│  Niveau 2 — ONLINE (en production)                           │
│  A/B testing, feedback utilisateurs, taux de satisfaction    │
│  → "Les utilisateurs sont-ils contents ?"                    │
├─────────────────────────────────────────────────────────────┤
│  Niveau 3 — OBSERVABILITÉ (continu)                          │
│  Logs, traces, coûts, latence, taux d'hallucination          │
│  → "Le système fonctionne-t-il correctement ?"               │
└─────────────────────────────────────────────────────────────┘
```

### Ce qu'on évalue

| Dimension | Question | Métriques |
|-----------|----------|-----------|
| Exactitude | La réponse est-elle correcte ? | BLEU, ROUGE, exact match |
| Fidélité (RAG) | La réponse reflète-t-elle les sources ? | Faithfulness |
| Pertinence | La réponse répond-elle à la question ? | Answer relevancy |
| Complétude | Manque-t-il des informations ? | Context recall |
| Hallucination | Le modèle invente-t-il des faits ? | Hallucination rate |
| Cohérence | La réponse est-elle logique ? | LLM-as-judge |
| Latence | Combien de temps pour répondre ? | TTFT, tokens/s |
| Coût | Combien coûte chaque réponse ? | $/requête |

---

## 2. Métriques classiques

### BLEU (Bilingual Évaluation Understudy)

BLEU mesure la **correspondance de n-grammes** entre le texte généré et une référence.

```typescript
function computeBLEU(
  generated: string,
  reference: string,
  maxN: number = 4,
): { score: number; precisions: number[] } {
  const genTokens = generated.toLowerCase().split(/\s+/);
  const refTokens = reference.toLowerCase().split(/\s+/);

  const precisions: number[] = [];

  for (let n = 1; n <= maxN; n++) {
    const genNgrams = extractNgrams(genTokens, n);
    const refNgrams = extractNgrams(refTokens, n);

    // Compter les correspondances
    const refCounts = new Map<string, number>();
    for (const ng of refNgrams) {
      refCounts.set(ng, (refCounts.get(ng) ?? 0) + 1);
    }

    let matches = 0;
    const usedCounts = new Map<string, number>();

    for (const ng of genNgrams) {
      const available = (refCounts.get(ng) ?? 0) - (usedCounts.get(ng) ?? 0);
      if (available > 0) {
        matches++;
        usedCounts.set(ng, (usedCounts.get(ng) ?? 0) + 1);
      }
    }

    const precision = genNgrams.length > 0 ? matches / genNgrams.length : 0;
    precisions.push(precision);
  }

  // Brevity penalty
  const bp = genTokens.length < refTokens.length
    ? Math.exp(1 - refTokens.length / genTokens.length)
    : 1;

  // Moyenne géométrique des précisions
  const logAvg = precisions.reduce(
    (sum, p) => sum + Math.log(Math.max(p, 1e-10)),
    0,
  ) / precisions.length;

  const score = bp * Math.exp(logAvg);

  return { score, precisions };
}

function extractNgrams(tokens: string[], n: number): string[] {
  const ngrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '));
  }
  return ngrams;
}

// Test
const result = computeBLEU(
  'Le chat est assis sur le tapis',
  'Le chat se repose sur le tapis bleu',
);
console.log(`BLEU: ${(result.score * 100).toFixed(1)}%`);
// BLEU: ~45.2% (correspondance partielle)
```

### ROUGE (Recall-Oriented Understudy for Gisting Évaluation)

ROUGE est orienté **rappel** (recall) — il mesure quelle proportion de la référence est couverte par la génération.

```typescript
interface ROUGEScores {
  rouge1: { precision: number; recall: number; f1: number };
  rouge2: { precision: number; recall: number; f1: number };
  rougeL: { precision: number; recall: number; f1: number };
}

function computeROUGE(generated: string, reference: string): ROUGEScores {
  const genTokens = generated.toLowerCase().split(/\s+/);
  const refTokens = reference.toLowerCase().split(/\s+/);

  // ROUGE-1 (unigrammes)
  const rouge1 = computeROUGEN(genTokens, refTokens, 1);

  // ROUGE-2 (bigrammes)
  const rouge2 = computeROUGEN(genTokens, refTokens, 2);

  // ROUGE-L (plus longue sous-séquence commune)
  const rougeL = computeROUGEL(genTokens, refTokens);

  return { rouge1, rouge2, rougeL };
}

function computeROUGEN(
  genTokens: string[],
  refTokens: string[],
  n: number,
): { precision: number; recall: number; f1: number } {
  const genNgrams = new Set(extractNgrams(genTokens, n));
  const refNgrams = extractNgrams(refTokens, n);
  const refNgramSet = new Set(refNgrams);

  const matches = [...genNgrams].filter((ng) => refNgramSet.has(ng)).length;

  const precision = genNgrams.size > 0 ? matches / genNgrams.size : 0;
  const recall = refNgramSet.size > 0 ? matches / refNgramSet.size : 0;
  const f1 = precision + recall > 0
    ? (2 * precision * recall) / (precision + recall)
    : 0;

  return { precision, recall, f1 };
}

function computeROUGEL(
  genTokens: string[],
  refTokens: string[],
): { precision: number; recall: number; f1: number } {
  const lcsLength = longestCommonSubsequence(genTokens, refTokens);

  const precision = genTokens.length > 0 ? lcsLength / genTokens.length : 0;
  const recall = refTokens.length > 0 ? lcsLength / refTokens.length : 0;
  const f1 = precision + recall > 0
    ? (2 * precision * recall) / (precision + recall)
    : 0;

  return { precision, recall, f1 };
}

function longestCommonSubsequence(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  return dp[m][n];
}
```

### BLEU vs ROUGE : quand utiliser quoi ?

| Métrique | Orientation | Cas d'usage | Limite |
|----------|-------------|-------------|--------|
| BLEU | Précision | Traduction, génération structurée | Ignore les synonymes |
| ROUGE | Rappel | Résumé, extraction | Insensible à la fluence |
| BLEU + ROUGE | Les deux | Évaluation complète | Ni l'un ni l'autre ne capture le "sens" |

> **Limite majeure** : BLEU et ROUGE comparent des mots, pas du sens. "Le félin se repose" et "Le chat dort" ont un faible score BLEU mais le même sens. C'est pourquoi on utilise aussi le **LLM-as-judge**.

### Perplexité

```typescript
/**
 * La perplexité mesure la "surprise" du modèle face au texte.
 * PPL = 2^H ou H est l'entropie croisée moyenne.
 * Plus elle est basse, meilleur est le modèle.
 */
function perplexity(tokenLogProbs: number[]): number {
  // tokenLogProbs : log-probabilités de chaque token (négatifs)
  const avgLogProb =
    tokenLogProbs.reduce((sum, lp) => sum + lp, 0) / tokenLogProbs.length;

  return Math.exp(-avgLogProb);
}

// Interprétation
// PPL = 1     → prédit parfaitement chaque token
// PPL = 10    → "hésite" entre ~10 tokens à chaque étape
// PPL = 100   → très incertain
// PPL = 50000 → quasi aléatoire (taille vocabulaire)

// Comparaison de modèles sur du texte de test :
// GPT-4       : PPL ≈ 5-8 sur du texte courant
// Llama 3 8B  : PPL ≈ 8-12
// Phi-3 Mini  : PPL ≈ 10-15
```

---

## 3. LLM-as-Judge

### Concept

Utiliser un LLM pour évaluer la sortie d'un autre LLM (où de lui-même). C'est devenu le standard de l'industrie car les métriques textuelles (BLEU/ROUGE) ne capturent pas la qualité sémantique.

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Question     │ ──→ │  LLM à évaluer    │ ──→ │  Réponse     │
└──────────────┘     └──────────────────┘     └──────┬───────┘
                                                      │
                                                      ▼
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Question +   │ ──→ │  LLM Juge        │ ──→ │  Score       │
│  Réponse +    │     │  (Claude Opus,    │     │  1-5 +       │
│  Critères     │     │   GPT-4)          │     │  Justification│
└──────────────┘     └──────────────────┘     └──────────────┘
```

### Implémentation

```typescript
interface JudgeResult {
  score: number;        // 1-5
  reasoning: string;    // Explication du score
  criteria: Record<string, number>; // Scores par critère
}

async function llmAsJudge(
  question: string,
  answer: string,
  reference?: string,
  llmClient?: { chat: (messages: Array<{ role: string; content: string }>) => Promise<string> },
): Promise<JudgeResult> {
  const prompt = `Tu es un évaluateur expert. Évalue la qualité de la réponse suivante.

## Question
${question}

## Réponse à évaluer
${answer}

${reference ? `## Réponse de référence\n${reference}` : ''}

## Critères d'évaluation (note chaque critère de 1 à 5)

1. **Exactitude** : La réponse est-elle factuellement correcte ?
2. **Complétude** : La réponse couvre-t-elle tous les aspects de la question ?
3. **Clarté** : La réponse est-elle bien structurée et facile à comprendre ?
4. **Pertinence** : La réponse est-elle directement liée à la question ?
5. **Concision** : La réponse évite-t-elle les digressions inutiles ?

## Format de réponse (JSON strict)

{
  "exactitude": <1-5>,
  "completude": <1-5>,
  "clarte": <1-5>,
  "pertinence": <1-5>,
  "concision": <1-5>,
  "score_global": <1-5>,
  "justification": "<explication en 2-3 phrases>"
}`;

  const response = await llmClient!.chat([
    { role: 'system', content: 'Tu es un évaluateur. Réponds uniquement en JSON valide.' },
    { role: 'user', content: prompt },
  ]);

  const parsed = JSON.parse(response);

  return {
    score: parsed.score_global,
    reasoning: parsed.justification,
    criteria: {
      exactitude: parsed.exactitude,
      completude: parsed.completude,
      clarte: parsed.clarte,
      pertinence: parsed.pertinence,
      concision: parsed.concision,
    },
  };
}
```

### Évaluation par paires (pairwise)

```typescript
interface PairwiseResult {
  winner: 'A' | 'B' | 'tie';
  reasoning: string;
  confidenceScore: number;
}

async function pairwiseJudge(
  question: string,
  answerA: string,
  answerB: string,
  llmClient: { chat: (messages: Array<{ role: string; content: string }>) => Promise<string> },
): Promise<PairwiseResult> {
  // Randomiser l'ordre pour éviter le biais de position
  const swapped = Math.random() > 0.5;
  const first = swapped ? answerB : answerA;
  const second = swapped ? answerA : answerB;

  const prompt = `Compare ces deux réponses à la question suivante.

## Question
${question}

## Réponse 1
${first}

## Réponse 2
${second}

Quelle réponse est meilleure ? Réponds en JSON :
{
  "winner": "1" | "2" | "tie",
  "reasoning": "<explication>",
  "confidence": <0.0-1.0>
}`;

  const response = await llmClient.chat([
    { role: 'user', content: prompt },
  ]);

  const parsed = JSON.parse(response);

  // Corriger si on avait swappé
  let winner: 'A' | 'B' | 'tie' = 'tie';
  if (parsed.winner === '1') winner = swapped ? 'B' : 'A';
  else if (parsed.winner === '2') winner = swapped ? 'A' : 'B';

  return {
    winner,
    reasoning: parsed.reasoning,
    confidenceScore: parsed.confidence,
  };
}
```

---

## 4. Métriques RAG

### Les 4 métriques fondamentales

```
                    Question ──────────────────────┐
                        │                           │
                        ▼                           │
                    Retrieval                       │
                        │                           │
                        ▼                           ▼
              Context récupéré ───→ LLM ───→ Réponse générée
                    │     │                    │
                    │     │                    │
    ┌───────────────┘     └────────────┐      │
    │                                   │      │
    ▼                                   ▼      ▼
Context Precision              Faithfulness   Answer Relevancy
"Les chunks récupérés          "La réponse    "La réponse
 sont-ils pertinents ?"         est-elle       répond-elle
                                fidèle au      à la question ?"
Context Recall                  contexte ?"
"Les chunks couvrent-ils
 toute la réponse attendue ?"
```

| Métrique | Mesure | Inputs | Calcul |
|----------|--------|--------|--------|
| **Faithfulness** | La réponse est-elle supportée par le contexte ? | Réponse + Context | Ratio d'affirmations supportées |
| **Answer Relevancy** | La réponse répond-elle à la question ? | Question + Réponse | Similarité question/réponse |
| **Context Precision** | Les top-K chunks sont-ils pertinents ? | Question + Context | Ratio de chunks pertinents |
| **Context Recall** | Le contexte couvre-t-il la réponse attendue ? | Context + Référence | Ratio de la référence couverte |

### Implémentation des métriques RAG

```typescript
interface RAGEvalInput {
  question: string;
  answer: string;
  contexts: string[];
  reference?: string; // Ground truth (optionnel)
}

interface RAGMetrics {
  faithfulness: number;
  answerRelevancy: number;
  contextPrecision: number;
  contextRecall: number;
}

class RAGEvaluator {
  constructor(
    private llm: { chat: (messages: Array<{ role: string; content: string }>) => Promise<string> },
    private embedder: { embed: (text: string) => Promise<number[]> },
  ) {}

  async evaluate(input: RAGEvalInput): Promise<RAGMetrics> {
    const [faithfulness, answerRelevancy, contextPrecision, contextRecall] =
      await Promise.all([
        this.evaluateFaithfulness(input),
        this.evaluateAnswerRelevancy(input),
        this.evaluateContextPrecision(input),
        input.reference
          ? this.evaluateContextRecall(input)
          : Promise.resolve(0),
      ]);

    return { faithfulness, answerRelevancy, contextPrecision, contextRecall };
  }

  /**
   * Faithfulness : chaque affirmation de la réponse est-elle supportée par le contexte ?
   */
  private async evaluateFaithfulness(input: RAGEvalInput): Promise<number> {
    // Étape 1 : Extraire les affirmations de la réponse
    const claimsResponse = await this.llm.chat([
      {
        role: 'user',
        content: `Extrais les affirmations factuelles de ce texte. Liste-les en JSON.
Texte : "${input.answer}"
Réponds : {"claims": ["affirmation 1", "affirmation 2", ...]}`,
      },
    ]);

    const { claims } = JSON.parse(claimsResponse);

    // Étape 2 : Vérifier chaque affirmation contre le contexte
    const context = input.contexts.join('\n\n');
    let supported = 0;

    for (const claim of claims) {
      const verdict = await this.llm.chat([
        {
          role: 'user',
          content: `L'affirmation suivante est-elle supportée par le contexte ?
Affirmation : "${claim}"
Contexte : "${context}"
Réponds uniquement "oui" ou "non".`,
        },
      ]);

      if (verdict.trim().toLowerCase().startsWith('oui')) {
        supported++;
      }
    }

    return claims.length > 0 ? supported / claims.length : 0;
  }

  /**
   * Answer Relevancy : la réponse est-elle pertinente par rapport à la question ?
   */
  private async evaluateAnswerRelevancy(input: RAGEvalInput): Promise<number> {
    // Générer des questions à partir de la réponse
    const questionsResponse = await this.llm.chat([
      {
        role: 'user',
        content: `Génère 3 questions auxquelles ce texte répond.
Texte : "${input.answer}"
Réponds : {"questions": ["q1", "q2", "q3"]}`,
      },
    ]);

    const { questions } = JSON.parse(questionsResponse);

    // Calculer la similarité cosinus entre la question originale
    // et les questions générées
    const originalEmb = await this.embedder.embed(input.question);
    const similarities: number[] = [];

    for (const q of questions) {
      const qEmb = await this.embedder.embed(q);
      similarities.push(cosineSimilarity(originalEmb, qEmb));
    }

    return similarities.reduce((a, b) => a + b, 0) / similarities.length;
  }

  /**
   * Context Precision : les chunks récupérés sont-ils pertinents ?
   */
  private async evaluateContextPrecision(input: RAGEvalInput): Promise<number> {
    let relevant = 0;

    for (const ctx of input.contexts) {
      const verdict = await this.llm.chat([
        {
          role: 'user',
          content: `Ce passage est-il pertinent pour répondre à la question ?
Question : "${input.question}"
Passage : "${ctx}"
Réponds uniquement "oui" ou "non".`,
        },
      ]);

      if (verdict.trim().toLowerCase().startsWith('oui')) {
        relevant++;
      }
    }

    return input.contexts.length > 0 ? relevant / input.contexts.length : 0;
  }

  /**
   * Context Recall : le contexte couvre-t-il la réponse de référence ?
   */
  private async evaluateContextRecall(input: RAGEvalInput): Promise<number> {
    if (!input.reference) return 0;

    const context = input.contexts.join('\n\n');
    const response = await this.llm.chat([
      {
        role: 'user',
        content: `Quelle proportion de la réponse de référence est couverte par le contexte ?
Référence : "${input.reference}"
Contexte : "${context}"
Réponds avec un nombre entre 0 et 1 (ex: 0.85).`,
      },
    ]);

    return parseFloat(response.trim()) || 0;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

---

## 5. Détection d'hallucinations

### Types d'hallucinations

| Type | Description | Exemple |
|------|-------------|---------|
| Factuelle | Invente des faits | "TypeScript a été créé en 2005" (faux : 2012) |
| Attribution | Attribue une source inexistante | "Selon la doc officielle..." (alors que la doc ne dit pas ça) |
| Contradiction | Contredit le contexte fourni | Le contexte dit X, la réponse dit Y |
| Fabrication | Invente des détails plausibles | URLs, numéros de version, noms de fonctions fictifs |

### Détecteur d'hallucinations

```typescript
interface HallucinationCheck {
  isHallucinated: boolean;
  confidence: number;
  hallucinations: Array<{
    claim: string;
    type: 'factual' | 'attribution' | 'contradiction' | 'fabrication';
    explanation: string;
  }>;
}

async function detectHallucinations(
  answer: string,
  contexts: string[],
  llm: { chat: (messages: Array<{ role: string; content: string }>) => Promise<string> },
): Promise<HallucinationCheck> {
  const context = contexts.join('\n---\n');

  const response = await llm.chat([
    {
      role: 'system',
      content: `Tu es un détecteur d'hallucinations. Analyse la réponse par rapport au contexte fourni.
Pour chaque affirmation de la réponse, vérifie si elle est supportée par le contexte.
Réponds en JSON.`,
    },
    {
      role: 'user',
      content: `## Contexte source
${context}

## Réponse à vérifier
${answer}

## Analyse requise
Identifie toutes les hallucinations (informations non supportées par le contexte).

Réponds en JSON :
{
  "hallucinations": [
    {
      "claim": "l'affirmation problématique",
      "type": "factual|attribution|contradiction|fabrication",
      "explanation": "pourquoi c'est une hallucination"
    }
  ],
  "total_claims": <nombre total d'affirmations>,
  "supported_claims": <nombre d'affirmations supportées>
}`,
    },
  ]);

  const parsed = JSON.parse(response);
  const hallucinationRate = 1 - (parsed.supported_claims / Math.max(parsed.total_claims, 1));

  return {
    isHallucinated: parsed.hallucinations.length > 0,
    confidence: hallucinationRate,
    hallucinations: parsed.hallucinations,
  };
}
```

---

## 6. A/B Testing de prompts

```typescript
interface ABTestResult {
  promptA: { id: string; wins: number; avgScore: number };
  promptB: { id: string; wins: number; avgScore: number };
  ties: number;
  totalTests: number;
  winner: 'A' | 'B' | 'tie';
  pValue: number;
}

class PromptABTester {
  constructor(
    private llm: { chat: (messages: Array<{ role: string; content: string }>) => Promise<string> },
    private judge: { chat: (messages: Array<{ role: string; content: string }>) => Promise<string> },
  ) {}

  async runTest(
    promptA: string,
    promptB: string,
    testQuestions: string[],
  ): Promise<ABTestResult> {
    let winsA = 0;
    let winsB = 0;
    let ties = 0;
    const scoresA: number[] = [];
    const scoresB: number[] = [];

    for (const question of testQuestions) {
      // Générer les réponses avec les deux prompts
      const [answerA, answerB] = await Promise.all([
        this.llm.chat([
          { role: 'system', content: promptA },
          { role: 'user', content: question },
        ]),
        this.llm.chat([
          { role: 'system', content: promptB },
          { role: 'user', content: question },
        ]),
      ]);

      // Juger les réponses
      const judgeResponse = await this.judge.chat([
        {
          role: 'user',
          content: `Compare ces deux réponses à la question "${question}".

Réponse A : ${answerA}
Réponse B : ${answerB}

Réponds en JSON :
{"winner": "A"|"B"|"tie", "scoreA": 1-5, "scoreB": 1-5, "reason": "..."}`,
        },
      ]);

      const verdict = JSON.parse(judgeResponse);
      scoresA.push(verdict.scoreA);
      scoresB.push(verdict.scoreB);

      if (verdict.winner === 'A') winsA++;
      else if (verdict.winner === 'B') winsB++;
      else ties++;
    }

    const avgA = scoresA.reduce((a, b) => a + b, 0) / scoresA.length;
    const avgB = scoresB.reduce((a, b) => a + b, 0) / scoresB.length;

    return {
      promptA: { id: 'A', wins: winsA, avgScore: avgA },
      promptB: { id: 'B', wins: winsB, avgScore: avgB },
      ties,
      totalTests: testQuestions.length,
      winner: winsA > winsB ? 'A' : winsB > winsA ? 'B' : 'tie',
      pValue: this.computePValue(winsA, winsB, ties),
    };
  }

  private computePValue(winsA: number, winsB: number, _ties: number): number {
    // Approximation simplifiée via test binomial
    const total = winsA + winsB;
    if (total === 0) return 1;
    const p = winsA / total;
    const z = (p - 0.5) / Math.sqrt(0.25 / total);
    // Approximation de la p-value bilatérale
    return 2 * (1 - normalCDF(Math.abs(z)));
  }
}

function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}
```

---

## 7. Observabilité : Langfuse et Langsmith

### Langfuse — plateforme open source

```
┌──────────────────────────────────────────────────┐
│  Votre Application                                │
│  ┌────────────────────────────────────────────┐   │
│  │  Langfuse SDK                               │   │
│  │  - Traces (chaque requête utilisateur)      │   │
│  │  - Spans (étapes : embedding, retrieval...) │   │
│  │  - Generations (appels LLM)                 │   │
│  │  - Scores (évaluation automatique)          │   │
│  └────────────────────┬───────────────────────┘   │
└───────────────────────┼──────────────────────────┘
                        │ HTTPS
                        ▼
┌──────────────────────────────────────────────────┐
│  Langfuse Server (self-hosted ou cloud)           │
│  - Dashboard (latence, coût, scores)              │
│  - Traces explorer                                │
│  - Prompt management                              │
│  - Evaluation datasets                            │
└──────────────────────────────────────────────────┘
```

### Langfuse vs Langsmith

| Critère | Langfuse | Langsmith |
|---------|----------|-----------|
| Open source | Oui (MIT) | Non |
| Self-hosted | Oui | Non (cloud LangChain) |
| Prix | Gratuit (self-hosted) | Freemium |
| Intégration | SDK générique | Optimisé LangChain |
| Dashboard | Complet | Très complet |
| Prompt management | Oui | Oui |
| Évaluation | Oui | Oui (plus avancé) |

---

## 8. Implémentation d'un logger d'interactions

```typescript
// src/observability/llm-logger.ts

interface LogEntry {
  id: string;
  timestamp: string;
  traceId: string;
  spanType: 'embedding' | 'retrieval' | 'generation' | 'evaluation';
  model?: string;
  input: unknown;
  output: unknown;
  durationMs: number;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number;
  metadata?: Record<string, unknown>;
}

interface TraceStats {
  totalDurationMs: number;
  totalCost: number;
  totalTokens: number;
  spanCount: number;
  spans: LogEntry[];
}

class LLMLogger {
  private logs: LogEntry[] = [];
  private traceMap = new Map<string, LogEntry[]>();

  /**
   * Wrapper pour mesurer automatiquement un appel LLM
   */
  async trace<T>(
    traceId: string,
    spanType: LogEntry['spanType'],
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>,
  ): Promise<T> {
    const start = performance.now();
    const id = `${traceId}-${spanType}-${Date.now()}`;

    try {
      const result = await fn();
      const durationMs = Math.round(performance.now() - start);

      const entry: LogEntry = {
        id,
        timestamp: new Date().toISOString(),
        traceId,
        spanType,
        input: metadata?.input,
        output: metadata?.output ?? (typeof result === 'string' ? result.slice(0, 200) : '...'),
        durationMs,
        model: metadata?.model as string,
        tokenUsage: metadata?.tokenUsage as LogEntry['tokenUsage'],
        cost: this.estimateCost(metadata),
        metadata,
      };

      this.logs.push(entry);
      if (!this.traceMap.has(traceId)) this.traceMap.set(traceId, []);
      this.traceMap.get(traceId)!.push(entry);

      return result;
    } catch (error) {
      const durationMs = Math.round(performance.now() - start);

      this.logs.push({
        id,
        timestamp: new Date().toISOString(),
        traceId,
        spanType,
        input: metadata?.input,
        output: { error: error instanceof Error ? error.message : 'Unknown' },
        durationMs,
        metadata: { ...metadata, error: true },
      });

      throw error;
    }
  }

  /**
   * Obtenir les stats d'une trace complète
   */
  getTraceStats(traceId: string): TraceStats | null {
    const spans = this.traceMap.get(traceId);
    if (!spans) return null;

    return {
      totalDurationMs: spans.reduce((sum, s) => sum + s.durationMs, 0),
      totalCost: spans.reduce((sum, s) => sum + (s.cost ?? 0), 0),
      totalTokens: spans.reduce(
        (sum, s) => sum + (s.tokenUsage?.total ?? 0),
        0,
      ),
      spanCount: spans.length,
      spans,
    };
  }

  /**
   * Dashboard des métriques agrégées
   */
  getDashboard(since?: Date): {
    totalRequests: number;
    avgLatencyMs: number;
    totalCost: number;
    totalTokens: number;
    errorRate: number;
    modelBreakdown: Record<string, { count: number; avgLatency: number; cost: number }>;
  } {
    const filtered = since
      ? this.logs.filter((l) => new Date(l.timestamp) >= since)
      : this.logs;

    const generations = filtered.filter((l) => l.spanType === 'generation');
    const errors = filtered.filter((l) => l.metadata?.error);

    const modelBreakdown: Record<string, { count: number; totalLatency: number; cost: number }> = {};
    for (const gen of generations) {
      const model = gen.model ?? 'unknown';
      if (!modelBreakdown[model]) {
        modelBreakdown[model] = { count: 0, totalLatency: 0, cost: 0 };
      }
      modelBreakdown[model].count++;
      modelBreakdown[model].totalLatency += gen.durationMs;
      modelBreakdown[model].cost += gen.cost ?? 0;
    }

    return {
      totalRequests: filtered.length,
      avgLatencyMs: filtered.length > 0
        ? Math.round(filtered.reduce((s, l) => s + l.durationMs, 0) / filtered.length)
        : 0,
      totalCost: filtered.reduce((s, l) => s + (l.cost ?? 0), 0),
      totalTokens: filtered.reduce((s, l) => s + (l.tokenUsage?.total ?? 0), 0),
      errorRate: filtered.length > 0 ? errors.length / filtered.length : 0,
      modelBreakdown: Object.fromEntries(
        Object.entries(modelBreakdown).map(([model, data]) => [
          model,
          {
            count: data.count,
            avgLatency: Math.round(data.totalLatency / data.count),
            cost: data.cost,
          },
        ]),
      ),
    };
  }

  private estimateCost(metadata?: Record<string, unknown>): number {
    if (!metadata?.tokenUsage) return 0;

    const usage = metadata.tokenUsage as { prompt: number; completion: number };
    const model = (metadata.model as string) ?? '';

    // Prix par million de tokens (estimation 2025)
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-sonnet-4-6': { input: 3, output: 15 },
      'claude-opus-4-6': { input: 15, output: 75 },
      'gpt-4o': { input: 2.5, output: 10 },
      'llama3.1:8b': { input: 0, output: 0 }, // Local = gratuit
    };

    const price = pricing[model] ?? { input: 0, output: 0 };
    return (
      (usage.prompt * price.input + usage.completion * price.output) / 1_000_000
    );
  }
}

// Utilisation dans le service de chat
const logger = new LLMLogger();

async function ragChat(question: string): Promise<string> {
  const traceId = `trace-${Date.now()}`;

  // Étape 1 : Embedding
  const embedding = await logger.trace(traceId, 'embedding', async () => {
    return await embedder.embed(question);
  }, { model: 'nomic-embed-text', input: question });

  // Étape 2 : Retrieval
  const chunks = await logger.trace(traceId, 'retrieval', async () => {
    return await vectorStore.search(embedding, 5);
  }, { input: question });

  // Étape 3 : Generation
  const answer = await logger.trace(traceId, 'generation', async () => {
    return await llm.chat([
      { role: 'system', content: buildPrompt(chunks) },
      { role: 'user', content: question },
    ]);
  }, {
    model: 'llama3.1:8b',
    input: question,
    tokenUsage: { prompt: 500, completion: 200, total: 700 },
  });

  // Stats
  const stats = logger.getTraceStats(traceId);
  console.log(`Trace ${traceId}: ${stats?.totalDurationMs}ms, $${stats?.totalCost.toFixed(4)}`);

  return answer;
}
```

---

## 9. Dashboard d'alerting

```typescript
// src/observability/alerting.ts

interface Alert {
  id: string;
  type: 'latency' | 'cost' | 'hallucination' | 'error_rate';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: string;
  value: number;
  threshold: number;
}

interface AlertConfig {
  latencyWarningMs: number;    // ex: 5000ms
  latencyCriticalMs: number;   // ex: 15000ms
  costDailyLimit: number;      // ex: $10
  hallucinationThreshold: number; // ex: 0.2 (20%)
  errorRateThreshold: number;  // ex: 0.05 (5%)
}

class AlertManager {
  private alerts: Alert[] = [];

  constructor(private config: AlertConfig) {}

  check(dashboard: {
    avgLatencyMs: number;
    totalCost: number;
    errorRate: number;
    hallucinationRate?: number;
  }): Alert[] {
    const newAlerts: Alert[] = [];

    // Latence
    if (dashboard.avgLatencyMs > this.config.latencyCriticalMs) {
      newAlerts.push(this.createAlert('latency', 'critical',
        `Latence moyenne critique : ${dashboard.avgLatencyMs}ms`,
        dashboard.avgLatencyMs, this.config.latencyCriticalMs));
    } else if (dashboard.avgLatencyMs > this.config.latencyWarningMs) {
      newAlerts.push(this.createAlert('latency', 'warning',
        `Latence moyenne élevée : ${dashboard.avgLatencyMs}ms`,
        dashboard.avgLatencyMs, this.config.latencyWarningMs));
    }

    // Coût
    if (dashboard.totalCost > this.config.costDailyLimit) {
      newAlerts.push(this.createAlert('cost', 'critical',
        `Budget quotidien dépassé : $${dashboard.totalCost.toFixed(2)}`,
        dashboard.totalCost, this.config.costDailyLimit));
    }

    // Taux d'erreur
    if (dashboard.errorRate > this.config.errorRateThreshold) {
      newAlerts.push(this.createAlert('error_rate', 'critical',
        `Taux d'erreur élevé : ${(dashboard.errorRate * 100).toFixed(1)}%`,
        dashboard.errorRate, this.config.errorRateThreshold));
    }

    // Hallucinations
    if (dashboard.hallucinationRate !== undefined &&
        dashboard.hallucinationRate > this.config.hallucinationThreshold) {
      newAlerts.push(this.createAlert('hallucination', 'warning',
        `Taux d'hallucination élevé : ${(dashboard.hallucinationRate * 100).toFixed(1)}%`,
        dashboard.hallucinationRate, this.config.hallucinationThreshold));
    }

    this.alerts.push(...newAlerts);
    return newAlerts;
  }

  private createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    message: string,
    value: number,
    threshold: number,
  ): Alert {
    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      severity,
      message,
      timestamp: new Date().toISOString(),
      value,
      threshold,
    };
  }

  getAlerts(since?: Date): Alert[] {
    if (!since) return this.alerts;
    return this.alerts.filter((a) => new Date(a.timestamp) >= since);
  }
}
```

---

## Résumé du module

| Concept | Points clés |
|---------|-------------|
| BLEU/ROUGE | Métriques textuelles basées sur les n-grammes. Utiles mais limitées |
| Perplexité | Mesure la "surprise" du modèle. Plus basse = meilleur |
| LLM-as-Judge | Un LLM évalue la qualité d'un autre LLM. Standard de l'industrie |
| Faithfulness | La réponse RAG est-elle fidèle au contexte récupéré ? |
| Answer Relevancy | La réponse répond-elle bien à la question posée ? |
| Context Precision | Les chunks récupérés sont-ils pertinents ? |
| Hallucinations | Affirmations non supportées par le contexte source |
| Observabilité | Traces, latence, coût, taux d'erreur — monitoring continu |
| Langfuse | Plateforme open source d'observabilité LLM |
| Alerting | Seuils sur latence, coût, hallucinations, erreurs |

---

## Exercices pratiques

1. **Métriques** : Implémentez BLEU et ROUGE, testez sur 10 paires question/réponse vs référence
2. **LLM-as-Judge** : Créez un évaluateur qui compare les réponses de 2 modèles Ollama sur 20 questions
3. **RAG Eval** : Évaluez votre pipeline RAG du module 15 avec les 4 métriques (faithfulness, relevancy, précision, recall)
4. **Logger** : Intégrez le LLMLogger dans votre chatbot et créez un endpoint /metrics qui retourne le dashboard
5. **Alertes** : Configurez des alertes et simulez des scénarios de dépassement de seuil

---

<!-- parcours-recommande -->

::: tip Parcours recommandé
1. **Screencast** : [screencast 16 évaluation llm](../screencasts/screencast-16-evaluation-llm.md)
2. **Lab** : [lab-16-évaluation-observabilité](../labs/lab-16-evaluation-observabilite/README)
3. **Quiz** : [quiz 16 évaluation llm](../quizzes/quiz-16-evaluation-llm.html)
:::
