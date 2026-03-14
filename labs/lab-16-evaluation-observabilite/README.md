# Lab 16 — Evaluation et observabilite

## Objectifs

- Calculer la fidelite (faithfulness) d'une reponse par rapport au contexte
- Detecter les hallucinations dans une reponse
- Construire un dataset d'evaluation structure
- Executer un A/B test entre deux prompts
- Creer une trace d'appel LLM avec estimation du cout
- Agreger les metriques de performance d'un pipeline

## Exercices

### 1. `calculateFaithfulness(answer: string, context: string): number`

Calcule la fraction des phrases de la reponse qui se retrouvent (en substance) dans le contexte. Decoupe la reponse en phrases (separateur `. `) et verifie si chaque phrase est contenue dans le contexte.

### 2. `detectHallucination(answer: string, context: string): { hasHallucination: boolean; claims: string[] }`

Detecte les hallucinations : extrait les phrases de la reponse et identifie celles qui ne sont pas supportees par le contexte.

### 3. `buildEvalDataset(items: { q: string; ctx: string; expected: string; actual: string }[]): { question: string; context: string; expected: string; actual: string; match: boolean }[]`

Construit un dataset d'evaluation en comparant les reponses attendues et reelles.

### 4. `runABTest(promptA: string, promptB: string, scores: { a: number; b: number }[]): { winner: string; avgA: number; avgB: number }`

Execute un A/B test : calcule les moyennes des scores et determine le gagnant.

### 5. `createLlmTrace(data: { prompt: string; completion: string; tokensIn: number; tokensOut: number; latencyMs: number; model: string }): object`

Cree une trace d'appel LLM avec timestamp, cout estime (tokensIn * 0.00001 + tokensOut * 0.00003) et les donnees d'entree.

### 6. `aggregateMetrics(traces: { latencyMs: number; cost: number; tokensIn: number; tokensOut: number }[]): { p50Latency: number; p95Latency: number; totalCost: number; avgTokens: number }`

Agrege les metriques : percentiles de latence (p50, p95), cout total, tokens moyens (in + out).
