# Screencast 14 — RAG Avance

## Informations
- **Duree estimee** : 20-25 min
- **Module** : `modules/14-rag-avance.md`
- **Lab associe** : `labs/lab-14-rag-avance/`
- **Prerequis** : Module 13 complete, pipeline RAG fondamental fonctionnel

## Setup
- [ ] Pipeline RAG du module 13 fonctionnel
- [ ] Ollama avec `nomic-embed-text` et `llama3.1:8b`
- [ ] pgvector demarre avec les documents indexes
- [ ] Terminal et VS Code ouverts sur le dossier du lab
- [ ] `pnpm install` deja execute

## Script

### [00:00-02:30] Les limites du RAG basique
> Dans le module precedent, on a construit un RAG qui fonctionne. Mais si vous l'avez teste avec des questions complexes, vous avez remarque des problemes : des chunks non pertinents dans les resultats, des mots-cles exacts rates, et parfois pas assez de contexte dans un chunk. On va resoudre tout ca.
**Action** : Montrer un exemple de RAG basique avec du bruit
```
Question : "Quelles sont les bonnes pratiques de securite pour NestJS ?"

RAG basique :
+-- Chunk 1 (0.82) : "NestJS utilise des Guards pour l'auth..."       OK
+-- Chunk 2 (0.78) : "La securite des applications web..."            OK
+-- Chunk 3 (0.75) : "NestJS est un framework progressif..."          BRUIT
+-- Chunk 4 (0.73) : "Les bonnes pratiques TypeScript..."              BRUIT
+-- Chunk 5 (0.71) : "Helmet middleware protege contre XSS..."         OK

Probleme : 2 chunks sur 5 ne sont pas pertinents
```

### [02:30-06:30] Hybrid Search : vectoriel + BM25
> La recherche vectorielle comprend le sens mais peut rater des mots-cles exacts. La recherche BM25 trouve les mots exacts mais ne comprend pas les synonymes. On va combiner les deux.
**Action** : Implementer BM25 en TypeScript
```typescript
// bm25.ts (extrait)
class BM25Index {
  private readonly k1 = 1.5;
  private readonly b = 0.75;

  search(query: string, limit = 5): Array<{ id: number; score: number }> {
    const queryTokens = this.tokenize(query);
    const scores = [];

    for (const doc of this.documents) {
      let score = 0;
      for (const term of queryTokens) {
        const tf = doc.tokens.filter(t => t === term).length;
        const idf = this.idf.get(term) ?? 0;
        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (doc.tokens.length / this.avgDocLength));
        score += idf * (numerator / denominator);
      }
      if (score > 0) scores.push({ id: doc.id, score });
    }

    return scores.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
```
**Action** : Montrer la fusion avec Reciprocal Rank Fusion
```typescript
// Reciprocal Rank Fusion (RRF)
// Score final = poids_vectoriel / (k + rang_vectoriel) + poids_bm25 / (k + rang_bm25)

const k = 60; // constante RRF standard
const vectorWeight = 0.7;
const bm25Weight = 0.3;

// Vectoriel trouve : [A, B, C, D, E]
// BM25 trouve :      [C, A, F, G, B]
// RRF fusionne :     [A, C, B, D, F] -- les deux sources se completent
```
```bash
npx tsx hybrid-search.ts
```
**Action** : Comparer les resultats hybride vs vectoriel seul

### [06:30-09:30] HyDE : Hypothetical Document Embeddings
> HyDE est une technique astucieuse : au lieu d'embedder la question directement, on demande au LLM de generer une reponse hypothetique, et on embede CETTE reponse. L'intuition : une reponse ressemble plus aux chunks pertinents qu'une question.
**Action** : Montrer HyDE en pratique
```typescript
async function hydeSearch(question: string, store: VectorStore): Promise<SearchResult[]> {
  // 1. Generer un document hypothetique
  const hypothetical = await llm.chat([{
    role: 'user',
    content: `Reponds a cette question en un paragraphe factuel : ${question}`,
  }]);

  // 2. Embedder le document hypothetique (pas la question !)
  const embedding = await embed(hypothetical);

  // 3. Chercher les chunks similaires au document hypothetique
  return store.search(embedding, 5);
}
```
```bash
npx tsx hyde-demo.ts
```
> HyDE ameliore surtout les questions vagues ou complexes. Pour les questions simples et directes, le gain est marginal.

### [09:30-12:30] Multi-query : reformuler pour mieux chercher
> Une seule formulation de la question peut manquer des angles. Multi-query genere 3-4 reformulations et combine les resultats.
**Action** : Montrer l'approche multi-query
```typescript
async function multiQuerySearch(question: string): Promise<SearchResult[]> {
  // 1. Generer des reformulations
  const reformulations = await llm.chat([{
    role: 'user',
    content: `Genere 3 reformulations de cette question (JSON array) : "${question}"`,
  }]);

  const queries = [question, ...JSON.parse(reformulations)];

  // 2. Chercher avec chaque reformulation
  const allResults = await Promise.all(
    queries.map(q => store.search(q, 5))
  );

  // 3. Deduplication + RRF
  return reciprocalRankFusion(allResults);
}
```
```bash
npx tsx multi-query-demo.ts
```
**Action** : Montrer que "Comment deployer NestJS" genere "mise en production Nest", "deploiement Node.js", "configuration Docker NestJS"

### [12:30-15:30] Reranking : filtrer le bruit
> Le reranking est un deuxieme filtre. Apres avoir recupere les top-20 chunks, on utilise un modele plus precis (cross-encoder) pour re-scorer et ne garder que les top-5 vraiment pertinents.
**Action** : Montrer le reranking avec LLM-as-reranker
```typescript
async function rerank(question: string, chunks: SearchResult[]): Promise<SearchResult[]> {
  const prompt = `Pour la question "${question}", note la pertinence de chaque passage de 0 a 10.
Reponds en JSON : [{"index": 0, "score": X}, ...]

${chunks.map((c, i) => `[${i}] ${c.content.slice(0, 200)}`).join('\n\n')}`;

  const scores = JSON.parse(await llm.chat([{ role: 'user', content: prompt }]));

  return chunks
    .map((chunk, i) => ({ ...chunk, score: scores[i]?.score ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
```
> Le reranking elimine le bruit mais ajoute un appel LLM supplementaire. C'est un compromis qualite/latence.

### [15:30-18:00] Parent-child chunking
> Quand un chunk est trop petit pour avoir du contexte, on utilise le parent-child chunking : on stocke des petits chunks pour la recherche precise, mais on retourne le chunk parent (plus grand) au LLM.
**Action** : Expliquer le concept
```
Document original (2000 tokens)
|
+-- Parent chunk 1 (800 tokens) -- retourne au LLM
|   +-- Child chunk 1a (200 tokens) -- utilise pour la recherche
|   +-- Child chunk 1b (200 tokens)
|   +-- Child chunk 1c (200 tokens)
|   +-- Child chunk 1d (200 tokens)
|
+-- Parent chunk 2 (800 tokens)
    +-- Child chunk 2a (200 tokens)
    +-- Child chunk 2b (200 tokens)
    ...

Recherche : on trouve child 1c (tres precis)
Retour LLM : on envoie parent 1 (contexte complet)
```
> Le child assure la precision de la recherche, le parent assure la richesse du contexte. C'est le meilleur des deux mondes.

### [18:00-20:30] RAG vs Fine-tuning : quand utiliser quoi ?
> Question frequente : pourquoi ne pas fine-tuner le modele sur vos donnees plutot que de faire du RAG ?
**Action** : Afficher le comparatif
```
| Critere           | RAG                      | Fine-tuning              |
|-------------------|--------------------------|--------------------------|
| Donnees fraiches  | Oui (temps reel)         | Non (re-entrainement)    |
| Cout initial      | Faible (infra)           | Eleve (GPU, heures)      |
| Transparence      | Citations des sources    | Boite noire              |
| Hallucinations    | Reduites (contexte)      | Toujours presentes       |
| Mise a jour       | Ajouter des documents    | Re-entrainer le modele   |
| Cas d'usage       | Documentation, support   | Style, format, jargon    |

Regle : RAG pour les CONNAISSANCES, fine-tuning pour le COMPORTEMENT.
```

### [20:30-23:00] RAGAS : evaluer votre RAG
> RAGAS est le framework standard pour evaluer un pipeline RAG avec 4 metriques : faithfulness, answer relevancy, context precision et context recall.
**Action** : Montrer les 4 metriques
```
Faithfulness    : La reponse est-elle fidele au contexte ? (pas d'invention)
Answer Relevancy: La reponse repond-elle a la question ?
Context Precision: Les chunks recuperes sont-ils pertinents ?
Context Recall  : Le contexte couvre-t-il la reponse attendue ?

Cible : chaque metrique > 0.7 pour un RAG de qualite production.
```
```bash
npx tsx ragas-eval.ts
# Faithfulness: 0.85, Relevancy: 0.82, Precision: 0.78, Recall: 0.91
```

### [23:00-25:00] Recapitulatif et transition
> On a vu cinq techniques pour passer du RAG basique au RAG avance : hybrid search pour combiner vectoriel et BM25, HyDE pour les questions complexes, multi-query pour couvrir plusieurs angles, reranking pour eliminer le bruit, et parent-child chunking pour le contexte. Le prochain screencast met tout ca en pratique dans un chatbot RAG full-stack avec NestJS.
**Action** : Afficher le recapitulatif
```
Resume :
- Hybrid search : vectoriel (0.7) + BM25 (0.3) via RRF
- HyDE : embedder une reponse hypothetique, pas la question
- Multi-query : 3-4 reformulations pour couvrir plus d'angles
- Reranking : filtrer les top-20 vers top-5 avec un second modele
- Parent-child : petits chunks pour chercher, grands pour le contexte
- RAGAS : 4 metriques (faithfulness, relevancy, precision, recall)
```

## Points d'attention pour l'enregistrement
- Les demos de hybrid search et HyDE necessitent un jeu de donnees suffisant (20+ chunks)
- Montrer les scores avant/apres chaque technique pour quantifier l'amelioration
- Le reranking ajoute de la latence — mentionner le compromis
- La partie RAGAS peut etre raccourcie si le temps est serre
- Insister sur la regle "RAG pour les connaissances, fine-tuning pour le comportement"
