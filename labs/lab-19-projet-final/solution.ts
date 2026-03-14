import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 19 — Projet final');

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
// Exercise 1 — ingestDocument
// ============================================================

function ingestDocument(
  text: string,
  chunkSize: number,
  overlap: number,
): { chunks: string[]; count: number } {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize));
    start += chunkSize - overlap;
  }
  return { chunks, count: chunks.length };
}

// ============================================================
// Exercise 2 — searchKnowledgeBase
// ============================================================

function searchKnowledgeBase(
  query: number[],
  kb: { text: string; vector: number[] }[],
  topK: number,
): string[] {
  const scored = kb.map((doc) => ({
    text: doc.text,
    score: cosineSimilarity(query, doc.vector),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((d) => d.text);
}

// ============================================================
// Exercise 3 — buildChatPipeline
// ============================================================

function buildChatPipeline(
  question: string,
  context: string[],
  history: string[],
): string {
  const parts: string[] = [];
  if (history.length > 0) {
    parts.push('History:\n' + history.join('\n'));
  }
  parts.push('Context:\n' + context.map((c, i) => `[${i + 1}] ${c}`).join('\n'));
  parts.push('Question: ' + question);
  return parts.join('\n\n');
}

// ============================================================
// Exercise 4 — evaluateResponse
// ============================================================

function evaluateResponse(
  answer: string,
  context: string,
): { faithfulness: number; relevancy: number } {
  // Faithfulness: fraction of answer sentences found in context
  const sentences = answer.split('. ').map((s) => s.replace(/\.$/, '').trim()).filter(Boolean);
  const supported = sentences.filter((s) => context.includes(s));
  const faithfulness = sentences.length === 0 ? 0 : supported.length / sentences.length;

  // Relevancy: fraction of context keywords found in answer
  const contextWords = [...new Set(context.toLowerCase().split(/\s+/).filter((w) => w.length > 2))];
  const answerLower = answer.toLowerCase();
  const matched = contextWords.filter((w) => answerLower.includes(w));
  const relevancy = contextWords.length === 0 ? 0 : matched.length / contextWords.length;

  return { faithfulness, relevancy };
}

// ============================================================
// Exercise 5 — calculatePipelineCost
// ============================================================

function calculatePipelineCost(
  steps: { model: string; tokens: number }[],
): number {
  const pricing: Record<string, number> = {
    'embedding': 0.0001,
    'gpt-4': 0.03,
    'gpt-3.5-turbo': 0.001,
  };
  let total = 0;
  for (const step of steps) {
    const pricePerK = pricing[step.model] ?? 0.01;
    total += (step.tokens / 1000) * pricePerK;
  }
  return total;
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
    expect(cost).toBeCloseTo(0.0601, 4);
  });

  it('should handle single step', () => {
    const cost = calculatePipelineCost([{ model: 'gpt-3.5-turbo', tokens: 1000 }]);
    expect(cost).toBeCloseTo(0.001, 4);
  });
});

run();
