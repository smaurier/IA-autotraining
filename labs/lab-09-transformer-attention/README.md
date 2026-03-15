# Lab 09 — Transformer & Attention

## Objectifs

- Comprendre les embeddings et la table de lookup
- Implementer le positional encoding (sin/cos)
- Implementer le mécanisme de Scaled Dot-Product Attention
- Implementer la normalisation de couche (Layer Norm)
- Tokeniser et detokeniser du texte

## Exercices

### 1. `createEmbeddingTable(vocabSize: number, dim: number): number[][]`

Cree une table d'embeddings de taille `vocabSize x dim` avec des valeurs aleatoires entre -1 et 1.

### 2. `lookupEmbedding(table: number[][], tokenId: number): number[]`

Retourne le vecteur d'embedding correspondant à un token ID.

### 3. `positionalEncoding(position: number, dim: number): number[]`

Genere le vecteur de positional encoding pour une position donnee :
- Position paire `2i` : `sin(position / 10000^(2i/dim))`
- Position impaire `2i+1` : `cos(position / 10000^(2i/dim))`

### 4. `scaledDotProductAttention(Q: number[][], K: number[][], V: number[][]): number[][]`

Calcule l'attention :
1. Scores = Q * K^T
2. Scale = scores / sqrt(d_k) ou `d_k` = nombre de colonnes de K
3. Applique softmax sur chaque ligne
4. Résultat = scores * V

### 5. `layerNorm(v: number[]): number[]`

Normalise un vecteur : `(v[i] - mean) / std` pour chaque élément. Si std = 0, retourne un vecteur de zeros.

### 6. `simpleTokenize(text: string): string[]`

Tokenise un texte en splitant sur les espaces et la ponctuation. La ponctuation devient un token separe.

### 7. `detokenize(tokens: string[]): string`

Reconstruit le texte en joignant les tokens avec des espaces.

## Lancer les tests

```bash
npx tsx exercise.ts
```
