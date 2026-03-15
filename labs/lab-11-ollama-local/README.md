# Lab 11 — Ollama en local

## Objectifs

- Construire une requête pour l'API Ollama
- Parser une réponse streaming NDJSON
- Générer un Modelfile pour personnaliser un modèle
- Estimer la VRAM nécessaire pour un modèle
- Selectionner le meilleur modèle selon les contraintes materielles

## Exercices

### 1. `buildOllamaRequest(model: string, prompt: string, options?: { temperature?: number; top_p?: number }): object`

Construit un objet de requête pour l'API `/api/generate` d'Ollama avec `stream: false` et les options facultatives.

### 2. `parseStreamResponse(chunks: string[]): string`

Parse un tableau de lignes NDJSON (chaque ligne contient un champ `"response"`), extrait et concatene toutes les valeurs `response`.

### 3. `buildModelfile(from: string, system: string, params: { name: string; value: string | number }[]): string`

Genere le contenu d'un Modelfile Ollama avec les directives `FROM`, `SYSTEM` et `PARAMETER`.

### 4. `estimateVramGB(paramsBillion: number, quantBits: number): number`

Estime la VRAM requise en Go : `(paramsBillion * quantBits) / 8 + 2` (2 Go d'overhead).

### 5. `selectBestModel(available: { name: string; params: number; quality: number }[], maxVram: number): { name: string; params: number; quality: number } | null`

Selectionne le modèle de meilleure qualite dont la VRAM estimee (quantification 4 bits) ne dépasse pas `maxVram`. Retourne `null` si aucun modèle ne convient.
