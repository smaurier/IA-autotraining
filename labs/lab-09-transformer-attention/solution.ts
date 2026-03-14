import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 09 — Transformer & Attention');

// ============================================================
// Implementations
// ============================================================

function createEmbeddingTable(vocabSize: number, dim: number): number[][] {
  const table: number[][] = [];
  for (let i = 0; i < vocabSize; i++) {
    const row: number[] = [];
    for (let j = 0; j < dim; j++) {
      row.push(Math.random() * 2 - 1);
    }
    table.push(row);
  }
  return table;
}

function lookupEmbedding(table: number[][], tokenId: number): number[] {
  return table[tokenId];
}

function positionalEncoding(position: number, dim: number): number[] {
  const pe: number[] = [];
  for (let i = 0; i < dim; i++) {
    const divTerm = Math.pow(10000, (2 * Math.floor(i / 2)) / dim);
    if (i % 2 === 0) {
      pe.push(Math.sin(position / divTerm));
    } else {
      pe.push(Math.cos(position / divTerm));
    }
  }
  return pe;
}

function softmaxRow(v: number[]): number[] {
  const maxVal = Math.max(...v);
  const exps = v.map((x) => Math.exp(x - maxVal));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

function scaledDotProductAttention(Q: number[][], K: number[][], V: number[][]): number[][] {
  const dk = K[0].length;
  const scale = Math.sqrt(dk);

  // QK^T: (seqQ x dk) * (dk x seqK) = (seqQ x seqK)
  const scores: number[][] = [];
  for (let i = 0; i < Q.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < K.length; j++) {
      let dot = 0;
      for (let d = 0; d < dk; d++) {
        dot += Q[i][d] * K[j][d];
      }
      row.push(dot / scale);
    }
    scores.push(row);
  }

  // Softmax each row
  const attnWeights = scores.map((row) => softmaxRow(row));

  // attnWeights * V: (seqQ x seqK) * (seqK x dv) = (seqQ x dv)
  const dv = V[0].length;
  const result: number[][] = [];
  for (let i = 0; i < attnWeights.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < dv; j++) {
      let sum = 0;
      for (let k = 0; k < V.length; k++) {
        sum += attnWeights[i][k] * V[k][j];
      }
      row.push(sum);
    }
    result.push(row);
  }

  return result;
}

function layerNorm(v: number[]): number[] {
  const n = v.length;
  const mean = v.reduce((a, b) => a + b, 0) / n;
  const variance = v.reduce((sum, x) => sum + (x - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);

  if (std === 0) {
    return v.map(() => 0);
  }

  return v.map((x) => (x - mean) / std);
}

function simpleTokenize(text: string): string[] {
  // Split on spaces and separate punctuation as individual tokens
  const tokens: string[] = [];
  const regex = /[a-zA-Z0-9]+|[^\s]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    tokens.push(match[0]);
  }
  return tokens;
}

function detokenize(tokens: string[]): string {
  return tokens.join(' ');
}

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
