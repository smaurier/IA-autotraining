# Module 09 — Architecture Transformer

## Objectif du module

Comprendre l'architecture Transformer — le modèle derriere GPT, Claude, BERT, Llama, et pratiquement tous les LLMs modernes. On va demystifier chaque composant, de la tokenization a l'attention multi-tete, avec des implementations simplifiees en TypeScript.

> Le papier "Attention Is All You Need" (Vaswani et al., 2017) a change le domaine entier. Ce module explique pourquoi.

---

## Plan du module

| Section | Concept | Importance |
|---------|---------|-----------|
| 1 | Tokenization | Comment le texte devient des nombres |
| 2 | Embeddings | Chaque token = un vecteur dense |
| 3 | Positional Encoding | Comment le modèle connait l'ordre |
| 4 | Self-Attention | Le mécanisme clé des transformers |
| 5 | Multi-Head Attention | Plusieurs perspectives en parallele |
| 6 | Feed-Forward Network | La couche dense après l'attention |
| 7 | Layer Norm + Residuals | Stabiliser l'entrainement |
| 8 | Encoder vs Decoder | BERT vs GPT |
| 9 | Pourquoi les Transformers gagnent | vs RNN/LSTM |

---

## 1. Tokenization — Du texte aux nombres

### Le problème

Les réseaux de neurones ne comprennent que les nombres. Il faut convertir du texte en sequence de nombres.

```
"Le chat dort" → [42, 1847, 9103]

Chaque nombre est l'identifiant d'un token dans le vocabulaire.
```

### Approches de tokenization

```
Niveau mot :     "Le" "chat" "dort"        → 3 tokens
                  Probleme : vocabulaire enorme, mots inconnus

Niveau caractere: "L" "e" " " "c" "h" ...  → 13 tokens
                  Probleme : sequences tres longues, peu de sens

Niveau subword :  "Le" "▁chat" "▁dort"     → 3 tokens
(BPE)            "▁program" "mation"        → 2 tokens
                  Compromis : vocabulaire raisonnable + mots rares geres
```

### BPE (Byte-Pair Encoding) — L'algorithme standard

BPE est l'algorithme de tokenization utilise par GPT, Claude, Llama, et la plupart des LLMs.

```
Algorithme BPE simplifie :

1. Commencer avec tous les caracteres individuels
   Vocabulaire : {a, b, c, d, ...}

2. Compter les paires de tokens adjacentes les plus frequentes
   "ab" apparait 100 fois, "bc" apparait 50 fois, ...

3. Fusionner la paire la plus frequente en un nouveau token
   Vocabulaire : {a, b, c, d, ..., ab}

4. Repeter 2-3 jusqu'a atteindre la taille de vocabulaire desiree
   (32K pour GPT-2, 100K pour GPT-4, 32K pour Llama)
```

### Implementation simplifiee

```typescript
// --- Tokenizer BPE tres simplifie ---
class SimpleTokenizer {
  private vocab: Map<string, number> = new Map();
  private reverseVocab: Map<number, string> = new Map();
  private merges: Array<[string, string]> = [];

  constructor() {
    // Initialiser avec les caracteres ASCII de base
    for (let i = 32; i < 127; i++) {
      const char = String.fromCharCode(i);
      this.vocab.set(char, this.vocab.size);
      this.reverseVocab.set(this.vocab.size - 1, char);
    }
  }

  // Entrainer le tokenizer sur un corpus
  train(text: string, numMerges: number): void {
    // Decouper en mots, chaque mot est une liste de caracteres
    let words = text.split(/\s+/).map((w) => w.split(''));

    for (let i = 0; i < numMerges; i++) {
      // Compter les paires adjacentes
      const pairCounts = new Map<string, number>();
      for (const word of words) {
        for (let j = 0; j < word.length - 1; j++) {
          const pair = `${word[j]}|${word[j + 1]}`;
          pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
        }
      }

      if (pairCounts.size === 0) break;

      // Trouver la paire la plus frequente
      let bestPair = '';
      let bestCount = 0;
      for (const [pair, count] of pairCounts) {
        if (count > bestCount) {
          bestPair = pair;
          bestCount = count;
        }
      }

      const [a, b] = bestPair.split('|');
      const merged = a + b;
      this.merges.push([a, b]);

      // Ajouter au vocabulaire
      if (!this.vocab.has(merged)) {
        const id = this.vocab.size;
        this.vocab.set(merged, id);
        this.reverseVocab.set(id, merged);
      }

      // Appliquer la fusion dans tous les mots
      words = words.map((word) => {
        const newWord: string[] = [];
        let j = 0;
        while (j < word.length) {
          if (j < word.length - 1 && word[j] === a && word[j + 1] === b) {
            newWord.push(merged);
            j += 2;
          } else {
            newWord.push(word[j]);
            j++;
          }
        }
        return newWord;
      });
    }
  }

  // Encoder du texte en tokens
  encode(text: string): number[] {
    const tokens: number[] = [];
    let chars = text.split('');

    // Appliquer les merges dans l'ordre
    for (const [a, b] of this.merges) {
      const merged = a + b;
      const newChars: string[] = [];
      let i = 0;
      while (i < chars.length) {
        if (i < chars.length - 1 && chars[i] === a && chars[i + 1] === b) {
          newChars.push(merged);
          i += 2;
        } else {
          newChars.push(chars[i]);
          i++;
        }
      }
      chars = newChars;
    }

    for (const token of chars) {
      const id = this.vocab.get(token);
      if (id !== undefined) {
        tokens.push(id);
      }
    }
    return tokens;
  }

  // Decoder des tokens en texte
  decode(tokens: number[]): string {
    return tokens.map((id) => this.reverseVocab.get(id) || '?').join('');
  }
}

// Exemple d'utilisation
const tokenizer = new SimpleTokenizer();
tokenizer.train('le chat dort le chat mange le chien dort', 20);

const tokens = tokenizer.encode('le chat dort');
console.log(tokens);           // → [id_le, id_chat, id_dort, ...]
console.log(tokenizer.decode(tokens)); // → "le chat dort"
```

### Ce que les LLMs voient vraiment

```
Texte humain :   "Bonjour, comment allez-vous ?"

Tokens GPT-4 :   ["Bon", "jour", ",", " comment", " allez", "-", "vous", " ?"]
Token IDs :       [23345,  10980, 11,   3049,     10393,   12,  10869, 949]

Le modele ne voit JAMAIS le texte — seulement les IDs.
Chaque ID est ensuite converti en un vecteur de 4096+ dimensions.
```

---

## 2. Embeddings — Chaque token est un vecteur

### L'idee

Un embedding est une **representation vectorielle dense** d'un token. Au lieu d'un simple numéro (42), chaque token devient un vecteur de centaines ou milliers de dimensions.

```
Token "chat" (ID: 1847)

One-hot encoding (sparse, 100K dimensions) :
[0, 0, 0, ..., 0, 1, 0, ..., 0, 0]
                   ^
                   position 1847

Embedding (dense, 768 dimensions) :
[0.12, -0.34, 0.56, 0.03, ..., -0.89, 0.21]
 ←───────── 768 nombres ──────────────→

L'embedding capture le SENS du token.
Les tokens similaires ont des embeddings proches.
```

### Implementation

```typescript
type Vector = number[];
type Matrix = number[][];

class EmbeddingLayer {
  // Table d'embeddings : [vocabSize × embeddingDim]
  private table: Matrix;

  constructor(vocabSize: number, embeddingDim: number) {
    // Initialisation aleatoire
    this.table = Array.from({ length: vocabSize }, () =>
      Array.from({ length: embeddingDim }, () =>
        (Math.random() * 2 - 1) * 0.02
      )
    );
  }

  // Lookup : tokenId → vecteur
  forward(tokenIds: number[]): Matrix {
    return tokenIds.map((id) => [...this.table[id]]);
  }
}

// Exemple
const embedding = new EmbeddingLayer(32000, 768);
const tokenIds = [42, 1847, 9103]; // "Le chat dort"
const vectors = embedding.forward(tokenIds);

// vectors[0] = embedding de "Le"    → [0.01, -0.03, ...]  (768 dims)
// vectors[1] = embedding de "chat"  → [-0.02, 0.05, ...]  (768 dims)
// vectors[2] = embedding de "dort"  → [0.04, -0.01, ...]  (768 dims)
```

### Proprietes des embeddings

```
Dans l'espace des embeddings :

  roi ─────────── reine
   |                |
   | (relation      | (relation
   |  homme/femme)  |  homme/femme)
   |                |
  homme ────────── femme

  roi - homme + femme ≈ reine

  C'est l'idee de Word2Vec (2013), et les embeddings
  des transformers capturent des relations encore plus riches.
```

---

## 3. Positional Encoding — L'ordre des mots

### Le problème

L'attention traite tous les tokens en parallele — elle n'a aucune notion d'ordre. "Le chat mange la souris" et "La souris mange le chat" produiraient le même résultat sans positional encoding.

### La solution : ajouter la position

```
Mot :      "Le"     "chat"    "mange"
Embedding: [0.1, ..]  [0.3, ..]  [0.2, ..]
Position:  [0.0, 1.0] [0.8, 0.6] [0.9, -0.4]
                ↓           ↓           ↓
Total :    [0.1, 1.0+..]  [1.1, 0.6+..]  [1.1, -0.4+..]
```

### Encodage sinusoidal (papier original)

```typescript
function positionalEncoding(seqLen: number, dModel: number): Matrix {
  const pe: Matrix = [];

  for (let pos = 0; pos < seqLen; pos++) {
    const row: Vector = new Array(dModel);
    for (let i = 0; i < dModel; i++) {
      const angle = pos / Math.pow(10000, (2 * Math.floor(i / 2)) / dModel);
      row[i] = i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
    }
    pe.push(row);
  }

  return pe;
}

// Ajouter la position aux embeddings
function addPositionalEncoding(embeddings: Matrix): Matrix {
  const seqLen = embeddings.length;
  const dModel = embeddings[0].length;
  const pe = positionalEncoding(seqLen, dModel);

  return embeddings.map((emb, pos) =>
    emb.map((val, i) => val + pe[pos][i])
  );
}

// Exemple
const embeddingsWithPosition = addPositionalEncoding(vectors);
```

```
Encodage sinusoidal — visualisation (4 dimensions) :

  Position 0:  [sin(0), cos(0), sin(0), cos(0)]  = [0.00, 1.00, 0.00, 1.00]
  Position 1:  [sin(1), cos(1), sin(.01), cos(.01)] = [0.84, 0.54, 0.01, 1.00]
  Position 2:  [sin(2), cos(2), sin(.02), cos(.02)] = [0.91, -0.42, 0.02, 1.00]

  Les basses frequences (dim 0-1) changent vite → position locale
  Les hautes frequences (dim 2-3) changent lentement → position globale
```

> Analogie : c'est comme une horloge a plusieurs aiguilles. L'aiguille des secondes tourne vite (basse frequence dans le vecteur), celle des minutes tourne lentement, celle des heures encore plus lentement. En regardant toutes les aiguilles, vous savez l'heure exacte. Pareil pour la position d'un token.

---

## 4. Self-Attention — Le mécanisme clé

### L'intuition

> Analogie de la bibliotheque : imaginez que chaque token est un chercheur dans une bibliotheque.
> - La **Query** (Q) est la question du chercheur : "Qu'est-ce que je cherche ?"
> - La **Key** (K) est l'etiquette de chaque livre : "Voila ce que je contiens"
> - La **Value** (V) est le contenu du livre : "Voila mon information"
>
> Chaque chercheur compare sa question a toutes les etiquettes, puis lit les livres les plus pertinents. C'est exactement ce que fait l'attention.

### La formule

```
Attention(Q, K, V) = softmax(Q × K^T / √d_k) × V

Ou :
  Q = queries  (ce que je cherche)
  K = keys     (ce que chaque token propose)
  V = values   (l'information de chaque token)
  d_k = dimension des keys (pour normaliser)
```

### Pas a pas

```
Phrase : "Le chat dort"
3 tokens, chaque token a un embedding de dimension d

1. Projeter chaque token en Q, K, V :
   Q = Embedding × W_Q    (matrice apprise)
   K = Embedding × W_K
   V = Embedding × W_V

2. Calculer les scores d'attention :
   Scores = Q × K^T    (produit scalaire entre chaque paire)

   Scores (3×3) :
           K_Le  K_chat  K_dort
   Q_Le  [ 0.5    0.2    0.1  ]
   Q_chat[ 0.3    0.9    0.4  ]    ← "chat" regarde surtout lui-meme
   Q_dort[ 0.1    0.6    0.8  ]    ← "dort" regarde "chat" et lui-meme

3. Normaliser : Scores / √d_k

4. Softmax (par ligne) → poids d'attention :
           Le    chat   dort
   Le   [ 0.45   0.32   0.23 ]    → somme = 1.0
   chat [ 0.18   0.52   0.30 ]    → somme = 1.0
   dort [ 0.15   0.38   0.47 ]    → somme = 1.0

5. Moyenne ponderee des Values :
   Sortie_chat = 0.18 × V_Le + 0.52 × V_chat + 0.30 × V_dort
```

### Implementation en TypeScript

```typescript
function dotProduct(a: Vector, b: Vector): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

function softmax(logits: Vector): Vector {
  const maxLogit = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - maxLogit));
  const sum = exps.reduce((s, e) => s + e, 0);
  return exps.map((e) => e / sum);
}

function matMul(a: Matrix, b: Matrix): Matrix {
  const rows = a.length;
  const cols = b[0].length;
  const inner = b.length;
  const result: Matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      for (let k = 0; k < inner; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
}

function transpose(m: Matrix): Matrix {
  return m[0].map((_, j) => m.map((row) => row[j]));
}

// --- Self-Attention ---
function selfAttention(
  queries: Matrix,   // [seqLen × dK]
  keys: Matrix,      // [seqLen × dK]
  values: Matrix,    // [seqLen × dV]
  mask?: boolean[][]  // masque causal pour le decoder
): Matrix {
  const dK = keys[0].length;
  const scale = Math.sqrt(dK);

  // 1. Scores = Q × K^T
  const scores = matMul(queries, transpose(keys));

  // 2. Normaliser par √d_k
  const scaled: Matrix = scores.map((row) =>
    row.map((val) => val / scale)
  );

  // 3. Appliquer le masque causal (si decoder)
  if (mask) {
    for (let i = 0; i < scaled.length; i++) {
      for (let j = 0; j < scaled[i].length; j++) {
        if (!mask[i][j]) {
          scaled[i][j] = -Infinity; // softmax → 0
        }
      }
    }
  }

  // 4. Softmax par ligne
  const attention: Matrix = scaled.map((row) => softmax(row));

  // 5. Sortie = attention × V
  return matMul(attention, values);
}

// --- Masque causal ---
// Le token i ne peut voir que les tokens 0..i (pas le futur)
function causalMask(seqLen: number): boolean[][] {
  return Array.from({ length: seqLen }, (_, i) =>
    Array.from({ length: seqLen }, (_, j) => j <= i)
  );
}
```

### Le masque causal — pourquoi GPT ne triche pas

```
Masque causal pour "Le chat dort paisiblement" :

         Le    chat   dort   pais.
Le     [ true  false  false  false ]  ← ne voit que lui-meme
chat   [ true  true   false  false ]  ← voit Le + chat
dort   [ true  true   true   false ]  ← voit Le + chat + dort
pais.  [ true  true   true   true  ]  ← voit tout

Sans masque :   chaque token voit TOUS les autres (BERT — encoder)
Avec masque :   chaque token ne voit que le passe (GPT — decoder)
```

---

## 5. Multi-Head Attention

### Pourquoi plusieurs tetes ?

Une seule tete d'attention peut se concentrer sur un seul type de relation. Avec plusieurs tetes, le modèle capture **différents aspects** en parallele.

```
Tete 1 : relations syntaxiques    ("dort" regarde "chat" — sujet-verbe)
Tete 2 : relations semantiques    ("dort" regarde "paisiblement" — verbe-adverbe)
Tete 3 : cooccurrences locales    ("dort" regarde "dort" — identite)
Tete 4 : relations longue distance ("dort" regarde "Le" — article lointain)
```

### Implementation

```typescript
class MultiHeadAttention {
  numHeads: number;
  headDim: number;
  dModel: number;

  // Poids de projection : [dModel × dModel] pour Q, K, V, et Output
  wQ: Matrix;
  wK: Matrix;
  wV: Matrix;
  wO: Matrix;

  constructor(dModel: number, numHeads: number) {
    this.dModel = dModel;
    this.numHeads = numHeads;
    this.headDim = Math.floor(dModel / numHeads);

    const scale = Math.sqrt(2 / dModel);
    const initMatrix = (rows: number, cols: number): Matrix =>
      Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => (Math.random() * 2 - 1) * scale)
      );

    this.wQ = initMatrix(dModel, dModel);
    this.wK = initMatrix(dModel, dModel);
    this.wV = initMatrix(dModel, dModel);
    this.wO = initMatrix(dModel, dModel);
  }

  // Decouper une matrice en plusieurs tetes
  private splitHeads(projected: Matrix): Matrix[] {
    const heads: Matrix[] = [];
    for (let h = 0; h < this.numHeads; h++) {
      const start = h * this.headDim;
      const end = start + this.headDim;
      heads.push(projected.map((row) => row.slice(start, end)));
    }
    return heads;
  }

  // Recombiner les tetes
  private concatHeads(heads: Matrix[]): Matrix {
    const seqLen = heads[0].length;
    return Array.from({ length: seqLen }, (_, i) =>
      heads.flatMap((head) => head[i])
    );
  }

  forward(input: Matrix, mask?: boolean[][]): Matrix {
    // 1. Projeter en Q, K, V
    const Q = matMul(input, transpose(this.wQ));
    const K = matMul(input, transpose(this.wK));
    const V = matMul(input, transpose(this.wV));

    // 2. Decouper en tetes
    const qHeads = this.splitHeads(Q);
    const kHeads = this.splitHeads(K);
    const vHeads = this.splitHeads(V);

    // 3. Attention sur chaque tete (en parallele)
    const attentionOutputs = qHeads.map((qH, h) =>
      selfAttention(qH, kHeads[h], vHeads[h], mask)
    );

    // 4. Concatener les tetes
    const concatenated = this.concatHeads(attentionOutputs);

    // 5. Projection de sortie
    return matMul(concatenated, transpose(this.wO));
  }
}
```

```
Multi-Head Attention — schema :

  Input [seqLen × dModel]
        │
    ┌───┴───┐
    │ W_Q   │ W_K   │ W_V
    ↓       ↓       ↓
    Q       K       V
    │       │       │
    ├──split en h tetes──┤
    │                    │
  ┌─┴──┐  ┌─┴──┐  ┌─┴──┐
  │Head│  │Head│  │Head│  ... (h tetes)
  │ 1  │  │ 2  │  │ 3  │
  └─┬──┘  └─┬──┘  └─┬──┘
    │       │       │
    └───concat──────┘
         │
       W_O ↓
         │
    Output [seqLen × dModel]
```

---

## 6. Feed-Forward Network

### La couche dense après l'attention

Après l'attention, chaque position passe a travers un réseau feed-forward identique (mais avec des poids différents par couche).

```typescript
class FeedForward {
  w1: Matrix; // [dModel × dFF]
  b1: Vector;
  w2: Matrix; // [dFF × dModel]
  b2: Vector;

  constructor(dModel: number, dFF: number) {
    const scale1 = Math.sqrt(2 / dModel);
    const scale2 = Math.sqrt(2 / dFF);

    this.w1 = Array.from({ length: dFF }, () =>
      Array.from({ length: dModel }, () => (Math.random() * 2 - 1) * scale1)
    );
    this.b1 = new Array(dFF).fill(0);

    this.w2 = Array.from({ length: dModel }, () =>
      Array.from({ length: dFF }, () => (Math.random() * 2 - 1) * scale2)
    );
    this.b2 = new Array(dModel).fill(0);
  }

  // GeLU — l'activation standard des transformers modernes
  private gelu(x: number): number {
    return 0.5 * x * (1 + Math.tanh(
      Math.sqrt(2 / Math.PI) * (x + 0.044715 * x * x * x)
    ));
  }

  forward(input: Matrix): Matrix {
    return input.map((token) => {
      // Couche 1 : projection vers dFF + GeLU
      const hidden = this.w1.map((row, i) =>
        this.gelu(dotProduct(row, token) + this.b1[i])
      );

      // Couche 2 : projection retour vers dModel
      return this.w2.map((row, i) =>
        dotProduct(row, hidden) + this.b2[i]
      );
    });
  }
}
```

```
Feed-Forward Network :

  Input [dModel=768]
        │
   ┌────┴────┐
   │ Linear  │  768 → 3072  (×4)
   │ + GeLU  │
   └────┬────┘
        │ [dFF=3072]
   ┌────┴────┐
   │ Linear  │  3072 → 768  (÷4)
   └────┬────┘
        │
  Output [dModel=768]

  dFF est typiquement 4× dModel.
  C'est la que la majorite des parametres se trouvent !
```

---

## 7. Layer Normalization et Residual Connections

### Layer Normalization

Normalise les activations pour stabiliser l'entrainement.

```typescript
class LayerNorm {
  gamma: Vector; // scale
  beta: Vector;  // shift
  epsilon: number;

  constructor(dModel: number, epsilon: number = 1e-5) {
    this.gamma = new Array(dModel).fill(1);
    this.beta = new Array(dModel).fill(0);
    this.epsilon = epsilon;
  }

  forward(input: Matrix): Matrix {
    return input.map((token) => {
      const mean = token.reduce((s, v) => s + v, 0) / token.length;
      const variance = token.reduce((s, v) => s + (v - mean) ** 2, 0) / token.length;
      const std = Math.sqrt(variance + this.epsilon);

      return token.map((val, i) =>
        this.gamma[i] * ((val - mean) / std) + this.beta[i]
      );
    });
  }
}
```

### Residual Connections — le raccourci

```
Sans residual :              Avec residual :

  x → [Attention] → y        x → [Attention] → (+) → y
                                  │               ↑
                                  └───────────────┘
                                  (raccourci / skip connection)

  y = Attention(x)            y = x + Attention(x)
```

> Analogie : les residual connections, c'est comme ajouter un escalier a cote de l'ascenseur. Si l'ascenseur (la couche) tombe en panne (gradient trop faible), le signal peut toujours passer par l'escalier. Ça permet d'entrainer des réseaux beaucoup plus profonds.

---

## 8. Le bloc Transformer complet

### Assemblage

```typescript
class TransformerBlock {
  attention: MultiHeadAttention;
  ff: FeedForward;
  norm1: LayerNorm;
  norm2: LayerNorm;

  constructor(dModel: number, numHeads: number, dFF: number) {
    this.attention = new MultiHeadAttention(dModel, numHeads);
    this.ff = new FeedForward(dModel, dFF);
    this.norm1 = new LayerNorm(dModel);
    this.norm2 = new LayerNorm(dModel);
  }

  forward(input: Matrix, mask?: boolean[][]): Matrix {
    // 1. Multi-Head Attention + Residual + LayerNorm
    const attOutput = this.attention.forward(input, mask);
    const addNorm1 = this.norm1.forward(
      input.map((row, i) => row.map((val, j) => val + attOutput[i][j]))
    );

    // 2. Feed-Forward + Residual + LayerNorm
    const ffOutput = this.ff.forward(addNorm1);
    const addNorm2 = this.norm2.forward(
      addNorm1.map((row, i) => row.map((val, j) => val + ffOutput[i][j]))
    );

    return addNorm2;
  }
}
```

```
Bloc Transformer complet :

  ┌───────────────────────────────┐
  │                               │
  │  Input                        │
  │    │                          │
  │    ├──→ Multi-Head Attention  │
  │    │         │                │
  │    └──→ Add ←┘                │
  │          │                    │
  │     Layer Norm                │
  │          │                    │
  │    ├──→ Feed-Forward          │
  │    │         │                │
  │    └──→ Add ←┘                │
  │          │                    │
  │     Layer Norm                │
  │          │                    │
  │       Output                  │
  │                               │
  └───────────────────────────────┘

  GPT-3 : 96 de ces blocs empiles
  GPT-4 : estimation ~120 blocs
  Llama 3.1 8B : 32 blocs
```

---

## 9. Encoder vs Decoder

### Les deux variantes principales

```
ENCODER (BERT, 2018)                  DECODER (GPT, 2018)
────────────────────                  ────────────────────
Voit TOUT le contexte                 Ne voit que le PASSE
(bidirectionnel)                      (auto-regressif)

Tache : comprendre                    Tache : generer
(classification, NER, Q&A)           (texte, code, chat)

Pas de masque causal                  Masque causal

"Le [MASK] dort sur le tapis"        "Le chat dort sur le" → "tapis"
      ↑                                                       ↑
  predit le mot masque               predit le prochain token


ENCODER-DECODER (T5, BART)
────────────────────────────
L'encoder comprend l'entree
Le decoder genere la sortie

Tache : transformation
(traduction, resume)

"The cat sleeps" → Encoder → Decoder → "Le chat dort"
```

| Modèle | Architecture | Taille | Utilisation |
|--------|-------------|--------|------------|
| BERT | Encoder | 110M-340M | Classification, NER, recherche |
| GPT-4 | Decoder | ~1.7T (estime) | Génération de texte, chat |
| Claude | Decoder | non divulgue | Génération, analyse, code |
| T5 | Encoder-Decoder | 60M-11B | Traduction, résumé |
| Llama 3.1 | Decoder | 8B-405B | Génération open source |

---

## 10. Pourquoi les Transformers ecrasent les RNN/LSTM

### Le problème des RNN

```
RNN — traitement sequentiel :

  x₁ → [RNN] → h₁ → [RNN] → h₂ → [RNN] → h₃ → [RNN] → h₄
                ↓              ↓              ↓              ↓
               y₁             y₂             y₃             y₄

  Problemes :
  1. Sequentiel : pas de parallelisation (lent sur GPU)
  2. Le token 1 influence le token 100 via 99 etapes
     → le signal se perd (vanishing gradient)
  3. Context window limite en pratique


Transformer — traitement parallele :

  x₁  x₂  x₃  x₄
   ↓   ↓   ↓   ↓
  ┌─────────────────┐
  │   Attention      │  ← TOUS les tokens en parallele
  │   (chaque token  │     O(n²) mais parallelisable
  │    voit tous     │
  │    les autres)   │
  └─────────────────┘
   ↓   ↓   ↓   ↓
  y₁  y₂  y₃  y₄

  Avantages :
  1. Parallelisable sur GPU (rapide)
  2. Connexion directe entre token 1 et token 100
  3. Context window de 128K+ tokens
```

### Comparaison detaillee

| Critere | RNN/LSTM | Transformer |
|---------|----------|-------------|
| Parallelisation | Non (sequentiel) | Oui (tout en parallele) |
| Distance maximale | ~100-500 tokens | 128K+ tokens |
| Entrainement | Lent (backprop through time) | Rapide (GPU-friendly) |
| Complexite | O(n) par token | O(n²) total, mais parallelise |
| État cache | Taille fixe (h) | Lineaire (KV cache) |
| Performances | Corrects | SOTA sur tout |

---

## Récapitulatif

### Le pipeline complet d'un LLM

```
"Le chat"
     │
  Tokenizer
     │
  [42, 1847]                    ← token IDs
     │
  Embedding Layer
     │
  [[0.1, -0.3, ...],           ← vecteurs 768D
   [0.5, 0.2, ...]]
     │
  + Positional Encoding
     │
  ┌──┴──────────────────┐
  │  Transformer Block 1 │ ─→ attention + FFN + residual + norm
  │  Transformer Block 2 │
  │  ...                  │
  │  Transformer Block N │
  └──┬──────────────────┘
     │
  Linear + Softmax
     │
  [0.01, 0.002, ..., 0.15, ...]  ← probabilite de chaque token
     │
  Echantillonnage (temperature, top_p)
     │
  Token ID 9103
     │
  Detokenize
     │
  "dort"
```

### Ce qu'il faut retenir

| Composant | Role |
|-----------|------|
| Tokenizer | Texte → IDs |
| Embedding | ID → vecteur dense |
| Positional Encoding | Injecter l'information de position |
| Self-Attention | Chaque token regarde tous les autres |
| Q, K, V | Question, etiquette, contenu |
| Multi-Head | Plusieurs perspectives en parallele |
| Feed-Forward | Transformation non-lineaire par position |
| Layer Norm | Stabiliser les activations |
| Residual | Raccourci pour le gradient |
| Masque causal | Empecher de voir le futur (decoder) |

### Exercices

1. **Implementer l'attention** : coder `selfAttention` et tester avec une matrice 3×4 (3 tokens, 4 dimensions).
2. **Masque causal** : vérifier que le premier token ne voit que lui-même, le deuxieme voit les deux premiers, etc.
3. **Comparer sans/avec normalisation** : observer l'effet de `/ √d_k` sur la distribution softmax.
4. **Temperature** : ajouter un paramètre de temperature au softmax de l'attention. Que se passe-t-il avec T=0.1 vs T=10 ?
5. **Visualiser l'attention** : pour une phrase donnee, afficher la matrice d'attention sous forme de heatmap ASCII.

---

*Prochain module : [10 — Entrainement & Fine-tuning](./10-entrainement-fine-tuning.md)*

---

<!-- parcours-recommande -->

::: tip Parcours recommandé
1. **Screencast** : [screencast 09 transformer attention](../screencasts/screencast-09-transformer-attention.md)
2. **Lab** : [lab-09-transformer-attention](../labs/lab-09-transformer-attention/README)
3. **Quiz** : [quiz 09 transformers](../quizzes/quiz-09-transformers.html)
:::
