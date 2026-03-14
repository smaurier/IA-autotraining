# Module 14 — RAG Avancé

> **Objectif** : Passer d'un RAG qui "marche" a un RAG qui marche **bien**. Techniques de qualite production.
> **Difficulte** : ⭐⭐⭐⭐ (avance)
> **Prerequis** : Module 13 (RAG Fondamental — obligatoire)
> **Duree estimee** : 4 heures

---

## Ce que ce module ajoute par rapport au Module 13

```
Module 13 (RAG basique)              Module 14 (RAG avancé)
─────────────────────────            ─────────────────────────────
Recherche vectorielle seule    →     Hybrid search (vectoriel + BM25)
Un seul reformulage            →     HyDE + multi-query expansion
Tous les résultats gardés      →     Reranking avec cross-encoder
Chunks indépendants            →     Parent-child chunking (contexte)
Métriques manuelles            →     Framework RAGAS automatisé
"Ca marche"                    →     "Ca marche bien en production"
```

> **Conseil** : si votre RAG du Module 13 donne deja de bons resultats sur vos donnees, vous n'avez pas besoin de toutes les techniques de ce module. Ajoutez-les une par une en mesurant l'impact avec RAGAS.

---

## Objectifs du module

- Maîtriser les techniques avancées qui transforment un RAG basique en un système de qualité production
- Implémenter hybrid search, HyDE, multi-query, reranking et parent-child chunking
- Comprendre quand utiliser RAG vs fine-tuning
- Évaluer un pipeline RAG avec le framework RAGAS
- Découvrir GraphRAG et le RAG multi-modal

---

## 1. Les limites du RAG fondamental

Avant de plonger dans les solutions avancées, rappelons les problèmes concrets du RAG basique :

```
Question : "Quelles sont les bonnes pratiques de sécurité pour NestJS ?"

RAG basique :
├── Chunk 1 (score 0.82) : "NestJS utilise des Guards pour l'authentification..."  ✅
├── Chunk 2 (score 0.78) : "La sécurité des applications web repose sur..."       ✅
├── Chunk 3 (score 0.75) : "NestJS est un framework progressif pour Node.js..."   ❌ (hors sujet)
├── Chunk 4 (score 0.73) : "Les bonnes pratiques TypeScript incluent..."           ❌ (hors sujet)
└── Chunk 5 (score 0.71) : "Helmet middleware protège contre les attaques XSS..."  ✅

Problème : 2 chunks sur 5 ne sont pas pertinents → bruit dans le contexte
```

> **Analogie** : Le RAG basique, c'est comme chercher un livre à la bibliothèque en regardant uniquement le titre. Le RAG avancé, c'est comme avoir un bibliothécaire expert qui comprend votre besoin, consulte plusieurs catalogues, vérifie la pertinence de chaque livre, et ne vous présente que les passages exacts qui répondent à votre question.

---

## 2. Hybrid Search : le meilleur des deux mondes

### Le problème de la recherche purement vectorielle

La recherche vectorielle excelle pour la **similarité sémantique** mais peut rater des correspondances exactes :

| Type de recherche | Force | Faiblesse |
|-------------------|-------|-----------|
| Vectorielle (embedding) | Comprend le sens, synonymes | Peut manquer des mots-clés exacts |
| Lexicale (BM25) | Correspondance exacte de termes | Ne comprend pas les synonymes |
| **Hybride** | **Combine les deux** | **Complexité accrue** |

### BM25 : l'algorithme de recherche textuelle

BM25 (Best Matching 25) est l'algorithme derrière Elasticsearch et la recherche textuelle classique. Il score les documents en fonction de la fréquence des termes de la requête.

```typescript
interface BM25Options {
  k1: number;  // Saturation de la fréquence des termes (1.2-2.0)
  b: number;   // Normalisation par la longueur (0.75)
}

class BM25Index {
  private documents: string[] = [];
  private tokenizedDocs: string[][] = [];
  private avgDocLength = 0;
  private idf: Map<string, number> = new Map();
  private k1: number;
  private b: number;

  constructor(options: BM25Options = { k1: 1.5, b: 0.75 }) {
    this.k1 = options.k1;
    this.b = options.b;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\sàâäéèêëïîôùûüÿç]/g, " ")
      .split(/\s+/)
      .filter(t => t.length > 1);
  }

  index(documents: string[]): void {
    this.documents = documents;
    this.tokenizedDocs = documents.map(d => this.tokenize(d));

    // Longueur moyenne des documents
    this.avgDocLength =
      this.tokenizedDocs.reduce((sum, doc) => sum + doc.length, 0) /
      this.tokenizedDocs.length;

    // Calcul IDF (Inverse Document Frequency)
    const docCount = this.tokenizedDocs.length;
    const termDocFreq = new Map<string, number>();

    for (const doc of this.tokenizedDocs) {
      const uniqueTerms = new Set(doc);
      for (const term of uniqueTerms) {
        termDocFreq.set(term, (termDocFreq.get(term) || 0) + 1);
      }
    }

    for (const [term, df] of termDocFreq) {
      this.idf.set(term, Math.log((docCount - df + 0.5) / (df + 0.5) + 1));
    }
  }

  search(query: string, topK = 5): Array<{ index: number; score: number }> {
    const queryTerms = this.tokenize(query);
    const scores: Array<{ index: number; score: number }> = [];

    for (let i = 0; i < this.tokenizedDocs.length; i++) {
      const doc = this.tokenizedDocs[i];
      let score = 0;

      for (const term of queryTerms) {
        const tf = doc.filter(t => t === term).length;
        const idf = this.idf.get(term) || 0;
        const docLength = doc.length;

        // Formule BM25
        const numerator = tf * (this.k1 + 1);
        const denominator =
          tf + this.k1 * (1 - this.b + this.b * (docLength / this.avgDocLength));

        score += idf * (numerator / denominator);
      }

      scores.push({ index: i, score });
    }

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
```

### Combiner Vector Search + BM25

```typescript
interface HybridResult {
  chunkId: string;
  content: string;
  vectorScore: number;
  bm25Score: number;
  hybridScore: number;
  metadata: Record<string, unknown>;
}

class HybridSearchEngine {
  private vectorStore: VectorStore;
  private bm25Index: BM25Index;
  private chunks: StoredChunk[] = [];
  private vectorWeight: number;

  constructor(vectorStore: VectorStore, vectorWeight = 0.7) {
    this.vectorStore = vectorStore;
    this.bm25Index = new BM25Index();
    this.vectorWeight = vectorWeight;
  }

  async index(chunks: Chunk[]): Promise<void> {
    // Indexer dans le vector store
    for (const chunk of chunks) {
      await this.vectorStore.add(chunk);
    }

    // Indexer dans BM25
    this.bm25Index.index(chunks.map(c => c.content));
    this.chunks = chunks as StoredChunk[];
  }

  async search(query: string, topK = 5): Promise<HybridResult[]> {
    // 1. Recherche vectorielle
    const vectorResults = await this.vectorStore.search(query, topK * 2);

    // 2. Recherche BM25
    const bm25Results = this.bm25Index.search(query, topK * 2);

    // 3. Normaliser les scores (min-max normalization)
    const maxVector = Math.max(...vectorResults.map(r => r.score), 0.001);
    const maxBM25 = Math.max(...bm25Results.map(r => r.score), 0.001);

    // 4. Fusionner avec Reciprocal Rank Fusion (RRF)
    const scoreMap = new Map<number, { vectorScore: number; bm25Score: number }>();

    for (let rank = 0; rank < vectorResults.length; rank++) {
      const idx = this.chunks.findIndex(c => c.id === vectorResults[rank].id);
      if (idx >= 0) {
        const existing = scoreMap.get(idx) || { vectorScore: 0, bm25Score: 0 };
        existing.vectorScore = vectorResults[rank].score / maxVector;
        scoreMap.set(idx, existing);
      }
    }

    for (let rank = 0; rank < bm25Results.length; rank++) {
      const idx = bm25Results[rank].index;
      const existing = scoreMap.get(idx) || { vectorScore: 0, bm25Score: 0 };
      existing.bm25Score = bm25Results[rank].score / maxBM25;
      scoreMap.set(idx, existing);
    }

    // 5. Calculer le score hybride pondéré
    const results: HybridResult[] = [];
    for (const [idx, scores] of scoreMap) {
      const chunk = this.chunks[idx];
      results.push({
        chunkId: chunk.id,
        content: chunk.content,
        vectorScore: scores.vectorScore,
        bm25Score: scores.bm25Score,
        hybridScore:
          this.vectorWeight * scores.vectorScore +
          (1 - this.vectorWeight) * scores.bm25Score,
        metadata: chunk.metadata,
      });
    }

    return results.sort((a, b) => b.hybridScore - a.hybridScore).slice(0, topK);
  }
}
```

### Impact du poids vectoriel

| vectorWeight | Comportement | Meilleur pour |
|-------------|-------------|---------------|
| 0.9 | Quasi uniquement sémantique | Questions conceptuelles |
| 0.7 | Sémantique dominant (recommandé) | Usage général |
| 0.5 | Équilibré | Documents techniques avec jargon |
| 0.3 | BM25 dominant | Recherche de termes exacts (noms d'API, codes d'erreur) |

---

## 3. HyDE : Hypothetical Document Embeddings

### Le problème

Quand un utilisateur pose une question courte comme "Guards NestJS ?", l'embedding de cette question courte est très différent de l'embedding d'un paragraphe détaillé sur les Guards NestJS. Il y a un **écart sémantique** entre questions et documents.

### L'idée

Au lieu d'embedder la question directement, on demande au LLM de **générer un document hypothétique** qui répondrait à la question, puis on utilise l'embedding de ce document pour la recherche.

```
Question courte → LLM génère un "faux" document → Embedding du faux document → Recherche vectorielle
```

> **Analogie** : C'est comme demander à un expert d'imaginer à quoi ressemblerait la réponse idéale, puis utiliser cette imagination pour chercher les vrais documents qui y ressemblent.

### Implémentation

```typescript
async function hydeSearch(
  query: string,
  store: VectorStore,
  topK = 5
): Promise<SearchResult[]> {
  // 1. Générer un document hypothétique
  const hypotheticalDoc = await generateResponse([
    {
      role: "system",
      content: `Tu es un rédacteur technique. Écris un court paragraphe (100-200 mots)
qui répondrait à la question suivante. Le texte doit être factuel et informatif,
comme un extrait de documentation technique. Ne dis pas "voici" ou "en réponse à".
Écris directement le contenu comme s'il faisait partie d'un document.`,
    },
    {
      role: "user",
      content: query,
    },
  ]);

  console.log(`[HyDE] Document hypothétique généré :`);
  console.log(`  "${hypotheticalDoc.slice(0, 150)}..."`);

  // 2. Utiliser l'embedding du document hypothétique pour la recherche
  const results = await store.search(hypotheticalDoc, topK);

  return results;
}

// Comparaison : recherche classique vs HyDE
async function compareSearchMethods(query: string, store: VectorStore): Promise<void> {
  console.log(`\n=== Comparaison pour : "${query}" ===\n`);

  // Recherche classique
  console.log("--- Recherche classique ---");
  const classicResults = await store.search(query, 3);
  classicResults.forEach((r, i) => {
    console.log(`  ${i + 1}. [${r.score.toFixed(3)}] ${r.content.slice(0, 80)}...`);
  });

  // Recherche HyDE
  console.log("\n--- Recherche HyDE ---");
  const hydeResults = await hydeSearch(query, store, 3);
  hydeResults.forEach((r, i) => {
    console.log(`  ${i + 1}. [${r.score.toFixed(3)}] ${r.content.slice(0, 80)}...`);
  });
}
```

### Quand utiliser HyDE

| Situation | HyDE utile ? |
|-----------|-------------|
| Questions courtes et vagues | Oui, très efficace |
| Questions détaillées et précises | Non, pas nécessaire |
| Base documentaire technique dense | Oui, aide à combler l'écart sémantique |
| Recherche de termes exacts | Non, préférer BM25 |

**Coût** : un appel LLM supplémentaire par requête (latence + tokens).

---

## 4. Multi-Query : reformuler pour mieux chercher

### Le problème

Une seule formulation de la question peut manquer des chunks pertinents qui utilisent un vocabulaire différent.

### L'idée

Reformuler la question en N variantes, effectuer une recherche pour chaque variante, puis fusionner les résultats.

```typescript
async function multiQuerySearch(
  query: string,
  store: VectorStore,
  numQueries = 3,
  topK = 5
): Promise<SearchResult[]> {
  // 1. Générer des variantes de la question
  const variationsResponse = await generateResponse([
    {
      role: "system",
      content: `Tu es un assistant de recherche. Génère exactement ${numQueries} reformulations
différentes de la question suivante. Chaque reformulation doit utiliser un vocabulaire
et un angle différent pour maximiser les chances de trouver l'information.
Retourne UNIQUEMENT les questions, une par ligne, sans numérotation.`,
    },
    {
      role: "user",
      content: query,
    },
  ]);

  const variations = variationsResponse
    .split("\n")
    .map(q => q.trim())
    .filter(q => q.length > 10);

  console.log(`[Multi-Query] Variantes générées :`);
  variations.forEach((v, i) => console.log(`  ${i + 1}. ${v}`));

  // 2. Rechercher avec chaque variante
  const allQueries = [query, ...variations];
  const allResults: SearchResult[] = [];

  for (const q of allQueries) {
    const results = await store.search(q, topK);
    allResults.push(...results);
  }

  // 3. Dédupliquer et garder le meilleur score pour chaque chunk
  const uniqueResults = new Map<string, SearchResult>();
  for (const result of allResults) {
    const existing = uniqueResults.get(result.id);
    if (!existing || result.score > existing.score) {
      uniqueResults.set(result.id, result);
    }
  }

  // 4. Trier par score et retourner les top-K
  return Array.from(uniqueResults.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
```

### Exemple concret

```
Question originale : "Comment sécuriser une API NestJS ?"

Variante 1 : "Quelles sont les méthodes d'authentification et d'autorisation dans NestJS ?"
Variante 2 : "Comment implémenter des Guards et des intercepteurs de sécurité avec Nest ?"
Variante 3 : "Protection d'une API REST Node.js contre les attaques courantes"

Résultat : la fusion des 4 recherches couvre un spectre sémantique beaucoup plus large
```

---

## 5. Parent-Child Chunking

### Le problème

- **Petits chunks** : précision de retrieval élevée, mais pas assez de contexte pour le LLM
- **Grands chunks** : contexte suffisant, mais le retrieval est imprécis (trop de bruit)

### La solution : stocker petit, récupérer grand

On crée deux niveaux de chunks :
- **Child chunks** (petits) : utilisés pour le retrieval (précision)
- **Parent chunks** (grands) : récupérés pour le contexte (complétude)

```
Document
├── Parent chunk 1 (1000 tokens)
│   ├── Child chunk 1.1 (200 tokens)  ← Utilisé pour le retrieval
│   ├── Child chunk 1.2 (200 tokens)  ← Utilisé pour le retrieval
│   └── Child chunk 1.3 (200 tokens)  ← Utilisé pour le retrieval
├── Parent chunk 2 (1000 tokens)
│   ├── Child chunk 2.1 (200 tokens)
│   ├── Child chunk 2.2 (200 tokens)
│   └── Child chunk 2.3 (200 tokens)
```

### Implémentation

```typescript
interface ParentChunk {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
}

interface ChildChunk {
  id: string;
  content: string;
  parentId: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

class ParentChildStore {
  private parents: Map<string, ParentChunk> = new Map();
  private children: ChildChunk[] = [];

  async ingest(
    text: string,
    source: string,
    parentSize = 1000,
    childSize = 200
  ): Promise<void> {
    // 1. Créer les parent chunks
    const parentChunks = chunkText(text, source, parentSize, 0);

    for (let pi = 0; pi < parentChunks.length; pi++) {
      const parentId = crypto.randomUUID();
      const parent: ParentChunk = {
        id: parentId,
        content: parentChunks[pi].content,
        metadata: { source, parentIndex: pi },
      };
      this.parents.set(parentId, parent);

      // 2. Créer les child chunks pour chaque parent
      const childChunks = chunkText(parentChunks[pi].content, source, childSize, 20);

      for (const child of childChunks) {
        const embedding = await embed(child.content);
        this.children.push({
          id: crypto.randomUUID(),
          content: child.content,
          parentId,
          embedding,
          metadata: { source, parentIndex: pi, ...child.metadata },
        });
      }
    }

    console.log(
      `[ParentChild] ${this.parents.size} parents, ${this.children.length} children`
    );
  }

  async search(query: string, topK = 3): Promise<ParentChunk[]> {
    const queryVec = await embed(query);

    // 1. Chercher dans les child chunks (précision)
    const scoredChildren = this.children.map(child => ({
      child,
      score: cosine(queryVec, child.embedding),
    }));

    scoredChildren.sort((a, b) => b.score - a.score);
    const topChildren = scoredChildren.slice(0, topK);

    console.log("[ParentChild] Top child chunks trouvés :");
    topChildren.forEach((sc, i) => {
      console.log(`  ${i + 1}. [${sc.score.toFixed(3)}] "${sc.child.content.slice(0, 60)}..."`);
    });

    // 2. Récupérer les parent chunks correspondants (contexte)
    const parentIds = [...new Set(topChildren.map(sc => sc.child.parentId))];
    const parents = parentIds
      .map(id => this.parents.get(id))
      .filter((p): p is ParentChunk => p !== undefined);

    console.log(`[ParentChild] ${parents.length} parent chunks récupérés`);

    return parents;
  }
}
```

> **Analogie** : C'est comme un index en fin de livre. L'index contient des entrées très spécifiques (les "child chunks") qui pointent vers des pages complètes (les "parent chunks"). On cherche dans l'index pour sa précision, mais on lit la page entière pour le contexte.

---

## 6. Metadata Filtering

### Le problème

Parfois, la pertinence ne dépend pas uniquement du contenu mais aussi de **métadonnées** : date, auteur, source, version, langue.

### Implémentation

```typescript
interface MetadataFilter {
  field: string;
  operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "in" | "contains";
  value: string | number | boolean | string[];
}

function applyFilters(
  chunks: StoredChunk[],
  filters: MetadataFilter[]
): StoredChunk[] {
  return chunks.filter(chunk => {
    return filters.every(filter => {
      const fieldValue = chunk.metadata[filter.field];
      if (fieldValue === undefined) return false;

      switch (filter.operator) {
        case "eq":
          return fieldValue === filter.value;
        case "neq":
          return fieldValue !== filter.value;
        case "gt":
          return (fieldValue as number) > (filter.value as number);
        case "lt":
          return (fieldValue as number) < (filter.value as number);
        case "gte":
          return (fieldValue as number) >= (filter.value as number);
        case "lte":
          return (fieldValue as number) <= (filter.value as number);
        case "in":
          return (filter.value as string[]).includes(fieldValue as string);
        case "contains":
          return String(fieldValue)
            .toLowerCase()
            .includes(String(filter.value).toLowerCase());
        default:
          return false;
      }
    });
  });
}

// Utilisation
const results = await searchWithFilters(
  store,
  "Comment déployer l'application ?",
  [
    { field: "source", operator: "in", value: ["deploy-guide.md", "docker.md"] },
    { field: "version", operator: "gte", value: 3 },
    { field: "language", operator: "eq", value: "fr" },
  ],
  5
);
```

### Metadata enrichment lors de l'ingestion

```typescript
interface DocumentMetadata {
  source: string;
  title: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  language?: string;
  category?: string;
  tags?: string[];
}

function extractMetadata(filepath: string, content: string): DocumentMetadata {
  // Extraire le frontmatter YAML si présent
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  let metadata: DocumentMetadata = { source: filepath, title: filepath };

  if (frontmatterMatch) {
    const yaml = frontmatterMatch[1];
    const lines = yaml.split("\n");
    for (const line of lines) {
      const [key, ...valueParts] = line.split(":");
      const value = valueParts.join(":").trim();
      if (key && value) {
        (metadata as Record<string, unknown>)[key.trim()] = value;
      }
    }
  }

  // Extraire le titre du premier heading
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    metadata.title = titleMatch[1];
  }

  return metadata;
}
```

---

## 7. Reranking : ré-ordonner les résultats

### Pourquoi le reranking ?

Le retrieval initial (vectoriel ou hybride) utilise des **bi-encoders** : la question et les documents sont encodés séparément. C'est rapide mais parfois imprécis.

Le reranking utilise un **cross-encoder** : la question et chaque document candidat sont encodés **ensemble**, ce qui permet une comparaison beaucoup plus fine.

```
Phase 1 : Bi-encoder (rapide, approximatif)
  Question ──→ [Encoder] ──→ Vec_Q     ┐
  Document ──→ [Encoder] ──→ Vec_D     ├── cosine(Vec_Q, Vec_D)
                                        ┘

Phase 2 : Cross-encoder (lent, précis)
  [Question + Document] ──→ [Cross-Encoder] ──→ Score de pertinence
```

### Implémentation avec Cohere Rerank

```typescript
interface RerankResult {
  index: number;
  relevanceScore: number;
}

async function cohereRerank(
  query: string,
  documents: string[],
  apiKey: string,
  topN = 5
): Promise<RerankResult[]> {
  const response = await fetch("https://api.cohere.ai/v1/rerank", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "rerank-english-v3.0",
      query,
      documents,
      top_n: topN,
    }),
  });

  const data = await response.json();
  return data.results.map((r: { index: number; relevance_score: number }) => ({
    index: r.index,
    relevanceScore: r.relevance_score,
  }));
}

// Pipeline complet : retrieve → rerank
async function retrieveAndRerank(
  query: string,
  store: VectorStore,
  cohereApiKey: string,
  initialTopK = 20,
  finalTopK = 5
): Promise<SearchResult[]> {
  // 1. Retrieval large (plus de candidats)
  const candidates = await store.search(query, initialTopK);

  console.log(`[Rerank] ${candidates.length} candidats initiaux`);

  // 2. Reranking
  const rerankResults = await cohereRerank(
    query,
    candidates.map(c => c.content),
    cohereApiKey,
    finalTopK
  );

  // 3. Mapper les résultats reranked
  const reranked = rerankResults.map(rr => ({
    ...candidates[rr.index],
    score: rr.relevanceScore, // Remplacer le score par le score de reranking
  }));

  console.log("[Rerank] Résultats après reranking :");
  reranked.forEach((r, i) => {
    console.log(`  ${i + 1}. [${r.score.toFixed(3)}] ${r.content.slice(0, 60)}...`);
  });

  return reranked;
}
```

### Reranking avec un LLM local (alternative gratuite)

```typescript
async function llmRerank(
  query: string,
  documents: { content: string; id: string }[],
  topN = 5
): Promise<Array<{ id: string; score: number }>> {
  const prompt = `Tu es un juge de pertinence. Pour chaque document, évalue sa pertinence
par rapport à la question sur une échelle de 0 à 10.

Question : "${query}"

${documents.map((d, i) => `Document ${i + 1} :\n${d.content.slice(0, 300)}`).join("\n\n")}

Retourne UNIQUEMENT un JSON array avec les scores :
[{"index": 0, "score": 8}, {"index": 1, "score": 3}, ...]`;

  const response = await generateResponse([
    { role: "system", content: "Tu es un évaluateur de pertinence documentaire. Réponds uniquement en JSON." },
    { role: "user", content: prompt },
  ]);

  const scores = JSON.parse(response) as Array<{ index: number; score: number }>;

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(s => ({
      id: documents[s.index].id,
      score: s.score / 10, // Normaliser entre 0 et 1
    }));
}
```

---

## 8. Contextual Compression

### Le problème

Même après le reranking, un chunk de 500 tokens peut contenir seulement 50 tokens réellement utiles. Le reste consomme inutilement le context window.

### La solution

Résumer chaque chunk pour ne garder que ce qui est pertinent par rapport à la question.

```typescript
async function compressChunks(
  query: string,
  chunks: SearchResult[],
  maxTokensPerChunk = 150
): Promise<Array<{ original: SearchResult; compressed: string }>> {
  const compressed = [];

  for (const chunk of chunks) {
    const summary = await generateResponse([
      {
        role: "system",
        content: `Tu es un extracteur d'information. Étant donné une question et un passage,
extrais UNIQUEMENT les informations du passage qui sont pertinentes pour répondre à la question.
Si le passage ne contient aucune information pertinente, réponds "NON_PERTINENT".
Sois concis : maximum ${maxTokensPerChunk} tokens.`,
      },
      {
        role: "user",
        content: `Question : ${query}\n\nPassage :\n${chunk.content}`,
      },
    ]);

    if (!summary.includes("NON_PERTINENT")) {
      compressed.push({ original: chunk, compressed: summary });
    }
  }

  console.log(
    `[Compression] ${chunks.length} chunks → ${compressed.length} après compression`
  );

  return compressed;
}
```

### Avant/Après compression

```
AVANT (chunk complet, 180 tokens) :
"NestJS est un framework pour construire des applications serveur Node.js
efficaces et scalables. Il utilise TypeScript par défaut et combine des
éléments de OOP, FP et FRP. NestJS fournit un système de Guards qui
permet d'implémenter l'authentification et l'autorisation. Les Guards
sont des classes qui implémentent l'interface CanActivate. Ils sont
exécutés après les middleware mais avant les intercepteurs."

APRÈS compression pour "Comment fonctionnent les Guards NestJS ?" (60 tokens) :
"Les Guards NestJS implémentent l'interface CanActivate pour gérer
l'authentification et l'autorisation. Ils s'exécutent après les
middleware mais avant les intercepteurs."
```

---

## 9. RAG vs Fine-tuning : decision framework

### Tableau comparatif

| Critère | RAG | Fine-tuning |
|---------|-----|-------------|
| **Données fraîches** | Oui, mises à jour en temps réel | Non, nécessite un ré-entraînement |
| **Coût initial** | Faible (pipeline d'ingestion) | Élevé (compute GPU, données annotées) |
| **Coût par requête** | Plus élevé (embedding + retrieval) | Plus faible (un seul appel LLM) |
| **Traçabilité** | Oui, on sait quels documents sont utilisés | Non, c'est une boîte noire |
| **Hallucinations** | Réduites (contexte explicite) | Possibles (connaissances implicites) |
| **Spécialisation du style** | Non | Oui (ton, format, vocabulaire) |
| **Scalabilité des données** | Excellente (ajouter des documents) | Limitée (taille du dataset) |
| **Latence** | Plus haute | Plus basse |

### Arbre de décision

```
Vos données changent-elles fréquemment ?
├── OUI → RAG
└── NON
    ├── Avez-vous besoin de traçabilité (citations, sources) ?
    │   ├── OUI → RAG
    │   └── NON
    │       ├── Voulez-vous changer le style/ton du modèle ?
    │       │   ├── OUI → Fine-tuning
    │       │   └── NON
    │       │       ├── Volume de données > 100K documents ?
    │       │       │   ├── OUI → RAG
    │       │       │   └── NON → Fine-tuning ou RAG selon le budget
    │       │       └──
    │       └──
    │   └──
    └──
```

### La combinaison gagnante : RAG + Fine-tuning

Dans certains cas, on combine les deux :
- **Fine-tuning** pour adapter le style et le format de réponse
- **RAG** pour fournir les données à jour

```
Question → Retrieval → Augmented Prompt → Fine-tuned LLM → Réponse stylée et contextualisée
```

---

## 10. Évaluation avancée : RAGAS framework

### Les métriques RAGAS

RAGAS (Retrieval-Augmented Generation Assessment) définit 4 métriques clés :

| Métrique | Question posée | Score idéal |
|----------|---------------|-------------|
| **Faithfulness** | La réponse est-elle fidèle au contexte ? | 1.0 |
| **Answer Relevancy** | La réponse est-elle pertinente à la question ? | 1.0 |
| **Context Precision** | Les chunks pertinents sont-ils en haut du classement ? | 1.0 |
| **Context Recall** | Tous les éléments de la réponse attendue sont-ils couverts ? | 1.0 |

### Implémentation simplifiée en TypeScript

```typescript
interface RAGASInput {
  question: string;
  answer: string;
  contexts: string[];
  groundTruth: string; // La réponse de référence
}

interface RAGASScores {
  faithfulness: number;
  answerRelevancy: number;
  contextPrecision: number;
  contextRecall: number;
}

async function evaluateWithRAGAS(input: RAGASInput): Promise<RAGASScores> {
  // 1. Faithfulness : la réponse est-elle supportée par le contexte ?
  const faithfulness = await evaluateFaithfulness(
    input.answer,
    input.contexts
  );

  // 2. Answer Relevancy : la réponse répond-elle à la question ?
  const answerRelevancy = await evaluateAnswerRelevancy(
    input.question,
    input.answer
  );

  // 3. Context Precision : les bons chunks sont-ils en haut ?
  const contextPrecision = await evaluateContextPrecision(
    input.question,
    input.contexts,
    input.groundTruth
  );

  // 4. Context Recall : le contexte couvre-t-il la réponse attendue ?
  const contextRecall = await evaluateContextRecall(
    input.contexts,
    input.groundTruth
  );

  return { faithfulness, answerRelevancy, contextPrecision, contextRecall };
}

// Faithfulness via LLM-as-judge
async function evaluateFaithfulness(
  answer: string,
  contexts: string[]
): Promise<number> {
  const context = contexts.join("\n\n");

  const response = await generateResponse([
    {
      role: "system",
      content: `Tu es un évaluateur de fidélité. Analyse si la réponse est supportée
par le contexte fourni.

Étape 1 : Extrais chaque affirmation factuelle de la réponse.
Étape 2 : Pour chaque affirmation, vérifie si elle est supportée par le contexte.
Étape 3 : Calcule le ratio : affirmations supportées / total affirmations.

Retourne UNIQUEMENT un JSON : {"supported": N, "total": M, "score": X.XX}`,
    },
    {
      role: "user",
      content: `Contexte :\n${context}\n\nRéponse à évaluer :\n${answer}`,
    },
  ]);

  const result = JSON.parse(response);
  return result.score;
}

// Answer Relevancy : la réponse est-elle pertinente ?
async function evaluateAnswerRelevancy(
  question: string,
  answer: string
): Promise<number> {
  const response = await generateResponse([
    {
      role: "system",
      content: `Tu es un évaluateur de pertinence. Évalue si la réponse est pertinente
par rapport à la question posée. Score de 0 (hors sujet) à 1 (parfaitement pertinent).
Retourne UNIQUEMENT un JSON : {"score": X.XX, "reason": "..."}`,
    },
    {
      role: "user",
      content: `Question : ${question}\n\nRéponse : ${answer}`,
    },
  ]);

  return JSON.parse(response).score;
}

// Context Precision
async function evaluateContextPrecision(
  question: string,
  contexts: string[],
  groundTruth: string
): Promise<number> {
  const response = await generateResponse([
    {
      role: "system",
      content: `Évalue si chaque contexte est utile pour répondre à la question.
La réponse de référence est fournie.
Pour chaque contexte, indique "utile" ou "inutile".
Retourne un JSON : {"verdicts": ["utile", "inutile", ...], "precision": X.XX}`,
    },
    {
      role: "user",
      content: `Question : ${question}
Réponse attendue : ${groundTruth}

${contexts.map((c, i) => `Contexte ${i + 1} :\n${c}`).join("\n\n")}`,
    },
  ]);

  return JSON.parse(response).precision;
}

// Context Recall
async function evaluateContextRecall(
  contexts: string[],
  groundTruth: string
): Promise<number> {
  const response = await generateResponse([
    {
      role: "system",
      content: `Évalue si le contexte fourni couvre tous les éléments de la réponse attendue.
Extrais les affirmations clés de la réponse attendue et vérifie si le contexte les couvre.
Retourne un JSON : {"covered": N, "total": M, "recall": X.XX}`,
    },
    {
      role: "user",
      content: `Réponse attendue :\n${groundTruth}\n\nContexte :\n${contexts.join("\n\n")}`,
    },
  ]);

  return JSON.parse(response).recall;
}
```

### Exécuter une évaluation complète

```typescript
async function runEvalSuite(
  store: VectorStore,
  testCases: RAGASInput[]
): Promise<void> {
  const allScores: RAGASScores[] = [];

  for (const testCase of testCases) {
    const scores = await evaluateWithRAGAS(testCase);
    allScores.push(scores);

    console.log(`Q: ${testCase.question.slice(0, 50)}...`);
    console.log(`  Faithfulness: ${scores.faithfulness.toFixed(2)}`);
    console.log(`  Answer Relevancy: ${scores.answerRelevancy.toFixed(2)}`);
    console.log(`  Context Precision: ${scores.contextPrecision.toFixed(2)}`);
    console.log(`  Context Recall: ${scores.contextRecall.toFixed(2)}`);
  }

  // Moyennes
  const avg = (key: keyof RAGASScores) =>
    allScores.reduce((sum, s) => sum + s[key], 0) / allScores.length;

  console.log("\n=== SCORES MOYENS ===");
  console.log(`Faithfulness:       ${avg("faithfulness").toFixed(2)}`);
  console.log(`Answer Relevancy:   ${avg("answerRelevancy").toFixed(2)}`);
  console.log(`Context Precision:  ${avg("contextPrecision").toFixed(2)}`);
  console.log(`Context Recall:     ${avg("contextRecall").toFixed(2)}`);
}
```

---

## 11. Multi-modal RAG

### Au-delà du texte

Les documents réels contiennent des images, des tableaux, du code, des diagrammes. Un RAG multi-modal peut traiter tout cela.

| Type de contenu | Stratégie | Outil |
|----------------|-----------|-------|
| Texte | Embedding textuel | nomic-embed-text, text-embedding-3 |
| Images | Description par un LLM vision | Claude Vision, GPT-4V, LLaVA |
| Tableaux | Conversion en texte structuré | Extraction manuelle, LLM |
| Code | Embedding spécialisé code | Voyage Code, text-embedding-3 |
| PDF | Extraction puis traitement | pdf-parse, unstructured |

### Pipeline multi-modal simplifié

```typescript
interface MultiModalChunk {
  id: string;
  content: string;           // Texte ou description
  originalType: "text" | "image" | "table" | "code";
  embedding: number[];
  metadata: {
    source: string;
    page?: number;
    imageUrl?: string;
    language?: string;       // Pour le code
  };
}

async function processImage(
  imagePath: string,
  model = "llava"
): Promise<string> {
  // Utiliser un LLM vision pour décrire l'image
  const imageBase64 = readFileSync(imagePath).toString("base64");

  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt: "Décris cette image en détail, en incluant tout texte visible, données de tableaux, diagrammes et leur signification.",
      images: [imageBase64],
      stream: false,
    }),
  });

  const data = await response.json();
  return data.response;
}

async function processTable(tableHtml: string): Promise<string> {
  // Convertir un tableau HTML en texte structuré
  const response = await generateResponse([
    {
      role: "system",
      content: "Convertis ce tableau HTML en texte structuré clair et lisible, en préservant les relations entre colonnes et lignes.",
    },
    { role: "user", content: tableHtml },
  ]);
  return response;
}
```

---

## 12. GraphRAG : la puissance des graphes de connaissances

### Le problème des embeddings seuls

Les embeddings capturent la **similarité sémantique** mais pas les **relations structurées** entre concepts.

Exemple : "Qui est le manager de l'équipe qui développe le module d'authentification ?"
- Les embeddings peuvent trouver des chunks sur l'authentification
- Mais pas naviguer la relation : Module → Équipe → Manager

### GraphRAG : combiner embeddings et knowledge graph

```
┌──────────────┐     développe      ┌──────────────┐
│  Équipe Auth │ ──────────────────→ │  Module Auth │
└──────┬───────┘                     └──────────────┘
       │
       │ managé par
       ▼
┌──────────────┐
│  Alice Dupont│
└──────────────┘
```

### Implémentation simplifiée

```typescript
interface GraphNode {
  id: string;
  type: string;          // "person", "team", "module", "concept"
  name: string;
  properties: Record<string, unknown>;
  embedding?: number[];
}

interface GraphEdge {
  source: string;
  target: string;
  relation: string;      // "manages", "develops", "depends_on"
  properties?: Record<string, unknown>;
}

class KnowledgeGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: GraphEdge[] = [];

  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
  }

  addEdge(edge: GraphEdge): void {
    this.edges.push(edge);
  }

  // Trouver les voisins d'un noeud
  getNeighbors(nodeId: string, depth = 1): GraphNode[] {
    const visited = new Set<string>();
    const result: GraphNode[] = [];

    const traverse = (currentId: string, currentDepth: number) => {
      if (currentDepth > depth || visited.has(currentId)) return;
      visited.add(currentId);

      const node = this.nodes.get(currentId);
      if (node) result.push(node);

      // Trouver les arêtes connectées
      const connectedEdges = this.edges.filter(
        e => e.source === currentId || e.target === currentId
      );

      for (const edge of connectedEdges) {
        const neighborId = edge.source === currentId ? edge.target : edge.source;
        traverse(neighborId, currentDepth + 1);
      }
    };

    traverse(nodeId, 0);
    return result;
  }

  // Recherche combinée : embedding + graph traversal
  async search(
    query: string,
    topK = 5
  ): Promise<Array<{ node: GraphNode; context: string }>> {
    const queryVec = await embed(query);

    // 1. Trouver les noeuds les plus proches par embedding
    const scored = Array.from(this.nodes.values())
      .filter(n => n.embedding)
      .map(n => ({ node: n, score: cosine(queryVec, n.embedding!) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    // 2. Pour chaque noeud, récupérer le sous-graphe local
    const results = scored.map(({ node }) => {
      const neighbors = this.getNeighbors(node.id, 2);
      const edges = this.edges.filter(
        e =>
          neighbors.some(n => n.id === e.source) &&
          neighbors.some(n => n.id === e.target)
      );

      // Construire un contexte textuel depuis le graphe
      const context = [
        `Entité : ${node.name} (${node.type})`,
        ...edges.map(e => {
          const source = this.nodes.get(e.source);
          const target = this.nodes.get(e.target);
          return `${source?.name} --[${e.relation}]--> ${target?.name}`;
        }),
      ].join("\n");

      return { node, context };
    });

    return results;
  }
}
```

### Extraction automatique du graphe depuis des documents

```typescript
async function extractEntitiesAndRelations(
  text: string
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const response = await generateResponse([
    {
      role: "system",
      content: `Extrais les entités et relations du texte suivant.
Retourne un JSON avec :
{
  "entities": [{"id": "e1", "type": "concept|person|tool|module", "name": "..."}],
  "relations": [{"source": "e1", "target": "e2", "relation": "uses|depends_on|manages|..."}]
}`,
    },
    { role: "user", content: text },
  ]);

  const result = JSON.parse(response);

  const nodes: GraphNode[] = result.entities.map((e: { id: string; type: string; name: string }) => ({
    id: e.id,
    type: e.type,
    name: e.name,
    properties: {},
  }));

  const edges: GraphEdge[] = result.relations.map((r: { source: string; target: string; relation: string }) => ({
    source: r.source,
    target: r.target,
    relation: r.relation,
  }));

  return { nodes, edges };
}
```

---

## 13. Pipeline RAG avancé complet

### Assemblage de toutes les techniques

```typescript
interface AdvancedRAGConfig {
  useHybridSearch: boolean;
  useHyDE: boolean;
  useMultiQuery: boolean;
  useParentChild: boolean;
  useReranking: boolean;
  useCompression: boolean;
  vectorWeight: number;
  initialTopK: number;
  finalTopK: number;
}

const defaultConfig: AdvancedRAGConfig = {
  useHybridSearch: true,
  useHyDE: false,           // Pas toujours nécessaire
  useMultiQuery: true,
  useParentChild: true,
  useReranking: true,
  useCompression: false,     // Coûteux en appels LLM
  vectorWeight: 0.7,
  initialTopK: 20,
  finalTopK: 5,
};

async function advancedRAGQuery(
  query: string,
  store: VectorStore,
  config: AdvancedRAGConfig = defaultConfig
): Promise<{ answer: string; sources: SearchResult[] }> {
  let searchQuery = query;
  let results: SearchResult[];

  // Étape 1 (optionnel) : HyDE
  if (config.useHyDE) {
    const hypoDoc = await generateHypotheticalDocument(query);
    searchQuery = hypoDoc;
  }

  // Étape 2 (optionnel) : Multi-Query
  if (config.useMultiQuery) {
    results = await multiQuerySearch(searchQuery, store, 3, config.initialTopK);
  } else {
    results = await store.search(searchQuery, config.initialTopK);
  }

  // Étape 3 (optionnel) : Reranking
  if (config.useReranking) {
    results = await llmRerank(query, results, config.finalTopK) as unknown as SearchResult[];
  } else {
    results = results.slice(0, config.finalTopK);
  }

  // Étape 4 (optionnel) : Compression
  if (config.useCompression) {
    const compressed = await compressChunks(query, results);
    // Utiliser les chunks compressés pour le prompt
    const context = compressed.map(c => c.compressed).join("\n\n---\n\n");
    const answer = await generateWithContext(query, context);
    return { answer, sources: results };
  }

  // Étape 5 : Génération
  const context = results.map(r => r.content).join("\n\n---\n\n");
  const answer = await generateWithContext(query, context);

  return { answer, sources: results };
}
```

---

## 14. Exercices pratiques

### Exercice 1 : Hybrid Search

Implémentez un pipeline hybrid search (BM25 + vectoriel) et comparez les résultats avec une recherche purement vectorielle sur 10 questions.

### Exercice 2 : Parent-Child Chunking

Prenez une documentation technique et implémentez le parent-child chunking. Mesurez l'amélioration de la qualité des réponses par rapport au chunking classique.

### Exercice 3 : Évaluation RAGAS

Créez un jeu de test de 15 questions avec ground truth. Évaluez votre pipeline avec les 4 métriques RAGAS et identifiez les points faibles.

### Exercice 4 : Pipeline complet

Assemblez un pipeline RAG avancé avec : hybrid search + multi-query + reranking. Comparez les scores RAGAS avec le RAG basique du module 13.

---

## Résumé du module

| Technique | Quand l'utiliser | Impact |
|-----------|-----------------|--------|
| Hybrid Search | Toujours (quasi gratuit) | Meilleur recall |
| HyDE | Questions courtes/vagues | Meilleure correspondance sémantique |
| Multi-Query | Questions complexes | Plus de chunks pertinents |
| Parent-Child | Documents structurés | Meilleur contexte |
| Metadata Filtering | Corpus large/hétérogène | Réduction du bruit |
| Reranking | Toujours (si budget OK) | Meilleure précision |
| Compression | Context window limité | Optimisation du contexte |
| GraphRAG | Relations entre entités | Réponses relationnelles |

Le RAG avancé n'est pas un choix binaire : c'est un menu de techniques à combiner selon vos besoins. Commencez par hybrid search + reranking (le meilleur rapport effort/qualité), puis ajoutez les autres techniques en mesurant l'impact avec RAGAS.
