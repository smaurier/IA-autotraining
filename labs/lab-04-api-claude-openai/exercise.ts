import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 04 — API Claude & OpenAI');

// ============================================================
// Types
// ============================================================

interface Message {
  role: string;
  content: string;
}

interface ToolParam {
  name: string;
  type: string;
  required: boolean;
}

interface ContentBlock {
  type: string;
  name?: string;
  input?: any;
}

// ============================================================
// TODO: Implementez les fonctions ci-dessous
// ============================================================

function buildMessageHistory(_turns: Message[]): Message[] {
  // TODO: Valider que les roles alternent entre user et assistant
  throw new Error('TODO: Not implemented');
}

function defineToolSchema(_name: string, _description: string, _params: ToolParam[]): object {
  // TODO: Generer un schema JSON d'outil avec input_schema
  throw new Error('TODO: Not implemented');
}

function parseToolCall(_response: ContentBlock[]): { name: string; input: any } | null {
  // TODO: Trouver le premier bloc tool_use et retourner { name, input }
  throw new Error('TODO: Not implemented');
}

function calculateApiCost(_inputTokens: number, _outputTokens: number, _model: string): number {
  // TODO: Calculer le cout selon la table de prix
  throw new Error('TODO: Not implemented');
}

function buildStreamChunks(_text: string, _chunkSize: number): string[] {
  // TODO: Decouper le texte en morceaux de chunkSize caracteres
  throw new Error('TODO: Not implemented');
}

function retryWithBackoff(_attempt: number, _baseMs: number): number {
  // TODO: Calculer le delai = baseMs * 2^attempt
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Tests
// ============================================================

describe('buildMessageHistory', () => {
  it('devrait retourner un historique valide avec roles alternants', () => {
    const turns = [
      { role: 'user', content: 'Bonjour' },
      { role: 'assistant', content: 'Salut !' },
      { role: 'user', content: 'Ca va ?' },
    ];
    const result = buildMessageHistory(turns);
    expect(result.length).toBe(3);
    expect(result[0].role).toBe('user');
  });

  it('devrait lancer une erreur si deux roles consecutifs identiques', () => {
    expect(() =>
      buildMessageHistory([
        { role: 'user', content: 'a' },
        { role: 'user', content: 'b' },
      ]),
    ).toThrow();
  });

  it('devrait accepter un historique avec un seul message', () => {
    const result = buildMessageHistory([{ role: 'user', content: 'Hello' }]);
    expect(result.length).toBe(1);
  });
});

describe('defineToolSchema', () => {
  it('devrait generer un schema avec name et description', () => {
    const schema: any = defineToolSchema('get_weather', 'Get current weather', [
      { name: 'city', type: 'string', required: true },
    ]);
    expect(schema.name).toBe('get_weather');
    expect(schema.description).toBe('Get current weather');
  });

  it('devrait inclure input_schema avec properties et required', () => {
    const schema: any = defineToolSchema('search', 'Search items', [
      { name: 'query', type: 'string', required: true },
      { name: 'limit', type: 'number', required: false },
    ]);
    expect(schema.input_schema.type).toBe('object');
    expect(schema.input_schema.properties.query.type).toBe('string');
    expect(schema.input_schema.required).toContain('query');
    expect(schema.input_schema.required.length).toBe(1);
  });
});

describe('parseToolCall', () => {
  it('devrait extraire le tool_use d\'une reponse', () => {
    const response: ContentBlock[] = [
      { type: 'text' },
      { type: 'tool_use', name: 'get_weather', input: { city: 'Paris' } },
    ];
    const result = parseToolCall(response);
    expect(result!.name).toBe('get_weather');
    expect(result!.input.city).toBe('Paris');
  });

  it('devrait retourner null si pas de tool_use', () => {
    const result = parseToolCall([{ type: 'text' }]);
    expect(result).toBe(null);
  });
});

describe('calculateApiCost', () => {
  it('devrait calculer le cout pour gpt-4o', () => {
    const cost = calculateApiCost(1000, 500, 'gpt-4o');
    // 1000 * 2.50/1M + 500 * 10.00/1M = 0.0025 + 0.005 = 0.0075
    expect(cost).toBeCloseTo(0.0075, 4);
  });

  it('devrait calculer le cout pour claude-sonnet', () => {
    const cost = calculateApiCost(2000, 1000, 'claude-sonnet');
    // 2000 * 3.00/1M + 1000 * 15.00/1M = 0.006 + 0.015 = 0.021
    expect(cost).toBeCloseTo(0.021, 4);
  });

  it('devrait calculer le cout pour claude-haiku', () => {
    const cost = calculateApiCost(10000, 5000, 'claude-haiku');
    // 10000 * 0.25/1M + 5000 * 1.25/1M = 0.0025 + 0.00625 = 0.00875
    expect(cost).toBeCloseTo(0.00875, 5);
  });
});

describe('buildStreamChunks', () => {
  it('devrait decouper en morceaux de la bonne taille', () => {
    const chunks = buildStreamChunks('Hello World!', 5);
    expect(chunks.length).toBe(3);
    expect(chunks[0]).toBe('Hello');
    expect(chunks[1]).toBe(' Worl');
    expect(chunks[2]).toBe('d!');
  });

  it('devrait gerer un texte plus court que chunkSize', () => {
    const chunks = buildStreamChunks('Hi', 10);
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe('Hi');
  });
});

describe('retryWithBackoff', () => {
  it('devrait retourner baseMs pour attempt 0', () => {
    expect(retryWithBackoff(0, 100)).toBe(100);
  });

  it('devrait doubler a chaque tentative', () => {
    expect(retryWithBackoff(1, 100)).toBe(200);
    expect(retryWithBackoff(2, 100)).toBe(400);
    expect(retryWithBackoff(3, 100)).toBe(800);
  });
});

run();
