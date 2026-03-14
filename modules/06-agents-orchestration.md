# Module 06 — Agents & Orchestration

> **Objectif** : Comprendre et implementer des agents IA autonomes. Maitriser le pattern ReAct, l'orchestration multi-agent, les guardrails et la gestion de la memoire.
> **Difficulte** : ⭐⭐⭐ (avance)
> **Prerequis** : Module 04 (API Claude), Module 05 (MCP)
> **Duree estimee** : 4 heures

---

## 1. Qu'est-ce qu'un agent IA ?

Un agent IA est un programme qui utilise un LLM pour **decider** quelle action executer, **observe** le resultat, et **itere** jusqu'a atteindre un objectif.

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

> **Analogie** : un chatbot classique est comme un employe qui repond aux questions au comptoir. Un agent est comme un employe qui peut se lever, aller chercher des dossiers, passer des coups de fil et revenir avec une reponse complete.

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
interface AgentStep {
  thought: string;
  action?: { tool: string; input: Record<string, any> };
  observation?: string;
}

async function runAgent(
  objective: string,
  tools: Tool[],
  maxIterations = 10,
): Promise<string> {
  const steps: AgentStep[] = [];

  for (let i = 0; i < maxIterations; i++) {
    const prompt = buildAgentPrompt(objective, tools, steps);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      tools: tools.map(t => t.definition),
      messages: [{ role: 'user', content: prompt }],
    });

    // Si le modele veut utiliser un outil
    if (response.stop_reason === 'tool_use') {
      const toolCall = response.content.find(c => c.type === 'tool_use');
      const tool = tools.find(t => t.definition.name === toolCall.name);
      const result = await tool.execute(toolCall.input);

      steps.push({
        thought: `Je dois utiliser ${toolCall.name}`,
        action: { tool: toolCall.name, input: toolCall.input },
        observation: JSON.stringify(result),
      });
      continue;
    }

    // Reponse finale
    return response.content[0].text;
  }

  return 'Nombre maximum d\'iterations atteint.';
}
```

---

## 3. Claude Agent SDK

### 3.1 Creer un agent avec le SDK natif

```typescript
import { Agent } from 'claude_agent_sdk';

const agent = new Agent({
  model: 'claude-sonnet-4-20250514',
  tools: [readFileTool, searchTool, runTestsTool],
  systemPrompt: `Tu es un agent de code review.
    Analyse le code, identifie les problemes, et propose des corrections.`,
  maxTurns: 15,
});

const result = await agent.run('Review le fichier src/auth/auth.service.ts');
console.log(result.output);
```

---

## 4. Multi-agent

### 4.1 Orchestration par specialite

```typescript
const agents = {
  codeReview: new Agent({
    systemPrompt: 'Tu es expert en review de code TypeScript.',
    tools: [readFile, searchCode],
  }),
  security: new Agent({
    systemPrompt: 'Tu es expert en securite applicative. Cherche les vulnerabilites.',
    tools: [readFile, scanDependencies],
  }),
  testing: new Agent({
    systemPrompt: 'Tu es expert en testing. Genere des tests manquants.',
    tools: [readFile, writeFile, runTests],
  }),
};

async function orchestrate(task: string) {
  // Le routeur decide quel agent utiliser
  const category = await classifyTask(task);

  switch (category) {
    case 'review': return agents.codeReview.run(task);
    case 'security': return agents.security.run(task);
    case 'testing': return agents.testing.run(task);
    default: return agents.codeReview.run(task);
  }
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

## 6. Memoire d'agent

### 6.1 Memoire de conversation

```typescript
class AgentMemory {
  private entries: { role: string; content: string; timestamp: Date }[] = [];

  append(role: string, content: string) {
    this.entries.push({ role, content, timestamp: new Date() });
  }

  getRecent(n: number) {
    return this.entries.slice(-n);
  }

  search(query: string) {
    return this.entries.filter(e =>
      e.content.toLowerCase().includes(query.toLowerCase())
    );
  }

  summarize(): string {
    // Compresser les vieux messages pour economiser du contexte
    if (this.entries.length > 20) {
      const old = this.entries.slice(0, -10);
      const summary = `Resume des ${old.length} premiers echanges: ...`;
      this.entries = [
        { role: 'system', content: summary, timestamp: new Date() },
        ...this.entries.slice(-10),
      ];
    }
    return this.entries.map(e => `${e.role}: ${e.content}`).join('\n');
  }
}
```

---

## 7. Limites et bonnes pratiques

| Piege | Solution |
|-------|----------|
| Boucle infinie | maxIterations + timeout |
| Cout explosif | Budget de tokens par session |
| Hallucination d'action | Valider les outputs avant execution |
| Lenteur | Streaming + cache des resultats |
| Perte de contexte | Compression de memoire |

### La regle d'or des agents

> Un agent qui fait une erreur **coute** plus qu'un agent qui demande confirmation. Privilegiez toujours la securite a l'autonomie.

---

## Exercice du module

Dans le Lab 06, vous allez :
1. Implementer une boucle ReAct (parse Thought/Action/Observation)
2. Executer un pas d'agent (decide: tool call ou reponse finale)
3. Implementer la logique d'arret (max iterations, objectif atteint)
4. Construire un guardrail (valider les actions)
5. Creer une memoire d'agent (append/retrieve)
6. Orchestrer plusieurs agents (routage par categorie)

```bash
npm run lab:06
```

---

## Et ensuite ?

Felicitations — vous avez termine la **Partie 1 : Utiliser l'IA**. Vous savez prompter, utiliser les assistants code, appeler les APIs, creer des serveurs MCP, et orchestrer des agents.

La **Partie 2 : Comprendre l'IA** commence avec le Module 07 (Maths Essentielles). Ne vous inquietez pas du mot "maths" — il s'agit uniquement de 5 concepts concrets (vecteurs, matrices, fonctions d'activation, gradient, loss) qui eclairent tout ce que vous avez utilise dans la Partie 1.

> Par exemple, quand vous avez utilise la `temperature` dans vos prompts, vous avez manipule le parametre d'une fonction **softmax**. Quand le RAG "cherche" des documents similaires, il calcule une **similarite cosinus** entre des vecteurs. Le Module 07 vous donnera l'intuition derriere ces mecanismes.

Si vous preferez rester sur le cote pratique, vous pouvez sauter directement aux Modules 13-15 (RAG) — les maths ne sont pas un prerequis strict pour construire un RAG fonctionnel.
