import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 07 — Maths Essentielles');

// ============================================================
// Implementations
// ============================================================

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

function vectorAdd(a: number[], b: number[]): number[] {
  return a.map((val, i) => val + b[i]);
}

function vectorNorm(v: number[]): number {
  return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
}

function matrixMultiply(a: number[][], b: number[][]): number[][] {
  const rows = a.length;
  const cols = b[0].length;
  const inner = b.length;
  const result: number[][] = [];

  for (let i = 0; i < rows; i++) {
    result[i] = [];
    for (let j = 0; j < cols; j++) {
      let sum = 0;
      for (let k = 0; k < inner; k++) {
        sum += a[i][k] * b[k][j];
      }
      result[i][j] = sum;
    }
  }

  return result;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function relu(x: number): number {
  return Math.max(0, x);
}

function softmax(v: number[]): number[] {
  const maxVal = Math.max(...v);
  const exps = v.map((x) => Math.exp(x - maxVal));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

function crossEntropyLoss(predicted: number[], actual: number[]): number {
  let loss = 0;
  for (let i = 0; i < predicted.length; i++) {
    if (actual[i] > 0) {
      loss -= actual[i] * Math.log(predicted[i]);
    }
  }
  return loss;
}

function gradientDescentStep(weights: number[], gradients: number[], lr: number): number[] {
  return weights.map((w, i) => w - lr * gradients[i]);
}

// ============================================================
// Tests
// ============================================================

describe('dotProduct', () => {
  it('devrait calculer le produit scalaire', () => {
    expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(32);
  });

  it('devrait retourner 0 pour des vecteurs orthogonaux', () => {
    expect(dotProduct([1, 0], [0, 1])).toBe(0);
  });
});

describe('vectorAdd', () => {
  it('devrait additionner deux vecteurs', () => {
    expect(vectorAdd([1, 2, 3], [4, 5, 6])).toEqual([5, 7, 9]);
  });

  it('devrait gerer les valeurs negatives', () => {
    expect(vectorAdd([1, -2], [-1, 2])).toEqual([0, 0]);
  });
});

describe('vectorNorm', () => {
  it('devrait calculer la norme d\'un vecteur unitaire', () => {
    expect(vectorNorm([1, 0, 0])).toBeCloseTo(1, 5);
  });

  it('devrait calculer la norme d\'un vecteur quelconque', () => {
    expect(vectorNorm([3, 4])).toBeCloseTo(5, 5);
  });
});

describe('matrixMultiply', () => {
  it('devrait multiplier deux matrices 2x2', () => {
    const a = [[1, 2], [3, 4]];
    const b = [[5, 6], [7, 8]];
    expect(matrixMultiply(a, b)).toEqual([[19, 22], [43, 50]]);
  });

  it('devrait multiplier une matrice 2x3 par 3x1', () => {
    const a = [[1, 2, 3], [4, 5, 6]];
    const b = [[1], [2], [3]];
    expect(matrixMultiply(a, b)).toEqual([[14], [32]]);
  });
});

describe('sigmoid', () => {
  it('devrait retourner 0.5 pour x=0', () => {
    expect(sigmoid(0)).toBeCloseTo(0.5, 5);
  });

  it('devrait approcher 1 pour un grand x positif', () => {
    expect(sigmoid(10)).toBeGreaterThan(0.99);
  });

  it('devrait approcher 0 pour un grand x negatif', () => {
    expect(sigmoid(-10)).toBeLessThan(0.01);
  });
});

describe('relu', () => {
  it('devrait retourner x si x > 0', () => {
    expect(relu(5)).toBe(5);
  });

  it('devrait retourner 0 si x < 0', () => {
    expect(relu(-3)).toBe(0);
  });

  it('devrait retourner 0 si x = 0', () => {
    expect(relu(0)).toBe(0);
  });
});

describe('softmax', () => {
  it('devrait sommer a 1', () => {
    const result = softmax([1, 2, 3]);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('devrait donner des probabilites croissantes pour des valeurs croissantes', () => {
    const result = softmax([1, 2, 3]);
    expect(result[2]).toBeGreaterThan(result[1]);
    expect(result[1]).toBeGreaterThan(result[0]);
  });
});

describe('crossEntropyLoss', () => {
  it('devrait calculer la loss pour une prediction parfaite', () => {
    const loss = crossEntropyLoss([0.99, 0.01], [1, 0]);
    expect(loss).toBeLessThan(0.02);
  });

  it('devrait donner une loss plus elevee pour une mauvaise prediction', () => {
    const good = crossEntropyLoss([0.9, 0.1], [1, 0]);
    const bad = crossEntropyLoss([0.1, 0.9], [1, 0]);
    expect(bad).toBeGreaterThan(good);
  });
});

describe('gradientDescentStep', () => {
  it('devrait mettre a jour les poids', () => {
    const result = gradientDescentStep([1, 2, 3], [0.1, 0.2, 0.3], 0.1);
    expect(result[0]).toBeCloseTo(0.99, 5);
    expect(result[1]).toBeCloseTo(1.98, 5);
    expect(result[2]).toBeCloseTo(2.97, 5);
  });

  it('devrait ne pas changer les poids si lr=0', () => {
    const result = gradientDescentStep([1, 2], [5, 5], 0);
    expect(result).toEqual([1, 2]);
  });
});

run();
