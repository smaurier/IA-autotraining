# Module 20 — Frameworks agentiques : LangGraph, CrewAI et orchestration avancee

> **Objectif** : Comprendre la difference entre agents et chaînes simples. Maîtriser LangGraph en TypeScript (graphes d'etats, noeuds, aretes conditionnelles, human-in-the-loop). Decouvrir CrewAI pour la collaboration multi-agent. Implementer les principaux patterns d'orchestration (sequentiel, parallele, superviseur, hierarchique).
>
> **Difficulte** : ⭐⭐⭐⭐ (avance)
> **Prerequis** : Module 04 (API Claude/OpenAI), Module 06 (Agents & Orchestration)
> **Duree estimee** : 5 heures

---

## 1. Agents vs chaînes simples : quand passer au niveau superieur ?

### 1.1 Rappel : qu'est-ce qu'une chaîne ?

Une chaîne (chain) est un pipeline **lineaire** : input → etape 1 → etape 2 → output. Chaque etape est connue a l'avance, l'ordre est fixe.

```
Chaîne simple (deterministe) :

  Requete utilisateur
       │
       ▼
  ┌──────────────┐
  │ Reformulation │ (prompt template)
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ Recherche RAG │ (vector store)
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │ Generation    │ (LLM)
  └──────┬───────┘
         ▼
     Reponse
```

### 1.2 Qu'est-ce qu'un agent ?

Un agent utilise un LLM pour **decider dynamiquement** quelle action executer a chaque etape. Le flux n'est pas predetermine.

```
Agent (dynamique) :

  Requete utilisateur
       │
       ▼
  ┌──────────────┐
  │   LLM decide  │◄──────────────────┐
  └──────┬───────┘                    │
         │                            │
    ┌────┴────┐                       │
    │ Action? │                       │
    └────┬────┘                       │
    ┌────┴─────┬──────┬──────┐       │
    ▼          ▼      ▼      ▼       │
  Outil A   Outil B  Outil C  Fin    │
    │          │      │              │
    └──────────┴──────┘              │
         │                            │
    Observation ──────────────────────┘
```

> **Analogie** : une chaîne, c'est une recette de cuisine. Vous suivez les etapes dans l'ordre. Un agent, c'est un chef cuisinier : il goute, ajuste, decide de recommencer une etape si le resultat n'est pas bon, ajoute un ingredient imprévu.

### 1.3 Quand utiliser quoi ?

| Critere | Chaîne | Agent | Framework agentique |
|---------|--------|-------|-------------------|
| Flux previsible | ✅ Ideal | Surpuissant | Surpuissant |
| Logique conditionnelle simple | ⚠️ If/else applicatif | ✅ Bon | Surpuissant |
| Decision complexe multi-etapes | ❌ Trop rigide | ✅ Bon | ✅ Ideal |
| Collaboration multi-agent | ❌ Impossible | ⚠️ Artisanal | ✅ Ideal |
| Human-in-the-loop | ❌ Complexe | ⚠️ Artisanal | ✅ Natif |
| Debugging / observabilite | ✅ Simple | ⚠️ Difficile | ✅ Integre |
| Cout et latence | Faible | Moyen | Moyen-eleve |

> **Conseil** : commencez toujours par une chaîne simple. Ajoutez un agent quand la chaîne ne suffit plus. Passez a un framework agentique quand vous avez besoin de graphes complexes, de persistence d'etat, ou de collaboration multi-agent.

---

## 2. LangGraph en TypeScript

### 2.1 Qu'est-ce que LangGraph ?

LangGraph est une librairie de LangChain qui permet de creer des **graphes d'etats** (state machines) pour orchestrer des agents. Chaque noeud est une fonction, les aretes definissent le flux, et l'etat est partage entre les noeuds.

```
┌──────────────────────────────────────────────────────────────┐
│         LANGGRAPH = GRAPHE D'ETATS POUR AGENTS                │
│                                                               │
│  Concepts cles :                                             │
│  • State  : objet partage entre les noeuds (context)        │
│  • Node   : fonction qui transforme le state                 │
│  • Edge   : connexion entre noeuds (deterministe)           │
│  • Conditional Edge : branchement dynamique (le LLM decide) │
│  • START / END : noeuds speciaux de debut et fin             │
│  • Checkpointing : persistence de l'etat entre les tours    │
│  • Human-in-the-loop : interruption pour validation humaine  │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Installation

```bash
npm install @langchain/langgraph @langchain/core @langchain/openai
```

### 2.3 Premier graphe : agent ReAct

```typescript
// ============================================================
// Agent ReAct avec LangGraph
// ============================================================

import { StateGraph, Annotation, END, START } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';

// ────────────────────────────────────────────────────────────
// 1. Definir l'etat du graphe
// ────────────────────────────────────────────────────────────
const AgentState = Annotation.Root({
    // Les messages sont accumules (pas remplaces)
    messages: Annotation<BaseMessage[]>({
        reducer: (prev, next) => [...prev, ...next],
        default: () => [],
    }),
});

// ────────────────────────────────────────────────────────────
// 2. Definir les outils
// ────────────────────────────────────────────────────────────
const searchTool = tool(
    async ({ query }: { query: string }) => {
        // Simuler une recherche
        const results: Record<string, string> = {
            'meteo paris': 'Il fait 18°C a Paris, ciel degage.',
            'population france': 'La France compte environ 68 millions d\'habitants.',
        };
        const key = Object.keys(results).find(k =>
            query.toLowerCase().includes(k)
        );
        return key ? results[key] : `Aucun resultat pour "${query}"`;
    },
    {
        name: 'search',
        description: 'Recherche des informations sur le web',
        schema: z.object({
            query: z.string().describe('La requete de recherche'),
        }),
    },
);

const calculatorTool = tool(
    async ({ expression }: { expression: string }) => {
        try {
            // Attention : eval est dangereux en production !
            // Utiliser une librairie comme mathjs
            const result = Function(`"use strict"; return (${expression})`)();
            return `Resultat : ${result}`;
        } catch {
            return 'Expression invalide';
        }
    },
    {
        name: 'calculator',
        description: 'Effectue un calcul mathematique',
        schema: z.object({
            expression: z.string().describe('L\'expression mathematique a evaluer'),
        }),
    },
);

const tools = [searchTool, calculatorTool];

// ────────────────────────────────────────────────────────────
// 3. Definir le modele avec les outils
// ────────────────────────────────────────────────────────────
const model = new ChatOpenAI({
    modelName: 'gpt-4o',
    temperature: 0,
}).bindTools(tools);

// ────────────────────────────────────────────────────────────
// 4. Definir les noeuds
// ────────────────────────────────────────────────────────────

// Noeud "agent" : le LLM reflechit et decide
async function agentNode(
    state: typeof AgentState.State,
): Promise<Partial<typeof AgentState.State>> {
    const response = await model.invoke(state.messages);
    return { messages: [response] };
}

// Noeud "tools" : execute les outils demandes par le LLM
const toolNode = new ToolNode(tools);

// ────────────────────────────────────────────────────────────
// 5. Definir le routage conditionnel
// ────────────────────────────────────────────────────────────
function shouldContinue(state: typeof AgentState.State): 'tools' | typeof END {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    // Si le LLM a demande d'utiliser des outils → continuer
    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
        return 'tools';
    }
    // Sinon → fin
    return END;
}

// ────────────────────────────────────────────────────────────
// 6. Construire le graphe
// ────────────────────────────────────────────────────────────
const graph = new StateGraph(AgentState)
    .addNode('agent', agentNode)
    .addNode('tools', toolNode)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', shouldContinue, {
        tools: 'tools',
        [END]: END,
    })
    .addEdge('tools', 'agent')  // Apres les outils, retour a l'agent
    .compile();

// ────────────────────────────────────────────────────────────
// 7. Executer
// ────────────────────────────────────────────────────────────
const result = await graph.invoke({
    messages: [new HumanMessage('Quelle est la meteo a Paris ?')],
});

const lastMsg = result.messages[result.messages.length - 1];
console.log(lastMsg.content);
// → "Il fait 18°C a Paris avec un ciel degage."
```

> **Analogie** : le graphe LangGraph, c'est comme un organigramme de decision. Chaque boîte (noeud) fait un travail specifique, et les fleches (aretes) definissent "ou aller ensuite". Les aretes conditionnelles sont comme des losanges de decision dans un flowchart.

### 2.4 Visualisation du graphe

```
        ┌───────┐
        │ START │
        └───┬───┘
            │
            ▼
        ┌───────┐
   ┌───▶│ agent │
   │    └───┬───┘
   │        │
   │   ┌────┴────┐
   │   │ Outils? │
   │   └────┬────┘
   │   Oui  │  Non
   │   ┌────┘  └────┐
   │   ▼             ▼
   │ ┌───────┐   ┌─────┐
   │ │ tools │   │ END │
   │ └───┬───┘   └─────┘
   │     │
   └─────┘
```

---

## 3. Patterns avances avec LangGraph

### 3.1 Human-in-the-loop (interruption pour validation)

```typescript
// ============================================================
// Agent avec validation humaine avant l'execution des outils
// ============================================================

import { MemorySaver } from '@langchain/langgraph';

// Utiliser un checkpointer pour persister l'etat
const checkpointer = new MemorySaver();

const graphWithHuman = new StateGraph(AgentState)
    .addNode('agent', agentNode)
    .addNode('tools', toolNode)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', shouldContinue, {
        tools: 'tools',
        [END]: END,
    })
    .addEdge('tools', 'agent')
    .compile({
        checkpointer,
        // Interrompre AVANT l'execution des outils
        interruptBefore: ['tools'],
    });

// ── Etape 1 : l'agent reflechit ──
const config = { configurable: { thread_id: 'session-123' } };

const step1 = await graphWithHuman.invoke(
    { messages: [new HumanMessage('Supprime le fichier config.yaml')] },
    config,
);

// L'execution s'arrete avant le noeud "tools"
console.log('Action proposee:', step1.messages[step1.messages.length - 1]);
// → tool_calls: [{ name: 'delete_file', args: { path: 'config.yaml' } }]

// ── Etape 2 : l'humain valide (ou refuse) ──
// Demander a l'utilisateur via une UI...
const userApproved = true;

if (userApproved) {
    // Reprendre l'execution la ou elle s'est arretee
    const step2 = await graphWithHuman.invoke(null, config);
    console.log('Resultat:', step2.messages[step2.messages.length - 1].content);
} else {
    console.log('Action annulee par l\'utilisateur');
}
```

> **Conseil** : utilisez `interruptBefore` pour les actions destructives (suppression, envoi d'email, paiement). L'agent propose l'action, l'humain valide, puis l'execution reprend.

### 3.2 Sous-graphes (graphe dans un graphe)

```typescript
// ============================================================
// Sous-graphe : un graphe specialise encapsule dans un noeud
// ============================================================

// Sous-graphe pour la recherche approfondie
const ResearchState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (prev, next) => [...prev, ...next],
        default: () => [],
    }),
    sources: Annotation<string[]>({
        reducer: (prev, next) => [...prev, ...next],
        default: () => [],
    }),
});

async function searchWeb(
    state: typeof ResearchState.State,
): Promise<Partial<typeof ResearchState.State>> {
    // Simuler une recherche web
    return {
        sources: ['https://example.com/article-1'],
        messages: [new AIMessage('Source trouvee: article-1')],
    };
}

async function summarize(
    state: typeof ResearchState.State,
): Promise<Partial<typeof ResearchState.State>> {
    const model = new ChatOpenAI({ modelName: 'gpt-4o', temperature: 0 });
    const response = await model.invoke([
        ...state.messages,
        new HumanMessage(`Resume les sources: ${state.sources.join(', ')}`),
    ]);
    return { messages: [response] };
}

const researchSubgraph = new StateGraph(ResearchState)
    .addNode('search', searchWeb)
    .addNode('summarize', summarize)
    .addEdge(START, 'search')
    .addEdge('search', 'summarize')
    .addEdge('summarize', END)
    .compile();

// Integrer le sous-graphe dans le graphe principal
const mainGraph = new StateGraph(AgentState)
    .addNode('agent', agentNode)
    .addNode('research', researchSubgraph)  // Sous-graphe comme noeud
    .addNode('tools', toolNode)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', (state) => {
        const last = state.messages[state.messages.length - 1] as AIMessage;
        if (last.content?.toString().includes('recherche approfondie')) {
            return 'research';
        }
        if (last.tool_calls?.length) return 'tools';
        return END;
    })
    .addEdge('research', 'agent')
    .addEdge('tools', 'agent')
    .compile();
```

### 3.3 Gestion de la memoire et du contexte

```typescript
// ============================================================
// State avec memoire structuree
// ============================================================

const AgentWithMemory = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (prev, next) => [...prev, ...next],
        default: () => [],
    }),
    // Memoire a court terme : les faits extraits de la conversation
    facts: Annotation<string[]>({
        reducer: (prev, next) => [...new Set([...prev, ...next])],
        default: () => [],
    }),
    // Compteur d'iterations pour eviter les boucles infinies
    iterationCount: Annotation<number>({
        reducer: (_prev, next) => next,
        default: () => 0,
    }),
});

async function extractFacts(
    state: typeof AgentWithMemory.State,
): Promise<Partial<typeof AgentWithMemory.State>> {
    const model = new ChatOpenAI({ modelName: 'gpt-4o', temperature: 0 });
    const response = await model.invoke([
        new HumanMessage(
            `Extrais les faits cles de cette conversation en une liste courte:\n` +
            state.messages.map(m => m.content).join('\n'),
        ),
    ]);
    const facts = (response.content as string).split('\n').filter(Boolean);
    return { facts };
}

// Garde-fou : limiter les iterations
function checkIterations(
    state: typeof AgentWithMemory.State,
): 'agent' | typeof END {
    if (state.iterationCount >= 10) {
        console.warn('Agent arrete : limite d\'iterations atteinte');
        return END;
    }
    return 'agent';
}
```

---

## 4. CrewAI : collaboration multi-agent

### 4.1 Concepts cles

CrewAI organise les agents en **equipages** (crews) ou chaque agent a un **role**, une **mission**, et peut **deleguer** des taches a d'autres agents.

```
┌──────────────────────────────────────────────────────────────┐
│         CREWAI : CONCEPTS                                     │
│                                                               │
│  Agent     = un specialiste avec un role et un objectif      │
│  Task      = une tache assignee a un agent                   │
│  Crew      = un groupe d'agents qui collaborent              │
│  Process   = comment les taches sont orchestrees             │
│              (sequentiel, hierarchique)                       │
│  Tools     = les outils accessibles a chaque agent           │
│  Delegation = un agent peut deleguer a un autre              │
└──────────────────────────────────────────────────────────────┘
```

> **Analogie** : CrewAI, c'est comme une equipe projet. Vous avez un chef de projet (superviseur), un developpeur, un testeur, et un redacteur. Chacun a son expertise, et ils se passent le travail selon un processus defini. Le chef de projet peut deleguer une tache de recherche au redacteur si necessaire.

### 4.2 Exemple : equipe de creation de contenu

```typescript
// ============================================================
// CrewAI-like pattern en TypeScript (concepts adaptes)
// ============================================================

import { ChatOpenAI } from '@langchain/openai';

// ────────────────────────────────────────────────────────────
// Definition des agents
// ────────────────────────────────────────────────────────────
interface AgentConfig {
    name: string;
    role: string;
    goal: string;
    backstory: string;
}

interface TaskConfig {
    description: string;
    expectedOutput: string;
    agent: AgentConfig;
}

const researcher: AgentConfig = {
    name: 'Researcher',
    role: 'Chercheur specialise',
    goal: 'Trouver des informations precises et actuelles sur un sujet',
    backstory: 'Tu es un chercheur meticuleux qui verifie ses sources et synthetise les informations de maniere claire.',
};

const writer: AgentConfig = {
    name: 'Writer',
    role: 'Redacteur technique',
    goal: 'Rediger un article clair, structure et engageant',
    backstory: 'Tu es un redacteur technique experimente qui sait vulgariser des sujets complexes sans perdre en precision.',
};

const reviewer: AgentConfig = {
    name: 'Reviewer',
    role: 'Relecteur et editeur',
    goal: 'Verifier la qualite, la coherence et l\'exactitude du contenu',
    backstory: 'Tu es un editeur rigoureux qui repere les erreurs, les imprecisions et les ameliorations possibles.',
};

// ────────────────────────────────────────────────────────────
// Definition des taches
// ────────────────────────────────────────────────────────────
const tasks: TaskConfig[] = [
    {
        description: 'Rechercher les dernieres tendances en IA agentique pour 2026',
        expectedOutput: 'Un rapport de recherche avec 5-7 points cles et leurs sources',
        agent: researcher,
    },
    {
        description: 'Rediger un article de blog de 800 mots base sur la recherche',
        expectedOutput: 'Un article structure avec introduction, corps et conclusion',
        agent: writer,
    },
    {
        description: 'Relire l\'article, corriger les erreurs et suggerer des ameliorations',
        expectedOutput: 'L\'article corrige avec une liste des modifications apportees',
        agent: reviewer,
    },
];

// ────────────────────────────────────────────────────────────
// Execution sequentielle (comme CrewAI sequential process)
// ────────────────────────────────────────────────────────────
async function runCrew(tasks: TaskConfig[]): Promise<string[]> {
    const model = new ChatOpenAI({ modelName: 'gpt-4o', temperature: 0.7 });
    const outputs: string[] = [];

    for (const task of tasks) {
        const previousContext = outputs.length > 0
            ? `\n\nContexte des etapes precedentes:\n${outputs.join('\n---\n')}`
            : '';

        const systemPrompt =
            `Tu es ${task.agent.name}, ${task.agent.role}.\n` +
            `Ton objectif : ${task.agent.goal}\n` +
            `Contexte : ${task.agent.backstory}`;

        const response = await model.invoke([
            { role: 'system', content: systemPrompt },
            {
                role: 'user',
                content: `Tache : ${task.description}\n` +
                    `Output attendu : ${task.expectedOutput}` +
                    previousContext,
            },
        ]);

        const output = response.content as string;
        outputs.push(`[${task.agent.name}] ${output}`);
        console.log(`✅ ${task.agent.name} a termine sa tache`);
    }

    return outputs;
}

const results = await runCrew(tasks);
console.log('\n=== Resultat final ===\n', results[results.length - 1]);
```

### 4.3 Pattern superviseur

```typescript
// ============================================================
// Pattern superviseur : un agent decide qui travaille
// ============================================================

interface WorkerAgent {
    name: string;
    description: string;
    execute: (task: string, context: string) => Promise<string>;
}

async function supervisorPattern(
    objective: string,
    workers: WorkerAgent[],
    maxRounds: number = 5,
): Promise<string> {
    const model = new ChatOpenAI({ modelName: 'gpt-4o', temperature: 0 });
    const history: string[] = [];

    const workerList = workers
        .map(w => `- ${w.name}: ${w.description}`)
        .join('\n');

    for (let round = 0; round < maxRounds; round++) {
        // Le superviseur decide qui doit travailler
        const decision = await model.invoke([
            {
                role: 'system',
                content:
                    `Tu es un superviseur qui coordonne une equipe.\n` +
                    `Ton equipe :\n${workerList}\n\n` +
                    `Reponds avec UN JSON : { "worker": "nom", "task": "description de la sous-tache" }\n` +
                    `OU { "worker": "FINISH", "result": "resultat final" } si l'objectif est atteint.`,
            },
            {
                role: 'user',
                content:
                    `Objectif : ${objective}\n\n` +
                    `Historique :\n${history.join('\n') || '(aucun)'}`,
            },
        ]);

        const parsed = JSON.parse(decision.content as string);

        if (parsed.worker === 'FINISH') {
            return parsed.result;
        }

        const worker = workers.find(w => w.name === parsed.worker);
        if (!worker) {
            history.push(`[Superviseur] Erreur : worker "${parsed.worker}" inconnu`);
            continue;
        }

        const result = await worker.execute(parsed.task, history.join('\n'));
        history.push(`[${worker.name}] Tache: ${parsed.task}\nResultat: ${result}`);
        console.log(`Round ${round + 1}: ${worker.name} → ${parsed.task}`);
    }

    return history[history.length - 1];
}
```

---

## 5. Patterns d'orchestration

### 5.1 Vue d'ensemble

```
┌──────────────────────────────────────────────────────────────┐
│         PATTERNS D'ORCHESTRATION                              │
│                                                               │
│  1. Sequentiel     A → B → C → Resultat                     │
│     Simple, previsible, adapte aux pipelines                 │
│                                                               │
│  2. Parallele      A ──┐                                     │
│                    B ──┤──▶ Merge → Resultat                 │
│                    C ──┘                                     │
│     Rapide, adapte aux taches independantes                  │
│                                                               │
│  3. Superviseur    Supervisor                                │
│                    ├─▶ Worker A                               │
│                    ├─▶ Worker B                               │
│                    └─▶ Worker C                               │
│     Flexible, le superviseur decide dynamiquement            │
│                                                               │
│  4. Hierarchique   Manager                                   │
│                    ├─▶ Team Lead 1                            │
│                    │   ├─▶ Worker A                           │
│                    │   └─▶ Worker B                           │
│                    └─▶ Team Lead 2                            │
│                        ├─▶ Worker C                           │
│                        └─▶ Worker D                           │
│     Scalable, adapte aux problemes complexes                 │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Pattern parallele avec LangGraph

```typescript
// ============================================================
// Execution parallele : plusieurs agents travaillent en meme temps
// ============================================================

const ParallelState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (prev, next) => [...prev, ...next],
        default: () => [],
    }),
    analysisA: Annotation<string>({
        reducer: (_prev, next) => next,
        default: () => '',
    }),
    analysisB: Annotation<string>({
        reducer: (_prev, next) => next,
        default: () => '',
    }),
    finalReport: Annotation<string>({
        reducer: (_prev, next) => next,
        default: () => '',
    }),
});

async function technicalAnalysis(
    state: typeof ParallelState.State,
): Promise<Partial<typeof ParallelState.State>> {
    const model = new ChatOpenAI({ modelName: 'gpt-4o', temperature: 0 });
    const last = state.messages[state.messages.length - 1];
    const response = await model.invoke([
        { role: 'system', content: 'Tu es un analyste technique. Analyse les aspects techniques.' },
        { role: 'user', content: last.content as string },
    ]);
    return { analysisA: response.content as string };
}

async function businessAnalysis(
    state: typeof ParallelState.State,
): Promise<Partial<typeof ParallelState.State>> {
    const model = new ChatOpenAI({ modelName: 'gpt-4o', temperature: 0 });
    const last = state.messages[state.messages.length - 1];
    const response = await model.invoke([
        { role: 'system', content: 'Tu es un analyste business. Analyse les aspects commerciaux.' },
        { role: 'user', content: last.content as string },
    ]);
    return { analysisB: response.content as string };
}

async function mergeAnalyses(
    state: typeof ParallelState.State,
): Promise<Partial<typeof ParallelState.State>> {
    const model = new ChatOpenAI({ modelName: 'gpt-4o', temperature: 0 });
    const response = await model.invoke([
        {
            role: 'user',
            content:
                `Synthetise ces deux analyses en un rapport unifie:\n\n` +
                `Analyse technique:\n${state.analysisA}\n\n` +
                `Analyse business:\n${state.analysisB}`,
        },
    ]);
    return { finalReport: response.content as string };
}

const parallelGraph = new StateGraph(ParallelState)
    .addNode('technical', technicalAnalysis)
    .addNode('business', businessAnalysis)
    .addNode('merge', mergeAnalyses)
    // Fan-out : les deux analyses partent en parallele
    .addEdge(START, 'technical')
    .addEdge(START, 'business')
    // Fan-in : les deux convergent vers merge
    .addEdge('technical', 'merge')
    .addEdge('business', 'merge')
    .addEdge('merge', END)
    .compile();
```

### 5.3 Comparaison des patterns

| Pattern | Latence | Complexite | Controle | Cas d'usage |
|---------|---------|------------|----------|-------------|
| Sequentiel | Elevee (N × latence) | Faible | Total | Pipeline de traitement |
| Parallele | Faible (max latence) | Moyenne | Total | Analyses independantes |
| Superviseur | Variable | Moyenne | Dynamique | Taches heterogenes |
| Hierarchique | Variable | Elevee | Dynamique | Projets complexes, equipes |

---

## 6. Tool use et function calling en profondeur

### 6.1 Architecture du function calling

```
┌──────────────────────────────────────────────────────────────┐
│         ARCHITECTURE DU FUNCTION CALLING                      │
│                                                               │
│  1. L'application envoie le message + les definitions        │
│     d'outils au LLM                                         │
│                                                               │
│  2. Le LLM repond avec un "tool_call" (nom + arguments)     │
│     IL N'EXECUTE PAS L'OUTIL LUI-MEME                       │
│                                                               │
│  3. L'application execute l'outil et renvoie le resultat     │
│                                                               │
│  4. Le LLM utilise le resultat pour formuler sa reponse      │
│                                                               │
│  App            LLM              Outil                       │
│   │──messages──▶│                  │                         │
│   │◀─tool_call──│                  │                         │
│   │─────────────────execute──────▶│                         │
│   │◀────────────────resultat──────│                         │
│   │──tool_result─▶│                  │                         │
│   │◀──reponse────│                  │                         │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Outils complexes avec validation

```typescript
// ============================================================
// Outils avec validation robuste et gestion d'erreurs
// ============================================================

import { tool } from '@langchain/core/tools';
import { z } from 'zod';

// Outil avec schema Zod detaille
const databaseQueryTool = tool(
    async ({ table, columns, where, limit }: {
        table: string;
        columns: string[];
        where?: string;
        limit: number;
    }) => {
        // Validation de securite (anti-injection)
        const allowedTables = ['products', 'orders', 'users'];
        if (!allowedTables.includes(table)) {
            throw new Error(`Table "${table}" non autorisee. Tables disponibles: ${allowedTables.join(', ')}`);
        }

        const sql = `SELECT ${columns.join(', ')} FROM ${table}${
            where ? ` WHERE ${where}` : ''
        } LIMIT ${limit}`;

        // Executer la requete (simulee ici)
        console.log(`SQL execute: ${sql}`);
        return JSON.stringify({ rows: [], sql });
    },
    {
        name: 'database_query',
        description: 'Execute une requete SELECT sur la base de donnees',
        schema: z.object({
            table: z.string().describe('Nom de la table (products, orders, users)'),
            columns: z.array(z.string()).describe('Colonnes a selectionner'),
            where: z.string().optional().describe('Clause WHERE (sans le mot WHERE)'),
            limit: z.number().min(1).max(100).default(10).describe('Nombre max de resultats'),
        }),
    },
);

// Outil avec retry et timeout
const apiCallTool = tool(
    async ({ url, method }: { url: string; method: string }) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        try {
            const response = await fetch(url, {
                method,
                signal: controller.signal,
            });
            const data = await response.json();
            return JSON.stringify(data);
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                return 'Erreur: timeout apres 5 secondes';
            }
            return `Erreur: ${(error as Error).message}`;
        } finally {
            clearTimeout(timeout);
        }
    },
    {
        name: 'api_call',
        description: 'Effectue un appel HTTP a une API externe',
        schema: z.object({
            url: z.string().url().describe('URL de l\'API'),
            method: z.enum(['GET', 'POST']).describe('Methode HTTP'),
        }),
    },
);
```

---

## 7. Evaluation et debugging des agents

### 7.1 Metriques cles

| Metrique | Description | Cible |
|----------|-------------|-------|
| Task completion rate | % de taches reussies | > 90% |
| Avg iterations | Nombre moyen d'iterations agent | < 5 |
| Tool error rate | % d'appels d'outils en erreur | < 5% |
| Latency (P50, P95) | Temps de reponse | P50 < 5s, P95 < 15s |
| Token cost / task | Cout moyen par tache | Selon budget |
| Hallucination rate | % de reponses factuellement incorrectes | < 2% |

### 7.2 Tracer les executions avec LangSmith

```typescript
// ============================================================
// Tracing avec LangSmith (integre dans LangGraph)
// ============================================================

// Variables d'environnement requises :
// LANGCHAIN_TRACING_V2=true
// LANGCHAIN_API_KEY=ls_...
// LANGCHAIN_PROJECT=my-agent

// Le tracing est automatique quand les variables sont definies !
// Chaque noeud, chaque appel LLM, chaque outil est trace.

// Pour un tracing custom :
import { traceable } from 'langsmith/traceable';

const myCustomStep = traceable(
    async (input: string): Promise<string> => {
        // Votre logique
        return `Traite: ${input}`;
    },
    { name: 'custom_processing_step' },
);
```

### 7.3 Tests automatises pour agents

```typescript
// ============================================================
// Tests d'agents avec des scenarios predéfinis
// ============================================================

import { describe, it, expect } from 'vitest';

interface TestCase {
    name: string;
    input: string;
    expectedToolCalls?: string[];
    expectedOutputContains?: string[];
    maxIterations: number;
}

const testCases: TestCase[] = [
    {
        name: 'Recherche simple',
        input: 'Quelle est la meteo a Paris ?',
        expectedToolCalls: ['search'],
        expectedOutputContains: ['Paris', 'temperature'],
        maxIterations: 3,
    },
    {
        name: 'Calcul',
        input: 'Combien font 15% de 250 ?',
        expectedToolCalls: ['calculator'],
        expectedOutputContains: ['37.5'],
        maxIterations: 3,
    },
    {
        name: 'Question sans outil',
        input: 'Bonjour, comment vas-tu ?',
        expectedToolCalls: [],
        maxIterations: 1,
    },
];

describe('Agent Tests', () => {
    for (const tc of testCases) {
        it(tc.name, async () => {
            const result = await graph.invoke({
                messages: [new HumanMessage(tc.input)],
            });

            // Verifier le nombre d'iterations
            expect(result.messages.length).toBeLessThanOrEqual(
                tc.maxIterations * 2 + 1, // messages * 2 (user+assistant) + 1 initial
            );

            // Verifier les outils appeles
            if (tc.expectedToolCalls) {
                const toolCalls = result.messages
                    .filter((m: BaseMessage) => (m as AIMessage).tool_calls?.length)
                    .flatMap((m: BaseMessage) =>
                        (m as AIMessage).tool_calls!.map((tc: { name: string }) => tc.name),
                    );
                for (const expected of tc.expectedToolCalls) {
                    expect(toolCalls).toContain(expected);
                }
            }

            // Verifier le contenu de la reponse
            if (tc.expectedOutputContains) {
                const lastMsg = result.messages[result.messages.length - 1];
                const content = lastMsg.content as string;
                for (const expected of tc.expectedOutputContains) {
                    expect(content.toLowerCase()).toContain(expected.toLowerCase());
                }
            }
        });
    }
});
```

---

## 8. Bonnes pratiques et pieges courants

### 8.1 Les pieges a eviter

```
┌──────────────────────────────────────────────────────────────┐
│         PIEGES COURANTS DES FRAMEWORKS AGENTIQUES             │
│                                                               │
│  1. ❌ Tout faire avec des agents                             │
│     → 80% des cas se resolvent avec une chaîne simple       │
│     → Les agents sont plus lents, plus chers, moins fiables │
│                                                               │
│  2. ❌ Pas de garde-fous (guardrails)                        │
│     → Limiter les iterations (maxIterations)                 │
│     → Limiter le budget tokens                               │
│     → Valider les actions destructives                       │
│                                                               │
│  3. ❌ Ignorer l'observabilite                               │
│     → Tracer chaque etape (LangSmith, OpenTelemetry)        │
│     → Logger les decisions de l'agent                        │
│                                                               │
│  4. ❌ Outils mal decrits                                    │
│     → Le LLM choisit les outils en lisant leur description  │
│     → Description vague = mauvais choix d'outil              │
│                                                               │
│  5. ❌ Etat trop large                                       │
│     → Ne mettre dans le state que ce qui est necessaire      │
│     → Compresser/resumer les longs historiques               │
└──────────────────────────────────────────────────────────────┘
```

### 8.2 Checklist de production

| Element | Detail |
|---------|--------|
| Timeout global | 30-60 secondes max par requete utilisateur |
| Max iterations | 5-10 selon la complexite |
| Budget tokens | Alerter au-dela de X tokens par session |
| Retry sur erreur outil | 1-2 retries avec backoff |
| Fallback | Reponse degradee si l'agent echoue |
| Logging structure | Chaque decision, chaque outil, chaque resultat |
| Tests de regression | Suite de scenarios avec resultats attendus |
| Human-in-the-loop | Pour toute action irreversible |

---

## 9. Exercices mentaux

> **Exercice mental 1** : Vous construisez un agent qui aide les utilisateurs a reserver des vols. L'agent a acces a 3 outils : `search_flights`, `book_flight`, `cancel_booking`. Dessinez le graphe LangGraph ideal. Ou placeriez-vous un `interruptBefore` ?

<details>
<summary>Reponse</summary>

```
START → agent → shouldContinue?
  → tools (search_flights) → agent  [boucle normale]
  → tools (book_flight) → agent     [interruptBefore ici !]
  → tools (cancel_booking) → agent  [interruptBefore ici !]
  → END
```

Il faut placer `interruptBefore` avant l'execution de `book_flight` et `cancel_booking` car ce sont des actions **irreversibles** (ou couteuses). La recherche de vols est sans risque et peut s'executer sans validation.

En pratique, plutot que d'interrompre sur le noeud "tools" generique, on peut creer des noeuds separes : `safe_tools` (search) et `dangerous_tools` (book, cancel), avec `interruptBefore: ['dangerous_tools']`.
</details>

> **Exercice mental 2** : Votre agent multi-agent (superviseur + 3 workers) coute 0.50€ par requete utilisateur en moyenne. Le patron veut reduire a 0.10€. Quelles strategies appliquer ?

<details>
<summary>Reponse</summary>

1. **Modele moins cher pour les workers** : utiliser GPT-4o-mini ou Claude Haiku pour les workers, garder GPT-4o pour le superviseur seul
2. **Limiter les rounds du superviseur** : max 3 rounds au lieu de 5-10
3. **Caching** : mettre en cache les resultats d'outils (meme requete = meme resultat)
4. **Pre-routing** : un classifier rapide (pas un LLM) decide quel worker utiliser, sans passer par le superviseur
5. **Chaîne quand possible** : si 70% des requetes suivent le meme chemin, utiliser une chaîne deterministe et ne basculer sur l'agent que pour les cas complexes
6. **Resumer le contexte** : au lieu de passer tout l'historique, resumer les echanges precedents
</details>

> **Exercice mental 3** : Vous avez un graphe LangGraph avec 4 noeuds : `planner`, `coder`, `tester`, `reviewer`. Le `planner` decide du plan, le `coder` ecrit le code, le `tester` teste, et le `reviewer` valide. Si le `tester` trouve des bugs, il faut renvoyer au `coder`. Si le `reviewer` n'est pas satisfait, il faut renvoyer au `planner`. Comment modeliser ces boucles ?

<details>
<summary>Reponse</summary>

```
START → planner → coder → tester → shouldRetryCode?
  → coder (si bugs)  [boucle interne]
  → reviewer → shouldRetryPlan?
    → planner (si insatisfait)  [boucle externe]
    → END (si valide)
```

En LangGraph, les aretes conditionnelles gerent les deux boucles :
- `shouldRetryCode` : si `state.testsPassing === false`, retour a `coder` (max 3 retries)
- `shouldRetryPlan` : si `state.reviewApproved === false`, retour a `planner` (max 2 retries)
- Les compteurs de retry dans le state evitent les boucles infinies
</details>

---

## Ce qu'il faut retenir

```
┌──────────────────────────────────────────────────────────────┐
│                    A RETENIR                                  │
│                                                               │
│  1. Chaîne → Agent → Framework agentique.                    │
│     Commencer simple, complexifier si necessaire.            │
│                                                               │
│  2. LangGraph = graphe d'etats pour agents TypeScript.       │
│     State + Nodes + Edges + Conditional Routing.             │
│                                                               │
│  3. Human-in-the-loop = securite pour les actions critiques. │
│     interruptBefore sur les noeuds destructifs.              │
│                                                               │
│  4. CrewAI = collaboration multi-agent avec roles definis.   │
│     Chercheur, redacteur, relecteur, superviseur.            │
│                                                               │
│  5. Patterns : sequentiel, parallele, superviseur,           │
│     hierarchique. Choisir selon le cas d'usage.              │
│                                                               │
│  6. Tool descriptions = critiques. Le LLM choisit les       │
│     outils en lisant leur description.                       │
│                                                               │
│  7. Toujours limiter : iterations, tokens, timeout.          │
│     Un agent sans garde-fous est un agent dangereux.         │
│                                                               │
│  8. Observer et tester : LangSmith, tests de scenarios,      │
│     metriques de completion et de cout.                      │
└──────────────────────────────────────────────────────────────┘
```

---

## Et ensuite ?

Ce module conclut la partie avancee du cours IA. Vous maîtrisez maintenant les fondamentaux (prompting, APIs), les techniques intermediaires (RAG, evaluation), et les patterns avances (agents, frameworks agentiques).

> Pour aller plus loin, explorez les projets open-source comme [AutoGPT](https://github.com/Significant-Gravitas/AutoGPT), [MetaGPT](https://github.com/geekan/MetaGPT), et [OpenDevin](https://github.com/OpenDevin/OpenDevin). Ces projets montrent comment les frameworks agentiques s'appliquent a des problemes reels a grande echelle.

---

<!-- parcours-recommande -->

::: tip Parcours recommande
Ce module n'a pas encore de lab ni de quiz associe. Revenez bientot !
:::
