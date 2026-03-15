# Screencast 05 — MCP — Model Context Protocol

## Informations
- **Duree estimee** : 20-25 min
- **Module** : `modules/05-mcp-model-context-protocol.md`
- **Lab associe** : `labs/lab-05-mcp-server/`
- **Prérequis** : Screencast 04

## Setup
- [ ] `pnpm add @modelcontextprotocol/sdk zod`
- [ ] API REST cible accessible (JSONPlaceholder ou API locale)
- [ ] Claude Desktop ou Claude Code installe pour tester le serveur
- [ ] Fichier `claude_desktop_config.json` localise
- [ ] MCP Inspector disponible (`npx @modelcontextprotocol/inspector`)

## Script

### [00:00-03:30] Qu'est-ce que MCP et pourquoi c'est important
> Les LLMs sont puissants mais isoles. Ils ne peuvent pas lire vos fichiers, interroger votre base de donnees, ou appeler vos APIs internes. Le tool use du module 04 resout partiellement ce problème, mais chaque intégration est custom. MCP — Model Context Protocol — standardise tout ça. C'est le USB de l'IA : un protocole ouvert créé par Anthropic qui connecte n'importe quel LLM a n'importe quelle source de donnees.
**Action** : Afficher le schema d'architecture MCP
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

### [03:30-06:30] Les 3 primitives MCP
> MCP expose trois types de choses aux LLMs : les Resources pour donner du contexte, les Tools pour exécuter des actions, et les Prompts pour des templates réutilisables.
**Action** : Expliquer chaque primitive avec un exemple
```typescript
// RESOURCE — donnees que le LLM peut lire
// Exemple : un fichier README, une config, des stats
{ uri: 'file:///project/README.md', name: 'README du projet', mimeType: 'text/markdown' }

// TOOL — action que le LLM peut executer
// Exemple : requete SQL, creation de fichier, appel API
{ name: 'query_database', description: 'Execute une requete SQL SELECT',
  inputSchema: { type: 'object', properties: { query: { type: 'string' } } } }

// PROMPT — template parametrable
// Exemple : code review, rapport, analyse
{ name: 'code_review', description: 'Review un fichier de code',
  arguments: [{ name: 'file_path', required: true }] }
```

### [06:30-12:00] Construire un MCP Server en Node.js
> On va construire un serveur MCP complet qui expose une API de gestion de produits. C'est le pont entre Claude et votre API REST.
**Action** : Créer le serveur pas a pas
```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({ name: 'my-mcp-server', version: '1.0.0' });

// Tool 1 : Lister les produits
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
    return { content: [{ type: 'text', text: JSON.stringify(products, null, 2) }] };
  },
);

// Tool 2 : Creer un produit
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
    return { content: [{ type: 'text', text: `Produit cree: ${JSON.stringify(product)}` }] };
  },
);
```
**Action** : Ajouter une Resource et un Prompt template
```typescript
// Resource : configuration de l'application
server.resource('config', 'config://app', async (uri) => ({
  contents: [{
    uri: uri.href,
    mimeType: 'application/json',
    text: JSON.stringify({ version: '1.0', env: 'dev' }),
  }],
}));

// Prompt template : saluer un utilisateur
server.tool('greet', 'Salue une personne par son nom',
  { name: { type: 'string', description: 'Nom de la personne' } },
  async ({ name }) => ({
    content: [{ type: 'text', text: `Bonjour ${name} !` }],
  }),
);
```

### [12:00-15:00] Transport : stdio vs SSE
> Le transport, c'est comment le serveur communique avec le client. Il y a deux modes : stdio pour les outils locaux, et SSE pour les serveurs distants.
**Action** : Montrer les deux transports
```typescript
// MODE 1 : stdio — communication via stdin/stdout (local)
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
const transport = new StdioServerTransport();
await server.connect(transport);

// MODE 2 : SSE — communication via HTTP (distant)
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';

const app = express();
app.get('/sse', (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  server.connect(transport);
});
app.post('/messages', (req, res) => {
  // Gerer les messages entrants
});
app.listen(3001);
```
> En général, utilisez stdio pour les outils locaux (Claude Desktop, Claude Code) et SSE pour les deployements serveur.

### [15:00-18:30] Configuration dans Claude Desktop et Claude Code
> Notre serveur est pret. Il faut maintenant le brancher à un client MCP.
**Action** : Configurer Claude Desktop
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
**Action** : Configurer Claude Code
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
**Action** : Relancer Claude Desktop et tester
```
Dans Claude Desktop :
1. Verifier que "my-api" est connecte dans les parametres
2. "Liste les produits de la categorie electronique"
   → Claude appelle list_products automatiquement
3. "Cree un produit: Casque audio, 79.99 euros, categorie audio"
   → Claude appelle create_product
```

### [18:30-22:00] Sécurité et bonnes pratiques
> La sécurité MCP est critique. Le LLM peut envoyer n'importe quoi comme input. Il faut valider et limiter.
**Action** : Montrer la validation des inputs
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
**Action** : Afficher la checklist de sécurité
```
Principes de securite MCP :
1. Valider TOUS les inputs (le LLM peut envoyer n'importe quoi)
2. Limiter les actions (un tool SQL = SELECT seulement)
3. Pas de credentials dans les tools (utiliser les variables d'env)
4. Audit log (logger chaque appel de tool)
5. Rate limiting si le serveur est expose en HTTP
```

### [22:00-25:00] Debugging avec l'inspecteur MCP
> Le debugging MCP peut etre deroutant parce que la communication passe par stdin/stdout. L'inspecteur MCP est votre meilleur ami.
**Action** : Lancer l'inspecteur MCP
```bash
npx @modelcontextprotocol/inspector npx tsx mcp-server.ts

# L'inspecteur ouvre un navigateur avec :
# - Liste des tools, resources, prompts exposes
# - Possibilite de tester chaque tool manuellement
# - Logs de communication JSON-RPC en temps reel
```
**Action** : Tester un tool via l'inspecteur et montrer les logs JSON-RPC
> Bonnes pratiques finales : utilisez `console.error()` pour vos logs — stdout est reserve au protocole MCP. Gardez les descriptions claires et precises — le LLM les lit pour decider quel tool utiliser. Et limitez le nombre de tools a moins de 20 par serveur.

## Points d'attention pour l'enregistrement
- Tester le serveur MCP avant l'enregistrement (les redemarrages prennent du temps)
- Avoir un fallback si l'API externe est lente (cache local ou JSONPlaceholder)
- Montrer l'inspecteur MCP — c'est un outil essentiel pour le debug
- Bien expliquer le flux : Claude lit la description → decide → appelle → recoit
- Utiliser console.error pour les logs (pas console.log — stdout est le protocole)
