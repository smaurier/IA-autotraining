import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 08 — Neural Network from Scratch');

// ============================================================
// Types
// ============================================================

interface Neuron {
  weights: number[];
  bias: number;
}

// ============================================================
// TODO: Implementez les fonctions ci-dessous
// ============================================================

function createNeuron(_inputSize: number): Neuron {
  // TODO: Creer un neurone avec poids aleatoires [-1, 1] et bias a 0
  throw new Error('TODO: Not implemented');
}

function forwardNeuron(_neuron: Neuron, _inputs: number[], _activation: (x: number) => number): number {
  // TODO: activation(sum(w[i]*inputs[i]) + bias)
  throw new Error('TODO: Not implemented');
}

function createLayer(_inputSize: number, _outputSize: number): Neuron[] {
  // TODO: Creer outputSize neurones avec inputSize entrees
  throw new Error('TODO: Not implemented');
}

function forwardLayer(_layer: Neuron[], _inputs: number[], _activation: (x: number) => number): number[] {
  // TODO: Calculer la sortie de chaque neurone
  throw new Error('TODO: Not implemented');
}

function calculateMSE(_predicted: number[], _actual: number[]): number {
  // TODO: (1/n) * sum((predicted[i] - actual[i])^2)
  throw new Error('TODO: Not implemented');
}

function backpropagateOutput(
  _predicted: number,
  _actual: number,
  _inputs: number[],
  _lr: number,
  _neuron: Neuron,
): void {
  // TODO: Mettre a jour weights et bias du neurone de sortie
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Tests
// ============================================================

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

describe('createNeuron', () => {
  it('devrait creer un neurone avec le bon nombre de poids', () => {
    const neuron = createNeuron(3);
    expect(neuron.weights.length).toBe(3);
    expect(neuron.bias).toBe(0);
  });

  it('devrait avoir des poids entre -1 et 1', () => {
    const neuron = createNeuron(10);
    for (const w of neuron.weights) {
      expect(w).toBeGreaterThanOrEqual(-1);
      expect(w).toBeLessThanOrEqual(1);
    }
  });
});

describe('forwardNeuron', () => {
  it('devrait calculer la sortie avec sigmoid', () => {
    const neuron: Neuron = { weights: [0.5, -0.5], bias: 0 };
    const output = forwardNeuron(neuron, [1, 1], sigmoid);
    expect(output).toBeCloseTo(0.5, 2);
  });

  it('devrait appliquer le biais', () => {
    const neuron: Neuron = { weights: [0], bias: 10 };
    const output = forwardNeuron(neuron, [0], sigmoid);
    expect(output).toBeGreaterThan(0.99);
  });
});

describe('createLayer', () => {
  it('devrait creer le bon nombre de neurones', () => {
    const layer = createLayer(3, 4);
    expect(layer.length).toBe(4);
    expect(layer[0].weights.length).toBe(3);
  });
});

describe('forwardLayer', () => {
  it('devrait retourner une sortie par neurone', () => {
    const layer: Neuron[] = [
      { weights: [1, 0], bias: 0 },
      { weights: [0, 1], bias: 0 },
    ];
    const output = forwardLayer(layer, [1, 0], sigmoid);
    expect(output.length).toBe(2);
    expect(output[0]).toBeGreaterThan(0.5);
    expect(output[1]).toBeCloseTo(0.5, 2);
  });
});

describe('calculateMSE', () => {
  it('devrait retourner 0 pour des predictions parfaites', () => {
    expect(calculateMSE([1, 0, 1], [1, 0, 1])).toBe(0);
  });

  it('devrait calculer correctement l\'erreur', () => {
    expect(calculateMSE([1, 0], [0, 1])).toBeCloseTo(1, 5);
  });
});

describe('backpropagateOutput', () => {
  it('devrait modifier les poids du neurone', () => {
    const neuron: Neuron = { weights: [0.5, 0.3], bias: 0.1 };
    const oldW0 = neuron.weights[0];
    // predicted < actual => error < 0 => weights should increase
    backpropagateOutput(0.8, 1.0, [1, 0.5], 0.5, neuron);
    expect(neuron.weights[0]).toBeGreaterThan(oldW0);
  });

  it('devrait ne pas changer les poids si prediction = actual', () => {
    const neuron: Neuron = { weights: [0.5], bias: 0.1 };
    backpropagateOutput(1.0, 1.0, [1], 0.5, neuron);
    expect(neuron.weights[0]).toBeCloseTo(0.5, 5);
  });
});

describe('trainXOR', () => {
  it('devrait approximer XOR apres entrainement', () => {
    // Petit reseau 2 -> 4 -> 1
    const hidden = createLayer(2, 4);
    const output = createLayer(4, 1);

    const xorData = [
      { input: [0, 0], target: 0 },
      { input: [0, 1], target: 1 },
      { input: [1, 0], target: 1 },
      { input: [1, 1], target: 0 },
    ];

    const lr = 1.0;
    for (let epoch = 0; epoch < 5000; epoch++) {
      for (const sample of xorData) {
        // Forward
        const hiddenOut = forwardLayer(hidden, sample.input, sigmoid);
        const pred = forwardNeuron(output[0], hiddenOut, sigmoid);

        // Backprop output
        backpropagateOutput(pred, sample.target, hiddenOut, lr, output[0]);

        // Backprop hidden (simplified: update each hidden neuron towards reducing error)
        const outError = pred - sample.target;
        const outDelta = outError * pred * (1 - pred);
        for (let h = 0; h < hidden.length; h++) {
          const hOut = hiddenOut[h];
          const hDelta = outDelta * output[0].weights[h] * hOut * (1 - hOut);
          for (let i = 0; i < hidden[h].weights.length; i++) {
            hidden[h].weights[i] -= lr * hDelta * sample.input[i];
          }
          hidden[h].bias -= lr * hDelta;
        }
      }
    }

    // Verifier les sorties
    for (const sample of xorData) {
      const hiddenOut = forwardLayer(hidden, sample.input, sigmoid);
      const pred = forwardNeuron(output[0], hiddenOut, sigmoid);
      const diff = Math.abs(pred - sample.target);
      expect(diff).toBeLessThan(0.3);
    }
  });
});

run();
