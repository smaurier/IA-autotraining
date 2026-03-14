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
// TODO: Implementez les fonctions ci-dessous
// ============================================================

function prepareTrainingData(_samples: TrainingSample[]): string {
  // TODO: Convertir chaque sample en une ligne JSON avec le format messages
  // {"messages": [{"role": "user", "content": input}, {"role": "assistant", "content": output}]}
  // Retourner toutes les lignes jointes par \n
  throw new Error('TODO: Not implemented');
}

function validateDataset(
  _data: TrainingSample[],
  _options: { minSize: number; requiredFields: string[] },
): ValidationResult {
  // TODO: Verifier que data.length >= minSize
  // Verifier que chaque element contient tous les requiredFields non vides
  // Retourner { valid, errors } avec la liste des erreurs trouvees
  throw new Error('TODO: Not implemented');
}

function splitDataset<T>(
  _data: T[],
  _ratios: { train: number; val: number; test: number },
): { train: T[]; val: T[]; test: T[] } {
  // TODO: Decouper data selon les ratios (utiliser Math.round pour les indices)
  // train = data[0..trainEnd], val = data[trainEnd..valEnd], test = data[valEnd..]
  throw new Error('TODO: Not implemented');
}

function calculateLoraParams(_config: LoraConfig): number {
  // TODO: rank * (dIn + dOut) * 2 * numLayers
  throw new Error('TODO: Not implemented');
}

function compareModelScores(
  _before: ModelScores,
  _after: ModelScores,
): { metric: string; before: number; after: number; improvement: number }[] {
  // TODO: Pour chaque metrique (accuracy, f1, latency), calculer
  // improvement = ((after - before) / before) * 100
  throw new Error('TODO: Not implemented');
}

function buildOllamaModelfile(_config: ModelfileConfig): string {
  // TODO: Generer un Modelfile avec:
  // FROM <from>
  // SYSTEM """<system>"""
  // PARAMETER <key> <value> (pour chaque parametre)
  throw new Error('TODO: Not implemented');
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
