import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 15 — Chatbot RAG');

// ============================================================
// Types
// ============================================================

interface Message {
  role: string;
  content: string;
}

interface Conversation {
  messages: Message[];
}

// ============================================================
// Exercise 1 — createConversation
// ============================================================

function createConversation(systemPrompt: string): Conversation {
  return {
    messages: [{ role: 'system', content: systemPrompt }],
  };
}

// ============================================================
// Exercise 2 — addMessage
// ============================================================

function addMessage(conv: Conversation, role: string, content: string): void {
  conv.messages.push({ role, content });
}

// ============================================================
// Exercise 3 — compressHistory
// ============================================================

function compressHistory(messages: Message[], maxMessages: number): Message[] {
  if (messages.length <= maxMessages) return [...messages];
  const system = messages[0];
  const recent = messages.slice(-(maxMessages - 1));
  return [system, ...recent];
}

// ============================================================
// Exercise 4 — buildRagChatPrompt
// ============================================================

function buildRagChatPrompt(
  history: Message[],
  context: string[],
  question: string,
): string {
  const historyStr = history
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');
  const contextStr = context
    .map((c, i) => `[${i + 1}] ${c}`)
    .join('\n');
  return `${historyStr}\n\nContext:\n${contextStr}\n\nQuestion: ${question}`;
}

// ============================================================
// Exercise 5 — countTokensEstimate
// ============================================================

function countTokensEstimate(text: string): number {
  if (text.length === 0) return 0;
  return Math.ceil(text.length / 4);
}

// ============================================================
// Exercise 6 — extractCitations
// ============================================================

function extractCitations(text: string): { text: string; sources: number[] } {
  const sources: number[] = [];
  const regex = /\[(\d+)\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const num = parseInt(match[1], 10);
    if (!sources.includes(num)) {
      sources.push(num);
    }
  }
  const cleaned = text.replace(/\[\d+\]/g, '');
  return { text: cleaned, sources };
}

// ============================================================
// Tests
// ============================================================

describe('createConversation', () => {
  it('should create a conversation with a system message', () => {
    const conv = createConversation('You are helpful.');
    expect(conv.messages).toHaveLength(1);
    expect(conv.messages[0].role).toBe('system');
    expect(conv.messages[0].content).toBe('You are helpful.');
  });
});

describe('addMessage', () => {
  it('should add a user message to the conversation', () => {
    const conv = createConversation('System');
    addMessage(conv, 'user', 'Hello');
    expect(conv.messages).toHaveLength(2);
    expect(conv.messages[1].role).toBe('user');
    expect(conv.messages[1].content).toBe('Hello');
  });

  it('should add an assistant message', () => {
    const conv = createConversation('System');
    addMessage(conv, 'user', 'Hi');
    addMessage(conv, 'assistant', 'Hello!');
    expect(conv.messages).toHaveLength(3);
  });
});

describe('compressHistory', () => {
  it('should keep system message and last N-1 messages', () => {
    const messages: Message[] = [
      { role: 'system', content: 'System' },
      { role: 'user', content: 'msg1' },
      { role: 'assistant', content: 'msg2' },
      { role: 'user', content: 'msg3' },
      { role: 'assistant', content: 'msg4' },
    ];
    const compressed = compressHistory(messages, 3);
    expect(compressed).toHaveLength(3);
    expect(compressed[0].role).toBe('system');
    expect(compressed[1].content).toBe('msg3');
    expect(compressed[2].content).toBe('msg4');
  });
});

describe('buildRagChatPrompt', () => {
  it('should include history, context and question', () => {
    const history: Message[] = [
      { role: 'user', content: 'Previous question' },
      { role: 'assistant', content: 'Previous answer' },
    ];
    const result = buildRagChatPrompt(history, ['Context chunk 1'], 'New question?');
    expect(result).toContain('Previous question');
    expect(result).toContain('Context chunk 1');
    expect(result).toContain('New question?');
  });
});

describe('countTokensEstimate', () => {
  it('should estimate tokens as ceil(chars/4)', () => {
    expect(countTokensEstimate('Hello world!')).toBe(3);
  });

  it('should handle empty string', () => {
    expect(countTokensEstimate('')).toBe(0);
  });
});

describe('extractCitations', () => {
  it('should extract citation numbers from text', () => {
    const result = extractCitations('Paris is the capital [1] of France [2].');
    expect(result.sources).toEqual([1, 2]);
  });

  it('should return cleaned text without citation markers', () => {
    const result = extractCitations('Answer [1] here.');
    expect(result.text).toBe('Answer  here.');
    expect(result.sources).toEqual([1]);
  });

  it('should handle text with no citations', () => {
    const result = extractCitations('No citations here.');
    expect(result.sources).toHaveLength(0);
    expect(result.text).toBe('No citations here.');
  });
});

run();
