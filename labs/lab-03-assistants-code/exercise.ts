import { createTestRunner } from '../test-utils.ts';

const { describe, it, expect, run } = createTestRunner('Lab 03 — Assistants Code');

// ============================================================
// Types
// ============================================================

interface Section {
  title: string;
  content: string;
}

interface ClaudeMdConfig {
  project: string;
  conventions: string[];
  commands: { name: string; cmd: string }[];
}

interface ProductivityGain {
  speedup: number;
  timeSaved: number;
}

// ============================================================
// TODO: Implementez les fonctions ci-dessous
// ============================================================

function parseClaudeMd(_content: string): { sections: Section[] } {
  // TODO: Parser les sections ## Title\ncontent
  throw new Error('TODO: Not implemented');
}

function generateClaudeMd(_config: ClaudeMdConfig): string {
  // TODO: Generer un fichier CLAUDE.md structure
  throw new Error('TODO: Not implemented');
}

function buildCursorRules(_rules: string[]): string {
  // TODO: Joindre les regles avec des retours a la ligne
  throw new Error('TODO: Not implemented');
}

function analyzeCodeReviewPrompt(_diff: string, _focus: string): string {
  // TODO: Construire un prompt structure de code review
  throw new Error('TODO: Not implemented');
}

function estimateProductivityGain(
  _tasksWithAi: number,
  _tasksWithout: number,
  _avgTimeWithAi: number,
  _avgTimeWithout: number,
): ProductivityGain {
  // TODO: Calculer speedup et timeSaved
  throw new Error('TODO: Not implemented');
}

// ============================================================
// Tests
// ============================================================

describe('parseClaudeMd', () => {
  it('devrait parser les sections d\'un fichier CLAUDE.md', () => {
    const content = '## Conventions\nUtiliser TypeScript strict\n\n## Commands\n- build: npm run build';
    const result = parseClaudeMd(content);
    expect(result.sections.length).toBe(2);
    expect(result.sections[0].title).toBe('Conventions');
    expect(result.sections[0].content).toContain('TypeScript strict');
  });

  it('devrait gerer une seule section', () => {
    const content = '## Setup\nRun npm install';
    const result = parseClaudeMd(content);
    expect(result.sections.length).toBe(1);
    expect(result.sections[0].title).toBe('Setup');
  });

  it('devrait retourner un tableau vide si pas de sections', () => {
    const result = parseClaudeMd('Juste du texte sans sections');
    expect(result.sections.length).toBe(0);
  });
});

describe('generateClaudeMd', () => {
  it('devrait generer un titre de projet', () => {
    const result = generateClaudeMd({
      project: 'MonProjet',
      conventions: ['TypeScript strict'],
      commands: [{ name: 'build', cmd: 'npm run build' }],
    });
    expect(result).toContain('# MonProjet');
  });

  it('devrait inclure les conventions en liste', () => {
    const result = generateClaudeMd({
      project: 'Test',
      conventions: ['ESLint', 'Prettier'],
      commands: [],
    });
    expect(result).toContain('- ESLint');
    expect(result).toContain('- Prettier');
  });

  it('devrait inclure les commandes formatees', () => {
    const result = generateClaudeMd({
      project: 'Test',
      conventions: [],
      commands: [{ name: 'test', cmd: 'npm test' }],
    });
    expect(result).toContain('**test**');
    expect(result).toContain('`npm test`');
  });
});

describe('buildCursorRules', () => {
  it('devrait joindre les regles avec des newlines', () => {
    const result = buildCursorRules(['Use TypeScript', 'No any types']);
    expect(result).toBe('Use TypeScript\nNo any types');
  });
});

describe('analyzeCodeReviewPrompt', () => {
  it('devrait contenir le diff et le focus', () => {
    const result = analyzeCodeReviewPrompt('+ const x = 1;', 'performance');
    expect(result).toContain('+ const x = 1;');
    expect(result).toContain('performance');
  });
});

describe('estimateProductivityGain', () => {
  it('devrait calculer le speedup correctement', () => {
    const result = estimateProductivityGain(10, 10, 30, 60);
    expect(result.speedup).toBe(2);
  });

  it('devrait calculer le temps economise', () => {
    const result = estimateProductivityGain(10, 10, 30, 60);
    expect(result.timeSaved).toBe(300);
  });
});

run();
