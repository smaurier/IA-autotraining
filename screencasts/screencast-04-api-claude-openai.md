# Screencast 04 — API Claude & OpenAI : SDK, Streaming et Tool Use

## Informations
- **Duree estimee** : 20-25 min
- **Module** : `modules/04-api-claude-openai.md`
- **Lab associe** : `labs/lab-04-chatbot-cli-tools/`
- **Prerequis** : Screencast 01, 02

## Setup
- [ ] Cle API Anthropic dans `.env` (`ANTHROPIC_API_KEY`)
- [ ] Cle API OpenAI dans `.env` (`OPENAI_API_KEY`) — optionnel pour la comparaison
- [ ] `pnpm add @anthropic-ai/sdk openai`
- [ ] Terminal propre, taille de police lisible
- [ ] Fichiers du lab prets dans `src/`

## Script

### [00:00-03:00] Introduction aux SDKs et premiers appels
> Aujourd'hui on plonge dans les API. On va voir comment appeler Claude et OpenAI depuis TypeScript, gerer le streaming, implementer le tool use, et construire un chatbot CLI complet. C'est le socle technique pour tout ce qui suit dans le cours.
**Action** : Montrer l'installation et le premier appel Claude
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const message = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  system: 'Tu es un assistant technique expert en TypeScript.',
  messages: [
    { role: 'user', content: 'Explique le pattern Strategy en TypeScript avec un exemple.' }
  ],
});

console.log(message.content[0].text);
console.log(`Tokens : ${message.usage.input_tokens} in, ${message.usage.output_tokens} out`);
```
> Notez la structure : model, max_tokens obligatoire, system prompt separe, et messages avec alternance user/assistant.

### [03:00-06:00] Conversation multi-turn et historique
> Un chatbot doit se souvenir du contexte. Pour ca, on accumule les messages dans un tableau et on les renvoie a chaque appel.
**Action** : Construire le chatbot CLI conversationnel
```typescript
import Anthropic from '@anthropic-ai/sdk';
import * as readline from 'readline';

const client = new Anthropic();
const messages: Anthropic.MessageParam[] = [];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(prompt: string): Promise<string> {
  return new Promise(resolve => rl.question(prompt, resolve));
}

console.log('Chatbot CLI — tapez "exit" pour quitter\n');

while (true) {
  const userInput = await ask('Vous > ');
  if (userInput === 'exit') break;

  messages.push({ role: 'user', content: userInput });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: 'Tu es un assistant developpeur. Reponds de facon concise.',
    messages,
  });

  const text = response.content[0].text;
  messages.push({ role: 'assistant', content: text });
  console.log(`\nAssistant > ${text}\n`);
  console.log(`  [${response.usage.input_tokens} + ${response.usage.output_tokens} tokens]\n`);
}
```
**Action** : Lancer le chatbot, poser 3 questions qui dependent du contexte
> Regardez les tokens : ils augmentent a chaque echange parce qu'on renvoie tout l'historique. C'est un point important pour la gestion des couts.

### [06:00-09:00] Streaming — Affichage token par token
> Par defaut, on attend la reponse complete. Avec le streaming, chaque token s'affiche des qu'il est genere. C'est essentiel pour l'experience utilisateur — personne ne veut regarder un curseur pendant 10 secondes.
**Action** : Implementer le streaming
```typescript
const stream = client.messages.stream({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Ecris un poeme de 4 vers sur TypeScript.' }],
});

process.stdout.write('Assistant > ');
for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    process.stdout.write(event.delta.text);
  }
}
console.log('\n');

const finalMessage = await stream.finalMessage();
console.log(`[${finalMessage.usage.input_tokens} + ${finalMessage.usage.output_tokens} tokens]`);
```
> Sans streaming, c'est comme attendre qu'un email soit entierement ecrit avant de le recevoir. Avec streaming, c'est un chat en direct — chaque mot apparait des qu'il est genere.

### [09:00-14:00] Tool Use — Donner des capacites au modele
> Maintenant le plus puissant : le tool use. Le LLM ne peut pas acceder a Internet ou executer du code. Mais il peut demander a votre application d'executer des outils. Le modele decide seul quand utiliser quel outil.
**Action** : Definir les outils et montrer la boucle d'execution
```typescript
// Definition des outils — JSON Schema
const tools: Anthropic.Tool[] = [
  {
    name: 'get_weather',
    description: 'Obtient la meteo actuelle pour une ville donnee',
    input_schema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'Nom de la ville' },
        unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
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
      },
      required: ['query'],
    },
  },
];
```
**Action** : Montrer la boucle tool use complete
```typescript
// Boucle : tant que le modele veut utiliser des outils
while (true) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    tools,
    messages,
  });

  if (response.stop_reason === 'tool_use') {
    const toolUse = response.content.find(c => c.type === 'tool_use');
    console.log(`Appel outil: ${toolUse.name}(${JSON.stringify(toolUse.input)})`);

    const result = await executeToolCall(toolUse.name, toolUse.input);

    messages.push({ role: 'assistant', content: response.content });
    messages.push({
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(result) }],
    });
    continue;
  }

  // Reponse finale
  return response.content[0].text;
}
```
**Action** : Executer avec "Quelle meteo a Paris ? Et cherche des ecouteurs a moins de 50 euros."
> Le modele appelle d'abord get_weather, puis search_products, et formule une reponse naturelle avec les deux resultats. Il a decide seul quel outil utiliser et dans quel ordre.

### [14:00-17:00] Gestion des couts et optimisation
> Les API sont facturees au token. Il faut comprendre les couts pour ne pas avoir de surprise.
**Action** : Afficher la grille tarifaire et le calcul de cout
```
| Modele            | Input ($/M tokens) | Output ($/M tokens) |
|-------------------|--------------------|--------------------|
| Claude Haiku 3.5  | $0.80              | $4.00              |
| Claude Sonnet 4   | $3.00              | $15.00             |
| Claude Opus 4     | $15.00             | $75.00             |
| GPT-4o            | $2.50              | $10.00             |
| GPT-4o-mini       | $0.15              | $0.60              |
```
```typescript
function calculateCost(inputTokens: number, outputTokens: number,
  inputPrice: number, outputPrice: number): number {
  return (inputTokens / 1_000_000) * inputPrice
       + (outputTokens / 1_000_000) * outputPrice;
}

// 1000 tokens input + 500 output avec Sonnet = $0.0105 par requete
```
> Quatre strategies d'optimisation : utiliser le bon modele par tache, system prompt concis, limiter max_tokens, et cacher les reponses repetitives.

### [17:00-20:00] Gestion des erreurs et retry
> En production, les appels API echouent. Rate limiting, erreurs serveur, timeouts. Il faut un retry avec exponential backoff.
**Action** : Montrer l'implementation robuste
```typescript
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
        const waitMs = Math.pow(2, attempt) * 1000;
        console.log(`Rate limited. Retry in ${waitMs}ms...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      if (error instanceof Anthropic.APIError && error.status >= 500) {
        console.log(`Server error. Retry ${attempt}/${maxRetries}...`);
        continue;
      }
      throw error; // Erreur non-retryable (400, 401, etc.)
    }
  }
  throw new Error('Max retries exceeded');
}
```

### [20:00-22:30] Comparaison Claude vs OpenAI
> Pour ceux qui connaissent OpenAI, voici les differences. Les concepts sont identiques, seule la syntaxe change.
**Action** : Afficher la comparaison cote a cote
```
| Aspect         | Claude (Anthropic)              | GPT (OpenAI)                   |
|----------------|----------------------------------|--------------------------------|
| System prompt  | Parametre `system` separe        | Message `role: 'system'`       |
| Reponse        | message.content[0].text          | choices[0].message.content     |
| Streaming      | client.messages.stream()         | stream: true dans les params   |
| Tool use       | stop_reason: 'tool_use'          | finish_reason: 'tool_calls'    |
| Vision         | type: 'image' dans content       | type: 'image_url' dans content |
| max_tokens     | Requis                           | Optionnel                      |
```
**Action** : Montrer un appel OpenAI equivalent
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

### [22:30-25:00] Vision et recapitulatif
> Derniere fonctionnalite : la vision. Les deux APIs peuvent analyser des images encodees en base64.
**Action** : Montrer un appel avec image
```typescript
const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64Data } },
      { type: 'text', text: 'Decris cette capture d\'ecran d\'interface.' },
    ],
  }],
});
```
> Recapitulatif : on a vu les SDKs Claude et OpenAI, la conversation multi-turn, le streaming, le tool use avec sa boucle, la gestion des couts, le retry robuste, la vision, et la comparaison des deux APIs. Vous avez maintenant tous les outils pour integrer des LLMs dans vos applications.

## Points d'attention pour l'enregistrement
- Montrer les tokens consommes a chaque appel pour sensibiliser aux couts
- Bien expliquer la boucle tool_use : le modele decide, on execute, on renvoie
- Le streaming doit etre visible token par token — ne pas aller trop vite
- Masquer les cles API dans le terminal (utiliser .env)
- Avoir un fallback si l'API est lente (preparer les reponses en cache)
