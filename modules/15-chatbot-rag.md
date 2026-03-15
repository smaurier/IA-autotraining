# Module 15 — Chatbot RAG Full-Stack

> **Objectif** : Construire une **vraie application** de chatbot RAG deployable, avec NestJS, pgvector et streaming.
> **Difficulte** : ⭐⭐⭐⭐ (avance — projet integrant tout le cours)
> **Prerequis** : Module 13 (RAG Fondamental — obligatoire), Module 14 (recommande), cours NestJS (recommande)
> **Duree estimee** : 5 heures

---

## La difference avec les Modules 13-14

Les modules 13 et 14 vous ont appris les **techniques** du RAG. Ce module les assemble dans une **application reelle** :

```
Module 13-14 (techniques)              Module 15 (application)
─────────────────────────              ─────────────────────────
Scripts TypeScript standalone    →     API NestJS structuree
Array en memoire                 →     PostgreSQL + pgvector
Appels synchrones                →     Streaming SSE temps reel
Texte brut en console            →     Citations avec sources
Pas de persistance               →     Docker Compose complet
Un seul echange                  →     Conversation multi-tours avec historique
```

> Ce module est un **projet d'integration**. Si vous maitrisez les modules 13-14, vous pouvez le suivre comme un TP guide. Si vous ne les avez pas faits, lisez au moins le Module 13 avant.

---

## Objectifs du module

- Construire un chatbot RAG complet avec NestJS, pgvector et Ollama/Claude
- Implémenter un pipeline d'ingestion (upload, chunking, embedding, stockage)
- Gérer une conversation avec historique et streaming SSE
- Configurer pgvector avec un schéma optimisé et un index HNSW
- Maîtriser le system prompt engineering pour un RAG
- Implémenter les citations et la traçabilité des sources
- Mettre en place les tests et le Docker Compose

---

## 1. Architecture du projet

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Upload fichiers  │  │  Chat interface   │  │  Sources panel   │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────────────┘  │
│           │                     │ SSE stream                         │
└───────────┼─────────────────────┼───────────────────────────────────┘
            │ POST /ingest        │ POST /chat
┌───────────┼─────────────────────┼───────────────────────────────────┐
│           ▼                     ▼           NESTJS API               │
│  ┌──────────────────┐  ┌──────────────────┐                         │
│  │  IngestModule     │  │  ChatModule       │                        │
│  │  - Upload         │  │  - Conversation   │                        │
│  │  - Chunking       │  │  - RAG Pipeline   │                        │
│  │  - Embedding      │  │  - Streaming      │                        │
│  │  - Storage        │  │  - Citations      │                        │
│  └────────┬─────────┘  └────────┬─────────┘                         │
│           │                     │                                     │
│  ┌────────▼─────────────────────▼─────────┐                         │
│  │           VectorStoreService            │                         │
│  │  - Insert embeddings                    │                         │
│  │  - Similarity search                    │                         │
│  └────────────────────┬───────────────────┘                         │
│                       │                                               │
└───────────────────────┼───────────────────────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  PostgreSQL   │ │   Ollama     │ │  Claude API  │
│  + pgvector   │ │  (local)     │ │  (cloud)     │
└──────────────┘ └──────────────┘ └──────────────┘
```

### Structure des fichiers

```
rag-chatbot/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── config/
│   │   └── configuration.ts
│   ├── ingest/
│   │   ├── ingest.module.ts
│   │   ├── ingest.controller.ts
│   │   ├── ingest.service.ts
│   │   ├── chunking.service.ts
│   │   └── dto/
│   │       └── ingest.dto.ts
│   ├── chat/
│   │   ├── chat.module.ts
│   │   ├── chat.controller.ts
│   │   ├── chat.service.ts
│   │   └── dto/
│   │       └── chat.dto.ts
│   ├── vector-store/
│   │   ├── vector-store.module.ts
│   │   └── vector-store.service.ts
│   ├── embedding/
│   │   ├── embedding.module.ts
│   │   └── embedding.service.ts
│   └── llm/
│       ├── llm.module.ts
│       └── llm.service.ts
├── docker-compose.yml
├── .env
├── package.json
└── tsconfig.json
```

---

## 2. Setup du projet

### Initialisation NestJS

```bash
# Créer le projet
npx @nestjs/cli new rag-chatbot
cd rag-chatbot

# Installer les dépendances
pnpm add pg @nestjs/config class-validator class-transformer
pnpm add multer @nestjs/platform-express
pnpm add -D @types/multer @types/pg
```

### Docker Compose

```yaml
# docker-compose.yml
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: ragchat
      POSTGRES_USER: raguser
      POSTGRES_PASSWORD: ragpass
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql

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

### Script d'initialisation SQL

```sql
-- init.sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Table des documents sources
CREATE TABLE documents (
  id          SERIAL PRIMARY KEY,
  filename    VARCHAR(500) NOT NULL,
  file_type   VARCHAR(50) NOT NULL,
  file_size   INTEGER NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Table des chunks (morceaux de documents)
CREATE TABLE chunks (
  id          SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  metadata    JSONB DEFAULT '{}',
  embedding   vector(768),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index HNSW pour la recherche vectorielle
CREATE INDEX chunks_embedding_idx ON chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 100);

-- Index pour le filtrage
CREATE INDEX chunks_document_id_idx ON chunks(document_id);
CREATE INDEX chunks_metadata_idx ON chunks USING gin(metadata);

-- Table des conversations
CREATE TABLE conversations (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(500),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Table des messages
CREATE TABLE messages (
  id              SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  role            VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  sources         JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX messages_conversation_idx ON messages(conversation_id);
```

### Configuration

```typescript
// src/config/configuration.ts
export default () => ({
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'raguser',
    password: process.env.DB_PASSWORD || 'ragpass',
    database: process.env.DB_NAME || 'ragchat',
  },
  ollama: {
    baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    chatModel: process.env.OLLAMA_CHAT_MODEL || 'llama3.1:8b',
    embedModel: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
  },
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
  },
  llmProvider: (process.env.LLM_PROVIDER || 'ollama') as 'ollama' | 'claude',
  chunking: {
    chunkSize: parseInt(process.env.CHUNK_SIZE || '500', 10),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '50', 10),
  },
});
```

---

## 3. Pipeline d'ingestion

### Service de chunking

```typescript
// src/ingest/chunking.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Chunk {
  content: string;
  index: number;
  metadata: {
    startChar: number;
    endChar: number;
    section?: string;
  };
}

@Injectable()
export class ChunkingService {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor(private config: ConfigService) {
    this.chunkSize = this.config.get<number>('chunking.chunkSize', 500);
    this.chunkOverlap = this.config.get<number>('chunking.chunkOverlap', 50);
  }

  /**
   * Découper un texte en chunks avec overlap
   * Stratégie : découper sur les paragraphes, puis sur les phrases
   */
  chunkText(text: string): Chunk[] {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks: Chunk[] = [];
    let currentChunk = '';
    let currentStart = 0;
    let charOffset = 0;

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) {
        charOffset += paragraph.length + 2; // +2 pour \n\n
        continue;
      }

      // Si le paragraphe seul dépasse la taille → découper par phrases
      if (trimmed.length > this.chunkSize) {
        // Flush le chunk courant
        if (currentChunk) {
          chunks.push(this.createChunk(currentChunk, chunks.length, currentStart));
          currentChunk = '';
        }

        const sentenceChunks = this.chunkBySentences(trimmed, charOffset);
        chunks.push(...sentenceChunks.map((sc, i) => ({
          ...sc,
          index: chunks.length + i,
        })));
      } else if ((currentChunk + '\n\n' + trimmed).length > this.chunkSize) {
        // Le chunk courant est plein → sauvegarder et commencer un nouveau
        if (currentChunk) {
          chunks.push(this.createChunk(currentChunk, chunks.length, currentStart));
        }

        // Overlap : reprendre la fin du chunk précédent
        const overlapText = this.getOverlap(currentChunk);
        currentChunk = overlapText ? overlapText + '\n\n' + trimmed : trimmed;
        currentStart = charOffset - overlapText.length;
      } else {
        // Ajouter au chunk courant
        currentChunk = currentChunk ? currentChunk + '\n\n' + trimmed : trimmed;
        if (!currentChunk || currentChunk === trimmed) {
          currentStart = charOffset;
        }
      }

      charOffset += paragraph.length + 2;
    }

    // Flush le dernier chunk
    if (currentChunk.trim()) {
      chunks.push(this.createChunk(currentChunk, chunks.length, currentStart));
    }

    return chunks;
  }

  /**
   * Découper un Markdown en gardant la structure des sections
   */
  chunkMarkdown(markdown: string): Chunk[] {
    const sections = this.splitMarkdownSections(markdown);
    const chunks: Chunk[] = [];

    for (const section of sections) {
      const sectionChunks = this.chunkText(section.content);

      for (const chunk of sectionChunks) {
        chunks.push({
          ...chunk,
          index: chunks.length,
          metadata: {
            ...chunk.metadata,
            section: section.heading,
          },
        });
      }
    }

    return chunks;
  }

  private splitMarkdownSections(
    markdown: string,
  ): Array<{ heading: string; content: string }> {
    const lines = markdown.split('\n');
    const sections: Array<{ heading: string; content: string }> = [];
    let currentHeading = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      const headingMatch = line.match(/^#{1,3}\s+(.+)/);

      if (headingMatch) {
        if (currentContent.length > 0) {
          sections.push({
            heading: currentHeading,
            content: currentContent.join('\n').trim(),
          });
        }
        currentHeading = headingMatch[1];
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    if (currentContent.length > 0) {
      sections.push({
        heading: currentHeading,
        content: currentContent.join('\n').trim(),
      });
    }

    return sections.filter((s) => s.content.length > 0);
  }

  private chunkBySentences(text: string, baseOffset: number): Chunk[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: Chunk[] = [];
    let currentChunk = '';
    let currentStart = baseOffset;

    for (const sentence of sentences) {
      if ((currentChunk + ' ' + sentence).length > this.chunkSize && currentChunk) {
        chunks.push(this.createChunk(currentChunk.trim(), chunks.length, currentStart));
        currentChunk = sentence;
        currentStart = baseOffset + text.indexOf(sentence);
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(this.createChunk(currentChunk.trim(), chunks.length, currentStart));
    }

    return chunks;
  }

  private createChunk(content: string, index: number, startChar: number): Chunk {
    return {
      content: content.trim(),
      index,
      metadata: {
        startChar,
        endChar: startChar + content.length,
      },
    };
  }

  private getOverlap(text: string): string {
    if (!text || this.chunkOverlap <= 0) return '';
    const words = text.split(/\s+/);
    const overlapWords = words.slice(-this.chunkOverlap);
    return overlapWords.join(' ');
  }
}
```

### Service d'embeddings

```typescript
// src/embedding/embedding.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly ollamaUrl: string;
  private readonly model: string;

  constructor(private config: ConfigService) {
    this.ollamaUrl = this.config.get<string>('ollama.baseUrl', 'http://localhost:11434');
    this.model = this.config.get<string>('ollama.embedModel', 'nomic-embed-text');
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${this.ollamaUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt: text }),
    });

    if (!response.ok) {
      throw new Error(`Embedding failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
  }

  async embedBatch(texts: string[], concurrency: number = 5): Promise<number[][]> {
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += concurrency) {
      const batch = texts.slice(i, i + concurrency);
      const embeddings = await Promise.all(batch.map((t) => this.embed(t)));
      results.push(...embeddings);

      this.logger.debug(
        `Embedded ${Math.min(i + concurrency, texts.length)}/${texts.length}`,
      );
    }

    return results;
  }
}
```

### Service d'ingestion

```typescript
// src/ingest/ingest.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ChunkingService } from './chunking.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService } from '../vector-store/vector-store.service';

interface IngestResult {
  documentId: number;
  filename: string;
  chunksCount: number;
  durationMs: number;
}

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(
    private chunking: ChunkingService,
    private embedding: EmbeddingService,
    private vectorStore: VectorStoreService,
  ) {}

  async ingestFile(
    file: Express.Multer.File,
  ): Promise<IngestResult> {
    const start = Date.now();

    // 1. Extraire le texte selon le type de fichier
    const text = await this.extractText(file);
    this.logger.log(`Extracted ${text.length} chars from ${file.originalname}`);

    // 2. Créer l'entrée document
    const documentId = await this.vectorStore.insertDocument({
      filename: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
    });

    // 3. Découper en chunks
    const isMarkdown = file.originalname.endsWith('.md');
    const chunks = isMarkdown
      ? this.chunking.chunkMarkdown(text)
      : this.chunking.chunkText(text);

    this.logger.log(`Created ${chunks.length} chunks`);

    // 4. Générer les embeddings
    const contents = chunks.map((c) => c.content);
    const embeddings = await this.embedding.embedBatch(contents);

    // 5. Stocker dans pgvector
    await this.vectorStore.insertChunks(
      chunks.map((chunk, i) => ({
        documentId,
        content: chunk.content,
        chunkIndex: chunk.index,
        metadata: chunk.metadata,
        embedding: embeddings[i],
      })),
    );

    const durationMs = Date.now() - start;
    this.logger.log(
      `Ingested ${file.originalname}: ${chunks.length} chunks in ${durationMs}ms`,
    );

    return {
      documentId,
      filename: file.originalname,
      chunksCount: chunks.length,
      durationMs,
    };
  }

  private async extractText(file: Express.Multer.File): Promise<string> {
    const content = file.buffer.toString('utf-8');

    switch (file.mimetype) {
      case 'text/plain':
      case 'text/markdown':
        return content;

      case 'application/json':
        return JSON.stringify(JSON.parse(content), null, 2);

      default:
        // Pour les fichiers texte sans mime-type précis
        if (file.originalname.match(/\.(ts|js|md|txt|csv|html|xml|yaml|yml)$/)) {
          return content;
        }
        throw new Error(`Type de fichier non supporté : ${file.mimetype}`);
    }
  }
}
```

### Contrôleur d'ingestion

```typescript
// src/ingest/ingest.controller.ts
import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { IngestService } from './ingest.service';

@Controller('ingest')
export class IngestController {
  constructor(private ingestService: IngestService) {}

  @Post('file')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async ingestFile(@UploadedFile() file: Express.Multer.File) {
    const result = await this.ingestService.ingestFile(file);
    return {
      success: true,
      data: result,
    };
  }

  @Post('files')
  @UseInterceptors(FilesInterceptor('files', 20, { limits: { fileSize: 10 * 1024 * 1024 } }))
  async ingestFiles(@UploadedFiles() files: Express.Multer.File[]) {
    const results = [];
    for (const file of files) {
      const result = await this.ingestService.ingestFile(file);
      results.push(result);
    }
    return {
      success: true,
      data: results,
      total: results.length,
    };
  }
}
```

---

## 4. Vector Store Service

```typescript
// src/vector-store/vector-store.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pg from 'pg';

const { Pool } = pg;

interface ChunkInsert {
  documentId: number;
  content: string;
  chunkIndex: number;
  metadata: Record<string, unknown>;
  embedding: number[];
}

interface SearchResult {
  chunkId: number;
  documentId: number;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
  filename: string;
}

@Injectable()
export class VectorStoreService implements OnModuleInit, OnModuleDestroy {
  private pool!: pg.Pool;
  private readonly logger = new Logger(VectorStoreService.name);

  constructor(private config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.pool = new Pool({
      host: this.config.get('database.host'),
      port: this.config.get('database.port'),
      user: this.config.get('database.user'),
      password: this.config.get('database.password'),
      database: this.config.get('database.database'),
    });

    // Vérifier la connexion
    const client = await this.pool.connect();
    this.logger.log('Connected to PostgreSQL with pgvector');
    client.release();
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async insertDocument(doc: {
    filename: string;
    fileType: string;
    fileSize: number;
  }): Promise<number> {
    const result = await this.pool.query(
      `INSERT INTO documents (filename, file_type, file_size)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [doc.filename, doc.fileType, doc.fileSize],
    );
    return result.rows[0].id;
  }

  async insertChunks(chunks: ChunkInsert[]): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const chunk of chunks) {
        await client.query(
          `INSERT INTO chunks (document_id, content, chunk_index, metadata, embedding)
           VALUES ($1, $2, $3, $4, $5::vector)`,
          [
            chunk.documentId,
            chunk.content,
            chunk.chunkIndex,
            chunk.metadata,
            `[${chunk.embedding.join(',')}]`,
          ],
        );
      }

      await client.query('COMMIT');
      this.logger.debug(`Inserted ${chunks.length} chunks`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async search(queryEmbedding: number[], limit: number = 5): Promise<SearchResult[]> {
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    const result = await this.pool.query(
      `SELECT
         c.id AS chunk_id,
         c.document_id,
         c.content,
         c.metadata,
         d.filename,
         1 - (c.embedding <=> $1::vector) AS similarity
       FROM chunks c
       JOIN documents d ON d.id = c.document_id
       ORDER BY c.embedding <=> $1::vector
       LIMIT $2`,
      [vectorStr, limit],
    );

    return result.rows.map((row) => ({
      chunkId: row.chunk_id,
      documentId: row.document_id,
      content: row.content,
      metadata: row.metadata,
      similarity: parseFloat(row.similarity),
      filename: row.filename,
    }));
  }

  async getDocuments(): Promise<Array<{ id: number; filename: string; chunksCount: number }>> {
    const result = await this.pool.query(`
      SELECT d.id, d.filename, COUNT(c.id)::int AS chunks_count
      FROM documents d
      LEFT JOIN chunks c ON c.document_id = d.id
      GROUP BY d.id, d.filename
      ORDER BY d.created_at DESC
    `);
    return result.rows.map((r) => ({
      id: r.id,
      filename: r.filename,
      chunksCount: r.chunks_count,
    }));
  }

  async deleteDocument(id: number): Promise<void> {
    await this.pool.query('DELETE FROM documents WHERE id = $1', [id]);
  }
}
```

---

## 5. Service LLM (Ollama + Claude)

```typescript
// src/llm/llm.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private readonly provider: 'ollama' | 'claude';
  private readonly ollamaUrl: string;
  private readonly ollamaModel: string;
  private readonly claudeApiKey: string;
  private readonly claudeModel: string;

  constructor(private config: ConfigService) {
    this.provider = this.config.get<'ollama' | 'claude'>('llmProvider', 'ollama');
    this.ollamaUrl = this.config.get('ollama.baseUrl', 'http://localhost:11434');
    this.ollamaModel = this.config.get('ollama.chatModel', 'llama3.1:8b');
    this.claudeApiKey = this.config.get('claude.apiKey', '');
    this.claudeModel = this.config.get('claude.model', 'claude-sonnet-4-6');

    this.logger.log(`LLM Provider: ${this.provider}`);
  }

  /**
   * Génération avec streaming — retourne un AsyncGenerator
   */
  async *chatStream(messages: LLMMessage[]): AsyncGenerator<string> {
    if (this.provider === 'claude') {
      yield* this.claudeStream(messages);
    } else {
      yield* this.ollamaStream(messages);
    }
  }

  /**
   * Génération sans streaming
   */
  async chat(messages: LLMMessage[]): Promise<string> {
    let result = '';
    for await (const chunk of this.chatStream(messages)) {
      result += chunk;
    }
    return result;
  }

  private async *ollamaStream(messages: LLMMessage[]): AsyncGenerator<string> {
    const response = await fetch(`${this.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.ollamaModel,
        messages,
        stream: true,
        options: { temperature: 0.3, num_predict: 2048 },
      }),
    });

    if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value, { stream: true }).split('\n').filter(Boolean);
      for (const line of lines) {
        const data = JSON.parse(line);
        if (data.message?.content) {
          yield data.message.content;
        }
      }
    }
  }

  private async *claudeStream(messages: LLMMessage[]): AsyncGenerator<string> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.claudeApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.claudeModel,
        max_tokens: 2048,
        system: systemMessage?.content ?? '',
        messages: chatMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude error: ${error}`);
    }

    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'content_block_delta') {
            yield data.delta.text;
          }
        }
      }
    }
  }
}
```

---

## 6. Service de Chat avec RAG

### System prompt engineering

```typescript
// src/chat/prompts.ts
export function buildRAGSystemPrompt(context: string): string {
  return `Tu es un assistant documentaire intelligent. Tu réponds aux questions en te basant EXCLUSIVEMENT sur le contexte fourni ci-dessous.

## Règles strictes

1. **Base tes réponses uniquement sur le contexte** — ne fabrique pas d'informations
2. **Cite tes sources** — utilise le format [Source: nom_fichier] après chaque affirmation
3. **Si le contexte ne contient pas la réponse**, dis-le clairement : "Je n'ai pas trouvé cette information dans les documents disponibles."
4. **Réponds en français** sauf si l'utilisateur pose sa question dans une autre langue
5. **Sois précis et concis** — va droit au but
6. **Structure ta réponse** avec des titres et des listes quand c'est pertinent

## Contexte (documents récupérés)

${context}

## Instructions de citation

Quand tu cites une source, utilise ce format :
- Pour une information provenant d'un document : [Source: nom_du_fichier.ext]
- Si plusieurs documents disent la même chose, cite tous les pertinents
- Ne cite JAMAIS un document qui ne parle pas du sujet`;
}

export function formatContext(
  results: Array<{ content: string; filename: string; similarity: number }>,
): string {
  return results
    .map(
      (r, i) =>
        `--- Document ${i + 1} [${r.filename}] (pertinence: ${(r.similarity * 100).toFixed(0)}%) ---\n${r.content}`,
    )
    .join('\n\n');
}
```

### Service de chat

```typescript
// src/chat/chat.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { LLMService } from '../llm/llm.service';
import { buildRAGSystemPrompt, formatContext } from './prompts';

interface ChatSource {
  filename: string;
  content: string;
  similarity: number;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly topK: number;

  constructor(
    private embedding: EmbeddingService,
    private vectorStore: VectorStoreService,
    private llm: LLMService,
    config: ConfigService,
  ) {
    this.topK = config.get<number>('rag.topK', 5);
  }

  /**
   * Chat avec streaming SSE — retourne un AsyncGenerator
   */
  async *chatStream(
    question: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): AsyncGenerator<{ type: 'sources' | 'token' | 'done'; data: unknown }> {
    // 1. Récupérer les chunks pertinents
    const queryEmbedding = await this.embedding.embed(question);
    const searchResults = await this.vectorStore.search(queryEmbedding, this.topK);

    // Filtrer les résultats peu pertinents
    const relevantResults = searchResults.filter((r) => r.similarity > 0.3);

    // 2. Émettre les sources d'abord
    const sources: ChatSource[] = relevantResults.map((r) => ({
      filename: r.filename,
      content: r.content.slice(0, 200) + (r.content.length > 200 ? '...' : ''),
      similarity: r.similarity,
    }));
    yield { type: 'sources', data: sources };

    // 3. Construire le prompt augmenté
    const context = formatContext(relevantResults);
    const systemPrompt = buildRAGSystemPrompt(context);

    // 4. Construire les messages avec l'historique
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...this.trimHistory(conversationHistory),
      { role: 'user' as const, content: question },
    ];

    // 5. Streamer la réponse du LLM
    for await (const token of this.llm.chatStream(messages)) {
      yield { type: 'token', data: token };
    }

    yield { type: 'done', data: null };
  }

  /**
   * Limiter l'historique pour ne pas dépasser le context window
   */
  private trimHistory(
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    maxMessages: number = 10,
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    // Garder les N derniers échanges
    if (history.length <= maxMessages) return history;
    return history.slice(-maxMessages);
  }
}
```

### Contrôleur de chat avec SSE

```typescript
// src/chat/chat.controller.ts
import { Controller, Post, Body, Sse, Param, Get } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { ChatService } from './chat.service';

interface ChatRequest {
  question: string;
  conversationId?: number;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface SseEvent {
  data: string;
  type?: string;
}

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  /**
   * POST /chat — retourne un flux SSE
   * Le client reçoit les tokens en temps réel
   */
  @Post()
  chat(@Body() body: ChatRequest): Observable<SseEvent> {
    const subject = new Subject<SseEvent>();

    (async () => {
      try {
        const stream = this.chatService.chatStream(
          body.question,
          body.history ?? [],
        );

        for await (const event of stream) {
          switch (event.type) {
            case 'sources':
              subject.next({
                type: 'sources',
                data: JSON.stringify(event.data),
              });
              break;

            case 'token':
              subject.next({
                type: 'token',
                data: JSON.stringify({ text: event.data }),
              });
              break;

            case 'done':
              subject.next({
                type: 'done',
                data: JSON.stringify({ finished: true }),
              });
              subject.complete();
              break;
          }
        }
      } catch (error) {
        subject.next({
          type: 'error',
          data: JSON.stringify({
            message: error instanceof Error ? error.message : 'Unknown error',
          }),
        });
        subject.complete();
      }
    })();

    return subject.asObservable();
  }
}
```

---

## 7. Client TypeScript pour le streaming

```typescript
// client/chat-client.ts
// Exemple de client qui consomme le flux SSE

interface ChatSource {
  filename: string;
  content: string;
  similarity: number;
}

class RAGChatClient {
  private history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  constructor(private apiUrl: string = 'http://localhost:3000') {}

  async sendMessage(
    question: string,
    onToken: (token: string) => void,
    onSources?: (sources: ChatSource[]) => void,
  ): Promise<string> {
    this.history.push({ role: 'user', content: question });

    const response = await fetch(`${this.apiUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        history: this.history.slice(0, -1), // Exclure la question courante
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parser les événements SSE
      const events = buffer.split('\n\n');
      buffer = events.pop() || ''; // Garder le fragment incomplet

      for (const event of events) {
        const lines = event.split('\n');
        let eventType = '';
        let eventData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) eventType = line.slice(7);
          if (line.startsWith('data: ')) eventData = line.slice(6);
        }

        switch (eventType) {
          case 'sources':
            if (onSources) onSources(JSON.parse(eventData));
            break;

          case 'token': {
            const { text } = JSON.parse(eventData);
            fullResponse += text;
            onToken(text);
            break;
          }

          case 'done':
            break;
        }
      }
    }

    this.history.push({ role: 'assistant', content: fullResponse });
    return fullResponse;
  }

  clearHistory(): void {
    this.history = [];
  }
}

// Utilisation
const client = new RAGChatClient();

const answer = await client.sendMessage(
  'Comment configurer pgvector ?',
  (token) => process.stdout.write(token),
  (sources) => {
    console.log('\n--- Sources ---');
    for (const s of sources) {
      console.log(`  [${(s.similarity * 100).toFixed(0)}%] ${s.filename}`);
    }
    console.log('--- Réponse ---');
  },
);

console.log('\n\nRéponse complète :', answer.length, 'caractères');
```

---

## 8. Gestion du context window

```typescript
// src/chat/context-manager.ts

interface ContextBudget {
  totalTokens: number;        // Limite du modèle (ex: 8192)
  systemPromptTokens: number; // ~500 tokens pour le system prompt
  responseTokens: number;     // ~2048 tokens réservés pour la réponse
  ragContextTokens: number;   // Espace pour les chunks RAG
  historyTokens: number;      // Espace pour l'historique
}

export class ContextManager {
  private readonly budget: ContextBudget;

  constructor(modelContextSize: number = 8192) {
    this.budget = {
      totalTokens: modelContextSize,
      systemPromptTokens: 500,
      responseTokens: 2048,
      ragContextTokens: 0,
      historyTokens: 0,
    };

    // Répartir l'espace restant : 70% RAG, 30% historique
    const remaining =
      modelContextSize -
      this.budget.systemPromptTokens -
      this.budget.responseTokens;

    this.budget.ragContextTokens = Math.floor(remaining * 0.7);
    this.budget.historyTokens = Math.floor(remaining * 0.3);
  }

  /**
   * Estimer le nombre de tokens (approximation ~4 chars/token en FR)
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 3.5);
  }

  /**
   * Sélectionner les chunks qui tiennent dans le budget
   */
  selectChunks(
    chunks: Array<{ content: string; similarity: number; filename: string }>,
  ): typeof chunks {
    const selected: typeof chunks = [];
    let currentTokens = 0;

    for (const chunk of chunks) {
      const chunkTokens = this.estimateTokens(chunk.content);

      if (currentTokens + chunkTokens > this.budget.ragContextTokens) {
        break;
      }

      selected.push(chunk);
      currentTokens += chunkTokens;
    }

    return selected;
  }

  /**
   * Tronquer l'historique pour tenir dans le budget
   */
  trimHistory(
    messages: Array<{ role: string; content: string }>,
  ): typeof messages {
    let totalTokens = 0;
    const result: typeof messages = [];

    // Garder les messages les plus récents
    for (let i = messages.length - 1; i >= 0; i--) {
      const tokens = this.estimateTokens(messages[i].content);

      if (totalTokens + tokens > this.budget.historyTokens) break;

      result.unshift(messages[i]);
      totalTokens += tokens;
    }

    return result;
  }

  getBudget(): ContextBudget {
    return { ...this.budget };
  }
}
```

---

## 9. Tests

### Tests unitaires du chunking

```typescript
// src/ingest/chunking.service.spec.ts
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ChunkingService } from './chunking.service';

describe('ChunkingService', () => {
  let service: ChunkingService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ChunkingService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultVal: number) => {
              const config: Record<string, number> = {
                'chunking.chunkSize': 200,
                'chunking.chunkOverlap': 20,
              };
              return config[key] ?? defaultVal;
            },
          },
        },
      ],
    }).compile();

    service = module.get(ChunkingService);
  });

  it('devrait découper un texte en chunks', () => {
    const text = Array(10)
      .fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
      .join('\n\n');

    const chunks = service.chunkText(text);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.content.length > 0)).toBe(true);
    expect(chunks.every((c) => c.content.length <= 250)).toBe(true); // marge
  });

  it('devrait respecter l\'index des chunks', () => {
    const text = 'Paragraphe 1.\n\nParagraphe 2.\n\nParagraphe 3.';
    const chunks = service.chunkText(text);

    chunks.forEach((chunk, i) => {
      expect(chunk.index).toBe(i);
    });
  });

  it('devrait découper le markdown par sections', () => {
    const md = `# Titre 1
Contenu de la section 1.

## Titre 2
Contenu de la section 2.

## Titre 3
Contenu de la section 3.`;

    const chunks = service.chunkMarkdown(md);
    expect(chunks.some((c) => c.metadata.section === 'Titre 1')).toBe(true);
  });
});
```

### Tests d'intégration du chat

```typescript
// src/chat/chat.service.spec.ts
import { Test } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { LLMService } from '../llm/llm.service';
import { ConfigService } from '@nestjs/config';

describe('ChatService', () => {
  let service: ChatService;

  const mockEmbedding = {
    embed: jest.fn().mockResolvedValue(new Array(768).fill(0.1)),
  };

  const mockVectorStore = {
    search: jest.fn().mockResolvedValue([
      {
        chunkId: 1,
        documentId: 1,
        content: 'pgvector est une extension PostgreSQL pour les vecteurs.',
        metadata: {},
        similarity: 0.92,
        filename: 'docs.md',
      },
    ]),
  };

  const mockLLM = {
    chatStream: jest.fn().mockImplementation(async function* () {
      yield 'pgvector ';
      yield 'est une ';
      yield 'extension PostgreSQL.';
    }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: EmbeddingService, useValue: mockEmbedding },
        { provide: VectorStoreService, useValue: mockVectorStore },
        { provide: LLMService, useValue: mockLLM },
        {
          provide: ConfigService,
          useValue: { get: () => 5 },
        },
      ],
    }).compile();

    service = module.get(ChatService);
  });

  it('devrait streamer une réponse avec sources', async () => {
    const events: Array<{ type: string; data: unknown }> = [];

    for await (const event of service.chatStream('Qu\'est-ce que pgvector ?', [])) {
      events.push(event);
    }

    expect(events[0].type).toBe('sources');
    expect(events.some((e) => e.type === 'token')).toBe(true);
    expect(events[events.length - 1].type).toBe('done');
  });

  it('devrait appeler embed avec la question', async () => {
    const stream = service.chatStream('test question', []);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _event of stream) { /* consume */ }

    expect(mockEmbedding.embed).toHaveBeenCalledWith('test question');
  });
});
```

---

## 10. Docker Compose complet

```yaml
# docker-compose.yml (version production)
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '3000:3000'
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=raguser
      - DB_PASSWORD=ragpass
      - DB_NAME=ragchat
      - OLLAMA_URL=http://ollama:11434
      - OLLAMA_CHAT_MODEL=llama3.1:8b
      - OLLAMA_EMBED_MODEL=nomic-embed-text
      - LLM_PROVIDER=ollama
    depends_on:
      postgres:
        condition: service_healthy
      ollama:
        condition: service_started
    restart: unless-stopped

  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: ragchat
      POSTGRES_USER: raguser
      POSTGRES_PASSWORD: ragpass
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U raguser -d ragchat']
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

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
```

---

## Résumé du module

| Composant | Technologie | Rôle |
|-----------|-------------|------|
| API | NestJS | Endpoints REST + SSE |
| BDD vectorielle | PostgreSQL + pgvector | Stockage chunks + recherche |
| Embeddings | Ollama (nomic-embed-text) | Conversion texte → vecteurs |
| LLM | Ollama / Claude (switchable) | Génération des réponses |
| Chunking | Custom (paragraphe/phrase) | Découpage intelligent |
| Streaming | SSE (Server-Sent Events) | Réponse en temps réel |
| Tests | Jest + mocks NestJS | Unitaires + intégration |
| Infra | Docker Compose | Orchestration des services |

---

## Exercices pratiques

1. **Ingestion** : Ajoutez le support des fichiers PDF (avec `pdf-parse`) et CSV
2. **Reranking** : Implémentez un reranker qui utilise le LLM pour scorer les chunks après la recherche vectorielle
3. **Historique** : Persistez les conversations en base de données et ajoutez un endpoint GET /conversations
4. **Citations** : Enrichissez le système de citations pour inclure le numéro de page/section
5. **Frontend** : Créez une interface de chat minimaliste en HTML/JS qui consomme le flux SSE
