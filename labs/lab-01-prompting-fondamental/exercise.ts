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
// TODO: Implementez les fonctions ci-dessous
// ============================================================

function buildSystemPrompt(_config: SystemPromptConfig): string {
  // TODO: Construire un prompt avec les sections # Role, # Contexte, # Contraintes, # Format de sortie
  throw new Error('TODO: Not implemented');
}

function buildFewShotPrompt(_examples: Example[], _query: string): string {
  // TODO: Construire un prompt few-shot avec les exemples puis la question
  throw new Error('TODO: Not implemented');
}

function buildChainOfThought(_prompt: string): string {
  // TODO: Ajouter "Reflechis etape par etape" au prompt
  throw new Error('TODO: Not implemented');
}

function formatJsonOutput(_rawResponse: string): Record<string, unknown> | null {
  // TODO: Extraire et parser le JSON d'une reponse LLM
  throw new Error('TODO: Not implemented');
}

function validatePrompt(_prompt: string): ValidationResult {
  // TODO: Verifier les anti-patterns (trop court, pas de contexte, vide)
  throw new Error('TODO: Not implemented');
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
