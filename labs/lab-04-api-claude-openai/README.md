# Lab 04 — API Claude & OpenAI

## Objectifs

- Construire un historique de messages valide pour les API LLM
- Définir des schemas d'outils (tool use / function calling)
- Parser les réponses de tool calls
- Calculer les couts d'API selon les modèles
- Simuler le streaming SSE
- Implementer un retry avec backoff exponentiel

## Exercices

### 1. `buildMessageHistory(turns: { role: string, content: string }[]): { role: string, content: string }[]`

Valide et retourne l'historique de messages. Les roles doivent alterner entre "user" et "assistant". Si deux messages consecutifs ont le même role, lancer une erreur.

### 2. `defineToolSchema(name: string, description: string, params: { name: string, type: string, required: boolean }[]): object`

Genere un schema JSON pour un outil au format API (avec `name`, `description`, `input_schema` contenant `type: "object"`, `properties` et `required`).

### 3. `parseToolCall(response: { type: string, name?: string, input?: any }[]): { name: string, input: any } | null`

Trouve le premier bloc de type `"tool_use"` dans la réponse et retourne `{ name, input }`. Retourne `null` si aucun tool use.

### 4. `calculateApiCost(inputTokens: number, outputTokens: number, model: string): number`

Calcule le cout en dollars selon la table de prix :
- `gpt-4o` : input $2.50/1M, output $10.00/1M
- `gpt-4o-mini` : input $0.15/1M, output $0.60/1M
- `claude-sonnet` : input $3.00/1M, output $15.00/1M
- `claude-haiku` : input $0.25/1M, output $1.25/1M

### 5. `buildStreamChunks(text: string, chunkSize: number): string[]`

Decoupe un texte en morceaux de `chunkSize` caracteres, simulant des chunks SSE.

### 6. `retryWithBackoff(attempt: number, baseMs: number): number`

Retourne le delai en ms avant le prochain retry : `baseMs * 2^attempt`.

## Lancer les tests

```bash
npx tsx exercise.ts
```
