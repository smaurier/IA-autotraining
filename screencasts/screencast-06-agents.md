# Screencast 06 — Agents & Orchestration

## Informations
- **Duree estimee** : 20-25 min
- **Module** : `modules/06-agents-orchestration.md`
- **Lab associe** : `labs/lab-06-agents/`
- **Prérequis** : Screencast 04, 05

## Setup
- [ ] Cle API Anthropic dans `.env`
- [ ] `pnpm add @anthropic-ai/sdk`
- [ ] Fichiers du lab prets dans `src/`
- [ ] Terminal avec le projet ouvert
- [ ] 2-3 fichiers TypeScript de test dans le projet pour les demos agent

## Script

### [00:00-03:30] Qu'est-ce qu'un agent IA ?
> Un chatbot classique repond aux questions. Un agent IA va plus loin : il decide quelle action exécuter, observe le résultat, et itere jusqu'a atteindre un objectif. Un chatbot, c'est un employe qui repond au comptoir. Un agent, c'est un employe qui peut se lever, aller chercher des dossiers, passer des coups de fil, et revenir avec une réponse complete.
**Action** : Afficher le schema de la boucle agent
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
> La différence clé avec le tool use simple du module 04 : l'agent est autonome. Il ne fait pas qu'un seul appel d'outil — il enchaine les actions, prend des decisions, et s'adapte selon les résultats.

### [03:30-08:00] Le pattern ReAct en pratique
> ReAct, c'est Thought, Action, Observation en boucle. On l'a vu en théorie au module 02. Maintenant, on l'implemente pour de vrai avec la boucle d'agent complete.
**Action** : Montrer l'implementation TypeScript pas a pas
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
**Action** : Exécuter l'agent avec un objectif concret
```
Objectif : "Quelles sont les ventes du mois dernier ?"

Thought: L'utilisateur veut connaitre les ventes. Je dois interroger la base.
Action: query_database("SELECT SUM(amount) FROM orders WHERE date >= '2025-02-01'")
Observation: 45230
Thought: J'ai la reponse. Je peux la communiquer.
Answer: Les ventes du mois dernier s'elevent a 45 230 euros.
```

### [08:00-11:30] Guardrails — Limiter les actions de l'agent
> Un agent autonome sans garde-fous, c'est dangereux. Il pourrait supprimer des fichiers, envoyer des emails, ou tourner en boucle infinie. Les guardrails sont essentiels.
**Action** : Implementer les guardrails
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
**Action** : Montrer le Human-in-the-loop
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
> La regle d'or des agents : un agent qui fait une erreur coute plus qu'un agent qui demandé confirmation. Privilegiez toujours la sécurité a l'autonomie.

### [11:30-15:00] Orchestration multi-agent
> Pour les taches complexes, un seul agent ne suffit pas. On peut specialiser plusieurs agents et les orchestrer avec un routeur.
**Action** : Montrer l'architecture multi-agent
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

// Routeur : le LLM decide quel agent utiliser
async function orchestrate(task: string) {
  const category = await classifyTask(task); // Appel LLM rapide
  switch (category) {
    case 'review': return agents.codeReview.run(task);
    case 'security': return agents.security.run(task);
    case 'testing': return agents.testing.run(task);
  }
}
```
**Action** : Exécuter le routeur avec différentes taches
> "Review le fichier auth.ts" → agent codeReview. "Y a-t-il des failles dans ce code ?" → agent security. "Genere les tests manquants pour utils.ts" → agent testing. Chaque agent est specialise et efficace dans son domaine.

### [15:00-18:00] Mémoire d'agent
> Un agent sans mémoire oublie tout entre chaque tour. Pour les sessions longues, il faut gérer la mémoire — stocker les echanges, compresser les anciens, et retrouver l'information pertinente.
**Action** : Montrer la classe AgentMemory
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
> La compression de mémoire est cruciale. Sans elle, le contexte explose et les couts avec. On garde les 10 derniers messages en detail et on résumé le reste.

### [18:00-21:00] Pieges courants et bonnes pratiques
> Les agents sont puissants mais fragiles. Voici les pieges les plus courants et comment les éviter.
**Action** : Afficher le tableau des pieges
```
| Piege              | Solution                              |
|--------------------|---------------------------------------|
| Boucle infinie     | maxIterations + timeout               |
| Cout explosif      | Budget de tokens par session          |
| Hallucination      | Valider les outputs avant execution   |
| Lenteur            | Streaming + cache des resultats       |
| Perte de contexte  | Compression de memoire                |
```
**Action** : Montrer le Claude Agent SDK
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
> Le SDK simplifie tout : gestion de la boucle, des tools, du contexte. Mais comprendre les mécanismes sous-jacents est essentiel pour debugger quand ça ne marche pas.

### [21:00-23:00] Demo complete — agent de code review
> Pour conclure, une demo complete : un agent qui review un fichier, identifie les problèmes, propose des corrections, et vérifié que les tests passent.
**Action** : Exécuter l'agent de bout en bout
```
Objectif: "Review src/utils/parser.ts et corrige les problemes trouves"

Iteration 1: read_file("src/utils/parser.ts")
  → Lit le fichier
Iteration 2: Thought: Je vois 3 problemes — types any, pas de gestion d'erreur, ...
  → search("parser" dans les tests)
Iteration 3: Thought: Pas de tests. Je vais corriger le code ET generer les tests.
  → write_file("src/utils/parser.ts", codeCorrige)
Iteration 4: write_file("src/utils/parser.test.ts", tests)
Iteration 5: run_tests("src/utils/parser.test.ts")
  → 5/5 tests passent
Answer: "J'ai corrige 3 problemes et ajoute 5 tests. Voici le resume..."
```

### [23:00-25:00] Récapitulatif
> On a vu comment construire un agent IA de A a Z : la boucle ReAct, les guardrails, l'orchestration multi-agent, la mémoire, et les bonnes pratiques. Les agents sont l'avenir de l'IA appliquee — mais n'oubliez jamais que la sécurité prime sur l'autonomie.
**Action** : Afficher le résumé
```
Agent = LLM + Outils + Boucle + Memoire + Guardrails

1. ReAct : Thought → Action → Observation → repeat
2. Guardrails : limiter, bloquer, confirmer
3. Multi-agent : specialiser et orchestrer
4. Memoire : stocker, compresser, retrouver
5. Production : timeout, budget, validation, human-in-the-loop
```

## Points d'attention pour l'enregistrement
- Montrer les iterations de l'agent en temps réel (pas de pre-enregistrement)
- Insister sur les guardrails — c'est le message le plus important
- La demo multi-agent peut etre simulee si les appels API sont trop lents
- Montrer le cout total de la session agent (nombre d'appels, tokens consommes)
- Faire la demo d'une boucle infinie (controlled) pour montrer pourquoi maxIterations est vital
