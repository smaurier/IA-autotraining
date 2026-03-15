# Lab 02 — Prompting Avance

## Objectifs

- Construire des prompts ReAct (Thought/Action/Observation)
- Implementer le Tree of Thought
- Detecter et neutraliser les injections de prompt
- Chainer des prompts

## Exercices

### 1. `buildReActPrompt(question: string, tools: string[]): string`

Genere un prompt au format ReAct avec la liste des outils disponibles et le format attendu (Thought/Action/Observation).

### 2. `buildTreeOfThought(problem: string, numPaths: number): string`

Genere un prompt demandant au LLM d'explorer `numPaths` chemins de raisonnement différents avant de choisir le meilleur.

### 3. `detectPromptInjection(input: string): boolean`

Detecte les tentatives d'injection courantes : "ignore previous", "ignore all", "disregard", "system prompt", "jailbreak", etc.

### 4. `sanitizeUserInput(input: string): string`

Neutralise les tentatives d'injection en encapsulant l'input utilisateur dans des delimiteurs et en echappant les patterns dangereux.

### 5. `buildPromptChain(steps: PromptStep[]): string[]`

Genere une chaine de prompts ou chaque étape peut referencer la sortie de l'étape précédente via `{{previous}}`.

```typescript
interface PromptStep {
  instruction: string;  // peut contenir {{previous}}
}
```

## Lancer les tests

```bash
npx tsx exercise.ts
```
