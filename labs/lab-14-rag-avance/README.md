# Lab 14 — RAG avance

## Objectifs

- Implementer une recherche hybride (vectorielle + textuelle)
- Générer des reformulations de requête (multi-query)
- Decouper un texte en chunks parent/enfant hierarchiques
- Filtrer des documents par metadonnees
- Reordonner des résultats par chevauchement de mots-clés

## Exercices

### 1. `hybridSearch(queryVec: number[], queryText: string, docs: { text: string; vector: number[] }[], vectorWeight: number): { text: string; score: number }[]`

Combine une recherche vectorielle (similarite cosinus) et une recherche textuelle (fraction de mots de la requête presents dans le document). Le score final est `vectorWeight * vectorScore + (1 - vectorWeight) * textScore`. Retourne les résultats tries par score decroissant.

### 2. `generateMultiQuery(original: string): string[]`

Genere 3 reformulations d'une requête : une version plus spécifique, une version plus générale, et une version en anglais.

### 3. `parentChildChunk(text: string, smallSize: number, parentSize: number): { parent: string; children: string[] }[]`

Decoupe le texte en chunks parents de `parentSize` caracteres, puis chaque parent en chunks enfants de `smallSize` caracteres.

### 4. `metadataFilter(docs: { text: string; metadata: Record<string, string> }[], filters: Record<string, string>): { text: string; metadata: Record<string, string> }[]`

Filtre les documents dont les metadonnees correspondent a tous les filtres specifies.

### 5. `rerankByKeywordOverlap(query: string, results: { text: string; score: number }[]): { text: string; score: number }[]`

Reordonne les résultats en ajoutant au score existant la fraction de mots de la requête presents dans le texte du résultat. Retourne les résultats tries par score decroissant.
