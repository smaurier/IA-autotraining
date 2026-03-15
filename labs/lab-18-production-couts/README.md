# Lab 18 — Production et couts

## Objectifs

- Calculer le cout mensuel d'utilisation d'un LLM
- Implementer un cache semantique par similarite vectorielle
- Appliquer un rate limiting par token bucket
- Selectionner un modèle de fallback en cas d'indisponibilite
- Optimiser un prompt en reduisant les espaces inutiles
- Générer un rapport de couts par modèle

## Exercices

### 1. `calculateMonthlyCost(dailyRequests: number, avgInputTokens: number, avgOutputTokens: number, model: string): number`

Calcule le cout mensuel (30 jours). Prix par token : `gpt-4` = $0.03/$0.06 par 1K tokens, `gpt-3.5-turbo` = $0.001/$0.002, defaut = $0.01/$0.03.

### 2. `buildSemanticCacheKey(embedding: number[], threshold: number, cache: { key: number[]; value: string }[]): string | null`

Cherche dans le cache une entree dont la similarite cosinus avec `embedding` dépasse `threshold`. Retourne la valeur trouvee ou `null`.

### 3. `applyRateLimit(bucket: { tokens: number; lastRefill: number; capacity: number; refillRate: number }, now: number): { allowed: boolean; remaining: number }`

Applique un rate limiting par token bucket : recharge les tokens selon le temps ecoule, puis consomme 1 token si disponible.

### 4. `selectFallbackModel(primary: string, available: string[], status: Record<string, boolean>): string`

Retourne le modèle primaire s'il est disponible, sinon le premier modèle disponible dans la liste. Leve une erreur si aucun modèle n'est disponible.

### 5. `optimizePrompt(prompt: string): string`

Optimise un prompt : supprime les espaces multiples, trim, supprime les lignes vides consecutives.

### 6. `buildCostReport(traces: { model: string; inputTokens: number; outputTokens: number }[]): { byModel: Record<string, number>; total: number }`

Genere un rapport de couts par modèle. Utilise les memes prix que `calculateMonthlyCost`.
