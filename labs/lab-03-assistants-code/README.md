# Lab 03 — Assistants Code

## Objectifs

- Comprendre les fichiers de configuration des assistants code (Claude, Cursor, etc.)
- Parser et générer des fichiers CLAUDE.md
- Construire des regles Cursor
- Analyser des prompts de code review
- Mesurer le gain de productivite avec un assistant IA

## Exercices

### 1. `parseClaudeMd(content: string): { sections: { title: string, content: string }[] }`

Parse un fichier CLAUDE.md au format "## Title\ncontent". Chaque section commence par `## ` et contient tout le texte jusqu'à la section suivante.

### 2. `generateClaudeMd(config: { project: string, conventions: string[], commands: { name: string, cmd: string }[] }): string`

Genere un fichier CLAUDE.md structure avec :
- Un titre `# {project}`
- Une section `## Conventions` avec chaque convention en liste a puces
- Une section `## Commands` avec chaque commande au format `- **{name}**: `{cmd}``

### 3. `buildCursorRules(rules: string[]): string`

Assemble des regles Cursor en les joignant avec des retours à la ligne.

### 4. `analyzeCodeReviewPrompt(diff: string, focus: string): string`

Construit un prompt structure de code review contenant :
- Le diff dans un bloc code
- Le focus d'analyse demandé

### 5. `estimateProductivityGain(tasksWithAi: number, tasksWithout: number, avgTimeWithAi: number, avgTimeWithout: number): { speedup: number, timeSaved: number }`

Calcule le gain de productivite :
- `speedup` = avgTimeWithout / avgTimeWithAi
- `timeSaved` = (tasksWithout * avgTimeWithout) - (tasksWithAi * avgTimeWithAi)

## Lancer les tests

```bash
npx tsx exercise.ts
```
