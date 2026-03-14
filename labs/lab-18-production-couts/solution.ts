import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 18 — Production et couts');

// ============================================================
// Helper — pricing
// ============================================================

function getModelPricing(model: string): { input: number; output: number } {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
  };
  return pricing[model] || { input: 0.01, output: 0.03 };
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
// Exercise 1 — calculateMonthlyCost
// ============================================================

function calculateMonthlyCost(
  dailyRequests: number,
  avgInputTokens: number,
  avgOutputTokens: number,
  model: string,
): number {
  const pricing = getModelPricing(model);
  const monthlyRequests = dailyRequests * 30;
  const inputCost = (avgInputTokens / 1000) * pricing.input;
  const outputCost = (avgOutputTokens / 1000) * pricing.output;
  return monthlyRequests * (inputCost + outputCost);
}

// ============================================================
// Exercise 2 — buildSemanticCacheKey
// ============================================================

function buildSemanticCacheKey(
  embedding: number[],
  threshold: number,
  cache: { key: number[]; value: string }[],
): string | null {
  let bestValue: string | null = null;
  let bestSim = -Infinity;
  for (const entry of cache) {
    const sim = cosineSimilarity(embedding, entry.key);
    if (sim > threshold && sim > bestSim) {
      bestSim = sim;
      bestValue = entry.value;
    }
  }
  return bestValue;
}

// ============================================================
// Exercise 3 — applyRateLimit
// ============================================================

function applyRateLimit(
  bucket: { tokens: number; lastRefill: number; capacity: number; refillRate: number },
  now: number,
): { allowed: boolean; remaining: number } {
  const elapsed = (now - bucket.lastRefill) / 1000;
  const refilled = Math.min(
    bucket.capacity,
    bucket.tokens + Math.floor(elapsed * bucket.refillRate),
  );
  bucket.tokens = refilled;
  bucket.lastRefill = now;

  if (bucket.tokens > 0) {
    bucket.tokens--;
    return { allowed: true, remaining: bucket.tokens };
  }
  return { allowed: false, remaining: 0 };
}

// ============================================================
// Exercise 4 — selectFallbackModel
// ============================================================

function selectFallbackModel(
  primary: string,
  available: string[],
  status: Record<string, boolean>,
): string {
  if (status[primary]) return primary;
  const fallback = available.find((m) => status[m]);
  if (!fallback) throw new Error('No available model');
  return fallback;
}

// ============================================================
// Exercise 5 — optimizePrompt
// ============================================================

function optimizePrompt(prompt: string): string {
  return prompt
    .trim()
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ +\n/g, '\n')
    .replace(/\n +/g, '\n')
    .trim();
}

// ============================================================
// Exercise 6 — buildCostReport
// ============================================================

function buildCostReport(
  traces: { model: string; inputTokens: number; outputTokens: number }[],
): { byModel: Record<string, number>; total: number } {
  const byModel: Record<string, number> = {};
  for (const trace of traces) {
    const pricing = getModelPricing(trace.model);
    const cost =
      (trace.inputTokens / 1000) * pricing.input +
      (trace.outputTokens / 1000) * pricing.output;
    byModel[trace.model] = (byModel[trace.model] || 0) + cost;
  }
  const total = Object.values(byModel).reduce((sum, v) => sum + v, 0);
  return { byModel, total };
}

// ============================================================
// Tests
// ============================================================

describe('calculateMonthlyCost', () => {
  it('should calculate cost for gpt-4', () => {
    const cost = calculateMonthlyCost(100, 500, 200, 'gpt-4');
    expect(cost).toBeCloseTo(81, 0);
  });

  it('should calculate cost for gpt-3.5-turbo', () => {
    const cost = calculateMonthlyCost(1000, 200, 100, 'gpt-3.5-turbo');
    expect(cost).toBeCloseTo(12, 0);
  });
});

describe('buildSemanticCacheKey', () => {
  it('should return cached value when similarity exceeds threshold', () => {
    const cache = [
      { key: [1, 0, 0], value: 'cached answer' },
    ];
    const result = buildSemanticCacheKey([1, 0, 0], 0.9, cache);
    expect(result).toBe('cached answer');
  });

  it('should return null when no match exceeds threshold', () => {
    const cache = [
      { key: [1, 0, 0], value: 'cached' },
    ];
    const result = buildSemanticCacheKey([0, 1, 0], 0.9, cache);
    expect(result).toBe(null);
  });
});

describe('applyRateLimit', () => {
  it('should allow request when tokens available', () => {
    const bucket = { tokens: 10, lastRefill: 1000, capacity: 10, refillRate: 1 };
    const result = applyRateLimit(bucket, 1000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it('should deny request when no tokens available', () => {
    const bucket = { tokens: 0, lastRefill: 1000, capacity: 10, refillRate: 1 };
    const result = applyRateLimit(bucket, 1000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should refill tokens based on elapsed time', () => {
    const bucket = { tokens: 0, lastRefill: 0, capacity: 10, refillRate: 1 };
    const result = applyRateLimit(bucket, 5000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });
});

describe('selectFallbackModel', () => {
  it('should return primary model when available', () => {
    const result = selectFallbackModel('gpt-4', ['gpt-4', 'gpt-3.5'], { 'gpt-4': true, 'gpt-3.5': true });
    expect(result).toBe('gpt-4');
  });

  it('should return fallback when primary is down', () => {
    const result = selectFallbackModel('gpt-4', ['gpt-4', 'gpt-3.5'], { 'gpt-4': false, 'gpt-3.5': true });
    expect(result).toBe('gpt-3.5');
  });
});

describe('optimizePrompt', () => {
  it('should remove extra whitespace', () => {
    const result = optimizePrompt('  Hello   world  ');
    expect(result).toBe('Hello world');
  });

  it('should collapse multiple blank lines', () => {
    const result = optimizePrompt('Line 1\n\n\n\nLine 2');
    expect(result).toBe('Line 1\n\nLine 2');
  });
});

describe('buildCostReport', () => {
  it('should aggregate costs by model', () => {
    const traces = [
      { model: 'gpt-4', inputTokens: 1000, outputTokens: 500 },
      { model: 'gpt-4', inputTokens: 2000, outputTokens: 1000 },
      { model: 'gpt-3.5-turbo', inputTokens: 500, outputTokens: 200 },
    ];
    const report = buildCostReport(traces);
    expect(report.byModel['gpt-4']).toBeGreaterThan(0);
    expect(report.byModel['gpt-3.5-turbo']).toBeGreaterThan(0);
    expect(report.total).toBeCloseTo(
      report.byModel['gpt-4'] + report.byModel['gpt-3.5-turbo'],
      4,
    );
  });
});

run();
