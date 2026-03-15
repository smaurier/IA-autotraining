# Module 05 — MCP — Model Context Protocol

> **Objectif** : Comprendre et implementer le Model Context Protocol pour connecter les LLMs a des sources de donnees et des outils externes. Créer un MCP Server en Node.js.
> **Difficulte** : ⭐⭐⭐ (avance)
> **Prérequis** : Module 04 (API Claude), bases Node.js
> **Duree estimee** : 4 heures

---

## 1. Qu'est-ce que MCP ?

### 1.1 Le problème

Les LLMs sont puissants mais isoles. Ils ne peuvent pas :
- Lire vos fichiers locaux
- Interroger votre base de donnees
- Appeler vos APIs internes
- Exécuter des commandes sur votre machine

Le tool use (Module 04) resout partiellement ce problème, mais chaque intégration est custom.

### 1.2 La solution : un protocole standard

MCP (Model Context Protocol) est un **protocole ouvert** créé par Anthropic qui standardise la communication entre les LLMs et les sources de donnees/outils externes.

> **Analogie** : MCP est au LLM ce que USB est au PC. Avant USB, chaque peripherique avait son propre connecteur. USB a standardise la connexion. MCP standardise la connexion entre un LLM et n'importe quelle source de donnees.

### 1.3 Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  MCP Host   │────▶│  MCP Client │────▶│  MCP Server │
│ (Claude,    │     │ (dans le    │     │ (votre code │
│  VS Code)   │     │  host)      │     │  Node.js)   │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                                        ┌───────────┐
                                        │ Resources │
                                        │ Tools     │
                                        │ Prompts   │
                                        └───────────┘
```

---

## 2. Les 3 primitives MCP

### 2.1 Resources — Donner du contexte

Les Resources exposent des donnees que le LLM peut lire :

```typescript
// Une resource expose des donnees
{
  uri: 'file:///Users/dev/project/README.md',
  name: 'README du projet',
  mimeType: 'text/markdown',
}

// Le LLM peut demander le contenu de cette resource
// → Le serveur retourne le texte du fichier
```

### 2.2 Tools — Exécuter des actions

Les Tools permettent au LLM d'exécuter des actions :

```typescript
// Un tool definit une action executable
{
  name: 'query_database',
  description: 'Execute une requete SQL SELECT sur la base de donnees',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Requete SQL SELECT' },
    },
    required: ['query'],
  },
}
```

### 2.3 Prompts — Templates réutilisables

Les Prompts sont des templates parametrables :

```typescript
// Un prompt template
{
  name: 'code_review',
  description: 'Review un fichier de code',
  arguments: [
    { name: 'file_path', description: 'Chemin du fichier', required: true },
    { name: 'focus', description: 'Focus: securite, performance, lisibilite', required: false },
  ],
}
```

---

## 3. Créer un MCP Server en Node.js

### 3.1 Installation

```bash
npm install @modelcontextprotocol/sdk
```

### 3.2 Serveur minimal

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({
  name: 'my-mcp-server',
  version: '1.0.0',
});

// Definir un tool
server.tool(
  'greet',
  'Salue une personne par son nom',
  {
    name: { type: 'string', description: 'Nom de la personne' },
  },
  async ({ name }) => {
    return {
      content: [{ type: 'text', text: `Bonjour ${name} !` }],
    };
  },
);

// Definir une resource
server.resource(
  'config',
  'config://app',
  async (uri) => {
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify({ version: '1.0', env: 'dev' }),
      }],
    };
  },
);

// Demarrer le serveur
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 3.3 MCP Server pour une API REST

```typescript
server.tool(
  'list_products',
  'Liste les produits du catalogue',
  {
    category: { type: 'string', description: 'Filtrer par categorie' },
    limit: { type: 'number', description: 'Nombre max de resultats' },
  },
  async ({ category, limit = 10 }) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    params.set('limit', String(limit));

    const response = await fetch(`http://localhost:3000/api/products?${params}`);
    const products = await response.json();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(products, null, 2),
      }],
    };
  },
);

server.tool(
  'create_product',
  'Cree un nouveau produit',
  {
    name: { type: 'string', description: 'Nom du produit' },
    price: { type: 'number', description: 'Prix en euros' },
    category: { type: 'string', description: 'Categorie' },
  },
  async ({ name, price, category }) => {
    const response = await fetch('http://localhost:3000/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, price, category }),
    });
    const product = await response.json();
    return {
      content: [{ type: 'text', text: `Produit cree: ${JSON.stringify(product)}` }],
    };
  },
);
```

---

## 4. Transport : stdio vs SSE

### 4.1 stdio (local)

Le serveur MCP communique via stdin/stdout. C'est le mode par defaut pour les outils locaux.

```typescript
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
const transport = new StdioServerTransport();
```

### 4.2 SSE (remote)

Pour un serveur distant accessible via HTTP :

```typescript
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';

const app = express();
const transports = new Map();

app.get('/sse', (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  transports.set(transport.sessionId, transport);
  server.connect(transport);
});

app.post('/messages', (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports.get(sessionId);
  transport.handlePostMessage(req, res);
});

app.listen(3001);
```

---

## 5. Configuration dans Claude Desktop / Claude Code

### 5.1 Claude Desktop

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json (Mac)
// %APPDATA%/Claude/claude_desktop_config.json (Windows)
{
  "mcpServers": {
    "my-api": {
      "command": "node",
      "args": ["path/to/my-mcp-server.js"],
      "env": {
        "API_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

### 5.2 Claude Code

```json
// .claude/settings.json dans le projet
{
  "mcpServers": {
    "my-api": {
      "command": "npx",
      "args": ["tsx", "tools/mcp-server.ts"]
    }
  }
}
```

---

## 6. Sécurité

### 6.1 Principes

- **Valider tous les inputs** : le LLM peut envoyer n'importe quoi
- **Limiter les actions** : un tool "exécuté_sql" ne devrait accepter que des SELECT
- **Pas de credentials dans les tools** : utiliser des variables d'environnement
- **Audit log** : logger chaque appel de tool

### 6.2 Validation d'input

```typescript
server.tool(
  'query_database',
  'Execute une requete SQL en lecture seule',
  { query: { type: 'string' } },
  async ({ query }) => {
    // Securite : bloquer les requetes de modification
    const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE'];
    const upper = query.toUpperCase().trim();
    if (forbidden.some(kw => upper.startsWith(kw))) {
      return {
        content: [{ type: 'text', text: 'Erreur: seules les requetes SELECT sont autorisees.' }],
        isError: true,
      };
    }

    const result = await db.query(query);
    return { content: [{ type: 'text', text: JSON.stringify(result.rows) }] };
  },
);
```

---

## Exercice du module

Dans le Lab 05, vous allez :
1. Créer une définition de Resource MCP
2. Créer une définition de Tool MCP
3. Implementer un dispatcher de tool calls
4. Valider les inputs d'un tool contre un JSON Schema
5. Générer un fichier de configuration MCP
6. Parser un message JSON-RPC

```bash
npm run lab:05
```

---

<!-- parcours-recommande -->

::: tip Parcours recommandé
1. **Screencast** : [screencast 05 mcp](../screencasts/screencast-05-mcp.md)
2. **Lab** : [lab-05-mcp-server](../labs/lab-05-mcp-server/README)
3. **Quiz** : [quiz 05 mcp](../quizzes/quiz-05-mcp.html)
:::
