import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 00 — Paysage IA');

// ============================================================
// Types
// ============================================================

interface Model {
  name: string;
  speed: number;
  cost: number;
  quality: number;
}

// ============================================================
// Implementations
// ============================================================

const PROPRIETARY_MODELS = [
  'gpt-4',
  'gpt-3.5-turbo',
  'claude-3-opus',
  'claude-3-sonnet',
  'claude-3-haiku',
  'gemini-pro',
  'gemini-ultra',
];

function classifyModel(name: string): 'proprietary' | 'open-source' {
  return PROPRIETARY_MODELS.includes(name) ? 'proprietary' : 'open-source';
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

function calculateCost(
  inputTokens: number,
  outputTokens: number,
  pricing: { inputPricePerMillion: number; outputPricePerMillion: number },
): number {
  return (
    (inputTokens * pricing.inputPricePerMillion +
      outputTokens * pricing.outputPricePerMillion) /
    1_000_000
  );
}

function compareModels(models: Model[], criteria: 'speed' | 'cost' | 'quality'): Model[] {
  const copy = [...models];
  if (criteria === 'quality') {
    return copy.sort((a, b) => b.quality - a.quality);
  }
  return copy.sort((a, b) => a[criteria] - b[criteria]);
}

// ============================================================
// Tests
// ============================================================

describe('classifyModel', () => {
  it('devrait classifier GPT-4 comme proprietaire', () => {
    expect(classifyModel('gpt-4')).toBe('proprietary');
  });

  it('devrait classifier Claude 3 Opus comme proprietaire', () => {
    expect(classifyModel('claude-3-opus')).toBe('proprietary');
  });

  it('devrait classifier Llama 3 comme open-source', () => {
    expect(classifyModel('llama-3')).toBe('open-source');
  });
});

describe('estimateTokenCount', () => {
  it('devrait estimer 1 token pour 4 caracteres', () => {
    expect(estimateTokenCount('abcd')).toBe(1);
  });

  it('devrait arrondir a l\'entier superieur', () => {
    expect(estimateTokenCount('hello')).toBe(2);
  });

  it('devrait retourner 0 pour une chaine vide', () => {
    expect(estimateTokenCount('')).toBe(0);
  });
});

describe('calculateCost', () => {
  it('devrait calculer le cout pour GPT-4 pricing', () => {
    const cost = calculateCost(1000, 500, {
      inputPricePerMillion: 30,
      outputPricePerMillion: 60,
    });
    expect(cost).toBeCloseTo(0.06, 4);
  });
});

describe('compareModels', () => {
  const models: Model[] = [
    { name: 'gpt-4', speed: 40, cost: 30, quality: 90 },
    { name: 'claude-3-haiku', speed: 100, cost: 0.25, quality: 75 },
    { name: 'llama-3-70b', speed: 60, cost: 0, quality: 80 },
  ];

  it('devrait trier par cout croissant', () => {
    const sorted = compareModels(models, 'cost');
    expect(sorted[0].name).toBe('llama-3-70b');
    expect(sorted[2].name).toBe('gpt-4');
  });
});

run();
