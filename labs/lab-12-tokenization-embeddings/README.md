# Lab 12 — Tokenization et embeddings

## Objectifs

- Comprendre le mécanisme de Byte Pair Encoding (BPE)
- Calculer la similarite cosinus entre vecteurs
- Rechercher les documents les plus similaires à une requête
- Construire un index de recherche semantique
- Implementer un tokenizer greedy par vocabulaire

## Exercices

### 1. `simpleBPEStep(tokens: string[], pair: [string, string], merged: string): string[]`

Effectue une étape de fusion BPE : parcourt le tableau de tokens et fusionne chaque occurrence consecutive de `pair[0]` + `pair[1]` en `merged`.

### 2. `cosineSimilarity(a: number[], b: number[]): number`

Calcule la similarite cosinus entre deux vecteurs de même dimension.

### 3. `findMostSimilar(query: number[], corpus: { id: string; vector: number[] }[]): { id: string; similarity: number }`

Trouve le document du corpus le plus similaire au vecteur `query` (par similarite cosinus).

### 4. `buildIndex(docs: { id: string; text: string; vector: number[] }[]): { id: string; text: string; vector: number[] }[]`

Construit un index de recherche à partir d'un tableau de documents (retourne une copie triee par id).

### 5. `semanticSearch(queryVector: number[], index: { id: string; text: string; vector: number[] }[], topK: number): { id: string; score: number }[]`

Recherche semantique : retourne les `topK` documents les plus proches du vecteur requête, tries par score decroissant.

### 6. `tokenize(text: string, vocab: string[]): string[]`

Tokenize un texte en utilisant un algorithme greedy longest-match sur le vocabulaire fourni. Les caracteres non reconnus deviennent `[UNK]`.
