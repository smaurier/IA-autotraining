import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 13 — RAG fondamental');

// ============================================================
// Exercise 1 — chunkText
// ============================================================

function chunkText(_text: string, _size: number, _overlap: number): string[] {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 2 — chunkBySentence
// ============================================================

function chunkBySentence(_text: string, _maxChunkSize: number): string[] {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 3 — buildAugmentedPrompt
// ============================================================

function buildAugmentedPrompt(
  _systemPrompt: string,
  _chunks: string[],
  _question: string,
): string {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 4 — searchDocuments
// ============================================================

function searchDocuments(
  _query: number[],
  _docs: { text: string; vector: number[] }[],
  _topK: number,
): string[] {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 5 — calculateChunkStats
// ============================================================

function calculateChunkStats(
  _chunks: string[],
): { count: number; avgLength: number; minLength: number; maxLength: number } {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 6 — formatCitations
// ============================================================

function formatCitations(_chunks: string[]): string {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Tests
// ============================================================

describe('chunkText', () => {
  it('should split text into fixed-size chunks', () => {
    const chunks = chunkText('abcdefghij', 4, 0);
    expect(chunks).toEqual(['abcd', 'efgh', 'ij']);
  });

  it('should apply overlap between chunks', () => {
    const chunks = chunkText('abcdefghij', 5, 2);
    expect(chunks[0]).toBe('abcde');
    expect(chunks[1]).toBe('defgh');
    expect(chunks[2]).toBe('ghij');
  });

  it('should handle text shorter than chunk size', () => {
    const chunks = chunkText('abc', 10, 0);
    expect(chunks).toEqual(['abc']);
  });
});

describe('chunkBySentence', () => {
  it('should group sentences without exceeding max size', () => {
    const text = 'Hello world. This is a test. Another sentence here.';
    const chunks = chunkBySentence(text, 30);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(30);
    }
  });

  it('should keep single long sentence as one chunk', () => {
    const text = 'A very short text.';
    const chunks = chunkBySentence(text, 100);
    expect(chunks).toHaveLength(1);
  });
});

describe('buildAugmentedPrompt', () => {
  it('should combine system prompt, context and question', () => {
    const result = buildAugmentedPrompt(
      'You are a helpful assistant.',
      ['Paris is the capital of France.', 'France is in Europe.'],
      'Where is Paris?',
    );
    expect(result).toContain('You are a helpful assistant.');
    expect(result).toContain('Paris is the capital of France.');
    expect(result).toContain('France is in Europe.');
    expect(result).toContain('Where is Paris?');
  });
});

describe('searchDocuments', () => {
  it('should return topK most similar documents', () => {
    const docs = [
      { text: 'alpha', vector: [1, 0] },
      { text: 'beta', vector: [0, 1] },
      { text: 'gamma', vector: [0.9, 0.1] },
    ];
    const results = searchDocuments([1, 0], docs, 2);
    expect(results).toHaveLength(2);
    expect(results[0]).toBe('alpha');
  });
});

describe('calculateChunkStats', () => {
  it('should compute correct statistics', () => {
    const stats = calculateChunkStats(['ab', 'abcd', 'abcdef']);
    expect(stats.count).toBe(3);
    expect(stats.avgLength).toBe(4);
    expect(stats.minLength).toBe(2);
    expect(stats.maxLength).toBe(6);
  });
});

describe('formatCitations', () => {
  it('should format chunks with numbered citations', () => {
    const result = formatCitations(['First chunk', 'Second chunk']);
    expect(result).toBe('[1] First chunk\n[2] Second chunk');
  });

  it('should handle single chunk', () => {
    const result = formatCitations(['Only chunk']);
    expect(result).toBe('[1] Only chunk');
  });
});

run();
