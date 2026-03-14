# Screencast 12 — Tokenization & Embeddings

## Informations
- **Duree estimee** : 20-25 min
- **Module** : `modules/12-tokenization-embeddings.md`
- **Lab associe** : `labs/lab-12-tokenization-embeddings/`
- **Prerequis** : Module 11 complete, Ollama avec `nomic-embed-text`, Docker pour pgvector

## Setup
- [ ] Ollama en cours d'execution avec `nomic-embed-text` (`ollama pull nomic-embed-text`)
- [ ] Docker installe (pour pgvector)
- [ ] Terminal et VS Code ouverts sur le dossier du lab
- [ ] `pnpm install` deja execute (dependance `pg`)

## Script

### [00:00-02:30] Les LLMs ne voient pas des mots
> On croit souvent que les LLMs lisent des mots. C'est faux. Ils lisent des tokens — des fragments de texte qui peuvent etre des mots entiers, des bouts de mots, ou meme des caracteres. Comprendre les tokens, c'est comprendre comment le LLM "pense" et surtout comment il facture.
**Action** : Afficher l'exemple de tokenization
```
Phrase : "Le developpeur TypeScript implemente une fonction"

Mots (6) :  [Le] [developpeur] [TypeScript] [implemente] [une] [fonction]

Tokens (9): [Le] [dev] [elopp] [eur] [Type] [Script] [imple] [mente] [une] [fonction]

1 token ≈ 4 caracteres en anglais, ≈ 3.5 en francais
1 page de texte ≈ 500-700 tokens
GPT-4 : ~$10/M tokens input -- chaque token compte !
```

### [02:30-06:00] BPE — l'algorithme de tokenization
> L'algorithme le plus utilise s'appelle BPE — Byte Pair Encoding. L'idee est simple : on commence par les caracteres, on compte les paires adjacentes les plus frequentes, et on les fusionne en un nouveau token. On repete jusqu'a atteindre la taille de vocabulaire voulue.
**Action** : Montrer le BPE pas a pas sur un petit corpus
```
Corpus : "aab aab aab ab"

Etape 0 -- Vocabulaire : {a, b, ' '}
Tokens : [a, a, b, ' ', a, a, b, ' ', a, a, b, ' ', a, b]

Etape 1 -- Paire la plus frequente : (a, a) --> 4 fois
Fusionner : aa
Tokens : [aa, b, ' ', aa, b, ' ', aa, b, ' ', a, b]

Etape 2 -- Paire la plus frequente : (aa, b) --> 3 fois
Fusionner : aab
Tokens : [aab, ' ', aab, ' ', aab, ' ', a, b]
```
**Action** : Ouvrir `bpe-demo.ts` et executer l'implementation TypeScript
```typescript
// bpe-demo.ts (extrait)
const bpe = new BPETokenizer();

const corpus = `
function add(a, b) { return a + b; }
function sub(a, b) { return a - b; }
function mul(a, b) { return a * b; }
`.repeat(10);

bpe.train(corpus, 80);

const testCode = 'function add(a, b) { return a + b; }';
const tokens = bpe.encode(testCode);
console.log(`Caracteres : ${testCode.length}`);
console.log(`Tokens : ${tokens.length}`);
console.log(`Detail :`, tokens);
```
```bash
npx tsx bpe-demo.ts
```
**Action** : Montrer comment "function" et "return" deviennent des tokens uniques apres l'entrainement

### [06:00-09:30] Embeddings : donner du sens aux nombres
> Maintenant, la partie la plus puissante : les embeddings. Un embedding transforme un texte en un vecteur — un tableau de 768 nombres. Et le truc magique, c'est que les textes qui ont le meme sens produisent des vecteurs proches.
**Action** : Afficher le concept
```
"TypeScript" --> [0.23, -0.45, 0.89, 0.12, ..., -0.33]  (768 dimensions)
"JavaScript" --> [0.25, -0.42, 0.91, 0.15, ..., -0.30]  (tres proche !)
"banane"     --> [-0.67, 0.33, -0.12, 0.78, ..., 0.55]  (tres eloigne)
```
**Action** : Generer des embeddings avec Ollama et comparer
```typescript
// embeddings-demo.ts
async function embed(text: string): Promise<number[]> {
  const res = await fetch('http://localhost:11434/api/embeddings', {
    method: 'POST',
    body: JSON.stringify({ model: 'nomic-embed-text', prompt: text }),
  });
  return (await res.json()).embedding;
}

const vecTS = await embed('Comment fonctionne TypeScript ?');
const vecJS = await embed('Le fonctionnement de JavaScript');
const vecCuisine = await embed('Recette de gateau au chocolat');

console.log(`TS vs JS :`, cosineSimilarity(vecTS, vecJS).toFixed(3));      // ~0.85
console.log(`TS vs Cuisine :`, cosineSimilarity(vecTS, vecCuisine).toFixed(3)); // ~0.15
```
```bash
npx tsx embeddings-demo.ts
```
**Action** : Montrer les scores de similarite et commenter

### [09:30-12:30] Similarite cosinus en detail
> Le score qu'on vient de calculer, c'est la similarite cosinus. Elle mesure l'angle entre deux vecteurs : 1 = identiques, 0 = aucun rapport, -1 = opposes.
**Action** : Montrer l'implementation
```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```
> Pourquoi le cosinus et pas la distance euclidienne ? Parce que le cosinus est insensible a la magnitude — il mesure la direction, pas la longueur. Deux textes courts ou longs sur le meme sujet auront un cosinus eleve.
**Action** : Tester avec 5-6 phrases de complexite variable et afficher la matrice de similarite

### [12:30-16:00] pgvector : stocker et chercher des vecteurs
> Stocker des vecteurs dans un tableau JavaScript, ca marche pour 100 documents. Pour 100 000, il faut une base de donnees vectorielle. On va utiliser pgvector — une extension PostgreSQL.
**Action** : Lancer pgvector avec Docker et creer le schema
```bash
docker run -d \
  --name pgvector \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```
```sql
-- Schema pour stocker des documents avec leurs embeddings
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id        SERIAL PRIMARY KEY,
  content   TEXT NOT NULL,
  metadata  JSONB DEFAULT '{}',
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index HNSW pour la recherche rapide
CREATE INDEX ON documents
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```
> L'index HNSW est crucial. Sans lui, chaque recherche compare votre requete avec TOUS les vecteurs — c'est en O(n). Avec HNSW, c'est en O(log n). Sur un million de documents, ca fait la difference entre 200ms et 2ms.

### [16:00-20:00] Recherche semantique complete en TypeScript
> Assemblons tout : on charge des documents, on les transforme en embeddings, on les stocke dans pgvector, et on fait une recherche semantique.
**Action** : Executer le pipeline complet
```typescript
// search-demo.ts
const docs = [
  'TypeScript est un sur-ensemble type de JavaScript',
  'React utilise un DOM virtuel pour optimiser les rendus',
  'PostgreSQL supporte les index HNSW via pgvector',
  'Docker permet de conteneuriser des applications',
  'Les closures capturent les variables du scope parent',
];

// 1. Indexer
for (const doc of docs) {
  const embedding = await embed(doc);
  await store.insert(doc, embedding);
}

// 2. Rechercher
const query = 'Comment fonctionne le typage en JS ?';
const results = await store.search(await embed(query), 3);

for (const r of results) {
  console.log(`[${(r.similarity * 100).toFixed(1)}%] ${r.content}`);
}
// [87.3%] TypeScript est un sur-ensemble type de JavaScript
// [72.1%] Les closures capturent les variables du scope parent
```
```bash
npx tsx search-demo.ts
```
**Action** : Montrer que la recherche comprend les synonymes — "typage en JS" trouve "TypeScript"

### [20:00-22:30] Modeles d'embeddings : local vs cloud
> On utilise nomic-embed-text (768 dimensions, local, gratuit). Pour la production, il y a aussi les modeles OpenAI — meilleure qualite, mais payants.
**Action** : Afficher le comparatif
```
| Modele                  | Dimensions | Cout         | Qualite |
|-------------------------|-----------|--------------|---------|
| nomic-embed-text (local)| 768       | Gratuit      | Bon     |
| mxbai-embed-large       | 1024      | Gratuit      | Tres bon|
| text-embedding-3-small  | 1536      | $0.02/M tok  | Bon     |
| text-embedding-3-large  | 3072      | $0.13/M tok  | Excellent|
```
> En local avec Ollama, je recommande nomic-embed-text pour commencer. Si vous avez besoin de mieux, mxbai-embed-large. Et si la qualite est critique, text-embedding-3-large d'OpenAI.

### [22:30-25:00] Recapitulatif et transition
> On a couvert le cycle complet : tokenization avec BPE, embeddings qui transforment du texte en vecteurs numeriques, similarite cosinus pour comparer le sens, et pgvector pour stocker et chercher a grande echelle. Ce sont les fondations du RAG — le sujet du prochain screencast.
**Action** : Afficher le recapitulatif
```
Resume :
- Tokens = sous-mots, pas des mots entiers (BPE)
- Embedding = vecteur de 768+ dimensions qui capture le sens
- Similarite cosinus : 1 = identique, 0 = sans rapport
- pgvector = extension PostgreSQL pour les vecteurs
- Index HNSW : O(log n) au lieu de O(n)
- nomic-embed-text pour le local, OpenAI pour la production
```

## Points d'attention pour l'enregistrement
- Avoir nomic-embed-text deja telecharge (ollama pull nomic-embed-text)
- Avoir pgvector deja demarre en Docker avant le screencast
- Le BPE pas a pas peut etre montre avec un slide anime
- Laisser 2-3 secondes sur les scores de similarite pour que l'audience les lise
- Insister sur le fait que "TypeScript" et "typage en JS" sont semantiquement proches
