# Module 13 — RAG Fondamental

> **Objectif** : Comprendre et implementer un pipeline RAG complet de A a Z.
> **Difficulte** : ⭐⭐⭐ (avance)
> **Prérequis** : Module 12 (Embeddings), Module 11 (Ollama)
> **Duree estimee** : 4 heures

<details>
<summary>Rappel du module précédent</summary>

1. **Qu'est-ce qu'un token et pourquoi les LLMs utilisent-ils des tokens plutot que des mots ?**
   Un token est un fragment de texte (mot, sous-mot, caractere). Les mots entiers poseraient un probleme de vocabulaire gigantesque (>500K) et de mots inconnus. L'algorithme BPE (Byte Pair Encoding) offre un compromis optimal avec un vocabulaire de 32K-128K tokens qui gere tous les mots.

2. **Qu'est-ce qu'un embedding et a quoi sert-il ?**
   Un embedding est une representation vectorielle (liste de nombres) qui capture le sens d'un texte. Les textes semantiquement proches ont des vecteurs proches dans l'espace vectoriel, ce qui permet la recherche semantique.

3. **Comment fonctionne la similarite cosinus et pourquoi est-elle utilisee pour comparer des embeddings ?**
   La similarite cosinus mesure l'angle entre deux vecteurs, independamment de leur longueur. Elle vaut 1 pour des vecteurs identiques en direction, 0 pour des vecteurs orthogonaux, et -1 pour des vecteurs opposes. Elle est preferee a la distance euclidienne car elle capture la similarite de sens plutot que de magnitude.

</details>

---

## Ou en etes-vous dans le parcours RAG ?

```
Module 13 (vous etes ici)        Module 14                    Module 15
RAG FONDAMENTAL                  RAG AVANCE                   CHATBOT RAG
─────────────────                ─────────────────            ─────────────────
✅ Chunking (4 strategies)       Hybrid search (BM25+vec)     Conversation multi-tours
✅ Embeddings + vector store     Reranking (cross-encoder)    Streaming SSE
✅ Similarity search (cosine)    HyDE + multi-query           Pipeline d'ingestion
✅ Prompt augmente               Parent-child chunking        pgvector + NestJS
✅ Pipeline complet minimal      GraphRAG                     Citations + sources
✅ Metriques de base             RAGAS evaluation             Docker Compose

Objectif : faire marcher           Objectif : faire marcher       Objectif : construire
un RAG de bout en bout             BIEN (qualite production)      une vraie application
```

> Chaque module RAG à un objectif distinct. Si vous ne devez en faire qu'un, faites celui-ci — il contient tout le nécessaire pour comprendre et utiliser le RAG.

---

## Objectifs du module

- Comprendre ce qu'est le RAG (Retrieval-Augmented Génération) et pourquoi c'est indispensable
- Maîtriser l'architecture complète : du document brut à la réponse augmentée
- Implémenter un pipeline RAG complet en TypeScript avec Ollama
- Connaître les stratégies de chunking et leur impact sur la qualité
- Évaluer un système RAG avec des métriques de base

---

## 1. Qu'est-ce que le RAG ?

### Le problème fondamental

Un LLM, même très performant, à une **limite incontournable** : il ne connaît que ce sur quoi il a été entraîné. Il ne connaît pas :

- Vos documents internes d'entreprise
- Votre base de connaissances produit
- Vos APIs et leur documentation
- Votre code source et ses conventions
- Les événements survenus après sa date de coupure

> **Analogie** : Imaginez un développeur senior brillant qui arrive dans votre entreprise le premier jour. Il maîtrise parfaitement TypeScript, les design patterns, les architectures distribuées. Mais il ne connaît rien de votre projet, de vos conventions, de votre documentation interne. Que faites-vous ? Vous lui donnez accès à la documentation. C'est exactement ce que fait le RAG.

### Définition

**RAG** (Retrieval-Augmented Génération) est une technique qui consiste à :

1. **Retrouver** (Retrieve) des informations pertinentes depuis vos propres données
2. **Augmenter** (Augment) le prompt envoyé au LLM avec ces informations
3. **Générer** (Generate) une réponse basée sur le contexte fourni

```
Question utilisateur + Contexte récupéré → Prompt augmenté → LLM → Réponse contextualisée
```

### Pourquoi pas simplement tout mettre dans le prompt ?

| Approche | Avantage | Inconvénient |
|----------|----------|--------------|
| Tout dans le prompt | Simple | Context window limité (128K-200K tokens max) |
| Fine-tuning | Le modèle "sait" | Coûteux, lent, pas de mise à jour en temps réel |
| RAG | Données fraîches, extensible | Plus complexe à implémenter |

Pour une base documentaire de 10 000 pages, il est **impossible** de tout mettre dans le prompt. Le RAG permet de sélectionner uniquement les passages pertinents pour chaque question.

---

## 2. Architecture RAG complète

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PHASE D'INGESTION                            │
│                                                                     │
│  Documents ──→ Chunking ──→ Embedding ──→ Vector Store              │
│  (MD, PDF,     (découper     (transformer   (stocker les            │
│   TXT, code)    en morceaux)  en vecteurs)   vecteurs + texte)      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        PHASE DE REQUÊTE                             │
│                                                                     │
│  Question ──→ Embedding ──→ Similarity ──→ Top-K ──→ Augmented     │
│  utilisateur   de la         Search        chunks    Prompt ──→ LLM │
│                question      (cosine sim)            + question      │
└─────────────────────────────────────────────────────────────────────┘
```

### Les 7 étapes détaillées

| Étape | Description | Outil typique |
|-------|-------------|---------------|
| 1. Chargement | Lire les documents sources | fs, pdf-parse, unstructured |
| 2. Chunking | Découper en morceaux de taille optimale | LangChain splitters, custom |
| 3. Embedding | Transformer chaque chunk en vecteur | text-embedding-3-small, Ollama |
| 4. Stockage | Persister les vecteurs + métadonnées | Chroma, pgvector, Pinecone |
| 5. Retrieval | Trouver les chunks les plus similaires | Cosine similarity, top-k |
| 6. Augmentation | Construire le prompt avec les chunks | Template de prompt |
| 7. Génération | Le LLM répond avec le contexte fourni | Claude, GPT, Ollama |

---

## 3. Chunking : découper intelligemment vos documents

### Pourquoi le chunking est crucial

Le chunking est **la décision la plus impactante** dans un pipeline RAG. Un mauvais chunking produit :

- Des chunks trop petits → pas assez de contexte, réponses incomplètes
- Des chunks trop grands → bruit, informations non pertinentes diluées
- Des chunks mal découpés → phrases coupées en deux, perte de sens

> **Analogie** : C'est comme découper un livre en fiches. Si vous découpez au milieu des phrases, les fiches sont inutilisables. Si vous découpez par chapitre entier, vos fiches sont trop grosses pour retrouver un point précis. L'idéal : des fiches par section thématique, avec un petit chevauchement pour ne pas perdre le fil.

### Stratégies de chunking

#### 3.1 Fixed-size chunking (taille fixe)

La méthode la plus simple : découper tous les N caractères.

```typescript
interface Chunk {
  content: string;
  metadata: {
    source: string;
    chunkIndex: number;
    startChar: number;
    endChar: number;
  };
}

function fixedSizeChunk(
  text: string,
  chunkSize: number,
  overlap: number,
  source: string
): Chunk[] {
  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const content = text.slice(start, end);

    chunks.push({
      content,
      metadata: {
        source,
        chunkIndex: index,
        startChar: start,
        endChar: end,
      },
    });

    start += chunkSize - overlap;
    index++;
  }

  return chunks;
}

// Utilisation
const text = "Un long document technique sur NestJS et ses modules...";
const chunks = fixedSizeChunk(text, 500, 50, "nestjs-docs.md");
```

**Avantages** : Simple, prévisible, rapide.
**Inconvénients** : Coupe au milieu des phrases, ignore la structure du document.

#### 3.2 Sentence-based chunking (par phrases)

Découper en respectant les limites de phrases, puis regrouper jusqu'à atteindre la taille cible.

```typescript
function sentenceChunk(
  text: string,
  maxChunkSize: number,
  overlap: number,
  source: string
): Chunk[] {
  // Découper en phrases (gestion basique)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: Chunk[] = [];
  let currentChunk = "";
  let currentStart = 0;
  let charPosition = 0;
  let index = 0;

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          source,
          chunkIndex: index,
          startChar: currentStart,
          endChar: charPosition,
        },
      });
      index++;

      // Overlap : garder les dernières phrases
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + sentence;
      currentStart = charPosition - overlap;
    } else {
      currentChunk += sentence;
    }
    charPosition += sentence.length;
  }

  // Dernier chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      metadata: {
        source,
        chunkIndex: index,
        startChar: currentStart,
        endChar: charPosition,
      },
    });
  }

  return chunks;
}
```

**Avantages** : Respecte les limites de phrases, plus cohérent.
**Inconvénients** : Taille variable, peut encore couper des paragraphes thématiques.

#### 3.3 Recursive chunking

La méthode recommandée par LangChain : essayer de découper par les séparateurs les plus significatifs d'abord.

```typescript
function recursiveChunk(
  text: string,
  maxChunkSize: number,
  overlap: number,
  source: string,
  separators: string[] = ["\n\n", "\n", ". ", " ", ""]
): Chunk[] {
  const chunks: Chunk[] = [];
  let index = 0;

  function splitRecursive(text: string, separatorIndex: number): string[] {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const separator = separators[separatorIndex];

    if (separatorIndex >= separators.length - 1) {
      // Dernier recours : découpe brute
      return fixedSizeChunk(text, maxChunkSize, overlap, source).map(c => c.content);
    }

    const parts = text.split(separator);
    const result: string[] = [];
    let currentPart = "";

    for (const part of parts) {
      const candidate = currentPart
        ? currentPart + separator + part
        : part;

      if (candidate.length > maxChunkSize && currentPart.length > 0) {
        // Le chunk courant est assez grand, le sauvegarder
        if (currentPart.length <= maxChunkSize) {
          result.push(currentPart);
        } else {
          // Trop grand, découper avec le séparateur suivant
          result.push(...splitRecursive(currentPart, separatorIndex + 1));
        }
        currentPart = part;
      } else {
        currentPart = candidate;
      }
    }

    if (currentPart.length > 0) {
      if (currentPart.length <= maxChunkSize) {
        result.push(currentPart);
      } else {
        result.push(...splitRecursive(currentPart, separatorIndex + 1));
      }
    }

    return result;
  }

  const textChunks = splitRecursive(text, 0);

  for (const content of textChunks) {
    chunks.push({
      content: content.trim(),
      metadata: {
        source,
        chunkIndex: index,
        startChar: 0, // Simplifié ici
        endChar: content.length,
      },
    });
    index++;
  }

  return chunks;
}
```

**Avantages** : Préserve au maximum la structure du document.
**Inconvénients** : Plus complexe, taille encore variable.

#### 3.4 Semantic chunking

Découper quand le **sens** change, en utilisant les embeddings pour détecter les transitions thématiques.

```typescript
interface SemanticChunkOptions {
  breakpointThreshold: number; // Seuil de différence pour découper (0.3-0.5)
  minChunkSize: number;
  maxChunkSize: number;
}

async function semanticChunk(
  sentences: string[],
  embedFn: (text: string) => Promise<number[]>,
  options: SemanticChunkOptions
): Promise<string[]> {
  // 1. Embedder chaque phrase
  const embeddings = await Promise.all(sentences.map(s => embedFn(s)));

  // 2. Calculer la distance cosinus entre phrases consécutives
  const distances: number[] = [];
  for (let i = 0; i < embeddings.length - 1; i++) {
    distances.push(1 - cosineSimilarity(embeddings[i], embeddings[i + 1]));
  }

  // 3. Identifier les points de rupture (breakpoints)
  const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
  const stdDev = Math.sqrt(
    distances.reduce((sum, d) => sum + (d - mean) ** 2, 0) / distances.length
  );
  const threshold = mean + options.breakpointThreshold * stdDev;

  // 4. Découper aux points de rupture
  const chunks: string[] = [];
  let currentChunk = sentences[0];

  for (let i = 1; i < sentences.length; i++) {
    if (distances[i - 1] > threshold && currentChunk.length >= options.minChunkSize) {
      chunks.push(currentChunk);
      currentChunk = sentences[i];
    } else {
      currentChunk += " " + sentences[i];
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}
```

**Avantages** : Découpage thématiquement cohérent.
**Inconvénients** : Nécessite des appels d'embedding pour chaque phrase, plus lent et coûteux.

### Comparaison des stratégies

| Stratégie | Qualité | Performance | Complexité | Cas d'usage |
|-----------|---------|-------------|------------|-------------|
| Fixed-size | ★★☆☆☆ | ★★★★★ | ★☆☆☆☆ | Prototype rapide |
| Sentence | ★★★☆☆ | ★★★★☆ | ★★☆☆☆ | Documents narratifs |
| Recursive | ★★★★☆ | ★★★★☆ | ★★★☆☆ | Usage général (recommandé) |
| Semantic | ★★★★★ | ★★☆☆☆ | ★★★★☆ | Documents complexes |

### Chunk size et overlap : l'impact sur la qualité

```
Chunk size trop petit (100 tokens)
├── ✅ Précision : les chunks sont très ciblés
├── ❌ Contexte : pas assez d'information pour comprendre
└── ❌ Cohérence : phrases coupées, références perdues

Chunk size trop grand (2000 tokens)
├── ❌ Précision : beaucoup de bruit dans chaque chunk
├── ✅ Contexte : suffisamment d'information
└── ❌ Coût : consomme beaucoup de context window

Chunk size optimal (300-800 tokens)
├── ✅ Précision : bon équilibre signal/bruit
├── ✅ Contexte : assez pour comprendre
└── ✅ Coût : raisonnable
```

**Overlap** : un chevauchement de 10-20% entre les chunks évite de perdre des informations aux frontières.

```typescript
// Exemple : chunk de 500 caractères avec 100 de chevauchement
// Chunk 1 : caractères 0-500
// Chunk 2 : caractères 400-900  (100 chars en commun avec chunk 1)
// Chunk 3 : caractères 800-1300 (100 chars en commun avec chunk 2)
```

---

## 4. Embeddings : transformer du texte en vecteurs

### Qu'est-ce qu'un embedding ?

Un embedding est une **représentation numérique** d'un texte sous forme de vecteur (tableau de nombres). Les textes sémantiquement proches produisent des vecteurs proches dans l'espace vectoriel.

> **Analogie** : Imaginez que chaque texte est un point sur une carte géographique. Les textes qui parlent du même sujet sont proches géographiquement, même s'ils utilisent des mots différents. "Comment configurer NestJS" et "Setup d'un projet Nest" seraient des voisins sur cette carte.

### Modèles d'embedding

| Modèle | Fournisseur | Dimensions | Coût | Qualité |
|--------|-------------|------------|------|---------|
| text-embedding-3-small | OpenAI | 1536 | $0.02/M tokens | ★★★★☆ |
| text-embedding-3-large | OpenAI | 3072 | $0.13/M tokens | ★★★★★ |
| embed-english-v3.0 | Cohere | 1024 | $0.10/M tokens | ★★★★☆ |
| nomic-embed-text | Ollama (local) | 768 | Gratuit | ★★★☆☆ |
| mxbai-embed-large | Ollama (local) | 1024 | Gratuit | ★★★★☆ |

### Générer des embeddings avec Ollama

```typescript
interface EmbeddingResponse {
  embedding: number[];
}

async function embedText(text: string, model = "nomic-embed-text"): Promise<number[]> {
  const response = await fetch("http://localhost:11434/api/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: text }),
  });

  if (!response.ok) {
    throw new Error(`Embedding failed: ${response.statusText}`);
  }

  const data = (await response.json()) as EmbeddingResponse;
  return data.embedding;
}

// Utilisation
const vector = await embedText("Comment créer un module NestJS ?");
console.log(`Dimensions : ${vector.length}`); // 768 pour nomic-embed-text
console.log(`Premiers éléments : ${vector.slice(0, 5)}`);
```

### Générer des embeddings avec OpenAI

```typescript
async function embedTextOpenAI(
  text: string,
  apiKey: string,
  model = "text-embedding-3-small"
): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: text,
    }),
  });

  const data = await response.json();
  return data.data[0].embedding;
}
```

### Similarité cosinus

Pour comparer deux vecteurs, on utilise la **similarité cosinus** : un score entre -1 et 1 (1 = identique, 0 = aucun rapport).

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Les vecteurs doivent avoir la même dimension");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

// Exemple
const vecA = await embedText("Comment configurer NestJS ?");
const vecB = await embedText("Setup d'un projet Nest");
const vecC = await embedText("Recette de gâteau au chocolat");

console.log(cosineSimilarity(vecA, vecB)); // ~0.85 (très similaire)
console.log(cosineSimilarity(vecA, vecC)); // ~0.15 (peu similaire)
```

---

## 5. Vector Store : stocker et rechercher les vecteurs

### Options de stockage

#### 5.1 Array en mémoire (prototype)

Pour commencer, un simple tableau TypeScript suffit.

```typescript
interface StoredChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    source: string;
    chunkIndex: number;
    [key: string]: unknown;
  };
}

class InMemoryVectorStore {
  private chunks: StoredChunk[] = [];

  async add(chunk: Omit<StoredChunk, "id">): Promise<string> {
    const id = crypto.randomUUID();
    this.chunks.push({ ...chunk, id });
    return id;
  }

  async addMany(chunks: Omit<StoredChunk, "id">[]): Promise<string[]> {
    return Promise.all(chunks.map(chunk => this.add(chunk)));
  }

  async search(
    queryEmbedding: number[],
    topK = 5,
    threshold = 0.0
  ): Promise<Array<StoredChunk & { score: number }>> {
    const scored = this.chunks.map(chunk => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    return scored
      .filter(item => item.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  get size(): number {
    return this.chunks.length;
  }
}
```

#### 5.2 Chroma (base vectorielle simple)

```typescript
// npm install chromadb
import { ChromaClient } from "chromadb";

async function setupChroma() {
  const client = new ChromaClient({ path: "http://localhost:8000" });

  // Créer ou récupérer une collection
  const collection = await client.getOrCreateCollection({
    name: "documentation",
    metadata: { "hnsw:space": "cosine" },
  });

  // Ajouter des documents
  await collection.add({
    ids: ["doc-1", "doc-2"],
    documents: ["Texte du chunk 1", "Texte du chunk 2"],
    embeddings: [
      [0.1, 0.2, 0.3 /* ... */],
      [0.4, 0.5, 0.6 /* ... */],
    ],
    metadatas: [
      { source: "guide.md", chunkIndex: 0 },
      { source: "guide.md", chunkIndex: 1 },
    ],
  });

  // Rechercher
  const results = await collection.query({
    queryEmbeddings: [[0.1, 0.2, 0.3 /* ... */]],
    nResults: 5,
  });

  return results;
}
```

#### 5.3 pgvector (PostgreSQL)

```sql
-- Activer l'extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Créer la table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(768), -- Adapter selon le modèle d'embedding
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index HNSW pour la recherche rapide
CREATE INDEX ON documents
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Recherche de similarité
SELECT id, content, metadata,
       1 - (embedding <=> $1::vector) AS similarity
FROM documents
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

### Comparaison des vector stores

| Solution | Type | Setup | Scalabilité | Cas d'usage |
|----------|------|-------|-------------|-------------|
| Array en mémoire | In-process | Aucun | < 10K docs | Prototypage, tests |
| Chroma | Serveur léger | Docker simple | < 1M docs | Projets moyens |
| pgvector | Extension PG | PostgreSQL existant | < 10M docs | Apps en production avec PG |
| Pinecone | SaaS cloud | API key | Illimité | Grande échelle, serverless |
| Weaviate | Serveur | Docker | < 100M docs | Recherche avancée |

---

## 6. Retrieval : retrouver les chunks pertinents

### Similarity search

La recherche de similarité trouve les chunks dont l'embedding est le plus proche de celui de la question.

```typescript
async function retrieve(
  query: string,
  store: InMemoryVectorStore,
  topK = 5,
  threshold = 0.3
): Promise<Array<StoredChunk & { score: number }>> {
  // 1. Embedder la question
  const queryEmbedding = await embedText(query);

  // 2. Chercher les chunks les plus similaires
  const results = await store.search(queryEmbedding, topK, threshold);

  console.log(`[Retrieval] Question: "${query}"`);
  console.log(`[Retrieval] ${results.length} chunks trouvés (seuil: ${threshold})`);

  for (const result of results) {
    console.log(`  - Score: ${result.score.toFixed(3)} | Source: ${result.metadata.source}`);
  }

  return results;
}
```

### Top-K et threshold

| Paramètre | Effet | Valeur typique |
|-----------|-------|----------------|
| top-K | Nombre maximum de chunks retournés | 3-10 |
| threshold | Score minimum de similarité | 0.3-0.5 |

```typescript
// Top-K élevé + threshold bas → plus de chunks, plus de bruit
const lotsOfResults = await store.search(queryEmbedding, 20, 0.1);

// Top-K bas + threshold haut → moins de chunks, plus précis
const preciseResults = await store.search(queryEmbedding, 3, 0.5);
```

**Conseil** : commencez avec `topK = 5` et `threshold = 0.3`, puis ajustez en mesurant la qualité des réponses.

---

## 7. Augmented Prompt : injecter le contexte

### Construction du prompt augmenté

```typescript
function buildAugmentedPrompt(
  question: string,
  chunks: Array<{ content: string; metadata: { source: string } }>,
  systemInstruction?: string
): string {
  const contextBlock = chunks
    .map((chunk, i) => `[Source ${i + 1}: ${chunk.metadata.source}]\n${chunk.content}`)
    .join("\n\n---\n\n");

  const system = systemInstruction || `Tu es un assistant documentaire.
Réponds UNIQUEMENT en te basant sur le contexte fourni ci-dessous.
Si le contexte ne contient pas l'information demandée, dis-le clairement.
Cite tes sources en utilisant [Source N].`;

  return `${system}

## Contexte

${contextBlock}

## Question

${question}

## Réponse`;
}
```

### Exemple de prompt augmenté généré

```
Tu es un assistant documentaire.
Réponds UNIQUEMENT en te basant sur le contexte fourni ci-dessous.
Si le contexte ne contient pas l'information demandée, dis-le clairement.
Cite tes sources en utilisant [Source N].

## Contexte

[Source 1: nestjs-modules.md]
Un module NestJS est une classe annotée avec @Module().
Chaque application a au moins un module racine (AppModule).
Les modules organisent le code en domaines fonctionnels.

---

[Source 2: nestjs-providers.md]
Les providers sont des classes injectables annotées avec @Injectable().
Ils sont déclarés dans le tableau providers d'un @Module().

## Question

Comment créer un module NestJS avec un service ?

## Réponse
```

### Bonnes pratiques pour le prompt augmenté

1. **Instruction claire** : dire au LLM de se baser uniquement sur le contexte
2. **Numéroter les sources** : facilite les citations dans la réponse
3. **Séparateurs visuels** : `---` entre les chunks pour les distinguer
4. **Question en dernier** : le LLM porte plus d'attention au début et à la fin du prompt
5. **Limiter la taille** : si trop de chunks, tronquer les moins pertinents

---

## 8. Implémentation complète en TypeScript

### Le pipeline RAG de A à Z

```typescript
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

// ─── Types ───────────────────────────────────────────────────────

interface Chunk {
  content: string;
  metadata: {
    source: string;
    chunkIndex: number;
  };
}

interface StoredChunk extends Chunk {
  id: string;
  embedding: number[];
}

interface SearchResult extends StoredChunk {
  score: number;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaResponse {
  message: { content: string };
}

// ─── Embedding avec Ollama ───────────────────────────────────────

async function embed(text: string): Promise<number[]> {
  const response = await fetch("http://localhost:11434/api/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nomic-embed-text",
      prompt: text,
    }),
  });
  const data = await response.json();
  return data.embedding;
}

// ─── Similarité cosinus ──────────────────────────────────────────

function cosine(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Vector Store en mémoire ─────────────────────────────────────

class VectorStore {
  private items: StoredChunk[] = [];

  async add(chunk: Chunk): Promise<void> {
    const embedding = await embed(chunk.content);
    this.items.push({
      ...chunk,
      id: crypto.randomUUID(),
      embedding,
    });
  }

  async search(query: string, topK = 5): Promise<SearchResult[]> {
    const queryVec = await embed(query);
    return this.items
      .map(item => ({ ...item, score: cosine(queryVec, item.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  get size(): number {
    return this.items.length;
  }
}

// ─── Chunking récursif simplifié ─────────────────────────────────

function chunkText(text: string, source: string, maxSize = 500, overlap = 50): Chunk[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: Chunk[] = [];
  let current = "";
  let index = 0;

  for (const para of paragraphs) {
    if (current.length + para.length > maxSize && current.length > 0) {
      chunks.push({
        content: current.trim(),
        metadata: { source, chunkIndex: index },
      });
      // Overlap : garder la fin du chunk précédent
      current = current.slice(-overlap) + "\n\n" + para;
      index++;
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }

  if (current.trim().length > 0) {
    chunks.push({
      content: current.trim(),
      metadata: { source, chunkIndex: index },
    });
  }

  return chunks;
}

// ─── Charger des fichiers Markdown ───────────────────────────────

function loadMarkdownFiles(directory: string): Chunk[] {
  const files = readdirSync(directory).filter(f => f.endsWith(".md"));
  const allChunks: Chunk[] = [];

  for (const file of files) {
    const content = readFileSync(join(directory, file), "utf-8");
    const chunks = chunkText(content, file);
    allChunks.push(...chunks);
    console.log(`📄 ${file} → ${chunks.length} chunks`);
  }

  console.log(`Total : ${allChunks.length} chunks`);
  return allChunks;
}

// ─── Générer une réponse avec Ollama ─────────────────────────────

async function generateResponse(messages: ChatMessage[]): Promise<string> {
  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral",
      messages,
      stream: false,
    }),
  });
  const data = (await response.json()) as OllamaResponse;
  return data.message.content;
}

// ─── Pipeline RAG complet ────────────────────────────────────────

async function ragQuery(
  store: VectorStore,
  question: string,
  topK = 5
): Promise<string> {
  console.log(`\n🔍 Question : "${question}"`);

  // 1. Retrieval
  const results = await store.search(question, topK);
  console.log(`📚 ${results.length} chunks trouvés :`);
  results.forEach((r, i) => {
    console.log(`   ${i + 1}. [${r.score.toFixed(3)}] ${r.metadata.source} #${r.metadata.chunkIndex}`);
  });

  // 2. Construire le prompt augmenté
  const context = results
    .map((r, i) => `[Source ${i + 1}: ${r.metadata.source}]\n${r.content}`)
    .join("\n\n---\n\n");

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Tu es un assistant documentaire technique.
Réponds UNIQUEMENT en te basant sur le contexte fourni.
Si le contexte ne contient pas l'information, dis "Je n'ai pas trouvé cette information dans la documentation."
Cite tes sources avec [Source N].`,
    },
    {
      role: "user",
      content: `## Contexte\n\n${context}\n\n## Question\n\n${question}`,
    },
  ];

  // 3. Génération
  const answer = await generateResponse(messages);
  console.log(`\n💬 Réponse :\n${answer}`);

  return answer;
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const store = new VectorStore();

  // Phase d'ingestion
  console.log("=== Phase d'ingestion ===");
  const chunks = loadMarkdownFiles("./docs");

  console.log("\nEmbedding des chunks...");
  for (const chunk of chunks) {
    await store.add(chunk);
    process.stdout.write(".");
  }
  console.log(`\n✅ ${store.size} chunks indexés\n`);

  // Phase de requête
  console.log("=== Phase de requête ===");
  await ragQuery(store, "Comment créer un module NestJS ?");
  await ragQuery(store, "Quelle est la différence entre un provider et un controller ?");
}

main().catch(console.error);
```

### Exécution

```bash
# Pré-requis : Ollama en cours d'exécution avec les modèles
ollama pull nomic-embed-text
ollama pull mistral

# Exécuter le pipeline
npx tsx rag-pipeline.ts
```

---

## 9. Métriques de base pour évaluer un RAG

### Les 3 métriques essentielles

| Métrique | Question | Calcul |
|----------|----------|--------|
| **Précision du contexte** | Les chunks récupérés sont-ils pertinents ? | Chunks pertinents / Total chunks |
| **Recall du contexte** | A-t-on récupéré tous les chunks nécessaires ? | Chunks pertinents trouvés / Total pertinents existants |
| **Fidélité (Faithfulness)** | La réponse est-elle fidèle au contexte ? | Affirmations supportées / Total affirmations |

### Évaluation simple en TypeScript

```typescript
interface EvalCase {
  question: string;
  expectedAnswer: string;
  relevantSources: string[]; // Les sources qui devraient être récupérées
}

interface EvalResult {
  question: string;
  contextPrecision: number;
  contextRecall: number;
  answerRelevancy: number; // Jugement humain ou LLM-as-judge
}

async function evaluateRAG(
  store: VectorStore,
  testCases: EvalCase[]
): Promise<EvalResult[]> {
  const results: EvalResult[] = [];

  for (const testCase of testCases) {
    const retrieved = await store.search(testCase.question, 5);
    const retrievedSources = retrieved.map(r => r.metadata.source);

    // Context Precision : combien de chunks récupérés sont pertinents ?
    const relevantRetrieved = retrievedSources.filter(s =>
      testCase.relevantSources.includes(s)
    );
    const precision = relevantRetrieved.length / retrievedSources.length;

    // Context Recall : combien de sources pertinentes ont été trouvées ?
    const recall = relevantRetrieved.length / testCase.relevantSources.length;

    results.push({
      question: testCase.question,
      contextPrecision: precision,
      contextRecall: recall,
      answerRelevancy: 0, // À évaluer manuellement ou via LLM-as-judge
    });
  }

  return results;
}

// Exemple de jeu de test
const testCases: EvalCase[] = [
  {
    question: "Comment créer un module NestJS ?",
    expectedAnswer: "Un module se crée avec @Module() decorator...",
    relevantSources: ["nestjs-modules.md", "nestjs-getting-started.md"],
  },
  {
    question: "Comment configurer une base de données PostgreSQL ?",
    expectedAnswer: "TypeORM avec @nestjs/typeorm...",
    relevantSources: ["nestjs-database.md", "typeorm-config.md"],
  },
];
```

### Tableau de bord d'évaluation

```typescript
function printEvalReport(results: EvalResult[]): void {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║           RAPPORT D'ÉVALUATION RAG              ║");
  console.log("╠══════════════════════════════════════════════════╣");

  let totalPrecision = 0;
  let totalRecall = 0;

  for (const result of results) {
    console.log(`║ Q: ${result.question.slice(0, 45).padEnd(45)}   ║`);
    console.log(`║   Précision: ${(result.contextPrecision * 100).toFixed(0)}%  Recall: ${(result.contextRecall * 100).toFixed(0)}%`.padEnd(51) + "║");
    console.log("╠──────────────────────────────────────────────────╣");
    totalPrecision += result.contextPrecision;
    totalRecall += result.contextRecall;
  }

  const avgPrecision = totalPrecision / results.length;
  const avgRecall = totalRecall / results.length;

  console.log(`║ MOYENNE - Précision: ${(avgPrecision * 100).toFixed(0)}%  Recall: ${(avgRecall * 100).toFixed(0)}%`.padEnd(51) + "║");
  console.log("╚══════════════════════════════════════════════════╝");
}
```

---

## 10. Limites du RAG fondamental

### Problèmes courants

| Problème | Cause | Solution |
|----------|-------|----------|
| Hallucinations malgré le contexte | Le LLM extrapole au-delà du contexte | Instructions plus strictes, temperature=0 |
| Chunks non pertinents | Mauvais chunking ou embedding | Améliorer le chunking, tester d'autres modèles d'embedding |
| Context window overflow | Trop de chunks injectés | Limiter top-K, reranking, compression |
| Réponses incomplètes | Chunks trop petits | Augmenter la taille des chunks, parent-child chunking |
| Lenteur | Embedding à chaque requête | Cache des embeddings, index HNSW |
| Données obsolètes | Pas de ré-indexation | Pipeline d'ingestion continue |

### Quand le RAG fondamental ne suffit pas

Le RAG fondamental atteint ses limites quand :

1. **La recherche par similarité ne suffit pas** → Il faut du hybrid search (Module 14)
2. **Les chunks manquent de contexte** → Parent-child chunking (Module 14)
3. **Trop de bruit dans les résultats** → Reranking (Module 14)
4. **Relations complexes entre documents** → GraphRAG (Module 14)
5. **Besoin de conversation multi-tours** → Gestion de l'historique (Module 15)

---

## 11. Exercices pratiques

### Exercice 1 : Pipeline RAG minimal

Créez un pipeline RAG qui :
1. Charge 3-5 fichiers Markdown de documentation technique
2. Les découpe avec le chunking récursif
3. Embed chaque chunk avec Ollama (`nomic-embed-text`)
4. Stocke dans un `InMemoryVectorStore`
5. Permet de poser des questions et reçoit des réponses contextualisées

### Exercice 2 : Comparaison de chunking

Prenez un même document et comparez la qualité de retrieval avec :
- Fixed-size chunking (300 chars)
- Fixed-size chunking (800 chars)
- Sentence-based chunking
- Recursive chunking

Pour chaque stratégie, posez 5 questions et mesurez la précision du contexte récupéré.

### Exercice 3 : Évaluation

Créez un jeu de test de 10 questions avec les réponses attendues et les sources pertinentes. Exécutez votre pipeline RAG et mesurez :
- Context Precision
- Context Recall
- Fidélité de la réponse (jugement manuel)

---

## Résumé du module

| Concept | Point clé |
|---------|-----------|
| RAG | Donner au LLM l'accès à vos propres données au moment de la requête |
| Chunking | Recursive chunking est le meilleur compromis pour commencer |
| Chunk size | 300-800 tokens avec 10-20% d'overlap |
| Embeddings | Ollama (gratuit, local) ou OpenAI (meilleure qualité, payant) |
| Vector Store | Array en mémoire pour prototyper, pgvector pour la production |
| Retrieval | top-K=5, threshold=0.3 comme point de départ |
| Prompt augmenté | Instruction stricte + contexte numéroté + question |
| Évaluation | Précision, recall, fidélité — mesurer avant d'optimiser |

Le RAG fondamental est la base sur laquelle tout le reste se construit. Dans le module suivant, nous verrons comment dépasser ces limites avec des techniques avancées : hybrid search, reranking, parent-child chunking et GraphRAG.

---

<!-- parcours-recommande -->

::: tip Parcours recommandé
1. **Screencast** : [screencast 13 rag fondamental](../screencasts/screencast-13-rag-fondamental.md)
2. **Lab** : [lab-13-rag-fondamental](../labs/lab-13-rag-fondamental/README)
3. **Quiz** : [quiz 13 rag fondamental](../quizzes/quiz-13-rag-fondamental.html)
:::
