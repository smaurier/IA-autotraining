import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 09 — Transformer & Attention');

// ============================================================
// TODO: Implementez les fonctions ci-dessous
// ============================================================

function createEmbeddingTable(_vocabSize: number, _dim: number): number[][] {
  // TODO: Creer une table vocabSize x dim avec valeurs aleatoires [-1, 1]
  throw new Error('TODO: Not implemented');
}

function lookupEmbedding(_table: number[][], _tokenId: number): number[] {
  // TODO: Retourner table[tokenId]
  throw new Error('TODO: Not implemented');
}

function positionalEncoding(_position: number, _dim: number): number[] {
  // TODO: sin/cos positional encoding
  throw new Error('TODO: Not implemented');
}

function scaledDotProductAttention(_Q: number[][], _K: number[][], _V: number[][]): number[][] {
  // TODO: QK^T / sqrt(dk) -> softmax rows -> * V
  throw new Error('TODO: Not implemented');
}

function layerNorm(_v: number[]): number[] {
  // TODO: (v - mean) / std
  throw new Error('TODO: Not implemented');
}

function simpleTokenize(_text: string): string[] {
  // TODO: Split sur espaces et ponctuation
  throw new Error('TODO: Not implemented');
}

function detokenize(_tokens: string[]): string {
  // TODO: Joindre avec des espaces
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Helpers
// ============================================================

function softmaxRow(v: number[]): number[] {
  const maxVal = Math.max(...v);
  const exps = v.map((x) => Math.exp(x - maxVal));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

// keep softmaxRow available for tests
void softmaxRow;

// ============================================================
// Tests
// ============================================================

describe('createEmbeddingTable', () => {
  it('devrait creer une table de la bonne taille', () => {
    const table = createEmbeddingTable(100, 64);
    expect(table.length).toBe(100);
    expect(table[0].length).toBe(64);
  });

  it('devrait avoir des valeurs entre -1 et 1', () => {
    const table = createEmbeddingTable(10, 8);
    for (const row of table) {
      for (const val of row) {
        expect(val).toBeGreaterThanOrEqual(-1);
        expect(val).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('lookupEmbedding', () => {
  it('devrait retourner le bon vecteur', () => {
    const table = [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]];
    const emb = lookupEmbedding(table, 1);
    expect(emb).toEqual([0.3, 0.4]);
  });
});

describe('positionalEncoding', () => {
  it('devrait retourner un vecteur de la bonne dimension', () => {
    const pe = positionalEncoding(0, 8);
    expect(pe.length).toBe(8);
  });

  it('devrait commencer par sin(0) = 0 pour position 0', () => {
    const pe = positionalEncoding(0, 4);
    expect(pe[0]).toBeCloseTo(0, 5);
  });

  it('devrait avoir cos(0) = 1 aux positions impaires pour position 0', () => {
    const pe = positionalEncoding(0, 4);
    expect(pe[1]).toBeCloseTo(1, 5);
  });
});

describe('scaledDotProductAttention', () => {
  it('devrait retourner une matrice de la bonne taille', () => {
    const Q = [[1, 0], [0, 1]];
    const K = [[1, 0], [0, 1]];
    const V = [[1, 2], [3, 4]];
    const result = scaledDotProductAttention(Q, K, V);
    expect(result.length).toBe(2);
    expect(result[0].length).toBe(2);
  });

  it('devrait donner plus de poids aux cles similaires', () => {
    const Q = [[1, 0]];
    const K = [[1, 0], [0, 1]];
    const V = [[10, 0], [0, 10]];
    const result = scaledDotProductAttention(Q, K, V);
    // Q[0] est plus similaire a K[0], donc result devrait pencher vers V[0]
    expect(result[0][0]).toBeGreaterThan(result[0][1]);
  });
});

describe('layerNorm', () => {
  it('devrait normaliser a mean ~ 0', () => {
    const result = layerNorm([1, 2, 3, 4, 5]);
    const mean = result.reduce((a, b) => a + b, 0) / result.length;
    expect(mean).toBeCloseTo(0, 5);
  });

  it('devrait normaliser a std ~ 1', () => {
    const result = layerNorm([1, 2, 3, 4, 5]);
    const mean = result.reduce((a, b) => a + b, 0) / result.length;
    const variance = result.reduce((sum, x) => sum + (x - mean) ** 2, 0) / result.length;
    expect(Math.sqrt(variance)).toBeCloseTo(1, 1);
  });

  it('devrait retourner des zeros si tous les elements sont identiques', () => {
    const result = layerNorm([5, 5, 5]);
    expect(result).toEqual([0, 0, 0]);
  });
});

describe('simpleTokenize', () => {
  it('devrait separer les mots', () => {
    const tokens = simpleTokenize('Hello world');
    expect(tokens).toEqual(['Hello', 'world']);
  });

  it('devrait separer la ponctuation', () => {
    const tokens = simpleTokenize('Hello, world!');
    expect(tokens).toContain(',');
    expect(tokens).toContain('!');
    expect(tokens).toContain('Hello');
  });
});

describe('detokenize', () => {
  it('devrait joindre les tokens', () => {
    expect(detokenize(['Hello', 'world'])).toBe('Hello world');
  });

  it('devrait gerer un seul token', () => {
    expect(detokenize(['Hello'])).toBe('Hello');
  });
});

run();
