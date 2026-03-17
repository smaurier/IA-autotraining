# Module 04 — API Claude & OpenAI

> **Objectif** : Maîtriser les SDKs Anthropic et OpenAI pour intégrer les LLMs dans des applications TypeScript. Comprendre le streaming, le tool use, la gestion des couts et les bonnes pratiques de production.
> **Difficulte** : ⭐⭐⭐ (intermediaire+)
> **Prérequis** : Module 01-02 (Prompting), bases Node.js/TypeScript
> **Duree estimee** : 4 heures

<details>
<summary>Rappel du module précédent</summary>

1. **Quels sont les deux paradigmes des assistants code ?**
   La completion inline (Copilot, Cursor tab) qui suggere du code pendant que vous tapez, et l'agent conversationnel (Claude Code, Copilot Chat) a qui vous decrivez ce que vous voulez en langage naturel.

2. **A quoi sert le fichier CLAUDE.md (ou .cursorrules) ?**
   Il donne du contexte permanent a l'assistant IA sur le projet : conventions, stack technique, commandes utiles. L'IA le lit a chaque session pour adapter ses reponses au projet.

3. **Pourquoi le TDD est-il le meilleur workflow avec un assistant code ?**
   Parce que le test sert de specification verifiable. On ecrit le test en premier (RED), on demande a l'IA d'implementer pour le faire passer (GREEN), puis on refactorise (REFACTOR). L'IA a un objectif clair et mesurable.

</details>

---

## 1. SDK Anthropic — Claude API

### 1.1 Installation et configuration

```bash
npm install @anthropic-ai/sdk
```

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

### 1.2 Messages API — Appel de base

```typescript
try {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: 'Tu es un assistant technique expert en TypeScript.',
    messages: [
      { role: 'user', content: 'Explique le pattern Strategy en TypeScript avec un exemple.' }
    ],
  });

  console.log(message.content[0].text);
} catch (error) {
  if (error instanceof Anthropic.AuthenticationError) {
    console.error('Cle API invalide. Verifiez ANTHROPIC_API_KEY.');
  } else if (error instanceof Anthropic.RateLimitError) {
    console.error('Rate limit atteint. Reessayez dans quelques secondes.');
  } else {
    throw error;
  }
}
```

### 1.3 Conversation multi-turn

```typescript
const messages: Anthropic.MessageParam[] = [];

async function chat(userMessage: string) {
  messages.push({ role: 'user', content: userMessage });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: 'Tu es un assistant de programmation.',
    messages,
  });

  const assistantMessage = response.content[0].text;
  messages.push({ role: 'assistant', content: assistantMessage });
  return assistantMessage;
}

await chat('Ecris une fonction fibonacci en TypeScript');
await chat('Maintenant optimise-la avec de la memoization');
// Le second appel a le contexte du premier
```

### 1.4 Streaming

```typescript
const stream = client.messages.stream({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Ecris un poeme sur TypeScript' }],
});

for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    process.stdout.write(event.delta.text);
  }
}
```

> **Analogie** : sans streaming, c'est comme attendre qu'un email soit entièrement écrit avant de le recevoir. Avec streaming, c'est comme un chat en direct — chaque mot apparait des qu'il est généré.

---

## 2. Tool Use / Function Calling

### 2.1 Le concept

Le LLM ne peut pas acceder a Internet, lire des fichiers ou exécuter du code. Mais il peut **demander** a votre application d'exécuter des outils.

```
Utilisateur → "Quelle meteo a Paris ?"
LLM → "Je dois appeler l'outil getWeather avec city='Paris'"
Votre code → appelle l'API meteo → retourne le resultat
LLM → "Il fait 18°C a Paris avec un ciel degage."
```

### 2.2 Définir un outil

```typescript
const tools: Anthropic.Tool[] = [
  {
    name: 'get_weather',
    description: 'Obtient la meteo actuelle pour une ville donnee',
    input_schema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'Nom de la ville' },
        unit: { type: 'string', enum: ['celsius', 'fahrenheit'], description: 'Unite de temperature' },
      },
      required: ['city'],
    },
  },
  {
    name: 'search_products',
    description: 'Recherche des produits dans le catalogue',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Terme de recherche' },
        maxPrice: { type: 'number', description: 'Prix maximum' },
        category: { type: 'string', description: 'Categorie de produit' },
      },
      required: ['query'],
    },
  },
];
```

### 2.3 Boucle d'exécution

```typescript
async function runWithTools(userMessage: string) {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ];

  while (true) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      tools,
      messages,
    });

    // Si le modele veut utiliser un outil
    if (response.stop_reason === 'tool_use') {
      const toolUse = response.content.find(c => c.type === 'tool_use');
      const result = await executeToolCall(toolUse.name, toolUse.input);

      messages.push({ role: 'assistant', content: response.content });
      messages.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        }],
      });
      continue; // Le modele va integrer le resultat
    }

    // Reponse finale
    return response.content[0].text;
  }
}
```

---

## 3. SDK OpenAI

### 3.1 Installation et appel de base

```bash
npm install openai
```

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

try {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'Tu es un assistant technique.' },
      { role: 'user', content: 'Explique les generics TypeScript.' },
    ],
  });

  console.log(completion.choices[0].message.content);
} catch (error) {
  if (error instanceof OpenAI.AuthenticationError) {
    console.error('Cle API invalide. Verifiez OPENAI_API_KEY.');
  } else if (error instanceof OpenAI.RateLimitError) {
    console.error('Rate limit atteint. Reessayez dans quelques secondes.');
  } else {
    throw error;
  }
}
```

### 3.2 Streaming OpenAI

```typescript
// OpenAI utilise le parametre `stream: true` — les events sont differents de Claude
const stream = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: 'Tu es un assistant technique.' },
    { role: 'user', content: 'Ecris un poeme sur TypeScript.' },
  ],
  stream: true,
});

for await (const chunk of stream) {
  // OpenAI : chaque chunk contient choices[].delta.content (pas content_block_delta)
  const text = chunk.choices[0]?.delta?.content;
  if (text) {
    process.stdout.write(text);
  }
}
```

> **Attention** : ne confondez pas les event types. Claude utilise `content_block_delta` avec `delta.text`, tandis qu'OpenAI utilise `choices[].delta.content`. Ce sont deux formats incompatibles.

### 3.3 Tool Use / Function Calling (OpenAI)

```typescript
import OpenAI from 'openai';

// OpenAI exige un wrapper `type: 'function'` + `function: {...}` autour de chaque outil
const tools: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Obtient la meteo actuelle pour une ville donnee',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'Nom de la ville' },
          unit: { type: 'string', enum: ['celsius', 'fahrenheit'], description: 'Unite de temperature' },
        },
        required: ['city'],
      },
    },
  },
];

async function runWithToolsOpenAI(userMessage: string) {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: 'Tu es un assistant meteo.' },
    { role: 'user', content: userMessage },
  ];

  while (true) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        tools,
        messages,
      });

      const choice = response.choices[0];

      // OpenAI utilise `finish_reason: 'tool_calls'` (pas 'tool_use' comme Claude)
      if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
        messages.push(choice.message); // Le message assistant avec les tool_calls

        for (const toolCall of choice.message.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await executeToolCall(toolCall.function.name, args);

          // OpenAI attend un message role: 'tool' avec le tool_call_id
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      return choice.message.content;
    } catch (error) {
      if (error instanceof OpenAI.RateLimitError) {
        console.error('Rate limit OpenAI atteint. Reessayez plus tard.');
      } else if (error instanceof OpenAI.AuthenticationError) {
        console.error('Cle API OpenAI invalide. Verifiez OPENAI_API_KEY.');
      }
      throw error;
    }
  }
}
```

> **Piege frequent** : avec Claude, les outils utilisent `input_schema` et la réponse contient `stop_reason: 'tool_use'`. Avec OpenAI, les outils utilisent `parameters` (dans un wrapper `function`) et la réponse contient `finish_reason: 'tool_calls'`. Adapter du code d'un SDK a l'autre nécessité plus qu'un simple renommage.

### 3.4 Differences Claude vs OpenAI

| Aspect | Claude (Anthropic) | GPT (OpenAI) |
|--------|-------------------|--------------|
| System prompt | Paramètre `system` separe | Message `role: 'system'` |
| Reponse | `message.content[0].text` | `choices[0].message.content` |
| Streaming events | `content_block_delta` → `delta.text` | `choices[].delta.content` |
| Streaming API | `client.messages.stream()` | `stream: true` dans les params |
| Tool schema | `input_schema: { properties }` | `function: { parameters: { properties } }` |
| Tool response | `stop_reason: 'tool_use'` | `finish_reason: 'tool_calls'` |
| Tool result msg | `role: 'user'` + `type: 'tool_result'` | `role: 'tool'` + `tool_call_id` |
| Vision | `type: 'image'` dans content | `type: 'image_url'` dans content |
| Erreurs SDK | `Anthropic.RateLimitError` | `OpenAI.RateLimitError` |

---

## 4. Vision — Envoyer des images

```typescript
// Claude — analyser une image
const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: base64ImageData,
        },
      },
      { type: 'text', text: 'Decris cette capture d\'ecran d\'interface.' },
    ],
  }],
});
```

---

## 5. Gestion des couts

### 5.1 Tarification par tokens

| Modèle | Input ($/M tokens) | Output ($/M tokens) |
|--------|--------------------|--------------------|
| Claude Haiku 3.5 | $0.80 | $4.00 |
| Claude Sonnet 4 | $3.00 | $15.00 |
| Claude Opus 4 | $15.00 | $75.00 |
| GPT-4o | $2.50 | $10.00 |
| GPT-4o-mini | $0.15 | $0.60 |

### 5.2 Calculer le cout d'un appel

```typescript
function calculateCost(
  inputTokens: number,
  outputTokens: number,
  inputPricePerMillion: number,
  outputPricePerMillion: number,
): number {
  return (inputTokens / 1_000_000) * inputPricePerMillion
       + (outputTokens / 1_000_000) * outputPricePerMillion;
}

// Exemple : 1000 tokens input + 500 tokens output avec Sonnet
const cost = calculateCost(1000, 500, 3.0, 15.0);
// = 0.003 + 0.0075 = $0.0105 par requete
```

### 5.3 Stratégies d'optimisation

1. **Utiliser le bon modèle** : Haiku pour les taches simples, Sonnet pour le gros du travail, Opus pour les taches complexes
2. **Reduire les tokens input** : system prompt concis, historique compresse
3. **Limiter max_tokens** : ne pas mettre 4096 si 256 suffisent
4. **Cacher les réponses** : pour les memes questions, retourner la réponse en cache

---

## 6. Gestion des erreurs

### 6.1 Retry robuste — Claude

```typescript
import Anthropic from '@anthropic-ai/sdk';

async function robustCallClaude(prompt: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        // Cle invalide — ne pas retenter
        throw new Error('Cle API Anthropic invalide. Verifiez ANTHROPIC_API_KEY.');
      }
      if (error instanceof Anthropic.RateLimitError) {
        const waitMs = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Rate limited. Retry in ${waitMs}ms...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      if (error instanceof Anthropic.APIError && error.status >= 500) {
        console.log(`Server error (${error.status}). Retry ${attempt}/${maxRetries}...`);
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
      throw error; // Erreur non-retryable
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 6.2 Retry robuste — OpenAI

```typescript
import OpenAI from 'openai';

async function robustCallOpenAI(prompt: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Tu es un assistant technique.' },
          { role: 'user', content: prompt },
        ],
      });
    } catch (error) {
      if (error instanceof OpenAI.AuthenticationError) {
        throw new Error('Cle API OpenAI invalide. Verifiez OPENAI_API_KEY.');
      }
      if (error instanceof OpenAI.RateLimitError) {
        const waitMs = Math.pow(2, attempt) * 1000;
        console.log(`Rate limited. Retry in ${waitMs}ms...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      if (error instanceof OpenAI.APIError && error.status >= 500) {
        console.log(`Server error (${error.status}). Retry ${attempt}/${maxRetries}...`);
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

> **Bonne pratique** : les erreurs `AuthenticationError` (clé invalide) et `BadRequestError` (prompt mal forme) ne doivent jamais etre retentees — elles echoueront toujours. Seules les erreurs `RateLimitError` et les erreurs serveur (5xx) meritent un retry avec backoff exponentiel.

---

## 7. Projet pratique — Chatbot CLI avec tools

```typescript
// Un chatbot en ligne de commande qui peut :
// 1. Repondre a des questions
// 2. Lire des fichiers locaux (tool: read_file)
// 3. Chercher sur le web (tool: web_search)
// 4. Executer du code TypeScript (tool: run_code)

import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  console.log('Chatbot IA — tapez "quit" pour quitter\n');

  while (true) {
    const input = await prompt('Vous > ');
    if (input === 'quit') break;

    const response = await runWithTools(input);
    console.log(`\nAssistant > ${response}\n`);
  }

  rl.close();
}

main();
```

---

## 8. Multimodal — Images, documents et audio

### 8.1 Envoyer des images a Claude

Claude peut analyser des images envoyees en **base64** ou via **URL** :

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';

// Methode 1 : Image en base64 (depuis un fichier local)
const imageBuffer = readFileSync('./screenshot.png');
const base64Data = imageBuffer.toString('base64');

const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',     // image/png, image/jpeg, image/gif, image/webp
          data: base64Data,
        },
      },
      {
        type: 'text',
        text: 'Analyse cette capture d\'ecran. Identifie les problemes d\'accessibilite.',
      },
    ],
  }],
});

// Methode 2 : Image via URL (Claude telecharge l'image)
const responseUrl = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'image',
        source: {
          type: 'url',
          url: 'https://example.com/diagram.png',
        },
      },
      {
        type: 'text',
        text: 'Explique ce diagramme d\'architecture.',
      },
    ],
  }],
});
```

### 8.2 Envoyer des images a OpenAI

```typescript
// OpenAI utilise un format different : type 'image_url' au lieu de 'image'
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{
    role: 'user',
    content: [
      {
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${base64Data}`,
          detail: 'high', // 'low', 'high', ou 'auto'
        },
      },
      {
        type: 'text',
        text: 'Decris cette image en detail.',
      },
    ],
  }],
});

// OpenAI supporte aussi les URLs directes
// image_url: { url: 'https://example.com/image.jpg' }
```

> **Piege frequent** : Claude utilise `type: 'image'` avec `source.type: 'base64'`, tandis qu'OpenAI utilise `type: 'image_url'` avec un data URI `data:image/png;base64,...`. Les formats sont **incompatibles** — pensez a abstraire cette difference dans votre code.

### 8.3 Cas d'usage Vision

| Cas d'usage | Description | Modèle recommandé |
|-------------|------------|-------------------|
| **Analyse de documents** | Extraire du texte de factures, contrats, formulaires scannes | Claude Sonnet (excellent en OCR) |
| **Comprehension de diagrammes** | Expliquer des schemas d'architecture, UML, flowcharts | Claude Sonnet ou GPT-4o |
| **Revue d'UI** | Identifier les problemes d'accessibilite, de design, d'UX | Claude Sonnet |
| **Analyse de code (screenshot)** | Lire du code depuis une image (IDE, terminal) | Claude Sonnet ou GPT-4o |
| **Comparaison visuelle** | Comparer deux versions d'une interface (avant/apres) | GPT-4o (multi-images natif) |
| **Extraction de donnees** | Lire des tableaux, graphiques, infographies | Claude Sonnet |

```typescript
// Exemple pratique : analyser un schema d'architecture
async function analyserDiagramme(imagePath: string): Promise<string> {
  const image = readFileSync(imagePath);
  const base64 = image.toString('base64');
  const mediaType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: `Tu es un architecte logiciel senior. Analyse les diagrammes techniques
et identifie : les composants, les flux de donnees, les points de defaillance
potentiels et les ameliorations possibles.`,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        },
        { type: 'text', text: 'Analyse ce diagramme d\'architecture.' },
      ],
    }],
  });

  return response.content[0].text;
}
```

### 8.4 Audio — Transcription avec OpenAI Whisper

OpenAI propose l'API Whisper pour la transcription audio. Ce n'est pas un LLM mais un modèle specialise de speech-to-text :

```typescript
import OpenAI from 'openai';
import { createReadStream } from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Transcrire un fichier audio
const transcription = await openai.audio.transcriptions.create({
  file: createReadStream('./meeting.mp3'),
  model: 'whisper-1',
  language: 'fr',              // Optionnel : forcer la langue
  response_format: 'verbose_json', // 'text', 'json', 'verbose_json', 'srt', 'vtt'
});

console.log(transcription.text);
// "Bonjour, aujourd'hui nous allons discuter de l'architecture du nouveau service..."

// Formats audio supportes : mp3, mp4, mpeg, mpga, m4a, wav, webm
// Taille max : 25 Mo par fichier
// Prix : $0.006 / minute
```

```typescript
// Pipeline complet : audio → transcription → analyse par LLM
async function analyserReunion(audioPath: string): Promise<string> {
  // 1. Transcrire l'audio
  const transcription = await openai.audio.transcriptions.create({
    file: createReadStream(audioPath),
    model: 'whisper-1',
    language: 'fr',
  });

  // 2. Analyser avec Claude
  const analyse = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: 'Tu analyses des transcriptions de reunions. Extrais : les decisions prises, les actions a suivre (avec responsable), et les points en suspens.',
    messages: [
      { role: 'user', content: `Voici la transcription :\n\n${transcription.text}` },
    ],
  });

  return analyse.content[0].text;
}
```

> **Note** : Claude et GPT-4o supportent aussi les entrees audio directement dans certains modes (Claude avec audio beta, GPT-4o avec audio dans le mode realtime). Ces APIs sont encore en evolution rapide — consultez la documentation officielle pour l'etat actuel.

---

## Exercice du module

Dans le Lab 04, vous allez :
1. Construire un historique de conversation multi-turn
2. Définir un schema d'outil (JSON Schema)
3. Parser un appel d'outil depuis la réponse du LLM
4. Calculer le cout d'un appel API
5. Implementer un handler de streaming SSE
6. Implementer un retry avec exponential backoff

```bash
npm run lab:04
```

---

<!-- parcours-recommande -->

::: tip Parcours recommandé
1. **Screencast** : [screencast 04 api claude openai](../screencasts/screencast-04-api-claude-openai.md)
2. **Lab** : [lab-04-api-claude-openai](../labs/lab-04-api-claude-openai/README)
3. **Quiz** : [quiz 04 api claude openai](../quizzes/quiz-04-api-claude-openai.html)
:::
