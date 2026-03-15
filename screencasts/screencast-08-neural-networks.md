# Screencast 08 — Réseaux de Neurones from Scratch

## Informations
- **Duree estimee** : 22-25 min
- **Module** : `modules/08-neural-network-scratch.md`
- **Lab associe** : `labs/lab-08-neural-network/`
- **Prérequis** : Screencast 07 (Maths essentielles)

## Setup
- [ ] Terminal avec le projet lab ouvert
- [ ] Fichiers TypeScript prets : perceptron.ts, dense-layer.ts, network.ts, xor.ts
- [ ] Pas de dépendance externe — tout en TypeScript pur
- [ ] Taille de police suffisante pour voir les traces d'entrainement

## Script

### [00:00-02:30] Introduction — Construire pour comprendre
> Aujourd'hui, on construit un réseau de neurones complet en TypeScript pur. Pas de TensorFlow, pas de PyTorch, pas de brain.js. On code chaque piece du puzzle : du perceptron simple au MLP qui apprend le XOR. Si vous pouvez le coder from scratch, vous le comprenez vraiment.
**Action** : Afficher le plan de construction
```
Ce qu'on va construire :
1. Perceptron       → un neurone unique
2. DenseLayer       → une couche de neurones
3. Forward pass     → propagation des signaux
4. Backward pass    → calcul des gradients (chain rule)
5. NeuralNetwork    → assemblage de couches
6. Training loop    → epochs, loss, accuracy
7. XOR solver       → preuve que les couches cachees marchent
```

### [02:30-06:00] Le Perceptron — Un neurone artificiel
> Le perceptron est le neurone le plus simple : il prend des entrees, les multiplie par des poids, ajoute un biais, et passe le tout dans une fonction d'activation. C'est la formule : y = activation(W·X + b).
**Action** : Afficher le schema et implementer
```
Neurone biologique :              Neurone artificiel :
  dendrites → corps → axone      entrees → somme ponderee → activation → sortie
      x₁ ──→╲                        x₁ ──→╲
      x₂ ──→ ●──→ sortie            x₂ ──→ Σ → f(z) → y
      x₃ ──→╱                        x₃ ──→╱
                                        + biais
```
```typescript
class Perceptron {
  weights: Vector;
  bias: number;

  constructor(inputSize: number) {
    const scale = Math.sqrt(2 / inputSize);
    this.weights = Array.from({ length: inputSize },
      () => (Math.random() * 2 - 1) * scale);
    this.bias = 0;
  }

  forward(inputs: Vector): number {
    const z = this.weights.reduce((sum, w, i) => sum + w * inputs[i], this.bias);
    return 1 / (1 + Math.exp(-z)); // sigmoid
  }
}
```
**Action** : Entrainer un perceptron sur la porte AND
```typescript
// Donnees AND :
// [0,0] → 0, [0,1] → 0, [1,0] → 0, [1,1] → 1

// Apres 1000 epochs avec lr=0.5 :
// [0,0] → 0.012 (attendu: 0)
// [0,1] → 0.089 (attendu: 0)
// [1,0] → 0.089 (attendu: 0)
// [1,1] → 0.921 (attendu: 1)
```
> Ça marche pour AND et OR. Mais pour XOR, c'est impossible avec un seul perceptron. On ne peut pas tracer une seule ligne droite qui separe les classes XOR. Il faut une couche cachee.

### [06:00-10:00] Forward Pass — Propagation des signaux
> Le forward pass, c'est le signal qui traverse le réseau de gauche a droite. Chaque couche transforme le vecteur d'entree via une multiplication matricielle + activation.
**Action** : Afficher l'architecture et implementer DenseLayer
```
Couche d'entree    Couche cachee    Couche de sortie
  (2 neurones)     (4 neurones)      (1 neurone)

     x₁ ──────→ h₁ ──┐
      │╲       ╱│╲     ╲
      │ ╲     ╱ │ ╲     → y
      │  ╲   ╱  │  ╲   ╱
     x₂ ──────→ h₄ ──┘

  Poids : 2×4 + 4×1 = 12 poids + 5 biais = 17 parametres
```
```typescript
class DenseLayer {
  weights: Matrix;    // [outputSize × inputSize]
  biases: Vector;
  activation: 'sigmoid' | 'relu' | 'none';
  state: LayerState | null = null;

  constructor(inputSize: number, outputSize: number, activation = 'sigmoid') {
    const scale = Math.sqrt(2 / (inputSize + outputSize));
    this.weights = Array.from({ length: outputSize }, () =>
      Array.from({ length: inputSize }, () => (Math.random() * 2 - 1) * scale));
    this.biases = new Array(outputSize).fill(0);
    this.activation = activation;
  }

  forward(inputs: Vector): Vector {
    const preActivation = this.weights.map((row, i) =>
      dotProduct(row, inputs) + this.biases[i]);
    const outputs = preActivation.map(z => {
      if (this.activation === 'sigmoid') return sigmoid(z);
      if (this.activation === 'relu') return relu(z);
      return z;
    });
    this.state = { inputs, preActivation, outputs }; // Pour le backward
    return outputs;
  }
}
```
> Le forward pass, c'est comme un signal electrique dans un circuit. Il entre par les capteurs, traverse des composants qui le transforment, et sort par l'afficheur. Chaque composant amplifie ou attenue le signal selon ses reglages — les poids.

### [10:00-14:00] Backward Pass — Backpropagation
> Maintenant la magie : la backpropagation. L'erreur de sortie se propage en arriere a travers chaque couche, et chaque couche apprend combien elle a contribue a l'erreur. C'est la chain rule : la derivee d'une composition de fonctions est le produit des derivees.
**Action** : Afficher le schema et implementer
```
FORWARD (gauche → droite) :
  Input ───→ H₁ ───→ H₂ ───→ Output ───→ Loss

BACKWARD (droite → gauche) :
  Input ←─── H₁ ←─── H₂ ←─── Output ←─── ∂Loss
  (on met a jour les poids de chaque couche en passant)
```
```typescript
function backwardDenseLayer(layer: DenseLayer, dOutput: Vector): LayerGradients {
  const state = layer.state!;

  // 1. Gradient a travers l'activation
  const dPreActivation = state.preActivation.map((z, i) => {
    const deriv = layer.activation === 'sigmoid'
      ? sigmoid(z) * (1 - sigmoid(z))
      : z > 0 ? 1 : 0; // relu
    return dOutput[i] * deriv;
  });

  // 2. Gradient des poids : dW = dZ × inputs^T
  const dWeights = dPreActivation.map(dz => state.inputs.map(inp => dz * inp));

  // 3. Gradient des biais : dB = dZ
  const dBiases = [...dPreActivation];

  // 4. Gradient des entrees (a propager) : dX = W^T × dZ
  const dInputs = state.inputs.map((_, j) =>
    dPreActivation.reduce((sum, dz, i) => sum + layer.weights[i][j] * dz, 0));

  return { dWeights, dBiases, dInputs };
}
```
> Comme une chaine de dominos : l'erreur de sortie fait tomber l'avant-dernier domino, qui fait tomber celui d'avant. Chaque couche recoit son bout de responsabilite.

### [14:00-17:30] Le MLP complet et la boucle d'entrainement
> On assemble tout : un réseau multi-couches avec forward, backward et mise a jour des poids.
**Action** : Montrer la classe NeuralNetwork
```typescript
class NeuralNetwork {
  layers: DenseLayer[];

  constructor(layerSizes: number[], activation = 'sigmoid') {
    this.layers = [];
    for (let i = 0; i < layerSizes.length - 1; i++) {
      const isLast = i === layerSizes.length - 2;
      this.layers.push(new DenseLayer(layerSizes[i], layerSizes[i + 1],
        isLast ? 'sigmoid' : activation));
    }
  }

  forward(input: Vector): Vector {
    let current = input;
    for (const layer of this.layers) current = layer.forward(current);
    return current;
  }

  backward(dOutput: Vector, learningRate: number): void {
    let grad = dOutput;
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const grads = backwardDenseLayer(this.layers[i], grad);
      // Mise a jour des poids
      for (let r = 0; r < this.layers[i].weights.length; r++) {
        for (let c = 0; c < this.layers[i].weights[r].length; c++) {
          this.layers[i].weights[r][c] -= learningRate * grads.dWeights[r][c];
        }
        this.layers[i].biases[r] -= learningRate * grads.dBiases[r];
      }
      grad = grads.dInputs;
    }
  }
}
```
**Action** : Montrer la boucle d'entrainement avec logs
```typescript
for (let epoch = 0; epoch < epochs; epoch++) {
  let totalLoss = 0, correct = 0;
  for (const { input, target } of data) {
    const output = network.forward(input);
    totalLoss += mseLoss(output, target);
    if ((output[0] > 0.5 ? 1 : 0) === target[0]) correct++;
    const dOutput = output.map((o, i) => (2 / output.length) * (o - target[i]));
    network.backward(dOutput, learningRate);
  }
  // Epoch 0: loss = 0.251, accuracy = 50.0%
  // Epoch 1000: loss = 0.061, accuracy = 75.0%
  // Epoch 5000: loss = 0.001, accuracy = 100.0%
}
```

### [17:30-20:30] Le problème XOR — La preuve par le code
> Le moment de verite : le XOR. Impossible pour un perceptron, trivial pour un MLP avec une couche cachee.
**Action** : Exécuter le XOR solver en live
```typescript
const network = new NeuralNetwork([2, 4, 1], 'sigmoid');

const xorData = [
  { input: [0, 0], target: [0] },
  { input: [0, 1], target: [1] },
  { input: [1, 0], target: [1] },
  { input: [1, 1], target: [0] },
];

// Entrainement : 5000 epochs, lr = 0.5
// Resultats :
//   [0,0] → 0.032 (attendu: 0) ✓
//   [0,1] → 0.971 (attendu: 1) ✓
//   [1,0] → 0.968 (attendu: 1) ✓
//   [1,1] → 0.041 (attendu: 0) ✓
```
**Action** : Expliquer comment la couche cachee resout XOR
```
Espace d'entree (2D)          Espace cache (projete)
  x₂                           h₂
   │  ●(0,1)    ○(1,1)          │     ●          ●
   │                             │
   │  ○(0,0)    ●(1,0)          │  ○                ○
   └──────────── x₁             └──────────────── h₁

  Pas lineairement               Lineairement separable !
  separable                       La couche cachee a "deplie" l'espace.
```
> Imaginez les donnees sur une feuille de papier. Impossible de les separer avec un trait droit. Mais si vous pliez la feuille dans l'espace 3D, vous pouvez passer un plan entre les classes. C'est exactement ce que fait la couche cachee : elle deplie l'espace.

### [20:30-23:00] Overfitting vs Underfitting
> Un réseau qui marche sur les donnees d'entrainement mais pas sur de nouvelles donnees, c'est de l'overfitting. Il a memorise au lieu de generaliser.
**Action** : Afficher le schema
```
Underfitting              Bon fit                Overfitting
(trop simple)            (juste bien)            (trop complexe)

Biais eleve              Equilibre              Variance elevee
Le modele ne capture     Le modele capture       Le modele a memorise
pas la structure.        la vraie structure.     le bruit.
```
**Action** : Montrer la detection d'overfitting
```
Detection : quand la train_loss descend mais la test_loss remonte.

  Loss
      │ \  train_loss
      │  \___________      ← continue a descendre
      │     ___________
      │    /            ← test_loss MONTE → overfitting !
      │   /  test_loss
      └────────────────── Epochs
              ^
       Arreter ici (early stopping)
```
**Action** : Montrer le dropout
```typescript
function applyDropout(layer: Vector, rate: number, training: boolean): Vector {
  if (!training) return layer.map(v => v * (1 - rate));
  return layer.map(v => (Math.random() > rate ? v / (1 - rate) : 0));
}
// En entrainement : desactive 50% des neurones aleatoirement
// En inference : utilise tous les neurones, scales
```

### [23:00-25:00] Récapitulatif
> On a construit un réseau de neurones complet from scratch en TypeScript. Du perceptron au MLP, du forward pass à la backpropagation, de la boucle d'entrainement à la résolution du XOR.
**Action** : Afficher le résumé
```
Ce qu'on a construit en TypeScript pur :
1. Perceptron        → y = activation(W·X + b)
2. DenseLayer        → une couche complete
3. Forward pass      → calcul de la sortie
4. Backward pass     → gradients via chain rule
5. NeuralNetwork     → assemblage de couches
6. Training loop     → epochs, loss, accuracy
7. XOR solver        → couches cachees = pouvoir
8. Overfitting tools → split, validation, dropout

Prochain module : l'architecture Transformer — le modele derriere GPT et Claude.
```

## Points d'attention pour l'enregistrement
- Exécuter le XOR en live — c'est le moment "wow" du screencast
- Montrer les epochs qui defilent avec la loss qui diminue
- Ne pas aller trop vite sur la backpropagation — c'est le concept le plus difficile
- Faire une pause après chaque section pour laisser assimiler
- Insister sur le fait que c'est du TypeScript pur, zero dépendance
