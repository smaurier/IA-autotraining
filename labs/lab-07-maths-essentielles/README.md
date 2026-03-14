# Lab 07 — Maths Essentielles pour l'IA

## Objectifs

- Manipuler des vecteurs et des matrices
- Implementer des fonctions d'activation (sigmoid, ReLU, softmax)
- Calculer une loss function (cross-entropy)
- Comprendre la descente de gradient

## Exercices

### 1. `dotProduct(a: number[], b: number[]): number`

Calcule le produit scalaire de deux vecteurs de meme dimension.

### 2. `vectorAdd(a: number[], b: number[]): number[]`

Additionne deux vecteurs element par element.

### 3. `vectorNorm(v: number[]): number`

Calcule la norme euclidienne d'un vecteur : `sqrt(sum(v[i]^2))`.

### 4. `matrixMultiply(a: number[][], b: number[][]): number[][]`

Multiplie deux matrices. Le nombre de colonnes de `a` doit etre egal au nombre de lignes de `b`.

### 5. `sigmoid(x: number): number`

Fonction sigmoid : `1 / (1 + e^(-x))`.

### 6. `relu(x: number): number`

Fonction ReLU : `max(0, x)`.

### 7. `softmax(v: number[]): number[]`

Fonction softmax : `e^v[i] / sum(e^v[j])` pour chaque element. Les valeurs de sortie somment a 1.

### 8. `crossEntropyLoss(predicted: number[], actual: number[]): number`

Cross-entropy loss : `-sum(actual[i] * log(predicted[i]))`.

### 9. `gradientDescentStep(weights: number[], gradients: number[], lr: number): number[]`

Met a jour les poids : `w[i] = w[i] - lr * gradients[i]`.

## Lancer les tests

```bash
npx tsx exercise.ts
```
