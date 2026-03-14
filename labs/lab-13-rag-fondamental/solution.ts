import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 13 — RAG fondamental');

// ============================================================
// Exercise 1 — chunkText
// ============================================================

function chunkText(text: string, size: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + size));
    start += size - overlap;
  }
  return chunks;
}

// ============================================================
// Exercise 2 — chunkBySentence
// ============================================================

function chunkBySentence(text: string, maxChunkSize: number): string[] {
  const sentences = text.split('. ').map((s, i, arr) =>
    i < arr.length - 1 ? s + '.' : s,
  );
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    const candidate = current ? current + ' ' + sentence : sentence;
    if (candidate.length <= maxChunkSize) {
      current = candidate;
    } else {
      if (current) chunks.push(current);
      current = sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

// ============================================================
// Exercise 3 — buildAugmentedPrompt
// ============================================================

function buildAugmentedPrompt(
  systemPrompt: string,
  chunks: string[],
  question: string,
): string {
  const context = chunks.map((c, i) => `[${i + 1}] ${c}`).join('\n');
  return `${systemPrompt}\n\nContext:\n${context}\n\nQuestion: ${question}`;
}

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
// Exercise 4 — searchDocuments
// ============================================================

function searchDocuments(
  query: number[],
  docs: { text: string; vector: number[] }[],
  topK: number,
): string[] {
  const scored = docs.map((doc) => ({
    text: doc.text,
    score: cosineSimilarity(query, doc.vector),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((d) => d.text);
}

// ============================================================
// Exercise 5 — calculateChunkStats
// ============================================================

function calculateChunkStats(
  chunks: string[],
): { count: number; avgLength: number; minLength: number; maxLength: number } {
  const lengths = chunks.map((c) => c.length);
  const sum = lengths.reduce((a, b) => a + b, 0);
  return {
    count: chunks.length,
    avgLength: sum / chunks.length,
    minLength: Math.min(...lengths),
    maxLength: Math.max(...lengths),
  };
}

// ============================================================
// Exercise 6 — formatCitations
// ============================================================

function formatCitations(chunks: string[]): string {
  return chunks.map((c, i) => `[${i + 1}] ${c}`).join('\n');
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
