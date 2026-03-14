# Screencast 13 — RAG Fondamental

## Informations
- **Duree estimee** : 20-25 min
- **Module** : `modules/13-rag-fondamental.md`
- **Lab associe** : `labs/lab-13-rag-fondamental/`
- **Prerequis** : Module 12 complete, Ollama avec `nomic-embed-text` et `mistral`, Docker pour pgvector

## Setup
- [ ] Ollama en cours d'execution avec `nomic-embed-text` et `mistral`
- [ ] pgvector demarre en Docker
- [ ] Dossier `./docs/` avec 3-5 fichiers Markdown de documentation technique
- [ ] Terminal et VS Code ouverts sur le dossier du lab
- [ ] `pnpm install` deja execute

## Script

### [00:00-03:00] Le probleme fondamental : les LLMs ne connaissent pas vos donnees
> Un LLM, meme brillant, ne connait que ce sur quoi il a ete entraine. Il ne connait pas vos documents internes, votre base de connaissances, votre code source. Que fait-on ? On pourrait tout mettre dans le prompt, mais avec 10 000 pages de documentation, le context window explose. Le RAG resout ce probleme.
**Action** : Afficher le schema RAG
```
RAG = Retrieval-Augmented Generation

Approches possibles :
| Approche          | Avantage           | Inconvenient                    |
|-------------------|--------------------|---------------------------------|
| Tout dans le prompt| Simple            | Context window limite (200K max)|
| Fine-tuning       | Le modele "sait"   | Couteux, pas de temps reel      |
| RAG               | Donnees fraiches   | Plus complexe a implementer     |

Le RAG selecte uniquement les passages pertinents pour chaque question.
```

### [03:00-05:00] Architecture RAG en 7 etapes
> Le RAG a deux phases. D'abord l'ingestion : on decoupe les documents, on les transforme en vecteurs, on les stocke. Ensuite la requete : on transforme la question en vecteur, on trouve les passages similaires, et on les injecte dans le prompt du LLM.
**Action** : Afficher le pipeline complet
```
PHASE D'INGESTION :
Documents --> Chunking --> Embedding --> Vector Store
(MD, PDF)    (decouper)   (vecteurs)    (pgvector)

PHASE DE REQUETE :
Question --> Embedding --> Similarity Search --> Top-K chunks
    |                                                |
    +----------> Prompt augmente (question + chunks) --> LLM --> Reponse
```

### [05:00-09:00] Chunking : decouper intelligemment les documents
> Le chunking est LA decision la plus impactante dans un RAG. Trop petit, pas assez de contexte. Trop grand, trop de bruit. On va comparer trois strategies.
**Action** : Montrer les strategies de chunking
```
Taille fixe (500 caracteres) :
+ Simple et previsible
- Coupe au milieu des phrases

Par phrases :
+ Respecte les limites de phrases
- Taille variable

Recursif (recommande) :
+ Preserve la structure (paragraphes > phrases > mots)
- Plus complexe
```
**Action** : Executer le chunking recursif sur un fichier
```typescript
// chunking-demo.ts
function chunkText(text: string, source: string, maxSize = 500, overlap = 50): Chunk[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: Chunk[] = [];
  let current = '';
  let index = 0;

  for (const para of paragraphs) {
    if (current.length + para.length > maxSize && current.length > 0) {
      chunks.push({
        content: current.trim(),
        metadata: { source, chunkIndex: index },
      });
      current = current.slice(-overlap) + '\n\n' + para;
      index++;
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }

  if (current.trim().length > 0) {
    chunks.push({ content: current.trim(), metadata: { source, chunkIndex: index } });
  }

  return chunks;
}
```
```bash
npx tsx chunking-demo.ts
```
**Action** : Montrer le nombre de chunks generes et la taille moyenne
> Le sweet spot se situe entre 300 et 800 tokens par chunk, avec un overlap de 10 a 20%. L'overlap evite de perdre des informations aux frontieres.

### [09:00-12:30] Vector Store en memoire : le prototype rapide
> Pour prototyper, on n'a pas besoin de pgvector. Un simple tableau TypeScript avec une recherche brute suffit. On va le construire en direct.
**Action** : Implementer le InMemoryVectorStore
```typescript
// vector-store.ts
class VectorStore {
  private items: StoredChunk[] = [];

  async add(chunk: Chunk): Promise<void> {
    const embedding = await embed(chunk.content);
    this.items.push({ ...chunk, id: crypto.randomUUID(), embedding });
  }

  async search(query: string, topK = 5): Promise<SearchResult[]> {
    const queryVec = await embed(query);
    return this.items
      .map(item => ({ ...item, score: cosine(queryVec, item.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
```
> C'est O(n) — ca marche bien jusqu'a 10 000 chunks. Au-dela, on passe a pgvector avec l'index HNSW.

### [12:30-16:00] Le prompt augmente : injecter le contexte
> Maintenant le coeur du RAG : on construit un prompt augmente. On prend la question de l'utilisateur, on ajoute les chunks recuperes, et on donne des instructions strictes au LLM.
**Action** : Montrer la construction du prompt
```typescript
function buildPrompt(question: string, chunks: SearchResult[]): ChatMessage[] {
  const context = chunks
    .map((c, i) => `[Source ${i + 1}: ${c.metadata.source}]\n${c.content}`)
    .join('\n\n---\n\n');

  return [
    {
      role: 'system',
      content: `Tu es un assistant documentaire technique.
Reponds UNIQUEMENT en te basant sur le contexte fourni.
Si le contexte ne contient pas l'information, dis "Je n'ai pas trouve cette information."
Cite tes sources avec [Source N].`,
    },
    {
      role: 'user',
      content: `## Contexte\n\n${context}\n\n## Question\n\n${question}`,
    },
  ];
}
```
> Quatre regles d'or : instruction stricte de se baser sur le contexte, sources numerotees, separateurs visuels entre les chunks, et la question en dernier.

### [16:00-20:00] Pipeline RAG complet de A a Z
> On assemble tout : chargement des fichiers Markdown, chunking, embedding, stockage, et requete.
**Action** : Executer le pipeline complet
```bash
# Prerequis : fichiers Markdown dans ./docs/
npx tsx rag-pipeline.ts
```
```
=== Phase d'ingestion ===
nestjs-modules.md --> 8 chunks
nestjs-providers.md --> 6 chunks
nestjs-controllers.md --> 7 chunks
Total : 21 chunks
Embedding des chunks... .....................
21 chunks indexes

=== Phase de requete ===
Question : "Comment creer un module NestJS ?"
3 chunks trouves :
  1. [0.847] nestjs-modules.md #2
  2. [0.812] nestjs-modules.md #0
  3. [0.764] nestjs-providers.md #1

Reponse :
Pour creer un module NestJS, utilisez le decorateur @Module().
Chaque application a au moins un module racine (AppModule) [Source 1].
Les modules organisent le code en domaines fonctionnels [Source 2].
```
**Action** : Poser 2-3 questions supplementaires pour montrer la pertinence

### [20:00-22:30] Metriques de base : precision et recall
> Comment savoir si notre RAG fonctionne bien ? On mesure la precision du contexte (les chunks recuperes sont-ils pertinents ?) et le recall (a-t-on trouve tous les chunks necessaires ?).
**Action** : Montrer l'evaluation
```typescript
const testCases: EvalCase[] = [
  {
    question: 'Comment creer un module NestJS ?',
    expectedAnswer: 'Avec @Module() decorator...',
    relevantSources: ['nestjs-modules.md', 'nestjs-getting-started.md'],
  },
];

// Precision = chunks pertinents / total chunks recuperes
// Recall = chunks pertinents trouves / total chunks pertinents existants
```
> Visez une precision au-dessus de 60% et un recall au-dessus de 80% comme point de depart. On verra comment ameliorer ces scores dans le module suivant.

### [22:30-25:00] Limites et transition vers le RAG avance
> Le RAG fondamental a des limites : la recherche par similarite seule peut rater des mots-cles exacts, les chunks manquent parfois de contexte, et il y a du bruit dans les resultats. Le module suivant adresse tout ca avec le hybrid search, le reranking, et le parent-child chunking.
**Action** : Afficher le recapitulatif
```
Resume :
- RAG = Retrieval + Augmentation + Generation
- Chunking recursif : 300-800 tokens, 10-20% overlap
- Embedding : nomic-embed-text (local) ou OpenAI (cloud)
- Vector Store : tableau pour prototyper, pgvector pour la prod
- Prompt augmente : instructions strictes + contexte numerote
- Metriques : precision et recall du contexte
- Prochaine etape : hybrid search, reranking (module 14)
```

## Points d'attention pour l'enregistrement
- Avoir les fichiers Markdown de demo pre-crees dans ./docs/
- Verifier que les embeddings sont bien generes (Ollama doit tourner)
- Montrer la reponse du LLM en entier pour que l'audience voie les citations [Source N]
- Insister sur le fait que le LLM n'invente pas — il cite les sources
- La partie chunking peut etre acceleree si le temps presse
