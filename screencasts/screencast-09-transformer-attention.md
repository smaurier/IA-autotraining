# Screencast 09 — Le Transformer et le mecanisme d'attention

## Informations
- **Duree estimee** : 15-18 min
- **Module** : `modules/09-transformer-attention.md`
- **Lab associe** : `labs/lab-09-transformer-attention/`
- **Prerequis** : Screencast 07, 08

## Setup
- [ ] Fichier `attention.ts` du lab pret
- [ ] Terminal ouvert
- [ ] Slides avec le schema du Transformer ("Attention Is All You Need")
- [ ] Schema d'architecture self-attention prepare

## Script

### [00:00-03:30] Le Transformer : revolution de 2017
> En 2017, Google publie "Attention Is All You Need" et invente le Transformer. C'est l'architecture derriere GPT, Claude, Llama et tous les LLM modernes. Aujourd'hui on va implementer le coeur de cette architecture : le mecanisme de self-attention.
**Action** : Afficher le schema simplifie du Transformer
```
Architecture Transformer (simplifiee) :

  Entree : "Le chat dort"
     │
     v
  ┌──────────────┐
  │ Tokenization │  "Le" "chat" "dort" -> [412, 8937, 19283]
  └──────┬───────┘
         v
  ┌──────────────┐
  │ Embedding    │  token_id -> vecteur [d_model]
  │ + Position   │  + information de position
  └──────┬───────┘
         v
  ┌──────────────────────────┐
  │ Self-Attention (x N)     │  <- CE QU'ON VA IMPLEMENTER
  │ + Feed-Forward           │
  │ + Layer Norm             │
  └──────────┬───────────────┘
             v
  ┌──────────────┐
  │ Prediction   │  softmax -> prochain token
  └──────────────┘
```

### [03:30-08:00] Self-attention pas a pas
> L'attention, c'est le mecanisme qui permet a chaque mot de "regarder" tous les autres mots de la phrase pour comprendre le contexte. Le mot "il" dans "Le chat mange car il a faim" doit savoir que "il" fait reference a "chat". C'est l'attention qui resout ca.
**Action** : Implementer la self-attention etape par etape
```typescript
// attention.ts

type Matrix = number[][];

// Utilitaires matriciels
function matMul(a: Matrix, b: Matrix): Matrix {
  const rows = a.length;
  const cols = b[0].length;
  const result: Matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      for (let k = 0; k < b.length; k++)
        result[i][j] += a[i][k] * b[k][j];
  return result;
}

function transpose(m: Matrix): Matrix {
  return m[0].map((_, j) => m.map((row) => row[j]));
}

function softmaxRows(m: Matrix): Matrix {
  return m.map((row) => {
    const max = Math.max(...row);
    const exps = row.map((v) => Math.exp(v - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map((e) => e / sum);
  });
}

// Self-Attention : Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) * V
function selfAttention(
  embeddings: Matrix,   // [seq_len x d_model]
  Wq: Matrix,           // [d_model x d_k]
  Wk: Matrix,           // [d_model x d_k]
  Wv: Matrix,           // [d_model x d_v]
): { output: Matrix; weights: Matrix } {
  // Etape 1 : Projeter en Q, K, V
  const Q = matMul(embeddings, Wq);
  const K = matMul(embeddings, Wk);
  const V = matMul(embeddings, Wv);

  console.log("Q (queries) :", Q);
  console.log("K (keys) :", K);
  console.log("V (values) :", V);

  // Etape 2 : Scores d'attention = Q * K^T / sqrt(d_k)
  const dk = Wk[0].length;
  const scores = matMul(Q, transpose(K)).map((row) =>
    row.map((v) => v / Math.sqrt(dk))
  );
  console.log("\nScores bruts (QK^T/sqrt(dk)) :", scores);

  // Etape 3 : Poids d'attention = softmax(scores)
  const weights = softmaxRows(scores);
  console.log("Poids d'attention (softmax) :", weights);

  // Etape 4 : Sortie = poids * V
  const output = matMul(weights, V);
  console.log("Sortie attention :", output);

  return { output, weights };
}
```

### [08:00-11:30] Demo : attention sur une phrase
> Lancons notre attention sur une phrase concrete et observons quels mots "font attention" a quels autres mots.
**Action** : Executer la self-attention sur des embeddings simules
```typescript
// demo-attention.ts
const tokens = ["Le", "chat", "mange", "car", "il", "a", "faim"];

// Embeddings simules (normalement appris, ici aleatoires mais coherents)
const d_model = 4;
const d_k = 3;

// Simuler des embeddings qui ont du sens
const embeddings: Matrix = [
  [0.1, 0.8, 0.2, 0.0],  // Le (article)
  [0.9, 0.3, 0.1, 0.7],  // chat (sujet, animal)
  [0.2, 0.1, 0.9, 0.3],  // mange (verbe)
  [0.0, 0.1, 0.0, 0.1],  // car (conjonction)
  [0.8, 0.3, 0.1, 0.6],  // il (pronom -> similaire a "chat")
  [0.1, 0.1, 0.7, 0.2],  // a (verbe)
  [0.3, 0.2, 0.8, 0.4],  // faim (nom)
];

// Matrices de poids (normalement apprises)
const Wq: Matrix = [[0.1, 0.3, -0.1], [0.2, -0.1, 0.4], [-0.3, 0.2, 0.1], [0.4, 0.1, -0.2]];
const Wk: Matrix = [[0.3, -0.1, 0.2], [-0.2, 0.4, 0.1], [0.1, 0.1, -0.3], [-0.1, 0.3, 0.2]];
const Wv: Matrix = [[0.2, 0.1, -0.1], [0.1, -0.2, 0.3], [-0.1, 0.3, 0.1], [0.3, 0.1, 0.2]];

const { weights } = selfAttention(embeddings, Wq, Wk, Wv);

// Visualiser les poids d'attention
console.log("\n=== Carte d'attention ===\n");
console.log("        " + tokens.map((t) => t.padEnd(6)).join(""));
tokens.forEach((token, i) => {
  const bars = weights[i].map((w) => {
    const level = Math.round(w * 5);
    return ["░░░░░", "▒░░░░", "▒▒░░░", "▒▒▒░░", "▒▒▒▒░", "█████"][level].substring(0, 5);
  });
  console.log(`${token.padEnd(8)}${bars.join(" ")}`);
});

// Montrer que "il" fait attention a "chat"
console.log(`\nAttention de "il" : ${tokens.map((t, i) => `${t}(${(weights[4][i] * 100).toFixed(0)}%)`).join(" ")}`);
```

### [11:30-14:30] Multi-Head Attention
> Dans les vrais Transformers, on n'utilise pas une seule attention mais plusieurs en parallele — chaque "tete" capture un aspect different (syntaxe, semantique, coreference, etc.).
**Action** : Implementer le multi-head attention
```typescript
// multi-head.ts
function multiHeadAttention(
  embeddings: Matrix,
  numHeads: number,
  dModel: number,
  dK: number,
): Matrix {
  const headOutputs: Matrix[] = [];

  for (let h = 0; h < numHeads; h++) {
    console.log(`\n--- Tete ${h + 1} ---`);
    // Chaque tete a ses propres poids (ici aleatoires)
    const Wq = randomMatrix(dModel, dK);
    const Wk = randomMatrix(dModel, dK);
    const Wv = randomMatrix(dModel, dK);

    const { output } = selfAttention(embeddings, Wq, Wk, Wv);
    headOutputs.push(output);
  }

  // Concatener les sorties de toutes les tetes
  const concatenated = embeddings.map((_, i) =>
    headOutputs.flatMap((head) => head[i])
  );
  console.log(`\nSortie concatenee [${concatenated.length} x ${concatenated[0].length}]`);

  // Projection finale (Wo)
  const Wo = randomMatrix(numHeads * dK, dModel);
  const finalOutput = matMul(concatenated, Wo);
  console.log(`Sortie finale [${finalOutput.length} x ${finalOutput[0].length}]`);

  return finalOutput;
}

function randomMatrix(rows: number, cols: number): Matrix {
  const scale = Math.sqrt(2 / (rows + cols));
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => (Math.random() * 2 - 1) * scale)
  );
}

// Demo avec 2 tetes d'attention
const result = multiHeadAttention(embeddings, 2, d_model, d_k);
```

### [14:30-18:00] Du Transformer au LLM
> On a implemente le mecanisme central. Mais un vrai Transformer a aussi des couches feed-forward, de la normalisation, des connexions residuelles et un masquage causal pour la generation.
**Action** : Montrer le schema complet et recapituler
```
Un bloc Transformer complet :

  Input
    │
    ├──────────────────────────────┐
    v                              │
  Multi-Head Attention             │ (connexion residuelle)
    │                              │
    v                              │
  Add & Layer Norm <───────────────┘
    │
    ├──────────────────────────────┐
    v                              │
  Feed-Forward Network             │ (connexion residuelle)
  (2 couches lineaires + GeLU)     │
    │                              │
    v                              │
  Add & Layer Norm <───────────────┘
    │
    v
  Output

Claude Sonnet : ~40 blocs empiles
GPT-4 : ~120 blocs empiles
Chaque bloc affine la representation des tokens
```
```
Ce qu'on a implemente :          Ce qui reste (en production) :
✓ Self-Attention                 - Positional Encoding
✓ Multi-Head Attention           - Layer Normalization
✓ Softmax scaled                 - Feed-Forward layers
✓ Matrices Q, K, V               - Masquage causal
                                  - Gradient descent distribue
                                  - Tokenization (screencast 12)
```

## Points d'attention pour l'enregistrement
- Prendre le temps de bien expliquer Q, K, V avec l'analogie de la recherche (query = question, key = index, value = contenu)
- La carte d'attention est le moment visuel le plus important — bien la montrer
- Ne pas s'attarder sur les details mathematiques des matrices aleatoires
- Faire le pont avec le screencast 08 (meme principes, architecture differente)
