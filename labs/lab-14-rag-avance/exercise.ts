import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 14 — RAG avance');

// ============================================================
// Exercise 1 — hybridSearch
// ============================================================

function hybridSearch(
  _queryVec: number[],
  _queryText: string,
  _docs: { text: string; vector: number[] }[],
  _vectorWeight: number,
): { text: string; score: number }[] {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 2 — generateMultiQuery
// ============================================================

function generateMultiQuery(_original: string): string[] {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 3 — parentChildChunk
// ============================================================

function parentChildChunk(
  _text: string,
  _smallSize: number,
  _parentSize: number,
): { parent: string; children: string[] }[] {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 4 — metadataFilter
// ============================================================

function metadataFilter(
  _docs: { text: string; metadata: Record<string, string> }[],
  _filters: Record<string, string>,
): { text: string; metadata: Record<string, string> }[] {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 5 — rerankByKeywordOverlap
// ============================================================

function rerankByKeywordOverlap(
  _query: string,
  _results: { text: string; score: number }[],
): { text: string; score: number }[] {
  throw new Error('TODO: Not implemented');
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
