# Lab 19 — Projet final

## Objectifs

- Assembler un pipeline RAG complet de bout en bout
- Ingerer et decouper un document en chunks
- Rechercher dans une base de connaissances par similarite vectorielle
- Construire un prompt de chat integrant contexte et historique
- Evaluer la qualite d'une reponse (fidelite et pertinence)
- Calculer le cout total d'un pipeline multi-etapes

## Exercices

### 1. `ingestDocument(text: string, chunkSize: number, overlap: number): { chunks: string[]; count: number }`

Ingere un document : le decoupe en chunks avec overlap et retourne les chunks avec leur nombre.

### 2. `searchKnowledgeBase(query: number[], kb: { text: string; vector: number[] }[], topK: number): string[]`

Recherche les `topK` documents les plus pertinents dans la base de connaissances par similarite cosinus.

### 3. `buildChatPipeline(question: string, context: string[], history: string[]): string`

Construit le prompt final du pipeline : historique de conversation, contexte RAG, puis la question.

### 4. `evaluateResponse(answer: string, context: string): { faithfulness: number; relevancy: number }`

Evalue la qualite d'une reponse : `faithfulness` = fraction de phrases supportees par le contexte, `relevancy` = fraction de mots-cles du contexte presents dans la reponse.

### 5. `calculatePipelineCost(steps: { model: string; tokens: number }[]): number`

Calcule le cout total d'un pipeline multi-etapes. Prix par 1K tokens : `embedding` = $0.0001, `gpt-4` = $0.03, `gpt-3.5-turbo` = $0.001, defaut = $0.01.
