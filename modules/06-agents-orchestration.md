# Module 06 — Agents & Orchestration

> **Objectif** : Comprendre et implementer des agents IA autonomes. Maîtriser le pattern ReAct, l'orchestration multi-agent, les guardrails et la gestion de la mémoire.
> **Difficulte** : ⭐⭐⭐ (avance)
> **Prérequis** : Module 04 (API Claude), Module 05 (MCP)
> **Duree estimee** : 4 heures

---

## 1. Qu'est-ce qu'un agent IA ?

Un agent IA est un programme qui utilise un LLM pour **decider** quelle action exécuter, **observe** le résultat, et **itere** jusqu'a atteindre un objectif.

```
          ┌─────────────┐
          │   Objectif   │
          └──────┬──────┘
                 ▼
          ┌─────────────┐
     ┌───▶│   Penser    │ (le LLM analyse la situation)
     │    └──────┬──────┘
     │           ▼
     │    ┌─────────────┐
     │    │    Agir      │ (appeler un outil)
     │    └──────┬──────┘
     │           ▼
     │    ┌─────────────┐
     └────│  Observer    │ (analyser le resultat)
          └─────────────┘
```

> **Analogie** : un chatbot classique est comme un employe qui repond aux questions au comptoir. Un agent est comme un employe qui peut se lever, aller chercher des dossiers, passer des coups de fil et revenir avec une réponse complete.

---

## 2. Le pattern ReAct

### 2.1 Thought → Action → Observation

```
Thought: L'utilisateur veut connaitre les ventes du mois dernier.
         Je dois interroger la base de donnees.
Action: query_database("SELECT SUM(amount) FROM orders WHERE date >= '2025-02-01'")
Observation: Le resultat est 45,230€.
Thought: J'ai la reponse. Je peux la communiquer a l'utilisateur.
Answer: Les ventes du mois dernier s'elevent a 45 230€.
```

### 2.2 Implementation en TypeScript

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// Definition d'un outil (format attendu par l'API Claude)
interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

// Map nom → fonction d'execution
type ToolExecutor = (input: Record<string, unknown>) => Promise<unknown>;

async function runAgent(
  objective: string,
  toolDefs: ToolDef[],
  toolExecutors: Map<string, ToolExecutor>,
  maxIterations = 10,
): Promise<string> {
  // On accumule les messages pour conserver le contexte complet
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: objective },
  ];

  for (let i = 0; i < maxIterations; i++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools: toolDefs,
      messages,
    });

    // Ajouter la reponse de l'assistant au contexte
    messages.push({ role: 'assistant', content: response.content });

    // Si le modele veut utiliser un outil (stop_reason === 'tool_use')
    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const executor = toolExecutors.get(block.name);
          try {
            const result = await executor!(block.input as Record<string, unknown>);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          } catch (err) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: `Erreur: ${(err as Error).message}`,
              is_error: true,
            });
          }
        }
      }

      // Renvoyer les resultats d'outils dans un message user
      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    // stop_reason === 'end_turn' → reponse finale
    const textBlock = response.content.find(b => b.type === 'text');
    return textBlock ? textBlock.text : '';
  }

  return 'Nombre maximum d\'iterations atteint.';
}
```

> **Point clé** : chaque appel a `client.messages.create()` recoit l'historique complet (`messages`). Quand Claude renvoie un `tool_use`, on exécuté l'outil et on ajoute un message `user` contenant un bloc `tool_result` avec le `tool_use_id` correspondant. Claude peut alors continuer son raisonnement.

---

## 3. Claude Agent SDK

### 3.1 Créer un agent avec le SDK natif

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const result = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 4096,
  system: `Tu es un agent de code review.
    Analyse le code, identifie les problemes, et propose des corrections.`,
  messages: [
    { role: 'user', content: 'Review le fichier src/auth/auth.service.ts' },
  ],
});

console.log(result.content[0].type === 'text' ? result.content[0].text : result);
```

---

## 4. Multi-agent

### 4.1 Orchestration par specialite

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

// Un "agent" est simplement un system prompt + des outils + la boucle ReAct
interface AgentConfig {
  systemPrompt: string;
  tools: Anthropic.Tool[];
  toolExecutors: Map<string, ToolExecutor>;
}

async function runSpecializedAgent(
  config: AgentConfig,
  task: string,
  maxIterations = 10,
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: task },
  ];

  for (let i = 0; i < maxIterations; i++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: config.systemPrompt,
      tools: config.tools,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const executor = config.toolExecutors.get(block.name);
          const result = await executor!(block.input as Record<string, unknown>);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }
      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    const textBlock = response.content.find(b => b.type === 'text');
    return textBlock ? textBlock.text : '';
  }
  return 'Max iterations atteint.';
}

// Configuration des agents specialises
const agents: Record<string, AgentConfig> = {
  review: {
    systemPrompt: 'Tu es expert en review de code TypeScript.',
    tools: [readFileTool, searchCodeTool],
    toolExecutors: new Map([['read_file', readFileExec], ['search_code', searchCodeExec]]),
  },
  security: {
    systemPrompt: 'Tu es expert en securite applicative. Cherche les vulnerabilites.',
    tools: [readFileTool, scanDependenciesTool],
    toolExecutors: new Map([['read_file', readFileExec], ['scan_deps', scanDepsExec]]),
  },
  testing: {
    systemPrompt: 'Tu es expert en testing. Genere des tests manquants.',
    tools: [readFileTool, writeFileTool, runTestsTool],
    toolExecutors: new Map([['read_file', readFileExec], ['write_file', writeFileExec], ['run_tests', runTestsExec]]),
  },
};

// Le routeur utilise Claude pour classifier la tache
async function classifyTask(task: string): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 50,
    messages: [{ role: 'user', content:
      `Classifie cette tache en une seule categorie parmi: review, security, testing.\nTache: ${task}` }],
  });
  const text = response.content[0].type === 'text' ? response.content[0].text : 'review';
  return text.trim().toLowerCase();
}

async function orchestrate(task: string): Promise<string> {
  const category = await classifyTask(task);
  const config = agents[category] ?? agents.review;
  return runSpecializedAgent(config, task);
}
```

---

## 5. Guardrails

### 5.1 Limiter les actions

```typescript
const guardrails = {
  allowedTools: ['read_file', 'search', 'run_tests'],
  blockedTools: ['delete_file', 'format_disk', 'send_email'],
  maxIterations: 20,
  maxTokensPerTurn: 4096,
  timeoutMs: 60_000,
  requireConfirmation: ['write_file', 'deploy'],
};

function validateAction(action: AgentAction): boolean {
  if (guardrails.blockedTools.includes(action.tool)) {
    console.log(`BLOCKED: ${action.tool} is not allowed`);
    return false;
  }
  if (!guardrails.allowedTools.includes(action.tool)) {
    console.log(`UNKNOWN: ${action.tool} is not in allowed list`);
    return false;
  }
  return true;
}
```

### 5.2 Human-in-the-loop

```typescript
async function executeWithConfirmation(action: AgentAction): Promise<string> {
  if (guardrails.requireConfirmation.includes(action.tool)) {
    console.log(`L'agent veut executer: ${action.tool}(${JSON.stringify(action.input)})`);
    const answer = await prompt('Approuver ? (y/n) ');
    if (answer !== 'y') {
      return 'Action refusee par l\'utilisateur.';
    }
  }
  return executeAction(action);
}
```

---

## 6. Mémoire d'agent

### 6.1 Mémoire de conversation (avec persistance)

```typescript
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

interface MemoryEntry {
  role: string;
  content: string;
  timestamp: string; // ISO string pour la serialisation JSON
}

class AgentMemory {
  private entries: MemoryEntry[] = [];
  private filePath: string | null;

  constructor(filePath?: string) {
    this.filePath = filePath ?? null;
    if (this.filePath && existsSync(this.filePath)) {
      this.entries = JSON.parse(readFileSync(this.filePath, 'utf-8'));
    }
  }

  private persist() {
    if (this.filePath) {
      writeFileSync(this.filePath, JSON.stringify(this.entries, null, 2));
    }
  }

  append(role: string, content: string) {
    this.entries.push({ role, content, timestamp: new Date().toISOString() });
    this.persist();
  }

  getRecent(n: number): MemoryEntry[] {
    return this.entries.slice(-n);
  }

  search(query: string): MemoryEntry[] {
    return this.entries.filter(e =>
      e.content.toLowerCase().includes(query.toLowerCase()),
    );
  }

  /** Convertit les entrees en format messages pour l'API Claude */
  toMessages(): Anthropic.MessageParam[] {
    return this.entries
      .filter(e => e.role === 'user' || e.role === 'assistant')
      .map(e => ({ role: e.role as 'user' | 'assistant', content: e.content }));
  }

  /** Compresse les vieux messages pour economiser du contexte */
  summarize(): string {
    if (this.entries.length > 20) {
      const old = this.entries.slice(0, -10);
      const summary = `Resume des ${old.length} premiers echanges: ...`;
      this.entries = [
        { role: 'system', content: summary, timestamp: new Date().toISOString() },
        ...this.entries.slice(-10),
      ];
      this.persist();
    }
    return this.entries.map(e => `${e.role}: ${e.content}`).join('\n');
  }

  clear() {
    this.entries = [];
    this.persist();
  }
}

// Utilisation
const memory = new AgentMemory('./agent-memory.json');
memory.append('user', 'Quels sont les tests en echec ?');
memory.append('assistant', 'Il y a 3 tests en echec dans auth.spec.ts.');

// Injecter la memoire dans un appel Claude
const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 4096,
  messages: memory.toMessages(),
});
```

---

## 7. Limites et bonnes pratiques

| Piege | Solution |
|-------|----------|
| Boucle infinie | maxIterations + timeout |
| Cout explosif | Budget de tokens par session |
| Hallucination d'action | Valider les outputs avant exécution |
| Lenteur | Streaming + cache des résultats |
| Perte de contexte | Compression de mémoire |

### La regle d'or des agents

> Un agent qui fait une erreur **coute** plus qu'un agent qui demandé confirmation. Privilegiez toujours la sécurité a l'autonomie.

---

## Exercice du module

Dans le Lab 06, vous allez :
1. Implementer une boucle ReAct (parse Thought/Action/Observation)
2. Exécuter un pas d'agent (decide: tool call ou réponse finale)
3. Implementer la logique d'arret (max iterations, objectif atteint)
4. Construire un guardrail (valider les actions)
5. Créer une mémoire d'agent (append/retrieve)
6. Orchestrer plusieurs agents (routage par categorie)

```bash
npm run lab:06
```

---

## Et ensuite ?

Felicitations — vous avez termine la **Partie 1 : Utiliser l'IA**. Vous savez prompter, utiliser les assistants code, appeler les APIs, créer des serveurs MCP, et orchestrer des agents.

La **Partie 2 : Comprendre l'IA** commence avec le Module 07 (Maths Essentielles). Ne vous inquietez pas du mot "maths" — il s'agit uniquement de 5 concepts concrets (vecteurs, matrices, fonctions d'activation, gradient, loss) qui eclairent tout ce que vous avez utilise dans la Partie 1.

> Par exemple, quand vous avez utilise la `temperature` dans vos prompts, vous avez manipule le paramètre d'une fonction **softmax**. Quand le RAG "cherche" des documents similaires, il calcule une **similarite cosinus** entre des vecteurs. Le Module 07 vous donnera l'intuition derriere ces mécanismes.

Si vous preferez rester sur le cote pratique, vous pouvez sauter directement aux Modules 13-15 (RAG) — les maths ne sont pas un prérequis strict pour construire un RAG fonctionnel.

---

<!-- parcours-recommande -->

::: tip Parcours recommandé
1. **Screencast** : [screencast 06 agents](../screencasts/screencast-06-agents.md)
2. **Lab** : [lab-06-agents-orchestration](../labs/lab-06-agents-orchestration/README)
3. **Quiz** : [quiz 06 agents](../quizzes/quiz-06-agents.html)
:::
