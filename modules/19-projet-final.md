# Module 19 — Projet Final : Assistant Documentaire Intelligent

## Objectifs du module

- Synthétiser toutes les compétences acquises dans les 18 modules précédents
- Construire un assistant documentaire complet de A à Z
- Implémenter un RAG hybride (vectoriel + BM25)
- Ajouter une conversation avec historique et citations
- Mettre en place un pipeline d'évaluation automatique
- Déployer en production avec monitoring et sécurité
- Suivre 6 phases guidées pour une construction progressive

---

## 1. Présentation du projet

### L'assistant documentaire intelligent

Vous allez construire un **assistant documentaire** capable de :

1. **Ingérer** des documents multi-format (Markdown, texte, JSON, code source)
2. **Chercher** avec un RAG hybride (recherche vectorielle + recherche lexicale BM25)
3. **Converser** avec historique, streaming et citations des sources
4. **S'évaluer** avec un pipeline automatique de métriques RAG
5. **Se protéger** avec des guardrails de sécurité
6. **Se monitorer** avec un dashboard de coûts et de qualité

> **Analogie** : Imaginez un stagiaire idéal pour votre équipe. Il a lu toute votre documentation, répond instantanément en citant les sources, sait dire "je ne sais pas", et vous pouvez suivre ses performances en temps réel. C'est exactement ce que vous allez construire.

### Fonctionnalités complètes

| Fonctionnalité | Description | Modules utilisés |
|---------------|-------------|-----------------|
| Ingestion multi-format | Upload et traitement de fichiers | M12, M13, M14 |
| Chunking intelligent | Découpage par paragraphes/sections | M13 |
| Embeddings | Conversion texte → vecteurs | M12 |
| Recherche hybride | Vectorielle (cosinus) + lexicale (BM25) | M14 |
| Conversation | Multi-tours avec historique | M4, M15 |
| Streaming SSE | Réponse en temps réel | M4, M15 |
| Citations | Traçabilité des sources | M15 |
| Évaluation | Faithfulness, relevancy, precision | M16 |
| Sécurité | Input/output guardrails | M17 |
| Monitoring | Coûts, latence, qualité | M16, M18 |
| Semantic cache | Réduction des coûts | M18 |
| Fallback models | Résilience multi-providers | M18 |

---

## 2. Architecture technique

### Vue d'ensemble

```
┌───────────────────────────────────────────────────────────────────────┐
│                           CLIENT                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  Upload UI   │  │  Chat UI      │  │  Sources     │  │  Admin    │ │
│  │  (fichiers)  │  │  (streaming)  │  │  (citations) │  │  (metrics)│ │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘  └─────┬─────┘ │
└─────────┼─────────────────┼──────────────────────────────────┼───────┘
          │ POST /ingest    │ POST /chat (SSE)                 │ GET /admin
┌─────────┼─────────────────┼──────────────────────────────────┼───────┐
│         ▼                 ▼                                  ▼       │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────────────┐  │
│  │ IngestModule│   │  ChatModule  │   │     AdminModule           │  │
│  │             │   │              │   │  - Metrics dashboard      │  │
│  │ - Upload    │   │ - Guards     │   │  - Eval pipeline          │  │
│  │ - Chunking  │   │ - Cache      │   │  - Document management    │  │
│  │ - Embedding │   │ - RAG Hybrid │   └──────────────────────────┘  │
│  │ - Storage   │   │ - LLM        │                                  │
│  └──────┬──────┘   │ - Streaming  │                                  │
│         │          │ - Citations  │                                  │
│         │          └──────┬──────┘                                   │
│         │                 │                                          │
│  ┌──────▼─────────────────▼──────────────────────────────────────┐   │
│  │                    Shared Services                             │   │
│  │  ┌──────────┐ ┌───────────┐ ┌────────┐ ┌────────┐ ┌────────┐│   │
│  │  │VectorStore│ │Embedding │ │  LLM    │ │ Cache  │ │Security││   │
│  │  │(pgvector) │ │Service   │ │Fallback │ │Semantic│ │Guards  ││   │
│  │  └──────────┘ └───────────┘ └────────┘ └────────┘ └────────┘│   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                   NESTJS                             │
└──────────────────────────────────────────────────────────────────────┘
          │              │              │
          ▼              ▼              ▼
   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │PostgreSQL │   │  Ollama  │   │  Claude  │
   │+ pgvector │   │  (local) │   │  (cloud) │
   └──────────┘   └──────────┘   └──────────┘
```

### Structure des fichiers du projet

```
doc-assistant/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── config/
│   │   └── configuration.ts
│   │
│   ├── ingest/                    # Phase 2
│   │   ├── ingest.module.ts
│   │   ├── ingest.controller.ts
│   │   ├── ingest.service.ts
│   │   ├── chunking.service.ts
│   │   └── parsers/
│   │       ├── markdown.parser.ts
│   │       ├── text.parser.ts
│   │       └── code.parser.ts
│   │
│   ├── search/                    # Phase 3
│   │   ├── search.module.ts
│   │   ├── search.service.ts       # RAG hybride
│   │   └── bm25.service.ts         # Recherche lexicale
│   │
│   ├── chat/                      # Phase 4
│   │   ├── chat.module.ts
│   │   ├── chat.controller.ts
│   │   ├── chat.service.ts
│   │   ├── prompts.ts
│   │   └── citation.service.ts
│   │
│   ├── eval/                      # Phase 5
│   │   ├── eval.module.ts
│   │   ├── eval.controller.ts
│   │   ├── eval.service.ts
│   │   └── datasets/
│   │       └── eval-set.jsonl
│   │
│   ├── admin/                     # Phase 6
│   │   ├── admin.module.ts
│   │   ├── admin.controller.ts
│   │   └── admin.service.ts
│   │
│   └── shared/                    # Phase 1
│       ├── vector-store/
│       │   ├── vector-store.module.ts
│       │   └── vector-store.service.ts
│       ├── embedding/
│       │   ├── embedding.module.ts
│       │   └── embedding.service.ts
│       ├── llm/
│       │   ├── llm.module.ts
│       │   └── llm.service.ts     # Fallback multi-provider
│       ├── cache/
│       │   ├── cache.module.ts
│       │   └── semantic-cache.service.ts
│       ├── security/
│       │   ├── security.module.ts
│       │   ├── injection-guard.ts
│       │   └── output-filter.ts
│       └── monitoring/
│           ├── monitoring.module.ts
│           └── llm-logger.service.ts
│
├── test/
│   ├── ingest.e2e-spec.ts
│   ├── chat.e2e-spec.ts
│   └── eval.e2e-spec.ts
│
├── docker-compose.yml
├── init.sql
├── Dockerfile
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 3. Phase 1 — Setup et infrastructure (2h)

### Objectif

Mettre en place le projet NestJS, PostgreSQL/pgvector, Ollama et les services partagés.

### Étapes

```bash
# 1. Créer le projet
npx @nestjs/cli new doc-assistant
cd doc-assistant

# 2. Installer les dépendances
pnpm add pg @nestjs/config class-validator class-transformer
pnpm add multer @nestjs/platform-express
pnpm add -D @types/multer @types/pg

# 3. Lancer l'infrastructure
docker compose up -d

# 4. Télécharger les modèles Ollama
docker exec ollama ollama pull llama3.1:8b
docker exec ollama ollama pull nomic-embed-text
```

### Docker Compose

```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: docassistant
      POSTGRES_USER: docuser
      POSTGRES_PASSWORD: docpass
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U docuser -d docassistant']
      interval: 5s
      timeout: 5s
      retries: 5

  ollama:
    image: ollama/ollama
    ports:
      - '11434:11434'
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

volumes:
  pgdata:
  ollama_data:
```

### Schéma SQL complet

```sql
-- init.sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents sources
CREATE TABLE documents (
  id          SERIAL PRIMARY KEY,
  filename    VARCHAR(500) NOT NULL,
  file_type   VARCHAR(50) NOT NULL,
  file_size   INTEGER NOT NULL,
  checksum    VARCHAR(64),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Chunks avec embeddings
CREATE TABLE chunks (
  id          SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  metadata    JSONB DEFAULT '{}',
  embedding   vector(768),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX chunks_embedding_hnsw ON chunks
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 100);
CREATE INDEX chunks_document_id_idx ON chunks(document_id);
CREATE INDEX chunks_content_trgm ON chunks USING gin(content gin_trgm_ops);

-- Conversations
CREATE TABLE conversations (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(500),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id              SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  role            VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  sources         JSONB DEFAULT '[]',
  latency_ms      INTEGER,
  token_count     INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX messages_conversation_idx ON messages(conversation_id, created_at);

-- Évaluations
CREATE TABLE evaluations (
  id              SERIAL PRIMARY KEY,
  question        TEXT NOT NULL,
  answer          TEXT NOT NULL,
  contexts        JSONB NOT NULL,
  reference       TEXT,
  faithfulness    FLOAT,
  relevancy       FLOAT,
  context_precision FLOAT,
  context_recall  FLOAT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Logs d'interactions (monitoring)
CREATE TABLE interaction_logs (
  id              SERIAL PRIMARY KEY,
  trace_id        VARCHAR(100),
  span_type       VARCHAR(50),
  model           VARCHAR(100),
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  latency_ms      INTEGER,
  cost            FLOAT DEFAULT 0,
  cached          BOOLEAN DEFAULT FALSE,
  error           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX logs_trace_idx ON interaction_logs(trace_id);
CREATE INDEX logs_created_idx ON interaction_logs(created_at);
```

### Checklist Phase 1

```
[ ] docker compose up -d fonctionne
[ ] PostgreSQL avec pgvector accessible
[ ] Ollama avec llama3.1:8b et nomic-embed-text prêts
[ ] NestJS démarre sans erreur
[ ] Configuration .env en place
[ ] EmbeddingService peut générer un embedding
[ ] VectorStoreService peut insérer et rechercher
[ ] LLMService peut générer une réponse
```

---

## 4. Phase 2 — Pipeline d'ingestion (3h)

### Objectif

Permettre l'upload de fichiers, les découper, les embedder et les stocker dans pgvector.

### Parser multi-format

```typescript
// src/ingest/parsers/code.parser.ts

interface CodeChunk {
  content: string;
  metadata: {
    language: string;
    type: 'function' | 'class' | 'module' | 'block';
    name?: string;
  };
}

export function parseTypeScript(code: string): CodeChunk[] {
  const chunks: CodeChunk[] = [];

  // Découper par fonctions et classes
  const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)[^{]*\{/g;
  const classRegex = /(?:export\s+)?class\s+(\w+)[^{]*\{/g;

  let match: RegExpExecArray | null;

  // Fonctions
  match = functionRegex.exec(code);
  while (match !== null) {
    const start = match.index;
    const end = findMatchingBrace(code, start + match[0].length - 1);
    if (end > start) {
      chunks.push({
        content: code.slice(start, end + 1),
        metadata: {
          language: 'typescript',
          type: 'function',
          name: match[1],
        },
      });
    }
    match = functionRegex.exec(code);
  }

  // Classes
  match = classRegex.exec(code);
  while (match !== null) {
    const start = match.index;
    const end = findMatchingBrace(code, start + match[0].length - 1);
    if (end > start) {
      chunks.push({
        content: code.slice(start, end + 1),
        metadata: {
          language: 'typescript',
          type: 'class',
          name: match[1],
        },
      });
    }
    match = classRegex.exec(code);
  }

  // Si aucun chunk trouvé, traiter comme un bloc
  if (chunks.length === 0) {
    chunks.push({
      content: code,
      metadata: { language: 'typescript', type: 'module' },
    });
  }

  return chunks;
}

function findMatchingBrace(code: string, openPos: number): number {
  let depth = 1;
  for (let i = openPos + 1; i < code.length; i++) {
    if (code[i] === '{') depth++;
    if (code[i] === '}') depth--;
    if (depth === 0) return i;
  }
  return -1;
}
```

### Checklist Phase 2

```
[ ] POST /ingest/file accepte un fichier et retourne le nombre de chunks
[ ] POST /ingest/files accepte plusieurs fichiers
[ ] GET /ingest/documents liste les documents ingérés
[ ] DELETE /ingest/documents/:id supprime un document et ses chunks
[ ] Chunking fonctionne pour Markdown, texte, code TS
[ ] Embeddings générés et stockés dans pgvector
[ ] Tests unitaires du chunking (au moins 5 cas)
```

---

## 5. Phase 3 — RAG Hybride (3h)

### Objectif

Implémenter une recherche combinant recherche vectorielle et BM25 pour de meilleurs résultats.

### BM25 simplifié en TypeScript

```typescript
// src/search/bm25.service.ts
import { Injectable } from '@nestjs/common';

interface BM25Document {
  id: number;
  content: string;
  tokens: string[];
}

@Injectable()
export class BM25Service {
  private documents: BM25Document[] = [];
  private avgDocLength = 0;
  private idf = new Map<string, number>();

  // Paramètres BM25 standard
  private readonly k1 = 1.5;
  private readonly b = 0.75;

  /**
   * Indexer les documents
   */
  index(docs: Array<{ id: number; content: string }>): void {
    this.documents = docs.map((d) => ({
      ...d,
      tokens: this.tokenize(d.content),
    }));

    this.avgDocLength = this.documents.reduce(
      (sum, d) => sum + d.tokens.length, 0,
    ) / this.documents.length;

    this.computeIDF();
  }

  /**
   * Rechercher les documents les plus pertinents
   */
  search(query: string, limit: number = 5): Array<{ id: number; score: number }> {
    const queryTokens = this.tokenize(query);
    const scores: Array<{ id: number; score: number }> = [];

    for (const doc of this.documents) {
      let score = 0;

      for (const term of queryTokens) {
        const tf = doc.tokens.filter((t) => t === term).length;
        const idf = this.idf.get(term) ?? 0;
        const docLength = doc.tokens.length;

        // Formule BM25
        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (docLength / this.avgDocLength));
        score += idf * (numerator / denominator);
      }

      if (score > 0) {
        scores.push({ id: doc.id, score });
      }
    }

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);
  }

  private computeIDF(): void {
    const N = this.documents.length;
    const df = new Map<string, number>();

    for (const doc of this.documents) {
      const uniqueTerms = new Set(doc.tokens);
      for (const term of uniqueTerms) {
        df.set(term, (df.get(term) ?? 0) + 1);
      }
    }

    for (const [term, count] of df) {
      this.idf.set(term, Math.log((N - count + 0.5) / (count + 0.5) + 1));
    }
  }
}
```

### Service de recherche hybride

```typescript
// src/search/search.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingService } from '../shared/embedding/embedding.service';
import { VectorStoreService } from '../shared/vector-store/vector-store.service';
import { BM25Service } from './bm25.service';

interface SearchResult {
  chunkId: number;
  content: string;
  filename: string;
  score: number;
  method: 'vector' | 'bm25' | 'hybrid';
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly vectorWeight = 0.7;
  private readonly bm25Weight = 0.3;

  constructor(
    private embedding: EmbeddingService,
    private vectorStore: VectorStoreService,
    private bm25: BM25Service,
  ) {}

  /**
   * Recherche hybride : combine vectorielle + BM25
   * avec Reciprocal Rank Fusion (RRF)
   */
  async hybridSearch(query: string, limit: number = 5): Promise<SearchResult[]> {
    // Lancer les deux recherches en parallèle
    const [vectorResults, bm25Results] = await Promise.all([
      this.vectorSearch(query, limit * 2),
      this.bm25Search(query, limit * 2),
    ]);

    // Reciprocal Rank Fusion
    const k = 60; // constante RRF standard
    const scores = new Map<number, { score: number; content: string; filename: string }>();

    // Scores vectoriels
    vectorResults.forEach((result, rank) => {
      const rrfScore = this.vectorWeight / (k + rank + 1);
      const existing = scores.get(result.chunkId);
      scores.set(result.chunkId, {
        score: (existing?.score ?? 0) + rrfScore,
        content: result.content,
        filename: result.filename,
      });
    });

    // Scores BM25
    bm25Results.forEach((result, rank) => {
      const rrfScore = this.bm25Weight / (k + rank + 1);
      const existing = scores.get(result.chunkId);
      scores.set(result.chunkId, {
        score: (existing?.score ?? 0) + rrfScore,
        content: existing?.content ?? result.content,
        filename: existing?.filename ?? result.filename,
      });
    });

    // Trier et retourner les top-K
    return [...scores.entries()]
      .map(([chunkId, data]) => ({
        chunkId,
        content: data.content,
        filename: data.filename,
        score: data.score,
        method: 'hybrid' as const,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async vectorSearch(query: string, limit: number): Promise<SearchResult[]> {
    const queryEmbedding = await this.embedding.embed(query);
    const results = await this.vectorStore.search(queryEmbedding, limit);

    return results.map((r) => ({
      chunkId: r.chunkId,
      content: r.content,
      filename: r.filename,
      score: r.similarity,
      method: 'vector' as const,
    }));
  }

  private async bm25Search(query: string, limit: number): Promise<SearchResult[]> {
    const results = this.bm25.search(query, limit);
    // Résoudre les IDs en contenu depuis le vector store
    // (simplifié ici — en production, on ferait un batch query)
    return results.map((r) => ({
      chunkId: r.id,
      content: '', // À résoudre depuis la BDD
      filename: '',
      score: r.score,
      method: 'bm25' as const,
    }));
  }
}
```

### Checklist Phase 3

```
[ ] Recherche vectorielle fonctionne (top-5 pertinents)
[ ] BM25 indexé au démarrage et après chaque ingestion
[ ] Recherche hybride RRF fonctionne
[ ] GET /search?q=... retourne les résultats avec scores
[ ] Tests : recherche synonymes (vectorielle > BM25)
[ ] Tests : recherche mots exacts (BM25 > vectorielle)
```

---

## 6. Phase 4 — Conversation et Citations (3h)

### Objectif

Implémenter le chat avec streaming SSE, historique de conversation et citations des sources.

### Service de citations

```typescript
// src/chat/citation.service.ts
import { Injectable } from '@nestjs/common';

interface Citation {
  filename: string;
  excerpt: string;
  chunkId: number;
  relevanceScore: number;
}

@Injectable()
export class CitationService {
  /**
   * Extraire les citations réellement utilisées dans la réponse
   * En comparant la réponse avec les chunks sources
   */
  extractUsedCitations(
    answer: string,
    sources: Array<{ chunkId: number; content: string; filename: string; score: number }>,
  ): Citation[] {
    const citations: Citation[] = [];

    for (const source of sources) {
      // Vérifier si des phrases du chunk apparaissent dans la réponse
      const sentences = source.content.split(/[.!?]+/).filter((s) => s.trim().length > 20);

      for (const sentence of sentences) {
        const normalizedSentence = sentence.trim().toLowerCase();
        const normalizedAnswer = answer.toLowerCase();

        // Recherche de sous-chaîne avec tolérance
        if (this.fuzzyContains(normalizedAnswer, normalizedSentence, 0.7)) {
          citations.push({
            filename: source.filename,
            excerpt: sentence.trim().slice(0, 150),
            chunkId: source.chunkId,
            relevanceScore: source.score,
          });
          break; // Une citation par source suffit
        }
      }
    }

    // Si aucune citation directe trouvée, citer les sources les plus pertinentes
    if (citations.length === 0 && sources.length > 0) {
      for (const source of sources.slice(0, 3)) {
        citations.push({
          filename: source.filename,
          excerpt: source.content.slice(0, 150),
          chunkId: source.chunkId,
          relevanceScore: source.score,
        });
      }
    }

    return citations;
  }

  /**
   * Vérification approximative de contenu
   */
  private fuzzyContains(haystack: string, needle: string, threshold: number): boolean {
    // Tokeniser et comparer les mots en commun
    const haystackWords = new Set(haystack.split(/\s+/));
    const needleWords = needle.split(/\s+/);

    const matchCount = needleWords.filter((w) => haystackWords.has(w)).length;
    return needleWords.length > 0 && matchCount / needleWords.length >= threshold;
  }
}
```

### Checklist Phase 4

```
[ ] POST /chat retourne un flux SSE avec les tokens
[ ] Les sources sont envoyées en premier (event type: sources)
[ ] L'historique de conversation fonctionne (multi-tours)
[ ] Les citations sont extraites et incluses dans la réponse
[ ] POST /conversations crée une conversation
[ ] GET /conversations/:id/messages retourne l'historique
[ ] Le context window est géré (truncation de l'historique)
[ ] Tests : conversation 5 tours sans dégradation
```

---

## 7. Phase 5 — Pipeline d'évaluation (2h)

### Objectif

Évaluer automatiquement la qualité du RAG avec les 4 métriques standard.

### Dataset d'évaluation

```jsonl
{"question":"Comment installer pgvector ?","reference":"pgvector s'installe via Docker avec l'image pgvector/pgvector:pg16 ou en compilant l'extension depuis les sources.","contexts_needed":["installation","pgvector","docker"]}
{"question":"Qu'est-ce que le chunking ?","reference":"Le chunking est le processus de découpage d'un document en morceaux de taille optimale pour le RAG, typiquement 200-500 tokens avec un overlap.","contexts_needed":["chunking","rag","documents"]}
{"question":"Comment fonctionne la recherche hybride ?","reference":"La recherche hybride combine la recherche vectorielle (similarité cosinus) et la recherche lexicale (BM25) via Reciprocal Rank Fusion.","contexts_needed":["recherche","hybride","bm25","vectorielle"]}
```

### Service d'évaluation

```typescript
// src/eval/eval.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SearchService } from '../search/search.service';
import { LLMService } from '../shared/llm/llm.service';

interface EvalResult {
  question: string;
  answer: string;
  reference?: string;
  contexts: string[];
  metrics: {
    faithfulness: number;
    answerRelevancy: number;
    contextPrecision: number;
    contextRecall: number;
    overall: number;
  };
}

@Injectable()
export class EvalService {
  private readonly logger = new Logger(EvalService.name);

  constructor(
    private search: SearchService,
    private llm: LLMService,
  ) {}

  /**
   * Évaluer le pipeline complet sur un dataset
   */
  async evaluateDataset(
    dataset: Array<{ question: string; reference?: string }>,
  ): Promise<{ results: EvalResult[]; summary: Record<string, number> }> {
    const results: EvalResult[] = [];

    for (const item of dataset) {
      this.logger.log(`Evaluating: "${item.question.slice(0, 50)}..."`);

      // 1. Rechercher les contextes
      const searchResults = await this.search.hybridSearch(item.question, 5);
      const contexts = searchResults.map((r) => r.content);

      // 2. Générer la réponse
      const answer = await this.llm.chat([
        { role: 'system', content: 'Réponds en te basant sur le contexte fourni.' },
        { role: 'user', content: `Contexte:\n${contexts.join('\n---\n')}\n\nQuestion: ${item.question}` },
      ]);

      // 3. Évaluer avec LLM-as-judge
      const metrics = await this.computeMetrics(
        item.question, answer, contexts, item.reference,
      );

      results.push({
        question: item.question,
        answer,
        reference: item.reference,
        contexts,
        metrics,
      });
    }

    // Résumé agrégé
    const summary = {
      faithfulness: avg(results.map((r) => r.metrics.faithfulness)),
      answerRelevancy: avg(results.map((r) => r.metrics.answerRelevancy)),
      contextPrecision: avg(results.map((r) => r.metrics.contextPrecision)),
      contextRecall: avg(results.map((r) => r.metrics.contextRecall)),
      overall: avg(results.map((r) => r.metrics.overall)),
    };

    this.logger.log(`Evaluation complete. Overall: ${(summary.overall * 100).toFixed(1)}%`);

    return { results, summary };
  }

  private async computeMetrics(
    question: string,
    answer: string,
    contexts: string[],
    reference?: string,
  ): Promise<EvalResult['metrics']> {
    const prompt = `Évalue cette réponse RAG. Note chaque critère de 0.0 à 1.0.

Question : ${question}
Contextes fournis : ${contexts.join('\n---\n')}
Réponse générée : ${answer}
${reference ? `Réponse de référence : ${reference}` : ''}

Critères :
- faithfulness: La réponse est-elle fidèle aux contextes ? (pas d'invention)
- answerRelevancy: La réponse répond-elle à la question ?
- contextPrecision: Les contextes sont-ils pertinents pour la question ?
- contextRecall: Les contextes couvrent-ils la réponse attendue ?

Réponds en JSON : {"faithfulness": 0.X, "answerRelevancy": 0.X, "contextPrecision": 0.X, "contextRecall": 0.X}`;

    const response = await this.llm.chat([
      { role: 'system', content: 'Tu es un évaluateur RAG. Réponds uniquement en JSON.' },
      { role: 'user', content: prompt },
    ]);

    try {
      const metrics = JSON.parse(response);
      const overall = (
        metrics.faithfulness +
        metrics.answerRelevancy +
        metrics.contextPrecision +
        (metrics.contextRecall ?? 0)
      ) / 4;

      return { ...metrics, overall };
    } catch {
      return {
        faithfulness: 0,
        answerRelevancy: 0,
        contextPrecision: 0,
        contextRecall: 0,
        overall: 0,
      };
    }
  }
}

function avg(numbers: number[]): number {
  return numbers.length > 0
    ? numbers.reduce((a, b) => a + b, 0) / numbers.length
    : 0;
}
```

### Checklist Phase 5

```
[ ] Dataset d'évaluation de 10+ questions créé (eval-set.jsonl)
[ ] POST /eval/run lance l'évaluation complète
[ ] GET /eval/results retourne les résultats détaillés
[ ] Métriques moyennes calculées (faithfulness, relevancy, precision, recall)
[ ] Score overall > 0.7 sur le dataset de test
```

---

## 8. Phase 6 — Production et monitoring (2h)

### Objectif

Ajouter la sécurité, le cache, le monitoring et préparer le déploiement Docker.

### Endpoint d'administration

```typescript
// src/admin/admin.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get('dashboard')
  async getDashboard(@Query('hours') hours?: string) {
    return this.admin.getDashboard(parseInt(hours ?? '24', 10));
  }

  @Get('documents')
  async getDocuments() {
    return this.admin.getDocuments();
  }

  @Get('eval/latest')
  async getLatestEval() {
    return this.admin.getLatestEvaluation();
  }

  @Get('health')
  async healthCheck() {
    return this.admin.healthCheck();
  }
}
```

### Health check complet

```typescript
// src/admin/admin.service.ts (extrait)

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, { status: string; latencyMs: number }>;
  timestamp: string;
}

async healthCheck(): Promise<HealthStatus> {
  const checks: Record<string, { status: string; latencyMs: number }> = {};

  // PostgreSQL
  const pgStart = Date.now();
  try {
    await this.pool.query('SELECT 1');
    checks.postgres = { status: 'ok', latencyMs: Date.now() - pgStart };
  } catch {
    checks.postgres = { status: 'error', latencyMs: Date.now() - pgStart };
  }

  // Ollama
  const ollamaStart = Date.now();
  try {
    const res = await fetch(`${this.ollamaUrl}/api/tags`);
    checks.ollama = {
      status: res.ok ? 'ok' : 'error',
      latencyMs: Date.now() - ollamaStart,
    };
  } catch {
    checks.ollama = { status: 'error', latencyMs: Date.now() - ollamaStart };
  }

  // pgvector
  const pgvStart = Date.now();
  try {
    await this.pool.query('SELECT COUNT(*) FROM chunks');
    checks.pgvector = { status: 'ok', latencyMs: Date.now() - pgvStart };
  } catch {
    checks.pgvector = { status: 'error', latencyMs: Date.now() - pgvStart };
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok');
  const anyError = Object.values(checks).some((c) => c.status === 'error');

  return {
    status: allOk ? 'healthy' : anyError ? 'unhealthy' : 'degraded',
    services: checks,
    timestamp: new Date().toISOString(),
  };
}
```

### Checklist Phase 6

```
[ ] Middleware de sécurité (injection detection) actif
[ ] Semantic cache configuré (seuil 0.92)
[ ] Rate limiting par IP (20 req/min)
[ ] Output filtering actif (PII, URLs)
[ ] GET /admin/dashboard retourne coûts, latence, cache hit rate
[ ] GET /admin/health retourne le statut de chaque service
[ ] Docker build fonctionne
[ ] docker compose up lance tout le stack
[ ] Tests E2E passent
```

---

## 9. Critères d'évaluation du projet

### Grille de notation

| Critère | Poids | Excellent (A) | Correct (B) | Insuffisant (C) |
|---------|-------|---------------|-------------|-----------------|
| **Ingestion** | 15% | Multi-format, chunking intelligent, déduplication | Upload + chunking basique | Upload seul |
| **RAG Hybride** | 20% | Vectoriel + BM25 + RRF, reranking | Vectoriel seul, pertinent | Recherche qui fonctionne |
| **Conversation** | 20% | Streaming, historique, context management | Streaming + historique basique | Réponse sans streaming |
| **Citations** | 10% | Citations précises avec excerpt | Citations par filename | Pas de citations |
| **Évaluation** | 15% | 4 métriques, dataset 15+ questions, score > 0.7 | 2 métriques, dataset basique | Évaluation manuelle |
| **Production** | 10% | Security guards, cache, monitoring, Docker | Security + Docker | Docker seul |
| **Qualité code** | 10% | TypeScript strict, tests, architecture propre | Types corrects, quelques tests | Code fonctionnel |

### Livrables attendus

```
1. Code source complet (repository Git)
2. README.md avec :
   - Instructions de setup (docker compose up)
   - Documentation des endpoints API
   - Résultats d'évaluation
3. Dataset d'évaluation (eval-set.jsonl, 15+ questions)
4. Capture d'écran du dashboard admin
5. Rapport de 1 page : choix techniques et résultats
```

---

## 10. Rétrospective des modules

### Le parcours complet

```
Module 00: Prérequis et paysage IA
Module 01: Prompting fondamental
Module 02: Prompting avancé         ──→ Vous savez parler aux LLMs
Module 03: Assistants de code
Module 04: APIs Claude et OpenAI    ──→ Vous savez les intégrer en TS
Module 05: MCP Protocol
Module 06: Agents et orchestration  ──→ Vous savez construire des agents
Module 07: Maths essentielles
Module 08: Neural network from scratch
Module 09: Transformer et attention ──→ Vous comprenez le fonctionnement interne
Module 10: Entraînement et fine-tuning
Module 11: Ollama et LLMs locaux
Module 12: Tokenization et embeddings ──→ Vous maîtrisez les fondations
Module 13: RAG fondamental
Module 14: RAG avancé               ──→ Vous savez construire un RAG
Module 15: Chatbot RAG full-stack
Module 16: Évaluation et observabilité
Module 17: Sécurité et éthique
Module 18: Production et coûts      ──→ Vous savez mettre en production
Module 19: Projet final             ──→ Vous avez tout assemblé
```

### Compétences acquises

| Domaine | Compétences |
|---------|-------------|
| **Prompting** | Zero-shot, few-shot, chain-of-thought, system prompts, prompt optimization |
| **APIs** | Claude, OpenAI, streaming, function calling, structured output |
| **Architecture** | Agents, MCP, RAG pipeline, embeddings, vector stores |
| **ML Foundations** | Tokenization BPE, neural networks, transformers, attention, fine-tuning |
| **Local LLMs** | Ollama, quantization, Modelfile, VRAM management |
| **RAG** | Chunking, embeddings, pgvector, HNSW, hybrid search, BM25, reranking |
| **Production** | Sécurité, évaluation, monitoring, coûts, caching, rate limiting |
| **TypeScript** | Toutes les implémentations en TypeScript strict |

### Pour aller plus loin

| Sujet | Ressources |
|-------|-----------|
| Fine-tuning avancé | Unsloth, Axolotl, HuggingFace TRL |
| Agents autonomes | AutoGPT, CrewAI, LangGraph |
| Multimodal | Vision (Claude, GPT-4V), Audio (Whisper) |
| Scaling RAG | Qdrant, Milvus, distributed vector stores |
| Évaluation avancée | RAGAS, DeepEval, LangSmith |
| MLOps | MLflow, Weights & Biases, DVC |
| Spécialisation | Code assistants, document AI, voice AI |

---

## Exercices pratiques (le projet lui-même)

1. **Phase 1** : Mettez en place l'infrastructure complète (Docker, PostgreSQL, Ollama, NestJS)
2. **Phase 2** : Implémentez le pipeline d'ingestion avec support Markdown, texte et code TypeScript
3. **Phase 3** : Construisez le moteur de recherche hybride (vectoriel + BM25 + RRF)
4. **Phase 4** : Créez le chat avec streaming SSE, historique et citations
5. **Phase 5** : Implémentez le pipeline d'évaluation avec 4 métriques et un dataset de 15+ questions
6. **Phase 6** : Ajoutez la sécurité (guardrails), le cache sémantique, le monitoring et le Docker complet
