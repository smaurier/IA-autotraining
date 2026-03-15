# Lab 06 — Agents & Orchestration

## Objectifs

- Parser des étapes ReAct (Thought / Action / Observation)
- Gérer la boucle d'un agent avec condition d'arret
- Valider les actions d'un agent
- Implementer une mémoire simple pour agent
- Router des taches vers le bon agent
- Construire des guardrails de sécurité

## Exercices

### 1. `parseReActStep(text: string): { thought: string, action?: string, observation?: string }`

Parse un texte au format ReAct :
```
Thought: ...
Action: ...
Observation: ...
```
Seul `Thought` est obligatoire. `Action` et `Observation` sont optionnels.

### 2. `shouldContinue(steps: { thought: string, action?: string }[], maxIter: number): boolean`

Retourne `true` si l'agent doit continuer :
- Le nombre d'étapes est inferieur a `maxIter`
- La dernière étape contient une `action` (l'agent veut encore agir)

### 3. `validateAgentAction(action: string, allowedActions: string[]): boolean`

Retourne `true` si l'action est dans la liste des actions autorisees.

### 4. `createAgentMemory(): { append, getRecent, search }`

Cree un objet mémoire avec :
- `append(role: string, content: string)` — ajoute une entree
- `getRecent(n: number)` — retourne les n dernières entrees `{ role, content }`
- `search(q: string)` — retourne les entrees dont le `content` contient `q` (case-insensitive)

### 5. `routeToAgent(task: string, agentCapabilities: { name: string, keywords: string[] }[]): string`

Retourne le nom de l'agent dont les keywords matchent le mieux la tache (le plus de keywords trouves dans le texte, case-insensitive). Retourne `"default"` si aucun match.

### 6. `buildGuardrailCheck(action: { tool: string, input: any }, blocked: string[], requireConfirm: string[]): { allowed: boolean, needsConfirmation: boolean }`

Verifie une action contre les guardrails :
- Si `action.tool` est dans `blocked` : `{ allowed: false, needsConfirmation: false }`
- Si `action.tool` est dans `requireConfirm` : `{ allowed: true, needsConfirmation: true }`
- Sinon : `{ allowed: true, needsConfirmation: false }`

## Lancer les tests

```bash
npx tsx exercise.ts
```
