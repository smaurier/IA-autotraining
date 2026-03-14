import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 05 — MCP Server');

// ============================================================
// Types
// ============================================================

interface ResourceDefinition {
  uri: string;
  name: string;
  mimeType: string;
}

interface ToolParamDef {
  name: string;
  type: string;
  desc: string;
}

interface ValidationSchema {
  required: string[];
  properties: Record<string, { type: string }>;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface ServerConfig {
  name: string;
  command: string;
  args: string[];
}

interface JsonRpcMessage {
  jsonrpc: string;
  method: string;
  params: any;
  id: number;
}

// ============================================================
// TODO: Implementez les fonctions ci-dessous
// ============================================================

function createResourceDefinition(_uri: string, _name: string, _mimeType: string): ResourceDefinition {
  // TODO: Retourner un objet { uri, name, mimeType }
  throw new Error('TODO: Not implemented');
}

function createToolDefinition(_name: string, _description: string, _params: ToolParamDef[]): object {
  // TODO: Retourner une definition d'outil avec inputSchema
  throw new Error('TODO: Not implemented');
}

function handleToolCall(_toolName: string, _input: any, _handlers: Record<string, (input: any) => any>): any {
  // TODO: Dispatcher vers le handler correspondant
  throw new Error('TODO: Not implemented');
}

function validateToolInput(_input: any, _schema: ValidationSchema): ValidationResult {
  // TODO: Valider required et types
  throw new Error('TODO: Not implemented');
}

function buildMcpConfig(_servers: ServerConfig[]): object {
  // TODO: Generer la config claude_desktop_config
  throw new Error('TODO: Not implemented');
}

function parseJsonRpcMessage(_raw: string): JsonRpcMessage {
  // TODO: Parser et valider un message JSON-RPC 2.0
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Tests
// ============================================================

describe('createResourceDefinition', () => {
  it('devrait creer une definition de ressource', () => {
    const res = createResourceDefinition('file:///data.json', 'Data', 'application/json');
    expect(res.uri).toBe('file:///data.json');
    expect(res.name).toBe('Data');
    expect(res.mimeType).toBe('application/json');
  });
});

describe('createToolDefinition', () => {
  it('devrait creer un outil avec inputSchema', () => {
    const tool: any = createToolDefinition('search', 'Search documents', [
      { name: 'query', type: 'string', desc: 'Search query' },
    ]);
    expect(tool.name).toBe('search');
    expect(tool.description).toBe('Search documents');
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.properties.query.type).toBe('string');
    expect(tool.inputSchema.properties.query.description).toBe('Search query');
  });
});

describe('handleToolCall', () => {
  it('devrait appeler le bon handler', () => {
    const handlers = {
      greet: (input: any) => `Hello ${input.name}`,
    };
    const result = handleToolCall('greet', { name: 'Alice' }, handlers);
    expect(result).toBe('Hello Alice');
  });

  it('devrait lancer une erreur si le tool n\'existe pas', () => {
    expect(() => handleToolCall('unknown', {}, {})).toThrow();
  });
});

describe('validateToolInput', () => {
  it('devrait valider un input correct', () => {
    const result = validateToolInput(
      { query: 'test', limit: 10 },
      { required: ['query'], properties: { query: { type: 'string' }, limit: { type: 'number' } } },
    );
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('devrait detecter un champ required manquant', () => {
    const result = validateToolInput(
      { limit: 10 },
      { required: ['query'], properties: { query: { type: 'string' }, limit: { type: 'number' } } },
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('devrait detecter un type incorrect', () => {
    const result = validateToolInput(
      { query: 123 },
      { required: ['query'], properties: { query: { type: 'string' } } },
    );
    expect(result.valid).toBe(false);
  });
});

describe('buildMcpConfig', () => {
  it('devrait generer la config au format claude_desktop_config', () => {
    const config: any = buildMcpConfig([
      { name: 'filesystem', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'] },
    ]);
    expect(config.mcpServers.filesystem.command).toBe('npx');
    expect(config.mcpServers.filesystem.args.length).toBe(3);
  });
});

describe('parseJsonRpcMessage', () => {
  it('devrait parser un message JSON-RPC valide', () => {
    const raw = JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', params: {}, id: 1 });
    const msg = parseJsonRpcMessage(raw);
    expect(msg.jsonrpc).toBe('2.0');
    expect(msg.method).toBe('tools/list');
    expect(msg.id).toBe(1);
  });

  it('devrait rejeter un JSON invalide', () => {
    expect(() => parseJsonRpcMessage('not json')).toThrow();
  });

  it('devrait rejeter si jsonrpc n\'est pas 2.0', () => {
    expect(() => parseJsonRpcMessage(JSON.stringify({ jsonrpc: '1.0', method: 'test', id: 1 }))).toThrow();
  });
});

run();
