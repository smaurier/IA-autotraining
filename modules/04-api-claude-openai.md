# Module 04 — API Claude & OpenAI

> **Objectif** : Maitriser les SDKs Anthropic et OpenAI pour integrer les LLMs dans des applications TypeScript. Comprendre le streaming, le tool use, la gestion des couts et les bonnes pratiques de production.
> **Difficulte** : ⭐⭐⭐ (intermediaire+)
> **Prerequis** : Module 01-02 (Prompting), bases Node.js/TypeScript
> **Duree estimee** : 4 heures

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
const message = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  system: 'Tu es un assistant technique expert en TypeScript.',
  messages: [
    { role: 'user', content: 'Explique le pattern Strategy en TypeScript avec un exemple.' }
  ],
});

console.log(message.content[0].text);
```

### 1.3 Conversation multi-turn

```typescript
const messages: Anthropic.MessageParam[] = [];

async function chat(userMessage: string) {
  messages.push({ role: 'user', content: userMessage });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
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
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Ecris un poeme sur TypeScript' }],
});

for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    process.stdout.write(event.delta.text);
  }
}
```

> **Analogie** : sans streaming, c'est comme attendre qu'un email soit entierement ecrit avant de le recevoir. Avec streaming, c'est comme un chat en direct — chaque mot apparait des qu'il est genere.

---

## 2. Tool Use / Function Calling

### 2.1 Le concept

Le LLM ne peut pas acceder a Internet, lire des fichiers ou executer du code. Mais il peut **demander** a votre application d'executer des outils.

```
Utilisateur → "Quelle meteo a Paris ?"
LLM → "Je dois appeler l'outil getWeather avec city='Paris'"
Votre code → appelle l'API meteo → retourne le resultat
LLM → "Il fait 18°C a Paris avec un ciel degage."
```

### 2.2 Definir un outil

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

### 2.3 Boucle d'execution

```typescript
async function runWithTools(userMessage: string) {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ];

  while (true) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
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

const completion = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: 'Tu es un assistant technique.' },
    { role: 'user', content: 'Explique les generics TypeScript.' },
  ],
});

console.log(completion.choices[0].message.content);
```

### 3.2 Differences Claude vs OpenAI

| Aspect | Claude (Anthropic) | GPT (OpenAI) |
|--------|-------------------|--------------|
| System prompt | Parametre `system` separe | Message `role: 'system'` |
| Reponse | `message.content[0].text` | `choices[0].message.content` |
| Streaming | `client.messages.stream()` | `stream: true` dans les params |
| Tool use | `tools` + `stop_reason: 'tool_use'` | `tools` + `finish_reason: 'tool_calls'` |
| Vision | `type: 'image'` dans content | `type: 'image_url'` dans content |

---

## 4. Vision — Envoyer des images

```typescript
// Claude — analyser une image
const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
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

| Modele | Input ($/M tokens) | Output ($/M tokens) |
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

### 5.3 Strategies d'optimisation

1. **Utiliser le bon modele** : Haiku pour les taches simples, Sonnet pour le gros du travail, Opus pour les taches complexes
2. **Reduire les tokens input** : system prompt concis, historique compresse
3. **Limiter max_tokens** : ne pas mettre 4096 si 256 suffisent
4. **Cacher les reponses** : pour les memes questions, retourner la reponse en cache

---

## 6. Gestion des erreurs

```typescript
import Anthropic from '@anthropic-ai/sdk';

async function robustCall(prompt: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        const waitMs = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Rate limited. Retry in ${waitMs}ms...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      if (error instanceof Anthropic.APIError && error.status >= 500) {
        console.log(`Server error. Retry ${attempt}/${maxRetries}...`);
        continue;
      }
      throw error; // Erreur non-retryable
    }
  }
  throw new Error('Max retries exceeded');
}
```

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

## Exercice du module

Dans le Lab 04, vous allez :
1. Construire un historique de conversation multi-turn
2. Definir un schema d'outil (JSON Schema)
3. Parser un appel d'outil depuis la reponse du LLM
4. Calculer le cout d'un appel API
5. Implementer un handler de streaming SSE
6. Implementer un retry avec exponential backoff

```bash
npm run lab:04
```
