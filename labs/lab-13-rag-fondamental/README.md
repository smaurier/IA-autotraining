# Lab 13 — RAG fondamental

## Objectifs

- Decouper un texte en chunks de taille fixe avec overlap
- Decouper un texte par phrases avec une taille maximale par chunk
- Construire un prompt augmente avec des chunks de contexte
- Rechercher les documents les plus pertinents par similarite vectorielle
- Calculer des statistiques sur les chunks
- Formater des citations numerotees

## Exercices

### 1. `chunkText(text: string, size: number, overlap: number): string[]`

Decoupe un texte en chunks de `size` caracteres avec un chevauchement de `overlap` caracteres entre chunks consecutifs.

### 2. `chunkBySentence(text: string, maxChunkSize: number): string[]`

Decoupe un texte en chunks en regroupant des phrases (separees par `. `) sans depasser `maxChunkSize` caracteres par chunk.

### 3. `buildAugmentedPrompt(systemPrompt: string, chunks: string[], question: string): string`

Construit un prompt augmente : system prompt, puis les chunks de contexte numerotes, puis la question de l'utilisateur.

### 4. `searchDocuments(query: number[], docs: { text: string; vector: number[] }[], topK: number): string[]`

Recherche les `topK` documents les plus proches du vecteur requete et retourne leurs textes.

### 5. `calculateChunkStats(chunks: string[]): { count: number; avgLength: number; minLength: number; maxLength: number }`

Calcule les statistiques sur un tableau de chunks : nombre, longueur moyenne, min et max.

### 6. `formatCitations(chunks: string[]): string`

Formate les chunks en citations numerotees : `[1] chunk1\n[2] chunk2\n...`
