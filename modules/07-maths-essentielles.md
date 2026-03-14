# Module 07 — Maths Essentielles pour l'IA

> **Objectif** : Maitriser les briques mathematiques indispensables pour comprendre les modules 08 (reseaux de neurones) et 09 (transformers). Aucun prerequis au-dela du niveau lycee.
> **Difficulte** : ⭐⭐ (intermediaire)
> **Prerequis** : Module 01-06 (Utiliser l'IA) — aucune base math specifique
> **Duree estimee** : 3 heures

---

## Pourquoi ce module maintenant ?

Dans les modules 01-06, vous avez **utilise** l'IA comme un outil : prompting, API, MCP, agents. Vous savez piloter la voiture.

A partir de maintenant, on ouvre le capot pour **comprendre le moteur**. Et le moteur de l'IA, c'est des maths — mais uniquement 5 concepts :

```
Ce que vous savez deja                 Ce que ces maths vont debloquer
─────────────────────────              ─────────────────────────────────
Embeddings (Module 12)           ←──   Vecteurs, produit scalaire, cosine
Similarite dans le RAG (13-15)   ←──   Distance euclidienne, cosine similarity
Softmax / temperature (Module 01)←──   Fonctions d'activation, softmax
"Le modele apprend" (concept)    ←──   Gradient descent, backpropagation
"Loss" dans les logs d'entrainement←── Cross-entropy loss
```

Chaque concept est lie a quelque chose que vous avez deja utilise. Pas de maths abstraites — uniquement ce qui sert dans les modules suivants.

> **Si vous etes presse** : les sections 1 (Vecteurs) et 3 (Fonctions d'activation / Softmax) sont les plus importantes. Les sections 4-5 (Derivees, Cross-entropy) sont necessaires uniquement si vous comptez faire le module 08 (neural network from scratch).

---

## Objectif du module

Ce module couvre **uniquement** les maths necessaires pour comprendre les reseaux de neurones et les transformers. Pas de theorie abstraite, pas de demonstrations formelles — juste ce dont vous avez besoin en tant que developpeur JavaScript pour lire du code d'IA et comprendre ce qui se passe sous le capot.

> Analogie : vous n'avez pas besoin de connaitre la metallurgie pour conduire une voiture, mais comprendre le moteur vous aide a diagnostiquer les problemes. C'est pareil ici.

---

## Plan du module

| Section | Concept | Pourquoi c'est utile |
|---------|---------|---------------------|
| 1 | Vecteurs | Les donnees en IA sont des vecteurs |
| 2 | Matrices | Les transformations sont des multiplications matricielles |
| 3 | Fonctions d'activation | Elles introduisent la non-linearite |
| 4 | Derivees et gradient | Le moteur de l'apprentissage |
| 5 | Cross-entropy loss | La fonction de cout des LLMs |

---

## 1. Vecteurs — La brique de base

### Qu'est-ce qu'un vecteur ?

Un vecteur est simplement **une liste ordonnee de nombres**. En TypeScript, c'est un `number[]`.

```
Vecteur 2D :  [3, 4]         → un point dans un plan
Vecteur 3D :  [1, 2, 3]      → un point dans l'espace
Vecteur 768D: [0.12, -0.34, ...] → un embedding de mot
```

En IA, **tout est vecteur** :
- Un pixel RGB est un vecteur `[r, g, b]`
- Un mot tokenise est un vecteur de 768 ou 1536 dimensions (embedding)
- Une phrase est une matrice (liste de vecteurs)

### Representation visuelle

```
        y
        ^
        |     * (3, 4)
   4    |    /
        |   /
   3    |  /
        | /
   2    |/
        +-----------> x
        0  1  2  3
```

### Implementation en TypeScript

```typescript
type Vector = number[];

// --- Addition de vecteurs ---
// Chaque element est additionne avec son correspondant
function vectorAdd(a: Vector, b: Vector): Vector {
  if (a.length !== b.length) {
    throw new Error(`Dimensions incompatibles: ${a.length} vs ${b.length}`);
  }
  return a.map((val, i) => val + b[i]);
}

// Exemple : deplacement dans l'espace
const position: Vector = [1, 2];
const deplacement: Vector = [3, -1];
const nouvellePosition = vectorAdd(position, deplacement);
// → [4, 1]
```

> Analogie : additionner deux vecteurs, c'est comme suivre deux directions successives sur une carte. Allez 3 pas a l'est puis 4 pas au nord, c'est la meme chose que le vecteur [3, 4].

### Produit scalaire (dot product)

Le produit scalaire est **l'operation la plus importante en IA**. Il mesure a quel point deux vecteurs pointent dans la meme direction.

```typescript
// --- Produit scalaire ---
// Somme des produits element par element
function dotProduct(a: Vector, b: Vector): number {
  if (a.length !== b.length) {
    throw new Error(`Dimensions incompatibles: ${a.length} vs ${b.length}`);
  }
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

// Exemple
const queryVector: Vector = [1, 0, 1];
const documentVector: Vector = [1, 1, 0];
const similarite = dotProduct(queryVector, documentVector);
// → 1*1 + 0*1 + 1*0 = 1
```

```
Produit scalaire — calcul pas a pas :

  a = [1, 0, 1]
  b = [1, 1, 0]

  1*1 = 1
  0*1 = 0
  1*0 = 0
       ───
  sum = 1
```

Le produit scalaire est au coeur du mecanisme d'**attention** dans les transformers : c'est comme ca qu'un token "regarde" les autres tokens.

### Norme d'un vecteur

La norme mesure la **longueur** d'un vecteur. C'est le theoreme de Pythagore generalise.

```typescript
// --- Norme euclidienne (L2) ---
function norm(v: Vector): number {
  return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
}

// Exemple : le vecteur [3, 4] a une norme de 5
// √(3² + 4²) = √(9 + 16) = √25 = 5
console.log(norm([3, 4])); // → 5
```

```
Norme — theoreme de Pythagore :

        |  /|
        | / |
   5    |/  | 4
        |   |
        +---+
          3

  √(3² + 4²) = √(9+16) = √25 = 5
```

### Distance euclidienne

La distance entre deux vecteurs mesure a quel point ils sont **differents**.

```typescript
// --- Distance euclidienne ---
function euclideanDistance(a: Vector, b: Vector): number {
  if (a.length !== b.length) {
    throw new Error(`Dimensions incompatibles`);
  }
  const squaredDiffs = a.map((val, i) => (val - b[i]) ** 2);
  return Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0));
}

// Exemple : distance entre deux embeddings de mots
const chatEmbedding: Vector = [0.9, 0.1, 0.8];
const felinEmbedding: Vector = [0.85, 0.15, 0.75];
const voitureEmbedding: Vector = [0.1, 0.9, 0.2];

console.log(euclideanDistance(chatEmbedding, felinEmbedding));
// → 0.087 (tres proches — meme champ semantique)

console.log(euclideanDistance(chatEmbedding, voitureEmbedding));
// → 1.22 (eloignes — champs semantiques differents)
```

### Similarite cosinus

La similarite cosinus mesure l'**angle** entre deux vecteurs, independamment de leur longueur. C'est la metrique standard pour comparer des embeddings.

```typescript
// --- Similarite cosinus ---
function cosineSimilarity(a: Vector, b: Vector): number {
  const dot = dotProduct(a, b);
  const normA = norm(a);
  const normB = norm(b);
  if (normA === 0 || normB === 0) return 0;
  return dot / (normA * normB);
}

// Resultat entre -1 et 1
// 1  = meme direction (tres similaires)
// 0  = perpendiculaires (pas de rapport)
// -1 = opposes (sens contraire)

const roi: Vector = [0.9, 0.1, 0.8, 0.2];
const reine: Vector = [0.85, 0.15, 0.82, 0.18];
const banane: Vector = [0.1, 0.9, 0.05, 0.95];

console.log(cosineSimilarity(roi, reine));   // → 0.998 (tres similaires)
console.log(cosineSimilarity(roi, banane));   // → 0.31  (peu similaires)
```

```
Similarite cosinus — intuition visuelle :

       B (banane)
      /
     /  angle = 72°  →  cos(72°) ≈ 0.31
    /
   +────────── A (roi)
    \
     \ angle = 3°   →  cos(3°) ≈ 0.998
      \
       C (reine)
```

---

## 2. Matrices — Les transformations

### Qu'est-ce qu'une matrice ?

Une matrice est un **tableau rectangulaire de nombres**. En TypeScript, c'est un `number[][]`.

```typescript
type Matrix = number[][];

// Matrice 2x3 (2 lignes, 3 colonnes)
const W: Matrix = [
  [1, 2, 3],
  [4, 5, 6],
];
```

En IA, les **poids** d'un reseau de neurones sont stockes dans des matrices. Quand on dit qu'un modele a 7 milliards de parametres (comme Llama 3.1 8B), ce sont 7 milliards de nombres dans des matrices.

### Transposee

La transposee echange les lignes et les colonnes.

```typescript
// --- Transposee ---
function transpose(m: Matrix): Matrix {
  const rows = m.length;
  const cols = m[0].length;
  const result: Matrix = Array.from({ length: cols }, () =>
    new Array(rows).fill(0)
  );
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = m[i][j];
    }
  }
  return result;
}

// Exemple
const original: Matrix = [
  [1, 2, 3],
  [4, 5, 6],
];
const transposee = transpose(original);
// → [[1, 4],
//    [2, 5],
//    [3, 6]]
```

```
Transposee — rotation des axes :

  Original (2x3)       Transposee (3x2)
  ┌─────────────┐      ┌─────────┐
  │  1   2   3  │      │  1   4  │
  │  4   5   6  │  →   │  2   5  │
  └─────────────┘      │  3   6  │
                        └─────────┘
```

### Multiplication matrice-vecteur

C'est **l'operation fondamentale** dans un reseau de neurones. Chaque couche transforme un vecteur d'entree en un vecteur de sortie via une multiplication matricielle.

```typescript
// --- Multiplication matrice × vecteur ---
function matVecMul(m: Matrix, v: Vector): Vector {
  if (m[0].length !== v.length) {
    throw new Error(
      `Dimensions incompatibles: matrice ${m.length}x${m[0].length} × vecteur ${v.length}`
    );
  }
  return m.map((row) => dotProduct(row, v));
}

// Exemple : une couche de neurones
// 3 entrees → 2 sorties
const poids: Matrix = [
  [0.5, -0.3, 0.8],  // neurone 1
  [0.1, 0.7, -0.2],  // neurone 2
];
const entree: Vector = [1.0, 0.5, 0.3];

const sortie = matVecMul(poids, entree);
// neurone 1 : 0.5*1.0 + (-0.3)*0.5 + 0.8*0.3 = 0.5 - 0.15 + 0.24 = 0.59
// neurone 2 : 0.1*1.0 + 0.7*0.5 + (-0.2)*0.3 = 0.1 + 0.35 - 0.06 = 0.39
// → [0.59, 0.39]
```

```
Multiplication matrice × vecteur — schema :

  Poids (2×3)         Entree (3)      Sortie (2)
  ┌───────────────┐   ┌─────┐         ┌──────┐
  │ 0.5 -0.3  0.8│ × │ 1.0 │    =    │ 0.59 │
  │ 0.1  0.7 -0.2│   │ 0.5 │         │ 0.39 │
  └───────────────┘   │ 0.3 │         └──────┘
                      └─────┘
```

### Multiplication matrice × matrice

```typescript
// --- Multiplication matrice × matrice ---
function matMul(a: Matrix, b: Matrix): Matrix {
  const rowsA = a.length;
  const colsA = a[0].length;
  const colsB = b[0].length;

  if (colsA !== b.length) {
    throw new Error(
      `Dimensions incompatibles: ${rowsA}x${colsA} × ${b.length}x${colsB}`
    );
  }

  const result: Matrix = Array.from({ length: rowsA }, () =>
    new Array(colsB).fill(0)
  );

  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      for (let k = 0; k < colsA; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
}

// Regle de compatibilite :
// (m × n) × (n × p) = (m × p)
//       ^^^   ^^^
//    doivent etre egaux
```

> Analogie : la multiplication matricielle, c'est comme une chaine de montage. La premiere matrice transforme les donnees d'une facon, la deuxieme les transforme d'une autre facon. Le resultat est la composition des deux transformations.

---

## 3. Fonctions d'activation

### Pourquoi on a besoin de fonctions d'activation ?

Sans fonctions d'activation, un reseau de neurones n'est qu'une suite de multiplications matricielles — et une suite de transformations lineaires reste lineaire. On ne pourrait apprendre que des relations lineaires (des lignes droites).

```
Sans activation :       Avec activation :
     y                       y
     |    /                  |        ___
     |   /                   |       /
     |  /                    |      /
     | /                     |_____/
     +────── x               +────────── x
  (lineaire seulement)    (peut approximer n'importe quoi)
```

Les fonctions d'activation introduisent de la **non-linearite**, ce qui permet au reseau d'apprendre des relations complexes.

### Sigmoid

La sigmoid ecrase n'importe quelle valeur entre 0 et 1. Historiquement tres utilisee, aujourd'hui surtout dans les portes (gates) des LSTM et les couches de sortie binaires.

```typescript
// --- Sigmoid ---
// Transforme n'importe quel nombre en valeur entre 0 et 1
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

// Exemples
console.log(sigmoid(-10)); // → 0.000045  (presque 0)
console.log(sigmoid(0));   // → 0.5       (pile au milieu)
console.log(sigmoid(10));  // → 0.999955  (presque 1)
```

```
Sigmoid — forme en S :

  1.0  ─────────────────────────────*****
                                 ***
  0.5  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─*─ ─ ─ ─ ─
                            ***
  0.0  *****─────────────────────────────
       -10  -5   0   5   10
```

### ReLU (Rectified Linear Unit)

ReLU est **la fonction d'activation la plus utilisee** dans les reseaux modernes. Extremement simple : si c'est negatif, renvoie 0 ; sinon, renvoie la valeur.

```typescript
// --- ReLU ---
function relu(x: number): number {
  return Math.max(0, x);
}

// Appliquer ReLU a un vecteur entier
function reluVector(v: Vector): Vector {
  return v.map(relu);
}

// Exemples
console.log(relu(-5));  // → 0
console.log(relu(0));   // → 0
console.log(relu(3));   // → 3

console.log(reluVector([-2, 0.5, -0.1, 3, -1]));
// → [0, 0.5, 0, 3, 0]
```

```
ReLU — simple et efficace :

  y
  |         /
  |        /
  |       /
  |      /
  |     /
  |____/
  +────────── x
     0
```

**Pourquoi ReLU fonctionne si bien ?**
- Calcul ultra rapide (juste un `max`)
- Pas de probleme de gradient qui s'evanouit (vanishing gradient)
- Cree de la sparsity (beaucoup de neurones a zero)

### Tanh

La tangente hyperbolique ecrase les valeurs entre -1 et 1. Centree autour de zero, ce qui aide l'optimisation.

```typescript
// --- Tanh ---
function tanh(x: number): number {
  return Math.tanh(x);
}

// Ou manuellement :
function tanhManual(x: number): number {
  const e2x = Math.exp(2 * x);
  return (e2x - 1) / (e2x + 1);
}

// Exemples
console.log(tanh(-5));  // → -0.9999
console.log(tanh(0));   // → 0
console.log(tanh(5));   // → 0.9999
```

```
Tanh — sigmoid centree :

  1.0  ─────────────────────────*****
                              ***
  0.0  ─ ─ ─ ─ ─ ─ ─ ─ ─ *─ ─ ─ ─ ─
                        ***
 -1.0  *****─────────────────────────
       -5    -2   0   2    5
```

### Softmax — La star des LLMs

Softmax transforme un vecteur de scores bruts (logits) en **probabilites** qui somment a 1. C'est la derniere couche de tout modele de langage : elle determine la probabilite de chaque token suivant.

```typescript
// --- Softmax ---
function softmax(logits: Vector): Vector {
  // Astuce de stabilite numerique : soustraire le max
  // pour eviter les overflow avec exp()
  const maxLogit = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - maxLogit));
  const sumExps = exps.reduce((sum, e) => sum + e, 0);
  return exps.map((e) => e / sumExps);
}

// Exemple : un LLM predit le prochain token
const logits: Vector = [2.0, 1.0, 0.1];
const probas = softmax(logits);
// → [0.659, 0.242, 0.099]
//   Le premier token a 65.9% de chances d'etre choisi

// Verification : les probas somment a 1
console.log(probas.reduce((s, p) => s + p, 0)); // → 1.0
```

```
Softmax — du score brut a la probabilite :

  Logits (scores bruts)        Probabilites (softmax)
  ┌────────────────────┐       ┌────────────────────────┐
  │ "le"   → 2.0       │       │ "le"   → 65.9%         │
  │ "un"   → 1.0       │  →    │ "un"   → 24.2%         │
  │ "chat" → 0.1       │       │ "chat" →  9.9%         │
  └────────────────────┘       └────────────────────────┘
                                         Total = 100%
```

> Analogie : softmax est comme un **vote pondere**. Chaque logit est la conviction d'un expert. Softmax normalise ces convictions pour obtenir des pourcentages, ou l'expert le plus convaincu obtient la plus grosse part, mais tout le monde garde une petite chance.

### Tableau comparatif des fonctions d'activation

| Fonction | Intervalle | Utilisation typique | Avantage | Inconvenient |
|----------|-----------|-------------------|----------|-------------|
| Sigmoid | [0, 1] | Sortie binaire, portes LSTM | Probabiliste | Vanishing gradient |
| ReLU | [0, +inf) | Couches cachees CNN/MLP | Rapide, simple | Neurones "morts" |
| Tanh | [-1, 1] | Couches cachees RNN | Centree a zero | Vanishing gradient |
| Softmax | [0, 1] (somme=1) | Derniere couche classification | Distribution de proba | Cout calcul |

---

## 4. Derivees et gradient

### Intuition : la pente de la colline

> Analogie : imaginez que vous etes au sommet d'une colline dans un brouillard epais. Vous ne voyez rien, mais vous sentez la pente sous vos pieds. La derivee, c'est cette pente. Le gradient, c'est la **direction de la pente la plus raide**. Pour descendre (= minimiser l'erreur), vous allez dans le sens oppose au gradient.

```
La descente de gradient :

        *  (depart : erreur elevee)
       / \
      /   \  ← gradient pointe vers le haut
     /     \    donc on descend
    /       \
   /     *   \   ← apres quelques pas
  /       \   \
 /         \   \
/           *   \  ← minimum atteint !
─────────────────────
```

### Derivee d'une fonction

La derivee mesure comment une petite variation de l'entree affecte la sortie.

```typescript
// --- Derivee numerique (approximation) ---
function numericalDerivative(
  f: (x: number) => number,
  x: number,
  h: number = 1e-7
): number {
  return (f(x + h) - f(x - h)) / (2 * h);
}

// Exemple : derivee de x² au point x = 3
// La derivee de x² est 2x, donc en x=3 → 6
const f = (x: number) => x * x;
console.log(numericalDerivative(f, 3)); // → 6.0 (environ)
```

### Derivees des fonctions d'activation

```typescript
// --- Derivee de sigmoid ---
function sigmoidDerivative(x: number): number {
  const s = sigmoid(x);
  return s * (1 - s);
}

// --- Derivee de ReLU ---
function reluDerivative(x: number): number {
  return x > 0 ? 1 : 0;
}

// --- Derivee de tanh ---
function tanhDerivative(x: number): number {
  const t = Math.tanh(x);
  return 1 - t * t;
}
```

```
Derivees — les pentes de chaque fonction :

  Sigmoid'           ReLU'             Tanh'
  max = 0.25         1 ou 0            max = 1

      *                   ──────          *
     / \             |   /               / \
    /   \            |  /               /   \
   /     \           | /               /     \
──/       \──     ───+/            ──/       \──
```

### Gradient : derivee en plusieurs dimensions

Quand on a plusieurs parametres (des milliers en IA), le gradient est le **vecteur de toutes les derivees partielles**.

```typescript
// --- Gradient numerique ---
function numericalGradient(
  f: (params: Vector) => number,
  params: Vector,
  h: number = 1e-7
): Vector {
  return params.map((_, i) => {
    const paramsPlus = [...params];
    const paramsMinus = [...params];
    paramsPlus[i] += h;
    paramsMinus[i] -= h;
    return (f(paramsPlus) - f(paramsMinus)) / (2 * h);
  });
}

// Exemple : gradient de f(x, y) = x² + y² au point (3, 4)
// ∂f/∂x = 2x = 6, ∂f/∂y = 2y = 8
const f2d = (p: Vector) => p[0] ** 2 + p[1] ** 2;
console.log(numericalGradient(f2d, [3, 4]));
// → [6, 8]
```

### Descente de gradient

C'est **l'algorithme d'apprentissage** fondamental en IA. On ajuste les poids dans la direction opposee au gradient, proportionnellement au learning rate.

```typescript
// --- Descente de gradient simple ---
function gradientDescent(
  lossFunction: (params: Vector) => number,
  initialParams: Vector,
  learningRate: number,
  epochs: number
): { params: Vector; lossHistory: number[] } {
  let params = [...initialParams];
  const lossHistory: number[] = [];

  for (let epoch = 0; epoch < epochs; epoch++) {
    const loss = lossFunction(params);
    lossHistory.push(loss);

    const gradient = numericalGradient(lossFunction, params);

    // Mise a jour : params = params - learningRate * gradient
    params = params.map((p, i) => p - learningRate * gradient[i]);

    if (epoch % 100 === 0) {
      console.log(`Epoch ${epoch}: loss = ${loss.toFixed(6)}`);
    }
  }

  return { params, lossHistory };
}

// Exemple : trouver le minimum de f(x, y) = (x-2)² + (y-3)²
// Le minimum est en (2, 3)
const loss = (p: Vector) => (p[0] - 2) ** 2 + (p[1] - 3) ** 2;

const result = gradientDescent(loss, [10, 10], 0.1, 500);
console.log(result.params);
// → [2.0000, 3.0000] (converge vers le minimum)
```

```
Descente de gradient — vue de dessus (courbes de niveau) :

      y
      │      ╭──╮
   10 │  *  ╱    ╲    * = depart (10, 10)
      │  ↓╱   ╭──╮╲
    8 │  ╱   ╱    ╲ ╲
      │╱   ╱  ╭──╮ ╲ ╲
    6 │   ╱  ╱ ** ╲  ╲ ╲   ** = minimum (2, 3)
      │  ╱  ╱      ╲  ╲ ╲
    4 │ ╱  ╱        ╲  ╲ ╲
      │╱  ╱          ╲  ╲ ╲
    2 │  ╲            ╱  ╱ ╱
      │   ╲──────────╱  ╱ ╱
      └──────────────────────── x
      0   2   4   6   8  10
```

### Le learning rate : un parametre crucial

```
Learning rate trop grand :          Learning rate trop petit :
(diverge, rate le minimum)          (converge, mais tres lentement)

      *                                   *
     / \                                  |
    /   \    *                            |
   /     \  / \                           *
  /       \/   \    *                     |
 /         \    \  / \                    |
            \    \/   *                   *
             \   bounce bounce            |
                                          * (apres 10000 epochs...)
                                          |
                                          * minimum

Learning rate correct :
(converge rapidement)

      *
       \
        \
         *
          \
           *
            *
             ** minimum
```

---

## 5. Cross-Entropy Loss

### Pourquoi c'est LA loss function des LLMs

La cross-entropy mesure la **distance entre deux distributions de probabilites** : celle predite par le modele et la distribution reelle (le token attendu).

### Intuition

> Analogie : imaginez un meteo qui donne des probabilites de pluie. S'il dit "90% de pluie" et qu'il pleut effectivement, sa perte (loss) est faible. S'il dit "10% de pluie" et qu'il pleut, sa perte est enorme. La cross-entropy capture exactement cette idee : **penaliser fortement les predictions confiantes qui ont tort**.

### Implementation

```typescript
// --- Cross-Entropy Loss ---
function crossEntropyLoss(predicted: Vector, targetIndex: number): number {
  // predicted : distribution de probabilites (sortie de softmax)
  // targetIndex : index du token correct

  // Eviter log(0) avec un epsilon
  const epsilon = 1e-15;
  const clipped = Math.max(predicted[targetIndex], epsilon);
  return -Math.log(clipped);
}

// Exemple 1 : le modele est confiant ET correct
const good: Vector = [0.9, 0.05, 0.05]; // token 0 predit a 90%
console.log(crossEntropyLoss(good, 0));
// → 0.105 (faible loss — bien !)

// Exemple 2 : le modele est confiant MAIS a tort
const bad: Vector = [0.05, 0.05, 0.9];  // token 2 predit a 90%
console.log(crossEntropyLoss(bad, 0));    // mais le correct est token 0
// → 2.996 (grosse loss — mauvaise prediction !)

// Exemple 3 : le modele hesite
const unsure: Vector = [0.33, 0.33, 0.34];
console.log(crossEntropyLoss(unsure, 0));
// → 1.109 (loss moyenne)
```

### Cross-entropy sur un batch

```typescript
// --- Cross-Entropy moyennee sur un batch ---
function batchCrossEntropy(
  predictions: Vector[],
  targets: number[]
): number {
  const losses = predictions.map((pred, i) =>
    crossEntropyLoss(pred, targets[i])
  );
  return losses.reduce((sum, l) => sum + l, 0) / losses.length;
}

// Exemple : un mini-batch de 4 predictions
const preds: Vector[] = [
  [0.7, 0.2, 0.1],  // → token 0 (correct: 0) ✓
  [0.1, 0.8, 0.1],  // → token 1 (correct: 1) ✓
  [0.3, 0.3, 0.4],  // → token 2 (correct: 0) ✗
  [0.6, 0.3, 0.1],  // → token 0 (correct: 0) ✓
];
const targets = [0, 1, 0, 0];

console.log(batchCrossEntropy(preds, targets));
// → 0.567 (loss moyenne du batch)
```

### Pourquoi cross-entropy et pas MSE ?

| Critere | MSE (Mean Squared Error) | Cross-Entropy |
|---------|-------------------------|---------------|
| Utilisation | Regression (predire un nombre) | Classification (predire une classe) |
| Gradient | Peut etre tres petit loin de la solution | Gradient fort quand la prediction est mauvaise |
| Avec softmax | Combinaison instable | Combinaison naturelle et stable |
| Pour les LLMs | Inadaptee | Standard universel |

La cross-entropy combinee avec softmax a une derivee particulierement elegante :

```
∂Loss/∂logit_i = predicted_i - target_i

C'est simplement la difference entre la prediction et la cible !
```

```typescript
// --- Gradient de softmax + cross-entropy ---
// Extremement simple a calculer
function softmaxCrossEntropyGradient(
  predicted: Vector,
  targetIndex: number
): Vector {
  return predicted.map((p, i) => (i === targetIndex ? p - 1 : p));
}

// Exemple
const pred = softmax([2.0, 1.0, 0.1]); // [0.659, 0.242, 0.099]
const grad = softmaxCrossEntropyGradient(pred, 0);
// → [-0.341, 0.242, 0.099]
// Le gradient dit : "augmente le score du token 0, diminue les autres"
```

---

## Recapitulatif

```
Pipeline complet d'un forward pass :

  Entree      Poids         Activation     Softmax       Loss
  [x₁,x₂] → [W×x + b] → [ReLU/etc] → [probas] → cross-entropy
              matrices      non-lin.     Σ=1         nombre unique

  Backward pass (apprentissage) :
  Loss → gradient → ajuster les poids → recommencer
```

### Ce qu'il faut retenir

| Concept | En une phrase |
|---------|--------------|
| Vecteur | Une liste de nombres = une donnee en IA |
| Produit scalaire | Mesure la similarite entre deux vecteurs |
| Matrice | Les poids du reseau, transforment les vecteurs |
| Sigmoid | Ecrase entre 0 et 1 |
| ReLU | Max(0, x) — la plus utilisee |
| Softmax | Transforme des scores en probabilites |
| Derivee | La pente — comment la sortie change quand l'entree change |
| Gradient | Vecteur de toutes les derivees partielles |
| Descente de gradient | Ajuster les poids dans la direction opposee au gradient |
| Cross-entropy | Penalise les predictions confiantes et fausses |

### Exercices pratiques

1. **Implementer une normalisation de vecteur** : diviser chaque element par la norme
2. **Comparer sigmoid et ReLU** : tracer les valeurs pour x de -5 a 5
3. **Mini descente de gradient** : trouver le minimum de `f(x) = (x - 7)²` en partant de x = 0
4. **Softmax temperature** : modifier softmax pour accepter un parametre T (temperature) qui controle la "confiance" de la distribution
5. **Cross-entropy en pratique** : calculer la loss pour differentes predictions et observer comment elle penalise les erreurs

---

*Prochain module : [08 — Reseaux de Neurones from Scratch](./08-neural-network-scratch.md)*
