# Lab 05 — MCP Server

## Objectifs

- Creer des definitions de ressources et d'outils MCP
- Dispatcher des appels d'outils vers des handlers
- Valider les inputs selon un schema
- Construire une configuration MCP pour Claude Desktop
- Parser des messages JSON-RPC

## Exercices

### 1. `createResourceDefinition(uri: string, name: string, mimeType: string): { uri, name, mimeType }`

Cree un objet de definition de ressource MCP.

### 2. `createToolDefinition(name: string, description: string, params: { name: string, type: string, desc: string }[]): object`

Cree une definition d'outil MCP avec un `inputSchema` au format JSON Schema (`type: "object"`, `properties` avec `type` et `description` pour chaque param).

### 3. `handleToolCall(toolName: string, input: any, handlers: Record<string, (input: any) => any>): any`

Dispatche l'appel vers le handler correspondant. Lance une erreur si le tool n'est pas trouve.

### 4. `validateToolInput(input: any, schema: { required: string[], properties: Record<string, { type: string }> }): { valid: boolean, errors: string[] }`

Valide un input selon un schema simplifie :
- Verifie que les champs `required` sont presents
- Verifie que les types correspondent (`typeof`)

### 5. `buildMcpConfig(servers: { name: string, command: string, args: string[] }[]): object`

Genere un objet de configuration au format `claude_desktop_config.json` :
```json
{ "mcpServers": { "<name>": { "command": "<command>", "args": [...] } } }
```

### 6. `parseJsonRpcMessage(raw: string): { jsonrpc: string, method: string, params: any, id: number }`

Parse une chaine JSON en message JSON-RPC. Lance une erreur si le JSON est invalide ou si `jsonrpc` n'est pas `"2.0"`.

## Lancer les tests

```bash
npx tsx exercise.ts
```
