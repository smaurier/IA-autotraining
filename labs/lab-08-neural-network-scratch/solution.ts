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
// Implementations
// ============================================================

function createNeuron(inputSize: number): Neuron {
  const weights: number[] = [];
  for (let i = 0; i < inputSize; i++) {
    weights.push(Math.random() * 2 - 1);
  }
  return { weights, bias: 0 };
}

function forwardNeuron(neuron: Neuron, inputs: number[], activation: (x: number) => number): number {
  let sum = neuron.bias;
  for (let i = 0; i < neuron.weights.length; i++) {
    sum += neuron.weights[i] * inputs[i];
  }
  return activation(sum);
}

function createLayer(inputSize: number, outputSize: number): Neuron[] {
  const layer: Neuron[] = [];
  for (let i = 0; i < outputSize; i++) {
    layer.push(createNeuron(inputSize));
  }
  return layer;
}

function forwardLayer(layer: Neuron[], inputs: number[], activation: (x: number) => number): number[] {
  return layer.map((neuron) => forwardNeuron(neuron, inputs, activation));
}

function calculateMSE(predicted: number[], actual: number[]): number {
  let sum = 0;
  for (let i = 0; i < predicted.length; i++) {
    const diff = predicted[i] - actual[i];
    sum += diff * diff;
  }
  return sum / predicted.length;
}

function backpropagateOutput(
  predicted: number,
  actual: number,
  inputs: number[],
  lr: number,
  neuron: Neuron,
): void {
  const error = predicted - actual;
  const delta = error * predicted * (1 - predicted);
  for (let i = 0; i < neuron.weights.length; i++) {
    neuron.weights[i] -= lr * delta * inputs[i];
  }
  neuron.bias -= lr * delta;
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
        const hiddenOut = forwardLayer(hidden, sample.input, sigmoid);
        const pred = forwardNeuron(output[0], hiddenOut, sigmoid);

        backpropagateOutput(pred, sample.target, hiddenOut, lr, output[0]);

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

    for (const sample of xorData) {
      const hiddenOut = forwardLayer(hidden, sample.input, sigmoid);
      const pred = forwardNeuron(output[0], hiddenOut, sigmoid);
      const diff = Math.abs(pred - sample.target);
      expect(diff).toBeLessThan(0.3);
    }
  });
});

run();
