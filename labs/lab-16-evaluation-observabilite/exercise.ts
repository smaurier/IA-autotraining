import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 16 — Evaluation et observabilite');

// ============================================================
// Exercise 1 — calculateFaithfulness
// ============================================================

function calculateFaithfulness(_answer: string, _context: string): number {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 2 — detectHallucination
// ============================================================

function detectHallucination(
  _answer: string,
  _context: string,
): { hasHallucination: boolean; claims: string[] } {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 3 — buildEvalDataset
// ============================================================

function buildEvalDataset(
  _items: { q: string; ctx: string; expected: string; actual: string }[],
): { question: string; context: string; expected: string; actual: string; match: boolean }[] {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 4 — runABTest
// ============================================================

function runABTest(
  _promptA: string,
  _promptB: string,
  _scores: { a: number; b: number }[],
): { winner: string; avgA: number; avgB: number } {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 5 — createLlmTrace
// ============================================================

function createLlmTrace(_data: {
  prompt: string;
  completion: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  model: string;
}): any {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Exercise 6 — aggregateMetrics
// ============================================================

function aggregateMetrics(
  _traces: { latencyMs: number; cost: number; tokensIn: number; tokensOut: number }[],
): { p50Latency: number; p95Latency: number; totalCost: number; avgTokens: number } {
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Tests
// ============================================================

describe('calculateFaithfulness', () => {
  it('should return 1.0 when all sentences are in context', () => {
    const context = 'Paris is the capital of France. France is in Europe.';
    const answer = 'Paris is the capital of France. France is in Europe.';
    expect(calculateFaithfulness(answer, context)).toBeCloseTo(1.0, 2);
  });

  it('should return 0.5 when half the sentences are supported', () => {
    const context = 'Paris is the capital of France.';
    const answer = 'Paris is the capital of France. It has 10 million people.';
    expect(calculateFaithfulness(answer, context)).toBeCloseTo(0.5, 2);
  });
});

describe('detectHallucination', () => {
  it('should detect unsupported claims', () => {
    const context = 'The sky is blue.';
    const answer = 'The sky is blue. The ocean is green.';
    const result = detectHallucination(answer, context);
    expect(result.hasHallucination).toBe(true);
    expect(result.claims.length).toBeGreaterThan(0);
  });

  it('should not flag supported content', () => {
    const context = 'Water boils at 100 degrees.';
    const answer = 'Water boils at 100 degrees.';
    const result = detectHallucination(answer, context);
    expect(result.hasHallucination).toBe(false);
    expect(result.claims).toHaveLength(0);
  });
});

describe('buildEvalDataset', () => {
  it('should build dataset with match status', () => {
    const items = [
      { q: 'Capital?', ctx: 'France', expected: 'Paris', actual: 'Paris' },
      { q: 'Color?', ctx: 'Sky', expected: 'Blue', actual: 'Red' },
    ];
    const dataset = buildEvalDataset(items);
    expect(dataset).toHaveLength(2);
    expect(dataset[0].match).toBe(true);
    expect(dataset[1].match).toBe(false);
  });
});

describe('runABTest', () => {
  it('should determine the winner based on average scores', () => {
    const scores = [
      { a: 0.8, b: 0.6 },
      { a: 0.9, b: 0.7 },
      { a: 0.7, b: 0.5 },
    ];
    const result = runABTest('Prompt A', 'Prompt B', scores);
    expect(result.winner).toBe('A');
    expect(result.avgA).toBeGreaterThan(result.avgB);
  });

  it('should return B as winner when B scores higher', () => {
    const scores = [
      { a: 0.3, b: 0.9 },
      { a: 0.4, b: 0.8 },
    ];
    const result = runABTest('PA', 'PB', scores);
    expect(result.winner).toBe('B');
  });
});

describe('createLlmTrace', () => {
  it('should create a trace with cost estimation', () => {
    const trace = createLlmTrace({
      prompt: 'Hello',
      completion: 'Hi there!',
      tokensIn: 100,
      tokensOut: 50,
      latencyMs: 200,
      model: 'gpt-4',
    });
    expect(trace.cost).toBeCloseTo(0.0025, 4);
    expect(trace.model).toBe('gpt-4');
    expect(trace.latencyMs).toBe(200);
  });
});

describe('aggregateMetrics', () => {
  it('should compute percentiles and totals', () => {
    const traces = [
      { latencyMs: 100, cost: 0.01, tokensIn: 50, tokensOut: 20 },
      { latencyMs: 200, cost: 0.02, tokensIn: 60, tokensOut: 30 },
      { latencyMs: 150, cost: 0.015, tokensIn: 55, tokensOut: 25 },
      { latencyMs: 300, cost: 0.03, tokensIn: 70, tokensOut: 40 },
    ];
    const metrics = aggregateMetrics(traces);
    expect(metrics.totalCost).toBeCloseTo(0.075, 3);
    expect(metrics.p50Latency).toBeLessThanOrEqual(200);
    expect(metrics.p95Latency).toBeGreaterThanOrEqual(200);
  });

  it('should calculate average tokens', () => {
    const traces = [
      { latencyMs: 100, cost: 0.01, tokensIn: 100, tokensOut: 50 },
      { latencyMs: 200, cost: 0.02, tokensIn: 200, tokensOut: 100 },
    ];
    const metrics = aggregateMetrics(traces);
    expect(metrics.avgTokens).toBe(225);
  });
});

run();
