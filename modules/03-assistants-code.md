# Module 03 — Copilot & Assistants Code

> **Objectif** : Maitriser les assistants IA de programmation pour maximiser la productivite. Comprendre forces et limites de chaque outil, developper des workflows efficaces.
> **Difficulte** : ⭐⭐ (intermediaire)
> **Prerequis** : Module 01 (Prompting Fondamental)
> **Duree estimee** : 3 heures

> **Ce module est 100% pratique** — pas de theorie IA ici. Vous apprenez a utiliser Copilot, Claude Code et Cursor comme un pro. C'est le dernier module "outil" avant de plonger dans les APIs (Module 04).

---

## 1. Le paysage des assistants code

### 1.1 Les outils majeurs en 2024-2025

| Outil | Editeur | Modele | Points forts |
|-------|---------|--------|-------------|
| **GitHub Copilot** | VS Code, JetBrains | GPT-4o / Claude | Tab completion, Copilot Chat, Edits |
| **Claude Code** | Terminal (CLI) | Claude Opus/Sonnet | Autonomie, MCP, skills, hooks, Plan mode |
| **Cursor** | Fork VS Code | GPT-4o / Claude | Composition, @codebase, rules |
| **Cody** | VS Code, JetBrains | Claude / StarCoder | Open-source, contexte de repo large |
| **Continue.dev** | VS Code, JetBrains | Ollama / Claude / GPT | Open-source, local, configurable |

### 1.2 Deux paradigmes differents

**Completion inline (Copilot, Cursor tab)** : l'IA suggere du code pendant que tu tapes. C'est du pair-programming passif — l'IA anticipe tes intentions.

**Agent conversationnel (Claude Code, Copilot Chat)** : tu decris ce que tu veux en langage naturel, l'IA genere du code, lit des fichiers, execute des commandes. C'est de la delegation active.

> **Analogie** : la completion inline, c'est un copilote qui finit tes phrases. L'agent conversationnel, c'est un collegue a qui tu donnes un brief et qui revient avec le code.

---

## 2. GitHub Copilot

### 2.1 Tab completion

La fonctionnalite de base : Copilot suggere du code en grise pendant que tu tapes.

```typescript
// Ecris un commentaire, Copilot suggere l'implementation
// Fonction qui calcule la distance de Levenshtein entre deux chaines
function levenshteinDistance(a: string, b: string): number {
  // Copilot va suggerer l'implementation complete ici
}
```

**Bonnes pratiques** :
- Ecris un commentaire descriptif AVANT la fonction
- Nomme bien tes variables — Copilot utilise les noms pour inferer l'intention
- Accepte avec Tab, rejette avec Esc, cycle avec Alt+] / Alt+[

### 2.2 Copilot Chat

Le chat integre dans VS Code :

```
> /explain — Explique le code selectionne
> /fix — Corrige le bug dans le code selectionne
> /tests — Genere des tests pour le code selectionne
> @workspace — Questionne le contexte du projet entier
> #file:src/auth.ts — Reference un fichier specifique
```

### 2.3 Copilot Edits

La fonctionnalite la plus recente : modification multi-fichiers en une seule interaction.

```
Prompt: "Ajoute de la validation Zod a tous les DTOs du dossier src/dto/"
→ Copilot modifie tous les fichiers concernes
→ Tu review chaque changement avant de l'accepter
```

---

## 3. Claude Code

### 3.1 L'approche agent

Claude Code est un CLI qui fonctionne en mode agent : il peut lire des fichiers, ecrire du code, executer des commandes, et iterer de maniere autonome.

```bash
# Lancer Claude Code
claude

# Donner une instruction
> Refactorise le composant UserProfile pour utiliser React Query
# au lieu de useEffect + fetch. Garde les memes props.
```

### 3.2 CLAUDE.md — Le fichier de configuration

Le fichier `CLAUDE.md` a la racine du projet donne du contexte permanent a Claude Code :

```markdown
# CLAUDE.md

## Projet
Application e-commerce NestJS + React.

## Conventions
- Utiliser des barrel exports (index.ts) dans chaque dossier
- Nommer les DTOs avec le suffixe .dto.ts
- Les tests sont a cote des fichiers sources (colocation)
- Utiliser Zod pour la validation, pas class-validator

## Stack technique
- Backend: NestJS 10, Prisma, PostgreSQL
- Frontend: React 19, TanStack Query, Tailwind CSS
- Tests: Vitest (unit), Playwright (e2e)

## Commandes
- `pnpm dev` — demarrer en dev
- `pnpm test` — lancer les tests
- `pnpm lint` — lancer ESLint
```

### 3.3 Skills et Hooks

**Skills** : des commandes personnalisees invocables avec `/skill-name`.

**Hooks** : des scripts shell executes automatiquement apres certaines actions (ex: lancer les tests apres chaque modification de fichier).

### 3.4 MCP — Model Context Protocol

Claude Code peut se connecter a des MCP servers pour acceder a des sources de donnees externes (bases de donnees, APIs, systemes de fichiers). Voir Module 05 pour les details.

### 3.5 Plan mode

Mode de planification : Claude Code analyse la tache, propose un plan d'action detaille, et attend ta validation avant d'executer.

```
> /plan Migrer de Express a NestJS tout le module auth

Claude Code propose:
1. Creer le module NestJS AuthModule
2. Migrer le middleware JWT vers un Guard
3. Migrer les routes vers un Controller
4. Adapter les tests
5. Supprimer l'ancien code Express

Approuver ? (y/n)
```

---

## 4. Cursor

### 4.1 Composition

Cursor permet de selectionner du code et de le modifier en langage naturel :

```
Selection: fonction calculateTotal()
Prompt: "Ajoute une reduction de 10% si le montant depasse 100€"
→ Cursor modifie la fonction en place
```

### 4.2 @codebase et Rules

- **@codebase** : Cursor indexe tout le projet et peut repondre a des questions sur l'architecture
- **.cursorrules** : equivalent du CLAUDE.md, donne du contexte permanent

```
// .cursorrules
You are a senior TypeScript developer.
Always use strict types, never use `any`.
Prefer functional programming patterns.
Use Zod for validation.
Write tests with Vitest.
```

---

## 5. Workflows quotidiens

### 5.1 TDD avec IA

```
1. Ecris le test en premier (RED)
2. Demande a l'IA d'implementer pour faire passer le test (GREEN)
3. Refactorise toi-meme ou demande a l'IA (REFACTOR)
```

Le TDD est le meilleur workflow avec l'IA car le test sert de specification verifiable.

### 5.2 Code review avec IA

```bash
# Avec Claude Code
> Review le diff git staged et signale les problemes de securite,
> performance et lisibilite. Ignore les changements de style.
```

### 5.3 Documentation avec IA

```bash
# Generer la JSDoc pour un module
> Ajoute la documentation JSDoc a toutes les fonctions exportees
> de src/services/payment.service.ts. Style concis, pas de @author.
```

### 5.4 Refactoring avec IA

```bash
# Extraction de composant
> Extrais la logique de filtrage du composant ProductList
> dans un hook custom useProductFilters. Garde les memes types.
```

---

## 6. Limites et pieges

### 6.1 Hallucinations de code

L'IA peut inventer des APIs qui n'existent pas :

```typescript
// L'IA peut suggerer ca :
import { useOptimistic } from 'react'; // N'existe que depuis React 19
await prisma.user.softDelete(id);      // N'existe pas dans Prisma
```

**Defense** : toujours verifier les imports, toujours lancer les tests.

### 6.2 Dependances fantomes

L'IA peut importer des packages qui n'existent pas ou qui sont deprecies.

**Defense** : verifier package.json apres chaque session.

### 6.3 Code non-idiomatique

L'IA melange parfois les paradigmes (ex: callbacks dans un codebase async/await).

**Defense** : les conventions dans CLAUDE.md / .cursorrules cadrent le style.

### 6.4 La regle d'or

> **L'IA est un copilote, pas un pilote.** Tu dois comprendre chaque ligne de code qu'elle genere. Si tu ne comprends pas pourquoi le code fonctionne, tu ne peux pas debugger quand il casse.

---

## 7. Ecrire de bons fichiers de configuration

### 7.1 CLAUDE.md efficace

```markdown
# Structure
- Decrire le projet en 2-3 phrases
- Lister les conventions non-evidentes
- Lister les commandes utiles
- Mentionner les pieges connus

# Anti-patterns
- Ne pas mettre 500 lignes de regles
- Ne pas dupliquer la doc officielle
- Ne pas mettre de secrets ou credentials
```

### 7.2 Prompt engineering pour le code

Les memes principes du Module 01 s'appliquent :

1. **Sois specifique** : "Refactorise" est vague. "Extrais la logique de validation dans un middleware NestJS Pipe" est precis.
2. **Donne du contexte** : "Cette fonction est appelee 1000 fois/seconde, optimise pour la performance."
3. **Definis le format** : "Utilise des arrow functions, pas de classes."
4. **Reference des fichiers** : "Base-toi sur le pattern de src/users/users.service.ts."

---

## 8. Comparaison et choix

| Critere | Copilot | Claude Code | Cursor |
|---------|---------|-------------|--------|
| Completion inline | Excellent | Non | Excellent |
| Agent autonome | Non | Excellent | Moyen |
| Multi-fichiers | Copilot Edits | Natif | Composer |
| Terminal/CLI | Non | Natif | Non |
| MCP/Extensions | Limite | Natif | Limite |
| Open-source | Non | Non | Non |
| Prix | $10/mois | Usage Claude | $20/mois |

**Recommandation** : Copilot pour la completion inline + Claude Code pour les taches complexes. C'est la combinaison la plus productive.

---

## Exercice du module

Dans le Lab 03, vous allez :
1. Parser un fichier CLAUDE.md en sections structurees
2. Generer un CLAUDE.md a partir d'un objet de configuration
3. Construire un fichier .cursorrules
4. Analyser un diff pour generer un prompt de code review
5. Calculer les metriques de productivite

```bash
npm run lab:03
```
