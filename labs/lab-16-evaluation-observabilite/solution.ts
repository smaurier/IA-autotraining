import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 16 — Evaluation et observabilite');

// ============================================================
// Exercise 1 — calculateFaithfulness
// ============================================================

function calculateFaithfulness(answer: string, context: string): number {
  const sentences = answer.split('. ').map((s) => s.replace(/\.$/, '').trim()).filter(Boolean);
  if (sentences.length === 0) return 0;
  const supported = sentences.filter((s) => context.includes(s));
  return supported.length / sentences.length;
}

// ============================================================
// Exercise 2 — detectHallucination
// ============================================================

function detectHallucination(
  answer: string,
  context: string,
): { hasHallucination: boolean; claims: string[] } {
  const sentences = answer.split('. ').map((s) => s.replace(/\.$/, '').trim()).filter(Boolean);
  const unsupported = sentences.filter((s) => !context.includes(s));
  return {
    hasHallucination: unsupported.length > 0,
    claims: unsupported,
  };
}

// ============================================================
// Exercise 3 — buildEvalDataset
// ============================================================

function buildEvalDataset(
  items: { q: string; ctx: string; expected: string; actual: string }[],
): { question: string; context: string; expected: string; actual: string; match: boolean }[] {
  return items.map((item) => ({
    question: item.q,
    context: item.ctx,
    expected: item.expected,
    actual: item.actual,
    match: item.expected === item.actual,
  }));
}

// ============================================================
// Exercise 4 — runABTest
// ============================================================

function runABTest(
  _promptA: string,
  _promptB: string,
  scores: { a: number; b: number }[],
): { winner: string; avgA: number; avgB: number } {
  const avgA = scores.reduce((sum, s) => sum + s.a, 0) / scores.length;
  const avgB = scores.reduce((sum, s) => sum + s.b, 0) / scores.length;
  return {
    winner: avgA >= avgB ? 'A' : 'B',
    avgA,
    avgB,
  };
}

// ============================================================
// Exercise 5 — createLlmTrace
// ============================================================

function createLlmTrace(data: {
  prompt: string;
  completion: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  model: string;
}): any {
  return {
    ...data,
    timestamp: new Date().toISOString(),
    cost: data.tokensIn * 0.00001 + data.tokensOut * 0.00003,
  };
}

// ============================================================
// Exercise 6 — aggregateMetrics
// ============================================================

function aggregateMetrics(
  traces: { latencyMs: number; cost: number; tokensIn: number; tokensOut: number }[],
): { p50Latency: number; p95Latency: number; totalCost: number; avgTokens: number } {
  const latencies = traces.map((t) => t.latencyMs).sort((a, b) => a - b);
  const totalCost = traces.reduce((sum, t) => sum + t.cost, 0);
  const totalTokens = traces.reduce((sum, t) => sum + t.tokensIn + t.tokensOut, 0);

  const p50Index = Math.floor(latencies.length * 0.5);
  const p95Index = Math.min(Math.floor(latencies.length * 0.95), latencies.length - 1);

  return {
    p50Latency: latencies[p50Index],
    p95Latency: latencies[p95Index],
    totalCost,
    avgTokens: totalTokens / traces.length,
  };
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
