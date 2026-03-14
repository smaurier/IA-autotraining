import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 12 — Tokenization et embeddings');

// ============================================================
// Exercise 1 — simpleBPEStep
// ============================================================

function simpleBPEStep(
  _tokens: string[],
  _pair: [string, string],
  _merged: string,
): string[] {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 2 — cosineSimilarity
// ============================================================

function cosineSimilarity(_a: number[], _b: number[]): number {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 3 — findMostSimilar
// ============================================================

function findMostSimilar(
  _query: number[],
  _corpus: { id: string; vector: number[] }[],
): { id: string; similarity: number } {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 4 — buildIndex
// ============================================================

function buildIndex(
  _docs: { id: string; text: string; vector: number[] }[],
): { id: string; text: string; vector: number[] }[] {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 5 — semanticSearch
// ============================================================

function semanticSearch(
  _queryVector: number[],
  _index: { id: string; text: string; vector: number[] }[],
  _topK: number,
): { id: string; score: number }[] {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 6 — tokenize
// ============================================================

function tokenize(_text: string, _vocab: string[]): string[] {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Tests
// ============================================================

describe('simpleBPEStep', () => {
  it('should merge a pair of tokens', () => {
    const tokens = ['l', 'o', 'w', 'e', 'r'];
    const result = simpleBPEStep(tokens, ['l', 'o'], 'lo');
    expect(result).toEqual(['lo', 'w', 'e', 'r']);
  });

  it('should merge multiple occurrences', () => {
    const tokens = ['a', 'b', 'a', 'b', 'c'];
    const result = simpleBPEStep(tokens, ['a', 'b'], 'ab');
    expect(result).toEqual(['ab', 'ab', 'c']);
  });

  it('should return unchanged tokens if pair not found', () => {
    const tokens = ['x', 'y', 'z'];
    const result = simpleBPEStep(tokens, ['a', 'b'], 'ab');
    expect(result).toEqual(['x', 'y', 'z']);
  });
});

describe('cosineSimilarity', () => {
  it('should return 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1.0, 4);
  });

  it('should return 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0, 4);
  });

  it('should return -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1.0, 4);
  });
});

describe('findMostSimilar', () => {
  it('should find the most similar document', () => {
    const corpus = [
      { id: 'a', vector: [1, 0, 0] },
      { id: 'b', vector: [0, 1, 0] },
      { id: 'c', vector: [0.9, 0.1, 0] },
    ];
    const result = findMostSimilar([1, 0, 0], corpus);
    expect(result.id).toBe('a');
    expect(result.similarity).toBeCloseTo(1.0, 4);
  });
});

describe('buildIndex', () => {
  it('should return a sorted copy of documents', () => {
    const docs = [
      { id: 'b', text: 'beta', vector: [0, 1] },
      { id: 'a', text: 'alpha', vector: [1, 0] },
    ];
    const index = buildIndex(docs);
    expect(index[0].id).toBe('a');
    expect(index[1].id).toBe('b');
  });
});

describe('semanticSearch', () => {
  it('should return topK results sorted by score', () => {
    const index = [
      { id: 'a', text: 'alpha', vector: [1, 0] },
      { id: 'b', text: 'beta', vector: [0, 1] },
      { id: 'c', text: 'gamma', vector: [0.7, 0.7] },
    ];
    const results = semanticSearch([1, 0], index, 2);
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('a');
  });
});

describe('tokenize', () => {
  it('should tokenize using greedy longest match', () => {
    const vocab = ['hel', 'lo', 'he', 'l', 'o', 'w', 'or', 'ld'];
    const result = tokenize('hello', vocab);
    expect(result).toEqual(['hel', 'lo']);
  });

  it('should produce [UNK] for unknown characters', () => {
    const vocab = ['a', 'b'];
    const result = tokenize('abc', vocab);
    expect(result).toEqual(['a', 'b', '[UNK]']);
  });
});

run();
