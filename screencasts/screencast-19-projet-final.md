# Screencast 19 — Projet Final : Assistant Documentaire Intelligent

## Informations
- **Duree estimee** : 20-25 min
- **Module** : `modules/19-projet-final.md`
- **Lab associe** : `labs/lab-19-projet-final/`
- **Prerequis** : Modules 11-18 completes, Docker, NestJS

## Setup
- [ ] Docker Compose pret (PostgreSQL/pgvector + Ollama)
- [ ] NestJS CLI installe (`npx @nestjs/cli`)
- [ ] Modeles Ollama deja telecharges (`llama3.1:8b`, `nomic-embed-text`)
- [ ] Terminal et VS Code ouverts
- [ ] Slides de l'architecture du projet pretes

## Script

### [00:00-03:00] Presentation du projet final
> C'est le dernier module. On va assembler TOUT ce qu'on a appris en 18 modules dans un seul projet : un assistant documentaire intelligent. Il ingere des documents, cherche avec un RAG hybride, converse avec streaming et citations, s'evalue automatiquement, se securise, et se monitore. Six phases, un projet complet.
**Action** : Afficher les fonctionnalites et les modules correspondants
```
| Fonctionnalite        | Description                        | Modules  |
|-----------------------|------------------------------------|----------|
| Ingestion multi-format| Upload et traitement de fichiers   | M12, M13 |
| Chunking intelligent  | Decoupage par paragraphes/sections | M13      |
| Recherche hybride     | Vectorielle + BM25 via RRF         | M14      |
| Conversation          | Multi-tours avec historique         | M4, M15  |
| Streaming SSE         | Reponse en temps reel              | M15      |
| Citations             | Tracabilite des sources            | M15      |
| Evaluation            | Faithfulness, relevancy, precision | M16      |
| Securite              | Input/output guardrails            | M17      |
| Monitoring            | Couts, latence, qualite            | M16, M18 |
| Semantic cache        | Reduction des couts                | M18      |
| Fallback models       | Resilience multi-providers         | M18      |
```

### [03:00-05:30] Architecture technique
> Voici l'architecture cible. Le client parle a NestJS. NestJS a 6 modules : ingestion, recherche, chat, evaluation, admin et les services partages. En dessous : PostgreSQL, Ollama et optionnellement Claude.
**Action** : Afficher le schema d'architecture
```
CLIENT
  | Upload    | Chat (SSE)    | Admin
  v           v               v
NESTJS API
  +-- IngestModule     +-- ChatModule      +-- AdminModule
  |   - Upload         |   - Guards         |   - Dashboard
  |   - Chunking       |   - Cache          |   - Eval pipeline
  |   - Embedding      |   - RAG Hybrid     |   - Documents
  |   - Storage        |   - Streaming
  |                    |   - Citations
  +--------------------+--------------------+
  |              Shared Services             |
  | VectorStore | Embedding | LLM | Cache | Security |
  +------+----------+----------+----------+
         |          |          |
   PostgreSQL    Ollama     Claude
   + pgvector    (local)    (cloud)
```
**Action** : Montrer la structure des fichiers du projet
```
doc-assistant/
+-- src/
|   +-- ingest/           # Phase 2
|   +-- search/           # Phase 3
|   +-- chat/             # Phase 4
|   +-- eval/             # Phase 5
|   +-- admin/            # Phase 6
|   +-- shared/           # Phase 1
|       +-- vector-store/
|       +-- embedding/
|       +-- llm/
|       +-- cache/
|       +-- security/
|       +-- monitoring/
+-- docker-compose.yml
+-- init.sql
+-- .env.example
```

### [05:30-09:00] Phase 1 : Setup et infrastructure
> Phase 1 : le socle. Docker Compose, schema SQL, services partages. A la fin de cette phase, on a un NestJS qui demarre, qui peut generer des embeddings, stocker des vecteurs et appeler un LLM.
**Action** : Montrer le Docker Compose et le demarrer
```bash
# Creer le projet
npx @nestjs/cli new doc-assistant
cd doc-assistant
pnpm add pg @nestjs/config class-validator multer

# Lancer l'infra
docker compose up -d
```
**Action** : Montrer le schema SQL
```sql
-- init.sql (resume)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (id SERIAL PRIMARY KEY, filename VARCHAR(500), created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE chunks (id SERIAL PRIMARY KEY, document_id INTEGER REFERENCES documents(id),
  content TEXT, embedding vector(768), metadata JSONB DEFAULT '{}');
CREATE TABLE conversations (id SERIAL PRIMARY KEY, title VARCHAR(500));
CREATE TABLE messages (id SERIAL PRIMARY KEY, conversation_id INTEGER REFERENCES conversations(id),
  role VARCHAR(20), content TEXT, sources JSONB DEFAULT '[]');
CREATE TABLE evaluations (id SERIAL PRIMARY KEY, question TEXT, answer TEXT,
  faithfulness FLOAT, relevancy FLOAT, context_precision FLOAT, context_recall FLOAT);
CREATE TABLE interaction_logs (id SERIAL PRIMARY KEY, trace_id VARCHAR(100),
  model VARCHAR(100), latency_ms INTEGER, cost FLOAT DEFAULT 0);

CREATE INDEX chunks_embedding_hnsw ON chunks USING hnsw (embedding vector_cosine_ops);
```
**Action** : Verifier que tout demarre
```
Checklist Phase 1 :
[x] docker compose up -d fonctionne
[x] PostgreSQL avec pgvector accessible
[x] Ollama avec llama3.1:8b et nomic-embed-text
[x] NestJS demarre sans erreur
[x] EmbeddingService genere un embedding
[x] VectorStoreService insere et recherche
```

### [09:00-12:00] Phase 2 : Pipeline d'ingestion
> Phase 2 : on uploade un fichier, on le decoupe en chunks, on embede chaque chunk, on stocke dans pgvector. Support Markdown, texte brut et code TypeScript.
**Action** : Montrer le IngestService et tester l'upload
```bash
# Upload d'un fichier Markdown
curl -X POST http://localhost:3000/ingest/file \
  -F "file=@./docs/nestjs-modules.md"
# { "documentId": 1, "chunks": 8 }

# Lister les documents
curl http://localhost:3000/ingest/documents
# [{ "id": 1, "filename": "nestjs-modules.md", "chunks": 8 }]
```
**Action** : Montrer le parser de code TypeScript qui decoupe par fonctions/classes

### [12:00-14:30] Phase 3 : RAG hybride
> Phase 3 : la recherche combine vectorielle et BM25. On utilise Reciprocal Rank Fusion pour fusionner les resultats.
**Action** : Montrer le SearchService et tester
```bash
# Recherche hybride
curl "http://localhost:3000/search?q=Comment+creer+un+module+NestJS"
# [
#   { "chunkId": 3, "content": "...", "score": 0.0142, "method": "hybrid" },
#   { "chunkId": 1, "content": "...", "score": 0.0138, "method": "hybrid" }
# ]
```
> Le RRF combine les rangs des deux methodes. Un chunk trouve en position 1 par les deux methodes aura le meilleur score final.

### [14:30-17:30] Phase 4 : Conversation et citations
> Phase 4 : le chat avec streaming SSE, historique et citations. C'est la partie visible pour l'utilisateur.
**Action** : Tester une conversation multi-tours
```bash
# Creer une conversation
curl -X POST http://localhost:3000/conversations
# { "id": 1 }

# Premier message
curl -X POST http://localhost:3000/chat/1/messages \
  -H "Content-Type: application/json" \
  -d '{"message": "Comment creer un module NestJS ?"}'
# Reponse streamee avec [Source 1], [Source 2]...

# Deuxieme message (utilise l'historique)
curl -X POST http://localhost:3000/chat/1/messages \
  -H "Content-Type: application/json" \
  -d '{"message": "Et comment ajouter un provider dedans ?"}'
```
**Action** : Montrer les citations extraites dans la reponse

### [17:30-19:30] Phase 5 : Pipeline d'evaluation
> Phase 5 : on evalue automatiquement la qualite du RAG. On cree un dataset de 15+ questions, on mesure faithfulness, relevancy, precision et recall. Cible : score overall > 0.7.
**Action** : Montrer le dataset et lancer l'evaluation
```bash
# Lancer l'evaluation
curl -X POST http://localhost:3000/eval/run
# {
#   "summary": {
#     "faithfulness": 0.85,
#     "answerRelevancy": 0.82,
#     "contextPrecision": 0.78,
#     "contextRecall": 0.91,
#     "overall": 0.84
#   }
# }
```
> Un score overall de 0.84, c'est tres bon. En dessous de 0.7, il faut ameliorer le chunking ou le system prompt.

### [19:30-21:30] Phase 6 : Production et monitoring
> Phase 6 : securite, cache, monitoring et Docker final. On branche le middleware d'injection, le semantic cache, et le dashboard admin.
**Action** : Montrer les endpoints admin
```bash
# Dashboard
curl http://localhost:3000/admin/dashboard
# { "totalRequests": 142, "totalCost": 0.42, "avgLatencyMs": 2340,
#   "cacheHitRate": 0.35 }

# Health check
curl http://localhost:3000/admin/health
# { "status": "healthy",
#   "services": { "postgres": "ok", "ollama": "ok", "pgvector": "ok" } }
```
**Action** : Verifier la checklist finale
```
Phase 6 :
[x] Middleware de securite actif
[x] Semantic cache (seuil 0.92)
[x] Rate limiting par IP (20 req/min)
[x] Output filtering (PII, URLs)
[x] Dashboard admin fonctionnel
[x] Health check operationnel
[x] Docker build fonctionne
[x] docker compose up lance tout le stack
```

### [21:30-23:30] Criteres d'evaluation et livrables
> Voici les criteres d'evaluation du projet et les livrables attendus.
**Action** : Afficher la grille
```
| Critere          | Poids | Excellent (A)                         |
|------------------|-------|---------------------------------------|
| Ingestion        | 15%   | Multi-format, chunking intelligent    |
| RAG Hybride      | 20%   | Vectoriel + BM25 + RRF, reranking    |
| Conversation     | 20%   | Streaming, historique, context mgmt   |
| Citations        | 10%   | Citations precises avec excerpts      |
| Evaluation       | 15%   | 4 metriques, dataset 15+ questions    |
| Production       | 10%   | Security, cache, monitoring, Docker   |
| Qualite code     | 10%   | TypeScript strict, tests, archi propre|

Livrables :
1. Code source (repository Git)
2. README avec instructions de setup
3. Dataset d'evaluation (eval-set.jsonl, 15+ questions)
4. Capture d'ecran du dashboard admin
5. Rapport de 1 page : choix techniques et resultats
```

### [23:30-25:00] Retrospective et conclusion du cours
> On arrive au bout. En 19 modules, vous etes passes de "qu'est-ce qu'un LLM" a "deployer un assistant documentaire avec RAG hybride, evaluation, securite et monitoring". Voici le chemin parcouru.
**Action** : Afficher la retrospective
```
Le parcours complet :
M00-02 : Prompting (parler aux LLMs)
M03-06 : APIs et agents (integrer en TypeScript)
M07-10 : Fondations ML (comprendre le fonctionnement)
M11-12 : Ollama, tokenization, embeddings (les briques)
M13-14 : RAG fondamental et avance (construire un RAG)
M15    : Chatbot full-stack (assembler)
M16-18 : Evaluation, securite, production (deployer)
M19    : Projet final (tout reunir)

Competences acquises :
- Prompting zero-shot, few-shot, chain-of-thought
- APIs Claude, OpenAI, streaming, function calling
- RAG complet : chunking, embeddings, pgvector, hybrid search
- Evaluation : BLEU, ROUGE, LLM-as-Judge, RAGAS
- Securite : injection, PII, guardrails, EU AI Act
- Production : couts, cache, rate limiting, monitoring
```
> Bravo. Vous avez toutes les cles pour construire des applications IA en production. Bon projet final !

## Points d'attention pour l'enregistrement
- Ce screencast est un survol des 6 phases — ne pas entrer dans les details d'implementation
- Avoir le projet deja fonctionnel pour les demos (pas de live coding complet)
- Les curls doivent etre pre-testes et fonctionnels
- Insister sur les checklists de chaque phase
- La retrospective finale doit etre inspirante — on clot le cours
- Mentionner que les 6 phases representent environ 15h de travail au total
