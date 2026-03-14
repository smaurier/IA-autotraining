# Lab 01 — Prompting Fondamental

## Objectifs

- Construire des prompts systeme structures
- Utiliser le few-shot prompting
- Appliquer le Chain of Thought
- Formater les sorties en JSON
- Valider la qualite d'un prompt

## Exercices

### 1. `buildSystemPrompt(config: SystemPromptConfig): string`

Genere un prompt systeme structure a partir d'une configuration.

```typescript
interface SystemPromptConfig {
  role: string;        // ex: "Tu es un assistant specialise en JavaScript"
  context: string;     // ex: "L'utilisateur est un developpeur junior"
  constraints: string[]; // ex: ["Reponds en francais", "Limite a 200 mots"]
  outputFormat: string;  // ex: "Reponds en JSON"
}
```

Le prompt doit contenir des sections `# Role`, `# Contexte`, `# Contraintes`, `# Format de sortie`.

### 2. `buildFewShotPrompt(examples: Example[], query: string): string`

Construit un prompt few-shot avec des exemples et la question finale.

```typescript
interface Example {
  input: string;
  output: string;
}
```

### 3. `buildChainOfThought(prompt: string): string`

Ajoute l'instruction "Reflechis etape par etape" au prompt.

### 4. `formatJsonOutput(rawResponse: string): Record<string, unknown> | null`

Extrait et parse le JSON d'une reponse LLM (qui peut contenir du texte avant/apres le JSON ou des blocs ```json).

### 5. `validatePrompt(prompt: string): ValidationResult`

Verifie un prompt pour des anti-patterns courants.

```typescript
interface ValidationResult {
  isValid: boolean;
  warnings: string[];
}
```

Regles :
- Trop court (< 10 caracteres) → warning
- Pas de contexte (ne contient ni "tu es" ni "you are" en case-insensitive) → warning
- Si le prompt est vide → invalide

## Lancer les tests

```bash
npx tsx exercise.ts
```
