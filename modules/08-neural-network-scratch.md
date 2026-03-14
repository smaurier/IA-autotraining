# Module 08 — Reseaux de Neurones from Scratch

## Objectif du module

Construire un reseau de neurones complet **en TypeScript pur**, sans aucun framework (pas de TensorFlow, pas de PyTorch, pas de brain.js). L'objectif est de comprendre chaque piece du puzzle : du perceptron simple au MLP qui apprend le XOR.

> Si vous pouvez le coder from scratch, vous le comprenez vraiment.

---

## Plan du module

| Section | Concept | Ce qu'on construit |
|---------|---------|-------------------|
| 1 | Perceptron | Un neurone unique |
| 2 | Forward pass | Propagation des signaux |
| 3 | Loss & backward | Calcul de l'erreur et des gradients |
| 4 | Backpropagation | Chain rule appliquee |
| 5 | MLP complet | Reseau multi-couches |
| 6 | Training loop | Boucle d'entrainement |
| 7 | Le probleme XOR | Demonstration de la puissance des couches cachees |
| 8 | Overfitting vs Underfitting | Le compromis biais-variance |

---

## 1. Le Perceptron — Le neurone artificiel

### Inspiration biologique

```
Neurone biologique :              Neurone artificiel :

  dendrites → corps → axone      entrees → somme ponderee → activation → sortie
      x₁ ──→╲                        x₁ ──→╲
      x₂ ──→ ●──→ sortie            x₂ ──→ Σ → f(z) → y
      x₃ ──→╱                        x₃ ──→╱
                                        + biais
```

Le perceptron est le neurone artificiel le plus simple : il prend des entrees, les multiplie par des poids, ajoute un biais, et passe le resultat dans une fonction d'activation.

### La formule

```
z = w₁·x₁ + w₂·x₂ + ... + wₙ·xₙ + b
y = activation(z)

Ou en notation vectorielle :
z = W·X + b
y = f(z)
```

### Implementation

```typescript
type Vector = number[];

class Perceptron {
  weights: Vector;
  bias: number;

  constructor(inputSize: number) {
    // Initialisation aleatoire (Xavier/Glorot simplifie)
    const scale = Math.sqrt(2 / inputSize);
    this.weights = Array.from({ length: inputSize }, () =>
      (Math.random() * 2 - 1) * scale
    );
    this.bias = 0;
  }

  // Forward pass : calcul de la sortie
  forward(inputs: Vector): number {
    // Somme ponderee
    const z = this.weights.reduce(
      (sum, w, i) => sum + w * inputs[i],
      this.bias
    );
    // Activation sigmoid
    return 1 / (1 + Math.exp(-z));
  }
}

// Exemple : un perceptron avec 2 entrees
const neurone = new Perceptron(2);
console.log(neurone.forward([1, 0])); // → un nombre entre 0 et 1
console.log(neurone.forward([0, 1])); // → un autre nombre
```

### Le perceptron peut apprendre AND et OR

```
Porte AND :           Porte OR :
x₁  x₂  →  y         x₁  x₂  →  y
0   0   →  0          0   0   →  0
0   1   →  0          0   1   →  1
1   0   →  0          1   0   →  1
1   1   →  1          1   1   →  1
```

```typescript
// Entrainement d'un perceptron sur la porte AND
function trainPerceptron(): void {
  const p = new Perceptron(2);
  const data = [
    { input: [0, 0], target: 0 },
    { input: [0, 1], target: 0 },
    { input: [1, 0], target: 0 },
    { input: [1, 1], target: 1 },
  ];

  const learningRate = 0.5;

  for (let epoch = 0; epoch < 1000; epoch++) {
    for (const { input, target } of data) {
      const output = p.forward(input);
      const error = target - output;

      // Derivee de sigmoid : output * (1 - output)
      const delta = error * output * (1 - output);

      // Mise a jour des poids
      p.weights = p.weights.map((w, i) => w + learningRate * delta * input[i]);
      p.bias += learningRate * delta;
    }
  }

  // Test
  console.log('AND gate results:');
  for (const { input, target } of data) {
    const output = p.forward(input);
    console.log(`  ${input} → ${output.toFixed(3)} (attendu: ${target})`);
  }
}

trainPerceptron();
// AND gate results:
//   [0,0] → 0.012 (attendu: 0)
//   [0,1] → 0.089 (attendu: 0)
//   [1,0] → 0.089 (attendu: 0)
//   [1,1] → 0.921 (attendu: 1)
```

### Le probleme XOR — la limite du perceptron

```
Porte XOR :
x₁  x₂  →  y
0   0   →  0
0   1   →  1
1   0   →  1
1   1   →  0    ← un perceptron ne peut PAS apprendre ca !

Pourquoi ?

  x₂
   │  ●(0,1)=1    ○(1,1)=0
   │
   │  ○(0,0)=0    ●(1,0)=1
   └──────────────── x₁

  Impossible de tracer UNE SEULE ligne droite
  qui separe les ● des ○

  → Il faut un reseau avec au moins une couche cachee !
```

---

## 2. Forward Pass — Propagation des signaux

### Architecture d'un MLP

```
Couche d'entree    Couche cachee    Couche de sortie
  (2 neurones)     (4 neurones)      (1 neurone)

     x₁ ──────→ h₁ ──────→╲
      │╲       ╱│╲          ╲
      │ ╲     ╱ │ ╲          ╲
      │  ╲   ╱  │  ╲          → y
      │   ╲ ╱   │   ╲        ╱
      │    ╳    │    ╲      ╱
      │   ╱ ╲   │     ╲    ╱
      │  ╱   ╲  │      ╲  ╱
      │ ╱     ╲ │       ╲╱
     x₂ ──────→ h₄ ──────→╱

  Chaque fleche = un poids (nombre a apprendre)
  Total poids = 2×4 + 4×1 = 12 poids + 5 biais = 17 parametres
```

### Implementation du forward pass

```typescript
type Matrix = number[][];

// Utilitaires
function dotProduct(a: Vector, b: Vector): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function relu(x: number): number {
  return Math.max(0, x);
}

// --- Couche dense (fully connected layer) ---
interface LayerState {
  inputs: Vector;     // entrees memorisees pour le backward
  preActivation: Vector; // z = W·x + b (avant activation)
  outputs: Vector;    // a = f(z) (apres activation)
}

class DenseLayer {
  weights: Matrix;    // [outputSize × inputSize]
  biases: Vector;     // [outputSize]
  activation: 'sigmoid' | 'relu' | 'none';
  state: LayerState | null = null;

  constructor(
    inputSize: number,
    outputSize: number,
    activation: 'sigmoid' | 'relu' | 'none' = 'sigmoid'
  ) {
    // Initialisation Xavier/Glorot
    const scale = Math.sqrt(2 / (inputSize + outputSize));
    this.weights = Array.from({ length: outputSize }, () =>
      Array.from({ length: inputSize }, () => (Math.random() * 2 - 1) * scale)
    );
    this.biases = new Array(outputSize).fill(0);
    this.activation = activation;
  }

  forward(inputs: Vector): Vector {
    const preActivation = this.weights.map((row, i) =>
      dotProduct(row, inputs) + this.biases[i]
    );

    const outputs = preActivation.map((z) => {
      switch (this.activation) {
        case 'sigmoid': return sigmoid(z);
        case 'relu': return relu(z);
        case 'none': return z;
      }
    });

    // Memoriser l'etat pour le backward pass
    this.state = { inputs, preActivation, outputs };
    return outputs;
  }
}
```

> Analogie : le forward pass, c'est comme un signal electrique qui traverse un circuit. Il entre par les capteurs (couche d'entree), traverse des composants qui le transforment (couches cachees), et sort par l'afficheur (couche de sortie). Chaque composant amplifie ou attenue le signal selon ses reglages (les poids).

---

## 3. Loss et Backward Pass

### Calcul de l'erreur

```typescript
// --- Fonctions de loss ---
function mseLoss(predicted: Vector, target: Vector): number {
  const n = predicted.length;
  return predicted.reduce(
    (sum, p, i) => sum + (p - target[i]) ** 2,
    0
  ) / n;
}

function binaryCrossEntropy(predicted: number, target: number): number {
  const eps = 1e-15;
  const p = Math.max(eps, Math.min(1 - eps, predicted));
  return -(target * Math.log(p) + (1 - target) * Math.log(1 - p));
}
```

### La Chain Rule — le coeur de la backpropagation

La chain rule (regle de la chaine) dit que la derivee d'une composition de fonctions est le produit des derivees individuelles.

```
Si y = f(g(x)), alors dy/dx = f'(g(x)) × g'(x)

En reseau de neurones :

  x → [couche 1] → h → [couche 2] → y → [loss] → L

  ∂L/∂w₁ = ∂L/∂y × ∂y/∂h × ∂h/∂w₁
            └─────────────────────────┘
            On enchaine les derivees de droite a gauche
```

```
Chain rule — visualisation :

  Forward :  x ──→ h ──→ y ──→ L
              w₁    w₂

  Backward : x ←── h ←── y ←── L
           ∂L/∂w₁  ∂L/∂w₂  ∂L/∂y

  ∂L/∂w₂ = ∂L/∂y × ∂y/∂w₂     (derivee directe)
  ∂L/∂w₁ = ∂L/∂y × ∂y/∂h × ∂h/∂w₁  (on enchaine)
```

> Analogie : imaginez une chaine de dominos. Si vous poussez le dernier, il fait tomber l'avant-dernier, qui fait tomber celui d'avant, etc. La backpropagation, c'est pareil : l'erreur de sortie se propage en arriere a travers chaque couche, et chaque couche apprend combien elle a contribue a l'erreur.

### Backward pass pour une couche dense

```typescript
interface LayerGradients {
  dWeights: Matrix;   // gradient des poids
  dBiases: Vector;    // gradient des biais
  dInputs: Vector;    // gradient a propager vers la couche precedente
}

function backwardDenseLayer(
  layer: DenseLayer,
  dOutput: Vector  // gradient venant de la couche suivante
): LayerGradients {
  const state = layer.state!;

  // 1. Gradient a travers l'activation
  const dPreActivation = state.preActivation.map((z, i) => {
    let activationDeriv: number;
    switch (layer.activation) {
      case 'sigmoid': {
        const s = sigmoid(z);
        activationDeriv = s * (1 - s);
        break;
      }
      case 'relu':
        activationDeriv = z > 0 ? 1 : 0;
        break;
      case 'none':
        activationDeriv = 1;
        break;
    }
    return dOutput[i] * activationDeriv;
  });

  // 2. Gradient des poids : dW = dZ × inputs^T
  const dWeights: Matrix = dPreActivation.map((dz) =>
    state.inputs.map((inp) => dz * inp)
  );

  // 3. Gradient des biais : dB = dZ
  const dBiases = [...dPreActivation];

  // 4. Gradient des entrees : dX = W^T × dZ
  const dInputs = state.inputs.map((_, j) =>
    dPreActivation.reduce(
      (sum, dz, i) => sum + layer.weights[i][j] * dz,
      0
    )
  );

  return { dWeights, dBiases, dInputs };
}
```

---

## 4. Backpropagation complete

### Algorithme pas a pas

```
Backpropagation — algorithme :

1. Forward pass : calculer toutes les sorties couche par couche
2. Calculer la loss (erreur)
3. Calculer le gradient de la loss par rapport a la sortie
4. Pour chaque couche (de la derniere a la premiere) :
   a. Calculer les gradients des poids et biais
   b. Propager le gradient vers la couche precedente
5. Mettre a jour tous les poids : w = w - lr * gradient
```

```
Backpropagation — flux des donnees :

  FORWARD (gauche → droite) :
  ┌─────┐    ┌─────┐    ┌─────┐    ┌──────┐
  │Input│───→│ H₁  │───→│ H₂  │───→│Output│───→ Loss
  └─────┘    └─────┘    └─────┘    └──────┘

  BACKWARD (droite → gauche) :
  ┌─────┐    ┌─────┐    ┌─────┐    ┌──────┐
  │Input│←───│ H₁  │←───│ H₂  │←───│Output│←─── ∂Loss
  └─────┘    └─────┘    └─────┘    └──────┘
  (on met a jour les poids de chaque couche en passant)
```

---

## 5. MLP complet en TypeScript

### La classe NeuralNetwork

```typescript
class NeuralNetwork {
  layers: DenseLayer[];

  constructor(layerSizes: number[], activation: 'sigmoid' | 'relu' = 'sigmoid') {
    this.layers = [];
    for (let i = 0; i < layerSizes.length - 1; i++) {
      const isLastLayer = i === layerSizes.length - 2;
      this.layers.push(
        new DenseLayer(
          layerSizes[i],
          layerSizes[i + 1],
          isLastLayer ? 'sigmoid' : activation
        )
      );
    }
  }

  // Forward pass a travers toutes les couches
  forward(input: Vector): Vector {
    let current = input;
    for (const layer of this.layers) {
      current = layer.forward(current);
    }
    return current;
  }

  // Backward pass a travers toutes les couches
  backward(dOutput: Vector, learningRate: number): void {
    let currentGradient = dOutput;

    // Parcours inverse des couches
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      const grads = backwardDenseLayer(layer, currentGradient);

      // Mise a jour des poids et biais
      for (let r = 0; r < layer.weights.length; r++) {
        for (let c = 0; c < layer.weights[r].length; c++) {
          layer.weights[r][c] -= learningRate * grads.dWeights[r][c];
        }
        layer.biases[r] -= learningRate * grads.dBiases[r];
      }

      // Propager le gradient vers la couche precedente
      currentGradient = grads.dInputs;
    }
  }
}
```

### Visualisation de l'architecture

```
NeuralNetwork([2, 4, 4, 1])

Couche 0       Couche 1       Couche 2       Couche 3
(entree)       (cachee 1)     (cachee 2)     (sortie)
2 neurones     4 neurones     4 neurones     1 neurone

   ○             ○              ○
                 ○              ○
   ○             ○              ○              ○
                 ○              ○

Poids :   2×4=8       4×4=16       4×1=4    = 28 poids
Biais :     4            4           1       = 9 biais
                                    Total    = 37 parametres
```

---

## 6. Training Loop

### La boucle d'entrainement

```typescript
interface TrainingConfig {
  learningRate: number;
  epochs: number;
  batchSize?: number;       // si undefined, full batch
  logEvery?: number;        // afficher les stats toutes les N epochs
}

interface TrainingResult {
  lossHistory: number[];
  accuracyHistory: number[];
  finalLoss: number;
  finalAccuracy: number;
}

function train(
  network: NeuralNetwork,
  data: Array<{ input: Vector; target: Vector }>,
  config: TrainingConfig
): TrainingResult {
  const { learningRate, epochs, logEvery = 100 } = config;
  const lossHistory: number[] = [];
  const accuracyHistory: number[] = [];

  for (let epoch = 0; epoch < epochs; epoch++) {
    let totalLoss = 0;
    let correct = 0;

    // Melanger les donnees a chaque epoch
    const shuffled = [...data].sort(() => Math.random() - 0.5);

    for (const { input, target } of shuffled) {
      // 1. Forward pass
      const output = network.forward(input);

      // 2. Calculer la loss (MSE pour simplifier)
      const loss = mseLoss(output, target);
      totalLoss += loss;

      // Accuracy (pour classification binaire)
      const predicted = output[0] > 0.5 ? 1 : 0;
      if (predicted === target[0]) correct++;

      // 3. Gradient de la loss par rapport a la sortie
      // dMSE/dOutput = 2/n * (output - target)
      const dOutput = output.map(
        (o, i) => (2 / output.length) * (o - target[i])
      );

      // 4. Backward pass + mise a jour
      network.backward(dOutput, learningRate);
    }

    const avgLoss = totalLoss / data.length;
    const accuracy = correct / data.length;
    lossHistory.push(avgLoss);
    accuracyHistory.push(accuracy);

    if (epoch % logEvery === 0) {
      console.log(
        `Epoch ${epoch.toString().padStart(5)}: ` +
        `loss = ${avgLoss.toFixed(6)}, ` +
        `accuracy = ${(accuracy * 100).toFixed(1)}%`
      );
    }
  }

  return {
    lossHistory,
    accuracyHistory,
    finalLoss: lossHistory[lossHistory.length - 1],
    finalAccuracy: accuracyHistory[accuracyHistory.length - 1],
  };
}
```

### Hyperparametres importants

| Hyperparametre | Role | Valeur typique | Effet si trop grand | Effet si trop petit |
|---------------|------|---------------|---------------------|---------------------|
| Learning rate | Taille du pas de gradient | 0.001 - 0.1 | Divergence | Convergence lente |
| Epochs | Nombre de passages sur les donnees | 100 - 10000 | Overfitting | Underfitting |
| Batch size | Exemples par mise a jour | 16 - 128 | Generalisation instable | Lent, RAM++ |
| Couches cachees | Profondeur du reseau | 1 - 5 | Overfitting, lent | Capacite limitee |
| Neurones/couche | Largeur du reseau | 4 - 256 | Overfitting, lent | Capacite limitee |

### Visualiser l'apprentissage

```
Loss qui diminue (bon signe) :

  Loss
  2.0 │ *
      │  *
  1.5 │   *
      │    **
  1.0 │      ***
      │         ****
  0.5 │             *****
      │                  **********
  0.1 │                           ********
      └──────────────────────────────────── Epochs
      0    200   400   600   800  1000


Accuracy qui monte (bon signe) :

  Accuracy
  100%│                              ********
   90%│                         *****
   80%│                    *****
   70%│               ****
   60%│           ****
   50%│      ****
   40%│   ***
   30%│  *
      └──────────────────────────────────── Epochs
```

---

## 7. Le probleme XOR — Demonstration

### XOR : impossible pour un perceptron, trivial pour un MLP

```typescript
// --- Resolution du XOR avec un MLP ---
function solveXOR(): void {
  // Architecture : 2 entrees → 4 neurones caches → 1 sortie
  const network = new NeuralNetwork([2, 4, 1], 'sigmoid');

  const xorData = [
    { input: [0, 0], target: [0] },
    { input: [0, 1], target: [1] },
    { input: [1, 0], target: [1] },
    { input: [1, 1], target: [0] },
  ];

  const result = train(network, xorData, {
    learningRate: 0.5,
    epochs: 5000,
    logEvery: 1000,
  });

  console.log('\nResultats XOR:');
  for (const { input, target } of xorData) {
    const output = network.forward(input);
    console.log(
      `  ${input} → ${output[0].toFixed(3)} ` +
      `(attendu: ${target[0]}, ` +
      `predit: ${output[0] > 0.5 ? 1 : 0}) ` +
      `${Math.round(output[0]) === target[0] ? '✓' : '✗'}`
    );
  }

  console.log(`\nLoss finale: ${result.finalLoss.toFixed(6)}`);
  console.log(`Accuracy: ${(result.finalAccuracy * 100).toFixed(1)}%`);
}

solveXOR();
// Epoch     0: loss = 0.251203, accuracy = 50.0%
// Epoch  1000: loss = 0.061842, accuracy = 75.0%
// Epoch  2000: loss = 0.008234, accuracy = 100.0%
// Epoch  3000: loss = 0.003102, accuracy = 100.0%
// Epoch  4000: loss = 0.001687, accuracy = 100.0%
//
// Resultats XOR:
//   [0,0] → 0.032 (attendu: 0, predit: 0) ✓
//   [0,1] → 0.971 (attendu: 1, predit: 1) ✓
//   [1,0] → 0.968 (attendu: 1, predit: 1) ✓
//   [1,1] → 0.041 (attendu: 0, predit: 0) ✓
```

### Comment la couche cachee resout XOR

```
Ce que la couche cachee apprend :

Espace d'entree (2D)          Espace cache (4D, projete en 2D)

  x₂                           h₂
   │  ●(0,1)    ○(1,1)          │     ●          ●
   │                             │
   │  ○(0,0)    ●(1,0)          │  ○                ○
   └──────────── x₁             └────────────────── h₁

  Pas lineairement               Lineairement separable !
  separable                       La couche cachee a "deplie"
                                  l'espace pour que les classes
                                  deviennent separables.
```

> Analogie : imaginez que les donnees XOR sont des points sur une feuille de papier. Impossible de les separer avec un trait droit. Mais si vous pliez la feuille dans l'espace 3D, vous pouvez passer un plan entre les deux classes. C'est exactement ce que fait la couche cachee : elle "plie" l'espace des donnees.

---

## 8. Un exemple plus complet : classification de cercles

```typescript
// --- Generer des donnees en cercles concentriques ---
function generateCircleData(
  n: number
): Array<{ input: Vector; target: Vector }> {
  const data: Array<{ input: Vector; target: Vector }> = [];

  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2;
    const isInner = i < n / 2;

    // Rayon : petit pour classe 0, grand pour classe 1
    const radius = isInner
      ? Math.random() * 0.5
      : 0.7 + Math.random() * 0.3;

    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    data.push({
      input: [x, y],
      target: [isInner ? 0 : 1],
    });
  }

  return data;
}

// --- Entrainement ---
function classifyCircles(): void {
  const network = new NeuralNetwork([2, 8, 4, 1], 'sigmoid');
  const trainData = generateCircleData(200);
  const testData = generateCircleData(50);

  // Entrainement
  const result = train(network, trainData, {
    learningRate: 0.3,
    epochs: 2000,
    logEvery: 500,
  });

  // Evaluation sur les donnees de test
  let testCorrect = 0;
  for (const { input, target } of testData) {
    const output = network.forward(input);
    const predicted = output[0] > 0.5 ? 1 : 0;
    if (predicted === target[0]) testCorrect++;
  }
  const testAccuracy = testCorrect / testData.length;

  console.log(`\nAccuracy train: ${(result.finalAccuracy * 100).toFixed(1)}%`);
  console.log(`Accuracy test:  ${(testAccuracy * 100).toFixed(1)}%`);
}
```

```
Classification de cercles concentriques :

         ○ ○ ○ ○                    Apres entrainement :
       ○ ○ ○ ○ ○ ○
      ○ ○  ● ● ● ○ ○               Le MLP a appris la frontiere
     ○ ○ ● ● ● ● ● ○ ○            non-lineaire (le cercle)
     ○ ○ ● ●   ● ● ○ ○            qui separe les deux classes.
     ○ ○ ● ● ● ● ● ○ ○
      ○ ○  ● ● ● ○ ○               ● = classe interieure
       ○ ○ ○ ○ ○ ○                 ○ = classe exterieure
         ○ ○ ○ ○
```

---

## 9. Overfitting vs Underfitting

### Le compromis biais-variance

```
Underfitting              Bon fit                Overfitting
(trop simple)            (juste bien)            (trop complexe)

   ○  ○                    ○  ○                    ○  ○
 ○  ___  ○               ○ /  \ ○                ○/~\/\○
○  /   \  ○             ○ /    \ ○              ○/ /\ \\ ○
  |     |               ─/──────\─             ~/\/  \/\\~
○  \___/  ○             ○ \    / ○              ○\ \/ // ○
 ○       ○               ○ \  / ○                ○\~/\/ ○
   ○  ○                    ○  ○                    ○  ○

Biais eleve              Equilibre             Variance elevee
Variance faible                                 Biais faible

Le modele est trop      Le modele capture       Le modele a memorise
simple pour capturer    la vraie structure      le bruit des donnees
la structure.           des donnees.            d'entrainement.
```

### Comment detecter l'overfitting

```typescript
// --- Split train/test ---
function splitData<T>(data: T[], ratio: number = 0.8): { train: T[]; test: T[] } {
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  const splitIndex = Math.floor(shuffled.length * ratio);
  return {
    train: shuffled.slice(0, splitIndex),
    test: shuffled.slice(splitIndex),
  };
}

// --- Evaluer sur train ET test a chaque epoch ---
function trainWithValidation(
  network: NeuralNetwork,
  trainData: Array<{ input: Vector; target: Vector }>,
  testData: Array<{ input: Vector; target: Vector }>,
  config: TrainingConfig
): void {
  const { learningRate, epochs, logEvery = 100 } = config;

  for (let epoch = 0; epoch < epochs; epoch++) {
    // Entrainement
    let trainLoss = 0;
    for (const { input, target } of trainData) {
      const output = network.forward(input);
      trainLoss += mseLoss(output, target);
      const dOutput = output.map((o, i) => (2 / output.length) * (o - target[i]));
      network.backward(dOutput, learningRate);
    }
    trainLoss /= trainData.length;

    // Validation (PAS de backward !)
    let testLoss = 0;
    for (const { input, target } of testData) {
      const output = network.forward(input);
      testLoss += mseLoss(output, target);
    }
    testLoss /= testData.length;

    if (epoch % logEvery === 0) {
      console.log(
        `Epoch ${epoch}: train_loss = ${trainLoss.toFixed(4)}, ` +
        `test_loss = ${testLoss.toFixed(4)} ` +
        `${testLoss > trainLoss * 1.5 ? '⚠ OVERFITTING' : ''}`
      );
    }
  }
}
```

```
Detection de l'overfitting — les deux courbes :

  Loss
      │ \
      │  \  train_loss
      │   \___________      ← train continue a descendre
      │     ___________
      │    /            ← test_loss commence a MONTER
      │   /
      │  /  test_loss
      │
      └────────────────── Epochs
              ^
              |
       Point optimal : arreter ici !
       (early stopping)
```

### Strategies contre l'overfitting

| Strategie | Comment ca marche | Quand l'utiliser |
|-----------|-------------------|-----------------|
| Plus de donnees | Plus d'exemples = meilleure generalisation | Toujours, si possible |
| Reseau plus petit | Moins de parametres = moins de memorisation | Reseau surdimensionne |
| Early stopping | Arreter quand la validation loss monte | Toujours |
| Dropout | Desactiver aleatoirement des neurones | Reseaux profonds |
| Regularisation L2 | Penaliser les gros poids | Overfitting modere |
| Data augmentation | Transformer les donnees existantes | Images, texte |

### Implementation du dropout

```typescript
// --- Dropout simplifie ---
function applyDropout(layer: Vector, rate: number, training: boolean): Vector {
  if (!training) {
    // En inference, on scale les sorties
    return layer.map((v) => v * (1 - rate));
  }
  // En entrainement, on desactive aleatoirement des neurones
  return layer.map((v) => (Math.random() > rate ? v / (1 - rate) : 0));
}

// Exemple : dropout a 50%
const hidden: Vector = [0.5, -0.3, 0.8, 0.1, -0.6, 0.9];

// Entrainement : certains neurones a zero
console.log(applyDropout(hidden, 0.5, true));
// → [1.0, 0, 1.6, 0, -1.2, 0]  (aleatoire)

// Inference : tous les neurones, scales
console.log(applyDropout(hidden, 0.5, false));
// → [0.25, -0.15, 0.4, 0.05, -0.3, 0.45]
```

---

## 10. Du MLP au Deep Learning

### Pourquoi les couches profondes marchent mieux

```
Reseau peu profond (wide) :     Reseau profond (deep) :

     Couche 1 (256 neurones)         Couche 1 (32)
           ↓                              ↓
     Couche 2 (sortie)               Couche 2 (32)
                                          ↓
     Total : ~65K params             Couche 3 (32)
     Apprend : motifs simples             ↓
                                     Couche 4 (32)
                                          ↓
                                     Couche 5 (sortie)

                                     Total : ~4K params
                                     Apprend : hierarchie de motifs
```

Les couches profondes apprennent des **representations hierarchiques** :

```
Couche 1 : detecte des motifs basiques  (bords, coins)
Couche 2 : combine les motifs           (formes, textures)
Couche 3 : detecte des objets           (yeux, nez, bouche)
Couche 4 : reconnait des concepts       (visage, chat, voiture)
```

> Analogie : c'est comme le systeme visuel humain. La retine detecte des contrastes locaux. Le cortex visuel primaire detecte des bords. Les zones superieures reconnaissent des objets entiers. Chaque niveau abstrait un peu plus.

### Les innovations qui ont rendu le deep learning possible

| Innovation | Annee | Probleme resolu |
|-----------|-------|----------------|
| ReLU | 2010 | Vanishing gradient |
| Dropout | 2012 | Overfitting |
| Batch Normalization | 2015 | Entrainement instable |
| Residual connections (ResNet) | 2015 | Degradation avec la profondeur |
| Transformer (attention) | 2017 | Sequences longues, parallelisation |
| Layer Normalization | 2016 | Stabilite dans les transformers |

---

## Recapitulatif

### Ce qu'on a construit

```
De zero, en TypeScript pur :

1. Perceptron        → un neurone unique
2. DenseLayer        → une couche de neurones
3. Forward pass      → propagation des signaux
4. Backward pass     → calcul des gradients (chain rule)
5. NeuralNetwork     → assemblage de couches
6. Training loop     → epochs, loss, accuracy
7. XOR solver        → preuve que les couches cachees marchent
8. Overfitting tools → split, validation, dropout
```

### L'essentiel en un tableau

| Concept | Definition concise |
|---------|-------------------|
| Perceptron | y = activation(W·X + b) |
| Forward pass | Calcul de la sortie couche par couche |
| Loss | Mesure de l'erreur (MSE, cross-entropy) |
| Backward pass | Calcul des gradients couche par couche |
| Chain rule | ∂L/∂w = produit des derivees le long du chemin |
| Learning rate | Taille du pas de mise a jour |
| Epoch | Un passage complet sur toutes les donnees |
| Overfitting | Le modele memorise au lieu de generaliser |
| Dropout | Desactive des neurones aleatoirement |
| Deep learning | Beaucoup de couches = representations hierarchiques |

### Exercices

1. **Modifier le XOR** : essayer avec 2, 8, et 16 neurones caches. Observer l'impact sur la vitesse de convergence.
2. **Implementer Adam** : remplacer la descente de gradient simple par l'optimiseur Adam (momentum + RMSprop).
3. **Early stopping** : ajouter un mecanisme qui arrete l'entrainement quand la validation loss remonte pendant 10 epochs.
4. **Classifier des spirales** : generer des donnees en forme de spirale (plus difficile que les cercles) et trouver l'architecture minimale qui resout le probleme.
5. **Benchmark** : mesurer le temps d'entrainement pour differentes tailles de reseau et tracer un graphe.

---

*Prochain module : [09 — Architecture Transformer](./09-transformer-attention.md)*
