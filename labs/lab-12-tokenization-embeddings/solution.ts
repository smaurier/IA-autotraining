import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 12 — Tokenization et embeddings');

// ============================================================
// Exercise 1 — simpleBPEStep
// ============================================================

function simpleBPEStep(
  tokens: string[],
  pair: [string, string],
  merged: string,
): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    if (i < tokens.length - 1 && tokens[i] === pair[0] && tokens[i + 1] === pair[1]) {
      result.push(merged);
      i += 2;
    } else {
      result.push(tokens[i]);
      i++;
    }
  }
  return result;
}

// ============================================================
// Exercise 2 — cosineSimilarity
// ============================================================

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  return dot / denom;
}

// ============================================================
// Exercise 3 — findMostSimilar
// ============================================================

function findMostSimilar(
  query: number[],
  corpus: { id: string; vector: number[] }[],
): { id: string; similarity: number } {
  let bestId = '';
  let bestSim = -Infinity;
  for (const doc of corpus) {
    const sim = cosineSimilarity(query, doc.vector);
    if (sim > bestSim) {
      bestSim = sim;
      bestId = doc.id;
    }
  }
  return { id: bestId, similarity: bestSim };
}

// ============================================================
// Exercise 4 — buildIndex
// ============================================================

function buildIndex(
  docs: { id: string; text: string; vector: number[] }[],
): { id: string; text: string; vector: number[] }[] {
  return [...docs].sort((a, b) => a.id.localeCompare(b.id));
}

// ============================================================
// Exercise 5 — semanticSearch
// ============================================================

function semanticSearch(
  queryVector: number[],
  index: { id: string; text: string; vector: number[] }[],
  topK: number,
): { id: string; score: number }[] {
  const scored = index.map((doc) => ({
    id: doc.id,
    score: cosineSimilarity(queryVector, doc.vector),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

// ============================================================
// Exercise 6 — tokenize
// ============================================================

function tokenize(text: string, vocab: string[]): string[] {
  const sorted = [...vocab].sort((a, b) => b.length - a.length);
  const tokens: string[] = [];
  let i = 0;
  while (i < text.length) {
    let matched = false;
    for (const word of sorted) {
      if (text.startsWith(word, i)) {
        tokens.push(word);
        i += word.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push('[UNK]');
      i++;
    }
  }
  return tokens;
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
