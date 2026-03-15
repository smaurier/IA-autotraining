# Lab 00 — Paysage IA

## Objectifs

- Comprendre la différence entre modèles proprietaires et open-source
- Estimer le nombre de tokens d'un texte
- Calculer le cout d'un appel API
- Comparer des modèles selon différents criteres

## Exercices

### 1. `classifyModel(name: string): 'proprietary' | 'open-source'`

Classifie un modèle comme proprietaire ou open-source.

Modeles proprietaires : `gpt-4`, `gpt-3.5-turbo`, `claude-3-opus`, `claude-3-sonnet`, `claude-3-haiku`, `gemini-pro`, `gemini-ultra`.
Tout autre modèle est considere open-source (ex: `llama-3`, `mistral-7b`, `mixtral-8x7b`).

### 2. `estimateTokenCount(text: string): number`

Estime le nombre de tokens d'un texte en utilisant l'approximation : `nombre de caracteres / 4`, arrondi a l'entier superieur.

### 3. `calculateCost(inputTokens: number, outputTokens: number, pricing: { inputPricePerMillion: number; outputPricePerMillion: number }): number`

Calcule le cout d'un appel API en dollars.

### 4. `compareModels(models: Model[], criteria: 'speed' | 'cost' | 'quality'): Model[]`

Trie un tableau de modèles par le critere donne (ordre croissant pour `cost` et `speed`, decroissant pour `quality`).

```typescript
interface Model {
  name: string;
  speed: number;    // tokens/seconde
  cost: number;     // $/million tokens
  quality: number;  // score 0-100
}
```

## Lancer les tests

```bash
npx tsx exercise.ts
# ou pour verifier la solution :
npx tsx solution.ts
```
