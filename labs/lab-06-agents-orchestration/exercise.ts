import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 06 — Agents & Orchestration');

// ============================================================
// Types
// ============================================================

interface ReActStep {
  thought: string;
  action?: string;
  observation?: string;
}

interface MemoryEntry {
  role: string;
  content: string;
}

interface AgentMemory {
  append: (role: string, content: string) => void;
  getRecent: (n: number) => MemoryEntry[];
  search: (q: string) => MemoryEntry[];
}

interface AgentCapability {
  name: string;
  keywords: string[];
}

interface GuardrailResult {
  allowed: boolean;
  needsConfirmation: boolean;
}

// ============================================================
// TODO: Implementez les fonctions ci-dessous
// ============================================================

function parseReActStep(_text: string): ReActStep {
  // TODO: Parser Thought, Action, Observation depuis le texte
  throw new Error('TODO: Not implemented');
}

function shouldContinue(_steps: { thought: string; action?: string }[], _maxIter: number): boolean {
  // TODO: Verifier si l'agent doit continuer
  throw new Error('TODO: Not implemented');
}

function validateAgentAction(_action: string, _allowedActions: string[]): boolean {
  // TODO: Verifier si l'action est autorisee
  throw new Error('TODO: Not implemented');
}

function createAgentMemory(): AgentMemory {
  // TODO: Creer un objet memoire avec append, getRecent, search
  throw new Error('TODO: Not implemented');
}

function routeToAgent(_task: string, _agentCapabilities: AgentCapability[]): string {
  // TODO: Router vers l'agent avec le plus de keywords matchants
  throw new Error('TODO: Not implemented');
}

function buildGuardrailCheck(
  _action: { tool: string; input: any },
  _blocked: string[],
  _requireConfirm: string[],
): GuardrailResult {
  // TODO: Verifier blocked et requireConfirm
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Tests
// ============================================================

describe('parseReActStep', () => {
  it('devrait parser une etape complete', () => {
    const text = 'Thought: Je dois chercher\nAction: search\nObservation: Resultat trouve';
    const step = parseReActStep(text);
    expect(step.thought).toBe('Je dois chercher');
    expect(step.action).toBe('search');
    expect(step.observation).toBe('Resultat trouve');
  });

  it('devrait gerer une etape sans action ni observation', () => {
    const text = 'Thought: Je reflechis encore';
    const step = parseReActStep(text);
    expect(step.thought).toBe('Je reflechis encore');
    expect(step.action).toBeUndefined();
    expect(step.observation).toBeUndefined();
  });
});

describe('shouldContinue', () => {
  it('devrait continuer si sous le max et derniere etape a une action', () => {
    const steps = [{ thought: 'Go', action: 'search' }];
    expect(shouldContinue(steps, 5)).toBe(true);
  });

  it('devrait arreter si max atteint', () => {
    const steps = [
      { thought: 'a', action: 'x' },
      { thought: 'b', action: 'y' },
    ];
    expect(shouldContinue(steps, 2)).toBe(false);
  });

  it('devrait arreter si derniere etape sans action', () => {
    const steps = [{ thought: 'Done' }];
    expect(shouldContinue(steps, 5)).toBe(false);
  });
});

describe('validateAgentAction', () => {
  it('devrait accepter une action autorisee', () => {
    expect(validateAgentAction('search', ['search', 'read', 'write'])).toBe(true);
  });

  it('devrait rejeter une action non autorisee', () => {
    expect(validateAgentAction('delete', ['search', 'read'])).toBe(false);
  });
});

describe('createAgentMemory', () => {
  it('devrait ajouter et recuperer des entrees', () => {
    const mem = createAgentMemory();
    mem.append('user', 'Bonjour');
    mem.append('assistant', 'Salut');
    const recent = mem.getRecent(2);
    expect(recent.length).toBe(2);
    expect(recent[0].role).toBe('user');
  });

  it('devrait chercher dans le contenu', () => {
    const mem = createAgentMemory();
    mem.append('user', 'Parle-moi de JavaScript');
    mem.append('user', 'Et de Python aussi');
    const results = mem.search('javascript');
    expect(results.length).toBe(1);
    expect(results[0].content).toContain('JavaScript');
  });
});

describe('routeToAgent', () => {
  it('devrait router vers l\'agent avec le plus de keywords', () => {
    const agents: AgentCapability[] = [
      { name: 'coder', keywords: ['code', 'function', 'bug'] },
      { name: 'writer', keywords: ['article', 'blog', 'text'] },
    ];
    const result = routeToAgent('Fix this bug in the code function', agents);
    expect(result).toBe('coder');
  });

  it('devrait retourner default si aucun match', () => {
    const result = routeToAgent('random topic', [{ name: 'coder', keywords: ['code'] }]);
    expect(result).toBe('default');
  });
});

describe('buildGuardrailCheck', () => {
  it('devrait bloquer un outil interdit', () => {
    const result = buildGuardrailCheck({ tool: 'rm', input: {} }, ['rm', 'format'], []);
    expect(result.allowed).toBe(false);
  });

  it('devrait demander confirmation pour un outil sensible', () => {
    const result = buildGuardrailCheck({ tool: 'write_file', input: {} }, [], ['write_file']);
    expect(result.allowed).toBe(true);
    expect(result.needsConfirmation).toBe(true);
  });

  it('devrait autoriser un outil normal', () => {
    const result = buildGuardrailCheck({ tool: 'search', input: {} }, ['rm'], ['write_file']);
    expect(result.allowed).toBe(true);
    expect(result.needsConfirmation).toBe(false);
  });
});

run();
