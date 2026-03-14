# Lab 08 — Neural Network from Scratch

## Objectifs

- Creer des neurones et des couches
- Implementer la propagation avant (forward pass)
- Calculer le Mean Squared Error
- Implementer la retropropagation pour la couche de sortie
- Entrainer un reseau sur le probleme XOR

## Exercices

### 1. `createNeuron(inputSize: number): Neuron`

Cree un neurone avec des poids aleatoires (entre -1 et 1) et un biais a 0.

```typescript
interface Neuron { weights: number[]; bias: number }
```

### 2. `forwardNeuron(neuron: Neuron, inputs: number[], activation: (x: number) => number): number`

Calcule la sortie d'un neurone : `activation(sum(weights[i] * inputs[i]) + bias)`.

### 3. `createLayer(inputSize: number, outputSize: number): Neuron[]`

Cree une couche de `outputSize` neurones, chacun avec `inputSize` entrees.

### 4. `forwardLayer(layer: Neuron[], inputs: number[], activation: Function): number[]`

Calcule la sortie de chaque neurone de la couche.

### 5. `calculateMSE(predicted: number[], actual: number[]): number`

Mean Squared Error : `(1/n) * sum((predicted[i] - actual[i])^2)`.

### 6. `backpropagateOutput(predicted: number, actual: number, inputs: number[], lr: number, neuron: Neuron): void`

Met a jour les poids et le biais d'un neurone de sortie :
- `error = predicted - actual`
- `delta = error * predicted * (1 - predicted)` (derivee de sigmoid)
- `neuron.weights[i] -= lr * delta * inputs[i]`
- `neuron.bias -= lr * delta`

### 7. `trainXOR()`

Entraine un reseau a approximer XOR. Apres entrainement, les sorties doivent etre proches des valeurs attendues (tolerance < 0.3).

## Lancer les tests

```bash
npx tsx exercise.ts
```
