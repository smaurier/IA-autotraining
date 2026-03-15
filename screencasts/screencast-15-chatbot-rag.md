# Screencast 15 — Chatbot RAG Full-Stack

## Informations
- **Duree estimee** : 20-25 min
- **Module** : `modules/15-chatbot-rag.md`
- **Lab associe** : `labs/lab-15-chatbot-rag/`
- **Prérequis** : Modules 13-14 completes, NestJS, Docker Compose

## Setup
- [ ] Docker Compose pret (PostgreSQL/pgvector + Ollama)
- [ ] Projet NestJS initialise (`npx @nestjs/cli new rag-chatbot`)
- [ ] Dependances installees (`pnpm add pg multer @nestjs/config`)
- [ ] Modeles Ollama telecharges (`llama3.1:8b`, `nomic-embed-text`)
- [ ] Terminal et VS Code ouverts

## Script

### [00:00-02:30] Architecture du chatbot RAG
> On passe à la pratique concrete : un chatbot RAG complet avec NestJS, pgvector et Ollama. Il a trois parties : l'ingestion de documents, la recherche hybride, et le chat avec streaming. On va construire tout ça pas a pas.
**Action** : Afficher l'architecture
```
CLIENT (Browser)
  |  Upload fichiers     |  Chat (SSE stream)
  v                      v
NESTJS API
  +-- IngestModule       +-- ChatModule
  |   - Upload           |   - Conversation
  |   - Chunking         |   - RAG Pipeline
  |   - Embedding        |   - Streaming SSE
  |   - Storage          |   - Citations
  +------+---------------+------+
         |                      |
    VectorStoreService     LLM Service
         |                      |
  PostgreSQL/pgvector     Ollama (local)
```

### [02:30-05:30] Docker Compose et schema SQL
> On commence par l'infra. Docker Compose lance PostgreSQL avec pgvector et Ollama. Le schema SQL définit les tables pour les documents, les chunks avec embeddings, et les conversations.
**Action** : Montrer le `docker-compose.yml` et le lancer
```yaml
# docker-compose.yml
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: ragchat
      POSTGRES_USER: raguser
      POSTGRES_PASSWORD: ragpass
    ports: ['5432:5432']
    volumes:
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql

  ollama:
    image: ollama/ollama
    ports: ['11434:11434']
    volumes: [ollama_data:/root/.ollama]
```
```bash
docker compose up -d
```
**Action** : Montrer le schema SQL avec les tables documents, chunks et messages
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chunks (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX chunks_embedding_hnsw ON chunks
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
```

### [05:30-09:00] Pipeline d'ingestion : upload, chunking, embedding
> L'ingestion prend un fichier, le découpé en chunks, généré un embedding pour chaque chunk, et stocke tout dans pgvector.
**Action** : Montrer le IngestService
```typescript
// ingest.service.ts (extrait)
@Injectable()
export class IngestService {
  async ingestFile(file: Express.Multer.File): Promise<{ chunks: number }> {
    // 1. Sauvegarder le document
    const doc = await this.saveDocument(file.originalname, file.mimetype);

    // 2. Parser le contenu
    const content = file.buffer.toString('utf-8');

    // 3. Chunking recursif
    const chunks = this.chunkText(content, file.originalname, 500, 50);

    // 4. Embedding + stockage
    for (const chunk of chunks) {
      const embedding = await this.embeddingService.embed(chunk.content);
      await this.vectorStore.insert(doc.id, chunk.content, embedding, chunk.metadata);
    }

    return { chunks: chunks.length };
  }
}
```
**Action** : Tester l'upload avec curl
```bash
curl -X POST http://localhost:3000/ingest/file \
  -F "file=@./docs/nestjs-modules.md"
# { "chunks": 8 }
```

### [09:00-13:00] Chat avec RAG et streaming SSE
> Le coeur du chatbot : on recoit une question, on cherche les chunks pertinents, on construit le prompt augmente, et on streame la réponse token par token via SSE.
**Action** : Montrer le ChatService
```typescript
// chat.service.ts (extrait)
@Injectable()
export class ChatService {
  async *chat(conversationId: number, question: string): AsyncGenerator<string> {
    // 1. Recuperer l'historique
    const history = await this.getHistory(conversationId, 10);

    // 2. RAG : chercher les chunks pertinents
    const queryEmbedding = await this.embedding.embed(question);
    const chunks = await this.vectorStore.search(queryEmbedding, 5);

    // 3. Construire le prompt augmente
    const context = chunks
      .map((c, i) => `[Source ${i + 1}: ${c.filename}]\n${c.content}`)
      .join('\n---\n');

    const messages = [
      { role: 'system', content: this.buildSystemPrompt(context) },
      ...history,
      { role: 'user', content: question },
    ];

    // 4. Streamer la reponse
    for await (const token of this.llm.streamChat(messages)) {
      yield token;
    }
  }
}
```
**Action** : Montrer le controller SSE
```typescript
// chat.controller.ts
@Post(':conversationId/messages')
@Sse()
async chat(@Param('conversationId') id: number, @Body() dto: ChatDto) {
  return new Observable(subscriber => {
    (async () => {
      for await (const token of this.chatService.chat(id, dto.message)) {
        subscriber.next({ data: token });
      }
      subscriber.complete();
    })();
  });
}
```

### [13:00-15:30] System prompt engineering pour le RAG
> Le system prompt fait toute la différence entre un chatbot qui hallucine et un qui cite ses sources fidelement.
**Action** : Montrer le system prompt optimise
```typescript
const SYSTEM_PROMPT = `Tu es un assistant documentaire technique.

REGLES STRICTES :
1. Reponds UNIQUEMENT en te basant sur le contexte fourni ci-dessous.
2. Si l'information n'est PAS dans le contexte, dis : "Je n'ai pas trouve cette information dans la documentation."
3. Cite tes sources avec [Source N] a la fin de chaque affirmation.
4. Ne fabrique JAMAIS de donnees, URLs, ou numeros de version.
5. Reponds en francais.

CONTEXTE :
{context}`;
```
> Chaque regle est la pour une raison précisé. La regle 2 evite les hallucinations, la regle 3 assure la tracabilite, la regle 4 est le filet de sécurité.

### [15:30-18:00] Citations et tracabilite des sources
> Les citations ne sont pas juste un bonus — c'est ce qui rend le chatbot fiable. L'utilisateur peut vérifier chaque affirmation.
**Action** : Montrer l'extraction de citations
```typescript
// citation.service.ts (extrait)
extractCitations(answer: string, sources: SearchResult[]): Citation[] {
  const citations: Citation[] = [];

  for (const source of sources) {
    const sentences = source.content.split(/[.!?]+/).filter(s => s.trim().length > 20);

    for (const sentence of sentences) {
      if (this.fuzzyContains(answer.toLowerCase(), sentence.trim().toLowerCase(), 0.7)) {
        citations.push({
          filename: source.filename,
          excerpt: sentence.trim().slice(0, 150),
          chunkId: source.chunkId,
        });
        break;
      }
    }
  }

  return citations;
}
```
**Action** : Tester le chat et montrer les citations dans la réponse
```bash
curl -X POST http://localhost:3000/chat/1/messages \
  -H "Content-Type: application/json" \
  -d '{"message": "Comment creer un module NestJS ?"}'
```

### [18:00-21:00] Gestion de l'historique de conversation
> Un chatbot sans mémoire est frustrant. On géré l'historique en stockant les messages et en les injectant dans le prompt — mais attention au context window.
**Action** : Expliquer la gestion du contexte
```
Context window = 8192 tokens (Llama 3.1 8B par defaut)

Repartition :
- System prompt + instructions : ~500 tokens
- Contexte RAG (5 chunks)     : ~2500 tokens
- Historique (10 derniers msg) : ~2000 tokens
- Question actuelle            : ~100 tokens
- Reserve pour la reponse      : ~3000 tokens

Si l'historique depasse, on tronque les messages les plus anciens.
```
**Action** : Tester une conversation multi-tours
```
User: "Comment creer un module NestJS ?"
Bot: "Pour creer un module NestJS, utilisez @Module()... [Source 1]"
User: "Et comment ajouter un provider dedans ?"
Bot: "Dans le meme module, ajoutez le provider... [Source 3]"
User: "Donne un exemple complet"
Bot: "Voici un exemple combinant le module et le provider... [Source 1, 3]"
```

### [21:00-23:30] Tests et Docker final
> Avant de conclure, un mot sur les tests. On teste l'ingestion (upload + nombre de chunks), le chat (réponse pertinente), et les citations.
**Action** : Montrer un test e2e
```typescript
describe('Chat E2E', () => {
  it('should answer with citations', async () => {
    // Ingerer un document
    await request(app.getHttpServer())
      .post('/ingest/file')
      .attach('file', './test/fixtures/test-doc.md')
      .expect(201);

    // Poser une question
    const response = await request(app.getHttpServer())
      .post('/chat/1/messages')
      .send({ message: 'Comment configurer le module ?' })
      .expect(200);

    expect(response.body.answer).toContain('[Source');
    expect(response.body.sources.length).toBeGreaterThan(0);
  });
});
```
```bash
pnpm test:e2e
```

### [23:30-25:00] Récapitulatif et transition
> On a construit un chatbot RAG complet : ingestion de fichiers, recherche vectorielle dans pgvector, chat avec streaming SSE, citations des sources, et historique de conversation. Le tout avec NestJS, pgvector et Ollama. Dans les prochains screencasts, on va évaluer la qualite de ce chatbot et le sécuriser pour la production.
**Action** : Afficher le récapitulatif
```
Resume :
- NestJS + pgvector + Ollama = stack RAG complet
- IngestModule : upload -> chunking -> embedding -> pgvector
- ChatModule : question -> retrieval -> prompt augmente -> streaming SSE
- System prompt strict : pas d'hallucinations, citations obligatoires
- Historique : 10 derniers messages, truncation si context window plein
- Citations : tracabilite de chaque affirmation vers sa source
```

## Points d'attention pour l'enregistrement
- Docker Compose doit etre demarre et stable AVANT l'enregistrement
- Avoir les modèles Ollama déjà telecharges
- Preparer les fichiers Markdown de test dans ./docs/
- Le streaming SSE est difficile a montrer dans le terminal — utiliser curl ou un client HTTP
- Insister sur le system prompt : c'est la clé de la qualite
- Vérifier que les citations [Source N] apparaissent bien dans les réponses
