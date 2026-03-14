import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 01 — Prompting Fondamental');

// ============================================================
// Types
// ============================================================

interface SystemPromptConfig {
  role: string;
  context: string;
  constraints: string[];
  outputFormat: string;
}

interface Example {
  input: string;
  output: string;
}

interface ValidationResult {
  isValid: boolean;
  warnings: string[];
}

// ============================================================
// Implementations
// ============================================================

function buildSystemPrompt(config: SystemPromptConfig): string {
  const constraintsList = config.constraints.map((c) => `- ${c}`).join('\n');
  return [
    `# Role`,
    config.role,
    '',
    `# Contexte`,
    config.context,
    '',
    `# Contraintes`,
    constraintsList,
    '',
    `# Format de sortie`,
    config.outputFormat,
  ].join('\n');
}

function buildFewShotPrompt(examples: Example[], query: string): string {
  const exampleLines = examples
    .map((ex, i) => `Exemple ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}`)
    .join('\n\n');
  return `${exampleLines}\n\nMaintenant, reponds:\nInput: ${query}\nOutput:`;
}

function buildChainOfThought(prompt: string): string {
  return `${prompt}\n\nReflechis etape par etape.`;
}

function formatJsonOutput(rawResponse: string): Record<string, unknown> | null {
  // Try to extract JSON from ```json ... ``` blocks
  const codeBlockMatch = rawResponse.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      return null;
    }
  }

  // Try to find a JSON object in the raw text
  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }

  return null;
}

function validatePrompt(prompt: string): ValidationResult {
  const warnings: string[] = [];

  if (prompt.trim().length === 0) {
    return { isValid: false, warnings: ['Prompt vide'] };
  }

  if (prompt.length < 10) {
    warnings.push('Prompt trop court');
  }

  const lower = prompt.toLowerCase();
  if (!lower.includes('tu es') && !lower.includes('you are')) {
    warnings.push('Pas de contexte de role detecte');
  }

  return { isValid: true, warnings };
}

// ============================================================
// Tests
// ============================================================

describe('buildSystemPrompt', () => {
  it('devrait contenir la section Role', () => {
    const result = buildSystemPrompt({
      role: 'Assistant JavaScript',
      context: 'Dev junior',
      constraints: ['Francais'],
      outputFormat: 'Texte',
    });
    expect(result).toContain('# Role');
    expect(result).toContain('Assistant JavaScript');
  });

  it('devrait contenir toutes les contraintes', () => {
    const result = buildSystemPrompt({
      role: 'Assistant',
      context: 'General',
      constraints: ['Reponds en francais', 'Max 200 mots'],
      outputFormat: 'JSON',
    });
    expect(result).toContain('Reponds en francais');
    expect(result).toContain('Max 200 mots');
  });
});

describe('buildFewShotPrompt', () => {
  it('devrait inclure les exemples et la question', () => {
    const examples: Example[] = [
      { input: 'Bonjour', output: 'Hello' },
      { input: 'Merci', output: 'Thank you' },
    ];
    const result = buildFewShotPrompt(examples, 'Au revoir');
    expect(result).toContain('Bonjour');
    expect(result).toContain('Hello');
    expect(result).toContain('Au revoir');
  });

  it('devrait fonctionner avec un seul exemple', () => {
    const result = buildFewShotPrompt([{ input: 'a', output: 'b' }], 'c');
    expect(result).toContain('a');
    expect(result).toContain('b');
    expect(result).toContain('c');
  });
});

describe('buildChainOfThought', () => {
  it('devrait ajouter l\'instruction de reflexion', () => {
    const result = buildChainOfThought('Quel est 2+2 ?');
    expect(result).toContain('Reflechis etape par etape');
    expect(result).toContain('Quel est 2+2 ?');
  });
});

describe('formatJsonOutput', () => {
  it('devrait extraire le JSON d\'une reponse brute', () => {
    const raw = 'Voici la reponse:\n```json\n{"name": "test"}\n```\nFin.';
    const result = formatJsonOutput(raw);
    expect(result).toEqual({ name: 'test' });
  });

  it('devrait parser du JSON brut sans markdown', () => {
    const result = formatJsonOutput('{"value": 42}');
    expect(result).toEqual({ value: 42 });
  });

  it('devrait retourner null pour du texte invalide', () => {
    const result = formatJsonOutput('pas de json ici');
    expect(result).toBe(null);
  });
});

describe('validatePrompt', () => {
  it('devrait signaler un prompt vide comme invalide', () => {
    const result = validatePrompt('');
    expect(result.isValid).toBe(false);
  });

  it('devrait signaler un prompt trop court', () => {
    const result = validatePrompt('Salut');
    expect(result.warnings).toContain('Prompt trop court');
  });

  it('devrait signaler l\'absence de contexte', () => {
    const result = validatePrompt('Explique-moi les closures en JavaScript');
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

run();
