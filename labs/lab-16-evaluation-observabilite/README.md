# Lab 16 — Évaluation et observabilité

## Objectifs

- Calculer la fidelite (faithfulness) d'une réponse par rapport au contexte
- Detecter les hallucinations dans une réponse
- Construire un dataset d'évaluation structure
- Exécuter un A/B test entre deux prompts
- Créer une trace d'appel LLM avec estimation du cout
- Agreger les metriques de performance d'un pipeline

## Exercices

### 1. `calculateFaithfulness(answer: string, context: string): number`

Calcule la fraction des phrases de la réponse qui se retrouvent (en substance) dans le contexte. Decoupe la réponse en phrases (separateur `. `) et vérifié si chaque phrase est contenue dans le contexte.

### 2. `detectHallucination(answer: string, context: string): { hasHallucination: boolean; claims: string[] }`

Detecte les hallucinations : extrait les phrases de la réponse et identifie celles qui ne sont pas supportees par le contexte.

### 3. `buildEvalDataset(items: { q: string; ctx: string; expected: string; actual: string }[]): { question: string; context: string; expected: string; actual: string; match: boolean }[]`

Construit un dataset d'évaluation en comparant les réponses attendues et reelles.

### 4. `runABTest(promptA: string, promptB: string, scores: { a: number; b: number }[]): { winner: string; avgA: number; avgB: number }`

Execute un A/B test : calcule les moyennes des scores et déterminé le gagnant.

### 5. `createLlmTrace(data: { prompt: string; completion: string; tokensIn: number; tokensOut: number; latencyMs: number; model: string }): object`

Cree une trace d'appel LLM avec timestamp, cout estime (tokensIn * 0.00001 + tokensOut * 0.00003) et les donnees d'entree.

### 6. `aggregateMetrics(traces: { latencyMs: number; cost: number; tokensIn: number; tokensOut: number }[]): { p50Latency: number; p95Latency: number; totalCost: number; avgTokens: number }`

Agrege les metriques : percentiles de latence (p50, p95), cout total, tokens moyens (in + out).
