import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 10 — Fine-tuning');

// ============================================================
// Types
// ============================================================

interface TrainingSample {
  input: string;
  output: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface ModelScores {
  accuracy: number;
  f1: number;
  latency: number;
}

interface LoraConfig {
  rank: number;
  dIn: number;
  dOut: number;
  numLayers: number;
}

interface ModelfileConfig {
  from: string;
  system: string;
  parameters: Record<string, number | string>;
}

// ============================================================
// Implementations
// ============================================================

function prepareTrainingData(samples: TrainingSample[]): string {
  return samples
    .map((sample) =>
      JSON.stringify({
        messages: [
          { role: 'user', content: sample.input },
          { role: 'assistant', content: sample.output },
        ],
      }),
    )
    .join('\n');
}

function validateDataset(
  data: TrainingSample[],
  options: { minSize: number; requiredFields: string[] },
): ValidationResult {
  const errors: string[] = [];

  if (data.length < options.minSize) {
    errors.push(`Dataset trop petit: ${data.length} < ${options.minSize}`);
  }

  for (let i = 0; i < data.length; i++) {
    const item = data[i] as Record<string, any>;
    for (const field of options.requiredFields) {
      if (!item[field] || (typeof item[field] === 'string' && item[field].trim() === '')) {
        errors.push(`Element ${i}: champ "${field}" vide ou manquant`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function splitDataset<T>(
  data: T[],
  ratios: { train: number; val: number; test: number },
): { train: T[]; val: T[]; test: T[] } {
  const trainEnd = Math.round(data.length * ratios.train);
  const valEnd = Math.round(data.length * (ratios.train + ratios.val));

  return {
    train: data.slice(0, trainEnd),
    val: data.slice(trainEnd, valEnd),
    test: data.slice(valEnd),
  };
}

function calculateLoraParams(config: LoraConfig): number {
  return config.rank * (config.dIn + config.dOut) * 2 * config.numLayers;
}

function compareModelScores(
  before: ModelScores,
  after: ModelScores,
): { metric: string; before: number; after: number; improvement: number }[] {
  const metrics: (keyof ModelScores)[] = ['accuracy', 'f1', 'latency'];
  return metrics.map((metric) => ({
    metric,
    before: before[metric],
    after: after[metric],
    improvement: ((after[metric] - before[metric]) / before[metric]) * 100,
  }));
}

function buildOllamaModelfile(config: ModelfileConfig): string {
  const lines: string[] = [];
  lines.push(`FROM ${config.from}`);
  lines.push(`SYSTEM """${config.system}"""`);
  for (const [key, value] of Object.entries(config.parameters)) {
    lines.push(`PARAMETER ${key} ${value}`);
  }
  return lines.join('\n');
}

// ============================================================
// Tests
// ============================================================

describe('prepareTrainingData', () => {
  it('devrait convertir un sample en JSONL', () => {
    const result = prepareTrainingData([{ input: 'Bonjour', output: 'Salut!' }]);
    const parsed = JSON.parse(result);
    expect(parsed.messages).toHaveLength(2);
    expect(parsed.messages[0].role).toBe('user');
    expect(parsed.messages[1].content).toBe('Salut!');
  });

  it('devrait generer plusieurs lignes JSONL', () => {
    const result = prepareTrainingData([
      { input: 'Hello', output: 'Hi' },
      { input: 'Bye', output: 'Goodbye' },
    ]);
    const lines = result.split('\n');
    expect(lines).toHaveLength(2);
  });
});

describe('validateDataset', () => {
  it('devrait valider un dataset correct', () => {
    const data = [
      { input: 'a', output: 'b' },
      { input: 'c', output: 'd' },
    ];
    const result = validateDataset(data, { minSize: 2, requiredFields: ['input', 'output'] });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('devrait rejeter un dataset trop petit', () => {
    const data = [{ input: 'a', output: 'b' }];
    const result = validateDataset(data, { minSize: 10, requiredFields: ['input', 'output'] });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('devrait detecter les champs vides', () => {
    const data = [
      { input: 'a', output: '' },
      { input: '', output: 'b' },
    ];
    const result = validateDataset(data, { minSize: 1, requiredFields: ['input', 'output'] });
    expect(result.valid).toBe(false);
  });
});

describe('splitDataset', () => {
  it('devrait decouper selon les ratios 80/10/10', () => {
    const data = Array.from({ length: 100 }, (_, i) => i);
    const split = splitDataset(data, { train: 0.8, val: 0.1, test: 0.1 });
    expect(split.train).toHaveLength(80);
    expect(split.val).toHaveLength(10);
    expect(split.test).toHaveLength(10);
  });

  it('devrait conserver tous les elements', () => {
    const data = Array.from({ length: 50 }, (_, i) => i);
    const split = splitDataset(data, { train: 0.7, val: 0.15, test: 0.15 });
    const total = split.train.length + split.val.length + split.test.length;
    expect(total).toBe(50);
  });
});

describe('calculateLoraParams', () => {
  it('devrait calculer les parametres LoRA', () => {
    const params = calculateLoraParams({ rank: 8, dIn: 4096, dOut: 4096, numLayers: 32 });
    // 8 * (4096 + 4096) * 2 * 32 = 4_194_304
    expect(params).toBe(4_194_304);
  });

  it('devrait fonctionner avec un petit rang', () => {
    const params = calculateLoraParams({ rank: 4, dIn: 768, dOut: 768, numLayers: 12 });
    // 4 * (768 + 768) * 2 * 12 = 147_456
    expect(params).toBe(147_456);
  });
});

describe('compareModelScores', () => {
  it('devrait calculer l\'amelioration en pourcentage', () => {
    const result = compareModelScores(
      { accuracy: 0.7, f1: 0.65, latency: 100 },
      { accuracy: 0.85, f1: 0.80, latency: 120 },
    );
    expect(result).toHaveLength(3);
    const acc = result.find(r => r.metric === 'accuracy')!;
    expect(acc.improvement).toBeCloseTo(21.43, 1);
  });
});

describe('buildOllamaModelfile', () => {
  it('devrait generer un Modelfile valide', () => {
    const result = buildOllamaModelfile({
      from: 'llama3:8b',
      system: 'Tu es un assistant utile.',
      parameters: { temperature: 0.7, top_p: 0.9 },
    });
    expect(result).toContain('FROM llama3:8b');
    expect(result).toContain('Tu es un assistant utile.');
    expect(result).toContain('PARAMETER temperature 0.7');
    expect(result).toContain('PARAMETER top_p 0.9');
  });
});

run();
