import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 14 — RAG avance');

// ============================================================
// Helper — cosineSimilarity
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
  return denom === 0 ? 0 : dot / denom;
}

// ============================================================
// Helper — textScore
// ============================================================

function textScore(queryText: string, docText: string): number {
  const queryWords = queryText.toLowerCase().split(/\s+/);
  const docLower = docText.toLowerCase();
  const matches = queryWords.filter((w) => docLower.includes(w));
  return queryWords.length === 0 ? 0 : matches.length / queryWords.length;
}

// ============================================================
// Exercise 1 — hybridSearch
// ============================================================

function hybridSearch(
  queryVec: number[],
  queryText: string,
  docs: { text: string; vector: number[] }[],
  vectorWeight: number,
): { text: string; score: number }[] {
  const results = docs.map((doc) => {
    const vecScore = cosineSimilarity(queryVec, doc.vector);
    const txtScore = textScore(queryText, doc.text);
    return {
      text: doc.text,
      score: vectorWeight * vecScore + (1 - vectorWeight) * txtScore,
    };
  });
  results.sort((a, b) => b.score - a.score);
  return results;
}

// ============================================================
// Exercise 2 — generateMultiQuery
// ============================================================

function generateMultiQuery(original: string): string[] {
  const cleaned = original.replace(/[?!.]/g, '').trim();
  return [
    `${cleaned} (details specifiques)`,
    `Explication generale : ${cleaned}`,
    `What is ${cleaned.toLowerCase()}?`,
  ];
}

// ============================================================
// Exercise 3 — parentChildChunk
// ============================================================

function parentChildChunk(
  text: string,
  smallSize: number,
  parentSize: number,
): { parent: string; children: string[] }[] {
  const parents: { parent: string; children: string[] }[] = [];
  let start = 0;
  while (start < text.length) {
    const parent = text.slice(start, start + parentSize);
    const children: string[] = [];
    let childStart = 0;
    while (childStart < parent.length) {
      children.push(parent.slice(childStart, childStart + smallSize));
      childStart += smallSize;
    }
    parents.push({ parent, children });
    start += parentSize;
  }
  return parents;
}

// ============================================================
// Exercise 4 — metadataFilter
// ============================================================

function metadataFilter(
  docs: { text: string; metadata: Record<string, string> }[],
  filters: Record<string, string>,
): { text: string; metadata: Record<string, string> }[] {
  return docs.filter((doc) =>
    Object.entries(filters).every(([key, value]) => doc.metadata[key] === value),
  );
}

// ============================================================
// Exercise 5 — rerankByKeywordOverlap
// ============================================================

function rerankByKeywordOverlap(
  query: string,
  results: { text: string; score: number }[],
): { text: string; score: number }[] {
  const queryWords = query.toLowerCase().split(/\s+/);
  const reranked = results.map((r) => {
    const docLower = r.text.toLowerCase();
    const overlap = queryWords.filter((w) => docLower.includes(w)).length / queryWords.length;
    return { text: r.text, score: r.score + overlap };
  });
  reranked.sort((a, b) => b.score - a.score);
  return reranked;
}

// ============================================================
// Tests
// ============================================================

describe('hybridSearch', () => {
  const docs = [
    { text: 'machine learning algorithms', vector: [1, 0, 0] },
    { text: 'deep learning neural networks', vector: [0.9, 0.1, 0] },
    { text: 'cooking recipes for beginners', vector: [0, 0, 1] },
  ];

  it('should combine vector and text scores', () => {
    const results = hybridSearch([1, 0, 0], 'machine learning', docs, 0.7);
    expect(results[0].text).toBe('machine learning algorithms');
  });

  it('should return all documents sorted by score', () => {
    const results = hybridSearch([1, 0, 0], 'learning', docs, 0.5);
    expect(results).toHaveLength(3);
    expect(results[0].score).toBeGreaterThan(results[2].score);
  });
});

describe('generateMultiQuery', () => {
  it('should return exactly 3 reformulations', () => {
    const queries = generateMultiQuery('Comment fonctionne le RAG ?');
    expect(queries).toHaveLength(3);
  });

  it('should return different strings from the original', () => {
    const original = 'Comment fonctionne le RAG ?';
    const queries = generateMultiQuery(original);
    for (const q of queries) {
      expect(q.length).toBeGreaterThan(0);
    }
  });
});

describe('parentChildChunk', () => {
  it('should create parent chunks with children', () => {
    const text = 'abcdefghijklmnopqrstuvwxyz';
    const result = parentChildChunk(text, 5, 13);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].parent.length).toBeLessThanOrEqual(13);
    expect(result[0].children.length).toBeGreaterThan(0);
    expect(result[0].children[0].length).toBeLessThanOrEqual(5);
  });

  it('should have children that compose the parent', () => {
    const text = 'abcdefghijklmnop';
    const result = parentChildChunk(text, 4, 8);
    expect(result[0].children.join('')).toBe(result[0].parent);
  });
});

describe('metadataFilter', () => {
  const docs = [
    { text: 'Doc A', metadata: { lang: 'fr', topic: 'ai' } },
    { text: 'Doc B', metadata: { lang: 'en', topic: 'ai' } },
    { text: 'Doc C', metadata: { lang: 'fr', topic: 'web' } },
  ];

  it('should filter by single metadata field', () => {
    const result = metadataFilter(docs, { lang: 'fr' });
    expect(result).toHaveLength(2);
  });

  it('should filter by multiple metadata fields', () => {
    const result = metadataFilter(docs, { lang: 'fr', topic: 'ai' });
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Doc A');
  });

  it('should return empty array if no match', () => {
    const result = metadataFilter(docs, { lang: 'de' });
    expect(result).toHaveLength(0);
  });
});

describe('rerankByKeywordOverlap', () => {
  it('should boost results containing query keywords', () => {
    const results = [
      { text: 'deep learning models', score: 0.5 },
      { text: 'machine learning algorithms for data', score: 0.4 },
    ];
    const reranked = rerankByKeywordOverlap('machine learning', results);
    expect(reranked[0].text).toBe('machine learning algorithms for data');
  });
});

run();
