import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 19 — Projet final');

// ============================================================
// Exercise 1 — ingestDocument
// ============================================================

function ingestDocument(
  _text: string,
  _chunkSize: number,
  _overlap: number,
): { chunks: string[]; count: number } {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 2 — searchKnowledgeBase
// ============================================================

function searchKnowledgeBase(
  _query: number[],
  _kb: { text: string; vector: number[] }[],
  _topK: number,
): string[] {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 3 — buildChatPipeline
// ============================================================

function buildChatPipeline(
  _question: string,
  _context: string[],
  _history: string[],
): string {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 4 — evaluateResponse
// ============================================================

function evaluateResponse(
  _answer: string,
  _context: string,
): { faithfulness: number; relevancy: number } {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 5 — calculatePipelineCost
// ============================================================

function calculatePipelineCost(
  _steps: { model: string; tokens: number }[],
): number {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Tests
// ============================================================

describe('ingestDocument', () => {
  it('should chunk a document and return count', () => {
    const text = 'a'.repeat(100);
    const result = ingestDocument(text, 30, 10);
    expect(result.count).toBeGreaterThan(1);
    expect(result.chunks).toHaveLength(result.count);
    expect(result.chunks[0].length).toBeLessThanOrEqual(30);
  });

  it('should handle small documents', () => {
    const result = ingestDocument('Hello world', 100, 0);
    expect(result.count).toBe(1);
    expect(result.chunks[0]).toBe('Hello world');
  });
});

describe('searchKnowledgeBase', () => {
  it('should return the most relevant documents', () => {
    const kb = [
      { text: 'AI and machine learning', vector: [1, 0, 0] },
      { text: 'Cooking recipes', vector: [0, 1, 0] },
      { text: 'Deep learning models', vector: [0.9, 0.1, 0] },
    ];
    const results = searchKnowledgeBase([1, 0, 0], kb, 2);
    expect(results).toHaveLength(2);
    expect(results[0]).toBe('AI and machine learning');
  });
});

describe('buildChatPipeline', () => {
  it('should combine history, context and question', () => {
    const result = buildChatPipeline(
      'What is RAG?',
      ['RAG combines retrieval and generation.'],
      ['User asked about LLMs previously.'],
    );
    expect(result).toContain('What is RAG?');
    expect(result).toContain('RAG combines retrieval and generation.');
    expect(result).toContain('User asked about LLMs previously.');
  });

  it('should work with empty history', () => {
    const result = buildChatPipeline('Hello?', ['Some context.'], []);
    expect(result).toContain('Hello?');
    expect(result).toContain('Some context.');
  });
});

describe('evaluateResponse', () => {
  it('should return high faithfulness for supported answers', () => {
    const context = 'Paris is the capital of France. France is in Europe.';
    const answer = 'Paris is the capital of France.';
    const result = evaluateResponse(answer, context);
    expect(result.faithfulness).toBeCloseTo(1.0, 2);
  });

  it('should calculate relevancy based on keyword overlap', () => {
    const context = 'machine learning algorithms for data science';
    const answer = 'machine learning is great for data analysis';
    const result = evaluateResponse(answer, context);
    expect(result.relevancy).toBeGreaterThan(0);
    expect(result.relevancy).toBeLessThanOrEqual(1);
  });
});

describe('calculatePipelineCost', () => {
  it('should sum costs across pipeline steps', () => {
    const steps = [
      { model: 'embedding', tokens: 1000 },
      { model: 'gpt-4', tokens: 2000 },
    ];
    const cost = calculatePipelineCost(steps);
    // embedding: 1000/1000 * 0.0001 = 0.0001
    // gpt-4: 2000/1000 * 0.03 = 0.06
    expect(cost).toBeCloseTo(0.0601, 4);
  });

  it('should handle single step', () => {
    const cost = calculatePipelineCost([{ model: 'gpt-3.5-turbo', tokens: 1000 }]);
    expect(cost).toBeCloseTo(0.001, 4);
  });
});

run();
