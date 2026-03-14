import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 11 — Ollama en local');

// ============================================================
// Exercise 1 — buildOllamaRequest
// ============================================================

function buildOllamaRequest(
  model: string,
  prompt: string,
  options?: { temperature?: number; top_p?: number },
): object {
  const req: any = { model, prompt, stream: false };
  if (options) {
    req.options = { ...options };
  }
  return req;
}

// ============================================================
// Exercise 2 — parseStreamResponse
// ============================================================

function parseStreamResponse(chunks: string[]): string {
  return chunks
    .map((chunk) => JSON.parse(chunk).response)
    .join('');
}

// ============================================================
// Exercise 3 — buildModelfile
// ============================================================

function buildModelfile(
  from: string,
  system: string,
  params: { name: string; value: string | number }[],
): string {
  const lines: string[] = [
    `FROM ${from}`,
    `SYSTEM ${system}`,
  ];
  for (const p of params) {
    lines.push(`PARAMETER ${p.name} ${p.value}`);
  }
  return lines.join('\n');
}

// ============================================================
// Exercise 4 — estimateVramGB
// ============================================================

function estimateVramGB(paramsBillion: number, quantBits: number): number {
  return (paramsBillion * quantBits) / 8 + 2;
}

// ============================================================
// Exercise 5 — selectBestModel
// ============================================================

function selectBestModel(
  available: { name: string; params: number; quality: number }[],
  maxVram: number,
): { name: string; params: number; quality: number } | null {
  const fitting = available.filter((m) => estimateVramGB(m.params, 4) <= maxVram);
  if (fitting.length === 0) return null;
  fitting.sort((a, b) => b.quality - a.quality);
  return fitting[0];
}

// ============================================================
// Tests
// ============================================================

describe('buildOllamaRequest', () => {
  it('should build a basic request with model and prompt', () => {
    const req = buildOllamaRequest('llama3', 'Hello') as any;
    expect(req.model).toBe('llama3');
    expect(req.prompt).toBe('Hello');
    expect(req.stream).toBe(false);
  });

  it('should include options when provided', () => {
    const req = buildOllamaRequest('mistral', 'Hi', { temperature: 0.7, top_p: 0.9 }) as any;
    expect(req.options.temperature).toBe(0.7);
    expect(req.options.top_p).toBe(0.9);
  });

  it('should handle partial options', () => {
    const req = buildOllamaRequest('llama3', 'Test', { temperature: 0.5 }) as any;
    expect(req.options.temperature).toBe(0.5);
  });
});

describe('parseStreamResponse', () => {
  it('should extract and concatenate response fields from NDJSON', () => {
    const chunks = [
      '{"response":"Hello"}',
      '{"response":" world"}',
      '{"response":"!"}',
    ];
    expect(parseStreamResponse(chunks)).toBe('Hello world!');
  });

  it('should handle single chunk', () => {
    expect(parseStreamResponse(['{"response":"OK"}'])).toBe('OK');
  });
});

describe('buildModelfile', () => {
  it('should generate a valid Modelfile', () => {
    const result = buildModelfile('llama3', 'You are a helpful assistant.', [
      { name: 'temperature', value: 0.7 },
      { name: 'top_p', value: 0.9 },
    ]);
    expect(result).toContain('FROM llama3');
    expect(result).toContain('SYSTEM You are a helpful assistant.');
    expect(result).toContain('PARAMETER temperature 0.7');
    expect(result).toContain('PARAMETER top_p 0.9');
  });

  it('should handle empty params', () => {
    const result = buildModelfile('mistral', 'Be concise.', []);
    expect(result).toContain('FROM mistral');
    expect(result).toContain('SYSTEM Be concise.');
  });
});

describe('estimateVramGB', () => {
  it('should estimate VRAM for a 7B model at 4-bit quantization', () => {
    expect(estimateVramGB(7, 4)).toBe(5.5);
  });

  it('should estimate VRAM for a 13B model at 8-bit quantization', () => {
    expect(estimateVramGB(13, 8)).toBe(15);
  });
});

describe('selectBestModel', () => {
  const models = [
    { name: 'tiny', params: 3, quality: 0.6 },
    { name: 'medium', params: 7, quality: 0.8 },
    { name: 'large', params: 13, quality: 0.95 },
  ];

  it('should select the best model that fits in VRAM', () => {
    const result = selectBestModel(models, 6);
    expect(result!.name).toBe('medium');
  });

  it('should return null if no model fits', () => {
    const result = selectBestModel(models, 1);
    expect(result).toBe(null);
  });
});

run();
