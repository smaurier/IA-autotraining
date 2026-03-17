# Module 12 — Tokenization & Embeddings

## Objectifs du module

- Comprendre la tokenization : pourquoi les LLMs ne voient pas des mots mais des tokens
- Implémenter l'algorithme BPE (Byte Pair Encoding) simplifié en TypeScript
- Comprendre les embeddings : représentation vectorielle du sens
- Maîtriser la similarité cosinus et ses applications
- Connaître les bases de données vectorielles (Chroma, pgvector, Pinecone, Qdrant)
- Configurer pgvector avec PostgreSQL et l'indexation HNSW
- Utiliser les API d'embeddings (Ollama, OpenAI, Claude)
- Implémenter une recherche sémantique complète en TypeScript

<details>
<summary>Rappel du module précédent</summary>

1. **Qu'est-ce qu'un perceptron et quelle est sa formule ?**
   Le perceptron est le neurone artificiel le plus simple. Il prend des entrees, les multiplie par des poids, ajoute un biais, et passe le resultat dans une fonction d'activation : z = W.X + b, y = f(z).

2. **Qu'est-ce que la backpropagation et a quoi sert-elle ?**
   La backpropagation (retropropagation) est l'algorithme qui calcule les gradients de l'erreur par rapport a chaque poids du reseau en appliquant la chain rule. Ces gradients permettent de mettre a jour les poids via le gradient descent pour que le modele "apprenne".

3. **Pourquoi un reseau a couches cachees peut-il resoudre le probleme XOR alors qu'un perceptron seul ne le peut pas ?**
   Le XOR n'est pas lineairement separable. Les couches cachees permettent au reseau de creer des representations intermediaires non-lineaires, combinant plusieurs frontieres de decision pour separer les classes.

</details>

---

## 1. Tokenization : les briques de base des LLMs

### Tokens vs mots

Un LLM ne lit pas des mots. Il lit des **tokens** — des fragments de texte qui peuvent être des mots entiers, des sous-mots, des caractères, ou même des octets.

```
Phrase : "Le développeur TypeScript implémente une fonction"

Mots (7) :  [Le] [développeur] [TypeScript] [implémente] [une] [fonction]

Tokens (9): [Le] [dév] [elopp] [eur] [Type] [Script] [implé] [mente] [une] [fonction]
```

> **Analogie** : Les mots sont comme les briques Lego standard — formes prédéfinies, taille fixe. Les tokens sont comme les pièces de puzzle — chaque modèle a son propre découpage. Un mot courant comme "the" est un seul token, mais un mot rare comme "anticonstitutionnellement" sera découpé en 5-6 tokens.

### Pourquoi ne pas utiliser les mots directement ?

| Approche | Problème |
|----------|---------|
| Mots entiers | Vocabulaire gigantesque (>500K mots), mots inconnus (OOV) |
| Caractères | Séquences trop longues, perte de sens |
| **Sous-mots (BPE)** | Compromis optimal : vocabulaire ~32K-128K, gère tous les mots |

### Visualiser la tokenization

```typescript
// Simuler la tokenization avec un vocabulaire simplifié
function simpleTokenize(text: string, vocabulary: Map<string, number>): number[] {
  const tokens: number[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    let matched = false;

    // Chercher le plus long token correspondant (greedy)
    for (let len = Math.min(remaining.length, 20); len >= 1; len--) {
      const candidate = remaining.slice(0, len);
      const tokenId = vocabulary.get(candidate);

      if (tokenId !== undefined) {
        tokens.push(tokenId);
        remaining = remaining.slice(len);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Fallback : caractère par caractère (byte fallback)
      tokens.push(vocabulary.get('<unk>') ?? 0);
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

// Comptage de tokens — pourquoi c'est important
// GPT-4 : ~$10/M tokens input, Claude : ~$3/M tokens input
// 1 token ≈ 4 caractères en anglais, ≈ 3 caractères en français
// 1 page de texte ≈ 500-700 tokens
// 1 fichier TypeScript moyen ≈ 200-400 tokens
```

### Tokens spéciaux

| Token | Usage | Exemple |
|-------|-------|---------|
| `<bos>` | Début de séquence | Marque le début d'un texte |
| `<eos>` | Fin de séquence | Marque la fin de la génération |
| `<pad>` | Remplissage | Aligner les séquences de longueur variable |
| `<unk>` | Token inconnu | Fallback pour les caractères non reconnus |
| `<|im_start|>` | Début de message (ChatML) | Délimiter les rôles dans une conversation |
| `<|im_end|>` | Fin de message (ChatML) | Fin d'un message utilisateur/assistant |

---

## 2. BPE — Byte Pair Encoding

### Le concept

BPE est l'algorithme de tokenization le plus utilisé (GPT, Llama, Mistral). L'idée est simple :

1. Commencer avec un vocabulaire de **caractères individuels**
2. Compter les **paires de tokens adjacentes** les plus fréquentes
3. **Fusionner** la paire la plus fréquente en un nouveau token
4. Répéter jusqu'à atteindre la taille de vocabulaire souhaitée

```
Corpus : "aab aab aab ab"

Étape 0 — Vocabulaire initial : {a, b, ' '}
Tokens : [a, a, b, ' ', a, a, b, ' ', a, a, b, ' ', a, b]

Étape 1 — Paire la plus fréquente : (a, a) → 4 fois
Fusionner : aa
Tokens : [aa, b, ' ', aa, b, ' ', aa, b, ' ', a, b]

Étape 2 — Paire la plus fréquente : (aa, b) → 3 fois
Fusionner : aab
Tokens : [aab, ' ', aab, ' ', aab, ' ', a, b]

Étape 3 — Paire la plus fréquente : (aab, ' ') → 2 fois
Fusionner : 'aab '
Tokens : ['aab ', 'aab ', aab, ' ', a, b]
```

### Implémentation BPE en TypeScript

```typescript
type TokenPair = [string, string];

class BPETokenizer {
  private mergeRules: Array<{ pair: TokenPair; merged: string }> = [];
  private vocabulary: Map<string, number> = new Map();

  /**
   * Entraîner le tokenizer BPE sur un corpus
   */
  train(corpus: string, vocabSize: number): void {
    // Étape 1 : Initialiser avec les caractères uniques
    const chars = new Set(corpus.split(''));
    let nextId = 0;
    for (const char of chars) {
      this.vocabulary.set(char, nextId++);
    }

    // Le corpus est initialement une liste de caractères
    let tokens = corpus.split('');

    console.log(`Vocabulaire initial : ${this.vocabulary.size} caractères`);

    // Étape 2 : Fusionner les paires jusqu'à atteindre vocabSize
    while (this.vocabulary.size < vocabSize) {
      // Compter les paires adjacentes
      const pairCounts = this.countPairs(tokens);

      if (pairCounts.size === 0) break;

      // Trouver la paire la plus fréquente
      let bestPair: TokenPair = ['', ''];
      let bestCount = 0;

      for (const [pairKey, count] of pairCounts) {
        if (count > bestCount) {
          bestCount = count;
          bestPair = pairKey.split('|||') as TokenPair;
        }
      }

      if (bestCount < 2) break; // Pas de paire fréquente

      // Créer le nouveau token
      const merged = bestPair[0] + bestPair[1];
      this.mergeRules.push({ pair: bestPair, merged });
      this.vocabulary.set(merged, nextId++);

      // Appliquer la fusion sur tous les tokens
      tokens = this.applyMerge(tokens, bestPair, merged);

      console.log(
        `Merge #${this.mergeRules.length}: "${bestPair[0]}" + "${bestPair[1]}" → "${merged}" (×${bestCount})`,
      );
    }

    console.log(`\nVocabulaire final : ${this.vocabulary.size} tokens`);
  }

  /**
   * Tokenizer une chaîne avec les règles apprises
   */
  encode(text: string): string[] {
    let tokens = text.split('');

    // Appliquer les merge rules dans l'ordre
    for (const rule of this.mergeRules) {
      tokens = this.applyMerge(tokens, rule.pair, rule.merged);
    }

    return tokens;
  }

  /**
   * Convertir des tokens en IDs numériques
   */
  encodeToIds(text: string): number[] {
    return this.encode(text).map(
      (token) => this.vocabulary.get(token) ?? 0,
    );
  }

  /**
   * Décoder des tokens en texte
   */
  decode(tokens: string[]): string {
    return tokens.join('');
  }

  private countPairs(tokens: string[]): Map<string, number> {
    const counts = new Map<string, number>();

    for (let i = 0; i < tokens.length - 1; i++) {
      const key = `${tokens[i]}|||${tokens[i + 1]}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return counts;
  }

  private applyMerge(tokens: string[], pair: TokenPair, merged: string): string[] {
    const result: string[] = [];
    let i = 0;

    while (i < tokens.length) {
      if (i < tokens.length - 1 && tokens[i] === pair[0] && tokens[i + 1] === pair[1]) {
        result.push(merged);
        i += 2; // Sauter les deux tokens fusionnés
      } else {
        result.push(tokens[i]);
        i += 1;
      }
    }

    return result;
  }
}

// Démonstration
const bpe = new BPETokenizer();

const corpus = `
function add(a, b) { return a + b; }
function sub(a, b) { return a - b; }
function mul(a, b) { return a * b; }
function div(a, b) { return a / b; }
const result = add(1, 2);
const value = sub(10, 5);
`.repeat(10); // Répéter pour avoir assez de données

bpe.train(corpus, 100);

const testCode = 'function add(a, b) { return a + b; }';
const tokens = bpe.encode(testCode);
console.log(`\n"${testCode}"`);
console.log(`Caractères : ${testCode.length}`);
console.log(`Tokens : ${tokens.length}`);
console.log(`Tokens :`, tokens);
```

### Résultat attendu

```
Vocabulaire initial : 28 caractères
Merge #1: "t" + "u" → "tu" (×84)
Merge #2: "r" + "e" → "re" (×72)
Merge #3: "tu" + "r" → "tur" (×62)
Merge #4: "re" + "tur" → "retur" (×52)
Merge #5: "retur" + "n" → "return" (×42)
Merge #6: "f" + "u" → "fu" (×40)
Merge #7: "fu" + "n" → "fun" (×40)
Merge #8: "c" + "t" → "ct" (×40)
Merge #9: "fun" + "ct" → "funct" (×40)
Merge #10: "i" + "o" → "io" (×40)
Merge #11: "funct" + "io" → "functio" (×40)
Merge #12: "functio" + "n" → "function" (×40)
...

"function add(a, b) { return a + b; }"
Caractères : 36
Tokens : 14
Tokens : ["function", " ", "add", "(", "a", ",", " ", "b", ")", " ", "{", " ", "return", ...]
```

### Vocabulaires des modèles populaires

| Modèle | Taille vocabulaire | Algorithme | Particularité |
|--------|-------------------|------------|---------------|
| GPT-4 / GPT-4o | ~100K | BPE (tiktoken) | Optimisé multilingue |
| Llama 3 | ~128K | BPE (SentencePiece) | Bon en code |
| Claude 3 | ~100K | BPE | Excellent en français |
| Mistral | ~32K | BPE (SentencePiece) | Plus compact |
| Gemma 2 | ~256K | BPE | Très large vocabulaire |

---

## 3. Embeddings : donner du sens aux nombres

### Qu'est-ce qu'un embedding ?

Un embedding est une **représentation vectorielle** d'un texte dans un espace à N dimensions. Chaque dimension capture un aspect du sens.

```
"TypeScript" → [0.23, -0.45, 0.89, 0.12, ..., -0.33]  (768 dimensions)
"JavaScript" → [0.25, -0.42, 0.91, 0.15, ..., -0.30]  (très proche !)
"banane"     → [-0.67, 0.33, -0.12, 0.78, ..., 0.55]  (très éloigné)
```

> **Analogie** : Imaginez que chaque mot est un point sur une carte géographique, mais en 768 dimensions au lieu de 2. Les mots proches en sens sont proches sur la carte. "TypeScript" et "JavaScript" sont dans la même ville. "Banane" est sur un autre continent.

### Word2Vec : le concept fondateur

Word2Vec (2013) a révolutionné le NLP en montrant que les relations sémantiques sont **algébriques** :

```
roi - homme + femme ≈ reine
Paris - France + Allemagne ≈ Berlin
TypeScript - types + dynamique ≈ JavaScript
```

```typescript
// Illustration des opérations vectorielles
function vectorAdd(a: number[], b: number[]): number[] {
  return a.map((val, i) => val + b[i]);
}

function vectorSub(a: number[], b: number[]): number[] {
  return a.map((val, i) => val - b[i]);
}

// roi - homme + femme ≈ reine
// embedding("roi") - embedding("homme") + embedding("femme") → vecteur proche de "reine"
function analogie(
  embeddings: Map<string, number[]>,
  a: string, // roi
  b: string, // homme
  c: string, // femme
): number[] {
  const vecA = embeddings.get(a)!;
  const vecB = embeddings.get(b)!;
  const vecC = embeddings.get(c)!;

  // a - b + c
  return vectorAdd(vectorSub(vecA, vecB), vecC);
}
```

### Sentence embeddings

En pratique, on utilise des **sentence embeddings** qui encodent des phrases/paragraphes entiers :

```typescript
// Différence entre word embeddings et sentence embeddings
//
// Word embedding : un vecteur par mot
//   "Le chat dort" → [[0.1, 0.2], [0.5, 0.3], [0.8, 0.1]]
//
// Sentence embedding : un vecteur pour toute la phrase
//   "Le chat dort" → [0.34, 0.67, ..., 0.12]  (un seul vecteur)
//
// Les sentence embeddings capturent le SENS global,
// pas juste les mots individuels.

// "Comment déployer une app Node.js ?" et
// "Quelle est la procédure pour mettre en production du JavaScript serveur ?"
// → Vecteurs très proches malgré des mots différents !
```

---

## 4. Similarité cosinus

### Formule et implémentation

La **similarité cosinus** mesure l'angle entre deux vecteurs. Elle varie de -1 (opposés) à 1 (identiques).

```typescript
/**
 * Calcule la similarité cosinus entre deux vecteurs
 * Retourne un nombre entre -1 et 1
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Dimensions différentes : ${a.length} vs ${b.length}`);
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

// Exemples
const vecTS = [0.9, 0.8, 0.1, 0.3];   // "TypeScript"
const vecJS = [0.85, 0.75, 0.15, 0.35]; // "JavaScript"
const vecBanane = [0.1, 0.2, 0.9, 0.8]; // "banane"

console.log(cosineSimilarity(vecTS, vecJS));     // ~0.99 (très similaires)
console.log(cosineSimilarity(vecTS, vecBanane));  // ~0.38 (très différents)
```

### Distance cosinus vs distance euclidienne

```typescript
// Distance euclidienne
function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(
    a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0),
  );
}

// Comparaison
// Cosinus : mesure l'ANGLE (direction) — insensible à la magnitude
// Euclidienne : mesure la DISTANCE (absolue) — sensible à la magnitude
//
// Pour les embeddings, le cosinus est préféré car :
// - Deux textes de longueurs différentes peuvent avoir le même sens
// - Le cosinus normalise automatiquement la magnitude
```

| Métrique | Formule | Quand l'utiliser |
|----------|---------|-----------------|
| Similarité cosinus | cos(θ) = A·B / (‖A‖×‖B‖) | Recherche sémantique (standard) |
| Distance euclidienne | √Σ(aᵢ-bᵢ)² | Clustering, K-means |
| Produit scalaire | Σ(aᵢ×bᵢ) | Si vecteurs déjà normalisés |
| Distance Manhattan | Σ|aᵢ-bᵢ| | Données sparses |

---

## 5. Bases de données vectorielles

### Pourquoi une BDD vectorielle ?

Une recherche de similarité naïve est en **O(n)** — on doit comparer le vecteur requête avec TOUS les vecteurs stockés. Pour 1 million de documents, c'est trop lent.

Les BDD vectorielles utilisent des **index approximatifs** (ANN — Approximate Nearest Neighbors) pour réduire à **O(log n)**.

```
Recherche naïve (brute force) :
┌──────────────┐     ┌──────────────────────────┐
│  Query vector │ ──→ │  Comparer avec 1M vecteurs │ → 200ms
└──────────────┘     └──────────────────────────┘

Avec index HNSW :
┌──────────────┐     ┌──────────────────────────┐
│  Query vector │ ──→ │  Naviguer le graphe (~100   │ → 2ms
└──────────────┘     │  comparaisons au lieu de 1M) │
                     └──────────────────────────┘
```

### Comparatif des solutions

| Solution | Type | Hébergement | Prix | Cas d'usage |
|----------|------|-------------|------|-------------|
| **pgvector** | Extension PostgreSQL | Self-hosted / Cloud | Gratuit | Vous avez déjà PostgreSQL |
| **Chroma** | BDD vectorielle légère | Self-hosted / Cloud | Gratuit | Prototypage, petits datasets |
| **Qdrant** | BDD vectorielle dédiée | Self-hosted / Cloud | Freemium | Performance, filtering avancé |
| **Pinecone** | BDD vectorielle cloud | Cloud uniquement | Payant | Serverless, scaling auto |
| **Weaviate** | BDD vectorielle + search | Self-hosted / Cloud | Freemium | Search hybride (vecteur + BM25) |
| **Milvus** | BDD vectorielle | Self-hosted | Gratuit | Très gros volumes (milliards) |

### Architecture d'index HNSW

HNSW (Hierarchical Navigable Small World) est l'algorithme d'index le plus utilisé :

```
Niveau 3 (le moins dense) :   A ─── B
                               │
Niveau 2 :                     A ─── B ─── C
                               │     │
Niveau 1 :                     A ── B ── C ── D ── E
                               │    │    │    │    │
Niveau 0 (le plus dense) :    A─B─C─D─E─F─G─H─I─J─K─L

Recherche :
1. Partir d'un nœud au niveau le plus haut
2. Naviguer vers le voisin le plus proche de la query
3. Descendre au niveau inférieur
4. Répéter jusqu'au niveau 0
→ Complexité O(log n) au lieu de O(n)
```

---

## 6. pgvector avec PostgreSQL

### Installation

```bash
# Docker (recommandé)
docker run -d \
  --name pgvector \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  pgvector/pgvector:pg16

# Ou via extension sur PostgreSQL existant
# CREATE EXTENSION vector;
```

### Setup du schéma

```sql
-- Activer l'extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Table pour stocker des documents avec leurs embeddings
CREATE TABLE documents (
  id            SERIAL PRIMARY KEY,
  content       TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}',
  embedding     vector(768),        -- 768 dimensions (nomic-embed-text)
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index HNSW pour la recherche rapide
-- m = nombre de connexions par nœud (16 = bon défaut)
-- ef_construction = qualité de construction (64 = bon défaut)
CREATE INDEX ON documents
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Index pour le filtrage par métadonnées
CREATE INDEX ON documents USING gin (metadata);
```

### Opérations de distance avec pgvector

```sql
-- Les 3 opérateurs de distance
SELECT
  id,
  content,
  embedding <=> '[0.1, 0.2, ...]'::vector AS cosine_distance,    -- Distance cosinus
  embedding <-> '[0.1, 0.2, ...]'::vector AS euclidean_distance,  -- Distance euclidienne
  embedding <#> '[0.1, 0.2, ...]'::vector AS inner_product        -- Produit scalaire négatif
FROM documents
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector  -- Tri par similarité cosinus
LIMIT 5;

-- ATTENTION : <=> retourne la DISTANCE (0 = identique, 2 = opposé)
-- Pour obtenir la SIMILARITÉ : 1 - distance
```

### Client TypeScript pour pgvector

```typescript
import pg from 'pg';

const { Pool } = pg;

interface Document {
  id: number;
  content: string;
  metadata: Record<string, unknown>;
  similarity?: number;
}

class VectorStore {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async init(): Promise<void> {
    await this.pool.query('CREATE EXTENSION IF NOT EXISTS vector');
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        embedding vector(768),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // Créer l'index HNSW si il n'existe pas
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS documents_embedding_idx
      ON documents USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
    `);
  }

  /**
   * Insérer un document avec son embedding
   */
  async insert(content: string, embedding: number[], metadata?: Record<string, unknown>): Promise<number> {
    const result = await this.pool.query(
      `INSERT INTO documents (content, embedding, metadata)
       VALUES ($1, $2::vector, $3)
       RETURNING id`,
      [content, `[${embedding.join(',')}]`, metadata ?? {}],
    );
    return result.rows[0].id;
  }

  /**
   * Insérer plusieurs documents en batch
   */
  async insertBatch(
    docs: Array<{ content: string; embedding: number[]; metadata?: Record<string, unknown> }>,
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const doc of docs) {
        await client.query(
          `INSERT INTO documents (content, embedding, metadata)
           VALUES ($1, $2::vector, $3)`,
          [doc.content, `[${doc.embedding.join(',')}]`, doc.metadata ?? {}],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Recherche par similarité cosinus
   */
  async search(
    queryEmbedding: number[],
    limit: number = 5,
    filter?: Record<string, unknown>,
  ): Promise<Document[]> {
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    let query = `
      SELECT id, content, metadata,
             1 - (embedding <=> $1::vector) AS similarity
      FROM documents
    `;
    const params: unknown[] = [vectorStr];

    // Filtrage optionnel par métadonnées
    if (filter) {
      const conditions = Object.entries(filter).map(([key, value], i) => {
        params.push(JSON.stringify(value));
        return `metadata->>'${key}' = $${i + 2}`;
      });
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY embedding <=> $1::vector LIMIT ${limit}`;

    const result = await this.pool.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      similarity: parseFloat(row.similarity),
    }));
  }

  /**
   * Supprimer un document
   */
  async delete(id: number): Promise<void> {
    await this.pool.query('DELETE FROM documents WHERE id = $1', [id]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
```

### Utilisation complète

```typescript
// Pipeline complet : texte → embedding → stockage → recherche

async function demo(): Promise<void> {
  const store = new VectorStore('postgresql://postgres:postgres@localhost:5432/postgres');
  await store.init();

  // 1. Générer des embeddings via Ollama
  async function embed(text: string): Promise<number[]> {
    const res = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      body: JSON.stringify({ model: 'nomic-embed-text', prompt: text }),
    });
    return (await res.json()).embedding;
  }

  // 2. Indexer des documents
  const docs = [
    { content: 'TypeScript est un sur-ensemble typé de JavaScript', metadata: { lang: 'fr', topic: 'typescript' } },
    { content: 'React utilise un DOM virtuel pour optimiser les rendus', metadata: { lang: 'fr', topic: 'react' } },
    { content: 'PostgreSQL supporte les index HNSW via pgvector', metadata: { lang: 'fr', topic: 'database' } },
    { content: 'Docker permet de conteneuriser des applications', metadata: { lang: 'fr', topic: 'devops' } },
    { content: 'Les closures capturent les variables du scope parent', metadata: { lang: 'fr', topic: 'javascript' } },
  ];

  for (const doc of docs) {
    const embedding = await embed(doc.content);
    await store.insert(doc.content, embedding, doc.metadata);
  }
  console.log(`${docs.length} documents indexés`);

  // 3. Recherche sémantique
  const query = 'Comment fonctionne le typage en JS ?';
  const queryEmbedding = await embed(query);
  const results = await store.search(queryEmbedding, 3);

  console.log(`\nRecherche : "${query}"`);
  for (const r of results) {
    console.log(`  [${(r.similarity! * 100).toFixed(1)}%] ${r.content}`);
  }
  // Résultat attendu :
  // [87.3%] TypeScript est un sur-ensemble typé de JavaScript
  // [72.1%] Les closures capturent les variables du scope parent
  // [45.6%] React utilise un DOM virtuel pour optimiser les rendus

  await store.close();
}
```

---

## 7. APIs d'embeddings

### Comparatif des modèles d'embeddings

| Modèle | Dimensions | Fournisseur | Prix/M tokens | Qualité (MTEB) |
|--------|-----------|-------------|---------------|----------------|
| text-embedding-3-large | 3072 | OpenAI | $0.13 | Excellent |
| text-embedding-3-small | 1536 | OpenAI | $0.02 | Bon |
| voyage-3 | 1024 | Anthropic/Voyage | $0.06 | Excellent |
| nomic-embed-text | 768 | Ollama (local) | Gratuit | Bon |
| mxbai-embed-large | 1024 | Ollama (local) | Gratuit | Très bon |
| all-MiniLM-L6-v2 | 384 | Ollama (local) | Gratuit | Correct |

### Utilisation multi-fournisseur

```typescript
interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  dimensions: number;
}

// Ollama (local, gratuit)
class OllamaEmbedding implements EmbeddingProvider {
  dimensions = 768;

  constructor(
    private model: string = 'nomic-embed-text',
    private baseUrl: string = 'http://localhost:11434',
  ) {}

  async embed(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      body: JSON.stringify({ model: this.model, prompt: text }),
    });
    return (await res.json()).embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Ollama ne supporte pas le batch nativement — on parallélise
    return Promise.all(texts.map((t) => this.embed(t)));
  }
}

// OpenAI
class OpenAIEmbedding implements EmbeddingProvider {
  dimensions = 1536;

  constructor(private apiKey: string) {}

  async embed(text: string): Promise<number[]> {
    const result = await this.embedBatch([text]);
    return result[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts,
      }),
    });

    const data = await res.json();
    return data.data.map((d: { embedding: number[] }) => d.embedding);
  }
}

// Factory
function createEmbeddingProvider(type: 'ollama' | 'openai'): EmbeddingProvider {
  switch (type) {
    case 'ollama':
      return new OllamaEmbedding();
    case 'openai':
      return new OpenAIEmbedding(process.env.OPENAI_API_KEY!);
  }
}
```

---

## 8. Applications pratiques

### Recherche sémantique dans du code

```typescript
// Indexer des fonctions TypeScript et les retrouver par description naturelle

interface CodeChunk {
  filePath: string;
  functionName: string;
  code: string;
  description: string; // Générée par LLM ou extraite des JSDoc
}

async function indexCodebase(
  chunks: CodeChunk[],
  store: VectorStore,
  embedder: EmbeddingProvider,
): Promise<void> {
  console.log(`Indexation de ${chunks.length} fonctions...`);

  const batchSize = 20;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    // Embedder la description (plus stable que le code brut)
    const texts = batch.map((c) => `${c.functionName}: ${c.description}`);
    const embeddings = await embedder.embedBatch(texts);

    const docs = batch.map((chunk, j) => ({
      content: chunk.code,
      embedding: embeddings[j],
      metadata: {
        filePath: chunk.filePath,
        functionName: chunk.functionName,
        description: chunk.description,
      },
    }));

    await store.insertBatch(docs);
    console.log(`  Batch ${Math.floor(i / batchSize) + 1} indexé`);
  }
}

// Recherche
async function searchCode(
  query: string,
  store: VectorStore,
  embedder: EmbeddingProvider,
): Promise<void> {
  const queryEmbed = await embedder.embed(query);
  const results = await store.search(queryEmbed, 5);

  console.log(`\nRecherche : "${query}"\n`);
  for (const r of results) {
    const meta = r.metadata as { functionName: string; filePath: string };
    console.log(`[${(r.similarity! * 100).toFixed(1)}%] ${meta.functionName} (${meta.filePath})`);
    console.log(`  ${r.content.slice(0, 100)}...\n`);
  }
}

// Exemple d'utilisation
// searchCode("fonction qui valide un email", store, embedder)
// → [92.1%] validateEmail (src/utils/validation.ts)
// → [78.4%] isValidFormat (src/utils/strings.ts)
```

### Clustering de documents

```typescript
// K-Means simplifié sur des embeddings
function kMeansClustering(
  embeddings: number[][],
  k: number,
  maxIterations: number = 50,
): { clusters: number[]; centroids: number[][] } {
  const n = embeddings.length;
  const dim = embeddings[0].length;

  // Initialiser les centroïdes aléatoirement
  let centroids = Array.from({ length: k }, () => {
    const idx = Math.floor(Math.random() * n);
    return [...embeddings[idx]];
  });

  let clusters = new Array(n).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assigner chaque point au centroïde le plus proche
    const newClusters = embeddings.map((emb) => {
      let bestCluster = 0;
      let bestSim = -Infinity;

      for (let c = 0; c < k; c++) {
        const sim = cosineSimilarity(emb, centroids[c]);
        if (sim > bestSim) {
          bestSim = sim;
          bestCluster = c;
        }
      }

      return bestCluster;
    });

    // Vérifier la convergence
    const changed = newClusters.some((c, i) => c !== clusters[i]);
    clusters = newClusters;

    if (!changed) {
      console.log(`Convergence atteinte à l'itération ${iter}`);
      break;
    }

    // Recalculer les centroïdes
    centroids = Array.from({ length: k }, (_, c) => {
      const members = embeddings.filter((_, i) => clusters[i] === c);
      if (members.length === 0) return centroids[c];

      return Array.from({ length: dim }, (__, d) =>
        members.reduce((sum, emb) => sum + emb[d], 0) / members.length,
      );
    });
  }

  return { clusters, centroids };
}

// Usage : regrouper des tickets de support par thème
// const embeddings = await Promise.all(tickets.map(t => embedder.embed(t.description)));
// const { clusters } = kMeansClustering(embeddings, 5);
// → Cluster 0 : bugs d'authentification
// → Cluster 1 : questions sur la facturation
// → Cluster 2 : demandes de fonctionnalités
// → Cluster 3 : problèmes de performance
// → Cluster 4 : questions d'intégration API
```

### Détection de duplicatas

```typescript
async function findDuplicates(
  documents: string[],
  embedder: EmbeddingProvider,
  threshold: number = 0.92,
): Promise<Array<[number, number, number]>> {
  const embeddings = await embedder.embedBatch(documents);
  const duplicates: Array<[number, number, number]> = [];

  for (let i = 0; i < embeddings.length; i++) {
    for (let j = i + 1; j < embeddings.length; j++) {
      const sim = cosineSimilarity(embeddings[i], embeddings[j]);
      if (sim >= threshold) {
        duplicates.push([i, j, sim]);
      }
    }
  }

  return duplicates.sort((a, b) => b[2] - a[2]);
}

// Utilisation
const articles = [
  'Comment installer Node.js sur Ubuntu',
  'Guide d\'installation de Node.js sur Linux Ubuntu',
  'Introduction à Docker pour les débutants',
  'TypeScript : les types génériques expliqués',
  'Installer Node.js sur un système Ubuntu',
];

const dupes = await findDuplicates(articles, embedder, 0.85);
for (const [i, j, sim] of dupes) {
  console.log(`[${(sim * 100).toFixed(1)}%] "${articles[i]}" ↔ "${articles[j]}"`);
}
// [94.2%] "Comment installer Node.js sur Ubuntu" ↔ "Installer Node.js sur un système Ubuntu"
// [91.7%] "Comment installer Node.js sur Ubuntu" ↔ "Guide d'installation de Node.js sur Linux Ubuntu"
```

---

## Résumé du module

| Concept | Points clés |
|---------|-------------|
| Tokenization | Les LLMs voient des tokens (sous-mots), pas des mots entiers |
| BPE | Algorithme itératif qui fusionne les paires les plus fréquentes |
| Embeddings | Vecteurs numériques qui capturent le sens sémantique |
| Similarité cosinus | Mesure de l'angle entre vecteurs : 1 = identique, 0 = sans rapport |
| pgvector | Extension PostgreSQL pour stocker et chercher des vecteurs |
| HNSW | Index de recherche approximatif : O(log n) au lieu de O(n) |
| Modèles d'embeddings | nomic-embed-text (local), text-embedding-3-small (OpenAI) |
| Applications | Recherche sémantique, clustering, détection de duplicatas |

---

## Exercices pratiques

1. **BPE** : Modifiez l'implémentation BPE pour supporter un byte-level BPE (commencer par les octets 0-255)
2. **Similarité** : Créez 20 phrases de test et visualisez la matrice de similarité cosinus (console ou HTML)
3. **pgvector** : Mettez en place une recherche sémantique sur un fichier Markdown de documentation
4. **Clustering** : Utilisez le K-Means sur des embeddings de tickets de support et identifiez les thèmes
5. **Benchmark** : Comparez les temps de recherche avec et sans index HNSW sur 10 000 documents

---

<!-- parcours-recommande -->

::: tip Parcours recommandé
1. **Screencast** : [screencast 12 tokenization embeddings](../screencasts/screencast-12-tokenization-embeddings.md)
2. **Lab** : [lab-12-tokenization-embeddings](../labs/lab-12-tokenization-embeddings/README)
3. **Quiz** : [quiz 12 embeddings](../quizzes/quiz-12-embeddings.html)
:::
