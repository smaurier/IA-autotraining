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
// Implementations
// ============================================================

function buildMessageHistory(turns: Message[]): Message[] {
  for (let i = 1; i < turns.length; i++) {
    if (turns[i].role === turns[i - 1].role) {
      throw new Error(`Consecutive messages with same role "${turns[i].role}" at index ${i}`);
    }
  }
  return turns;
}

function defineToolSchema(name: string, description: string, params: ToolParam[]): object {
  const properties: Record<string, { type: string }> = {};
  const required: string[] = [];

  for (const param of params) {
    properties[param.name] = { type: param.type };
    if (param.required) {
      required.push(param.name);
    }
  }

  return {
    name,
    description,
    input_schema: {
      type: 'object',
      properties,
      required,
    },
  };
}

function parseToolCall(response: ContentBlock[]): { name: string; input: any } | null {
  const toolUse = response.find((block) => block.type === 'tool_use');
  if (!toolUse || !toolUse.name) return null;
  return { name: toolUse.name, input: toolUse.input };
}

function calculateApiCost(inputTokens: number, outputTokens: number, model: string): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'claude-sonnet': { input: 3.00, output: 15.00 },
    'claude-haiku': { input: 0.25, output: 1.25 },
  };

  const prices = pricing[model];
  if (!prices) throw new Error(`Unknown model: ${model}`);

  return (inputTokens * prices.input + outputTokens * prices.output) / 1_000_000;
}

function buildStreamChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

function retryWithBackoff(attempt: number, baseMs: number): number {
  return baseMs * Math.pow(2, attempt);
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
    expect(cost).toBeCloseTo(0.0075, 4);
  });

  it('devrait calculer le cout pour claude-sonnet', () => {
    const cost = calculateApiCost(2000, 1000, 'claude-sonnet');
    expect(cost).toBeCloseTo(0.021, 4);
  });

  it('devrait calculer le cout pour claude-haiku', () => {
    const cost = calculateApiCost(10000, 5000, 'claude-haiku');
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
