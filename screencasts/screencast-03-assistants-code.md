# Screencast 03 — Assistants de code (Copilot, Claude Code, Cursor)

## Informations
- **Duree estimee** : 18-22 min
- **Module** : `modules/03-assistants-code.md`
- **Lab associe** : `labs/lab-03-assistants-code/`
- **Prerequis** : Screencast 01, 02

## Setup
- [ ] VS Code avec GitHub Copilot active et connecte
- [ ] Claude Code installe et configure (`claude --version`)
- [ ] Projet TypeScript initialise (`pnpm init && pnpm add -D typescript tsx vitest`)
- [ ] `tsconfig.json` configure (strict: true)
- [ ] Terminal split : un pour Claude Code, un pour executer le code
- [ ] Fichier CLAUDE.md prepare a la racine du projet

## Script

### [00:00-03:00] Le paysage des assistants code en 2025
> Les assistants de code ont revolutionne notre facon de developper. Mais il y a deux paradigmes tres differents : la completion inline comme Copilot qui anticipe ce que vous tapez, et l'agent conversationnel comme Claude Code a qui vous donnez un brief complet. On va voir les deux en detail.
**Action** : Afficher le tableau comparatif des outils
```
| Outil          | Editeur          | Points forts                          |
|----------------|------------------|---------------------------------------|
| GitHub Copilot | VS Code, JetBrains | Tab completion, Copilot Chat, Edits  |
| Claude Code    | Terminal (CLI)   | Autonomie, MCP, skills, Plan mode     |
| Cursor         | Fork VS Code     | Composition, @codebase, rules         |
| Cody           | VS Code          | Open-source, contexte repo large      |
| Continue.dev   | VS Code          | Open-source, local, configurable      |
```
> La completion inline, c'est un copilote qui finit vos phrases. L'agent conversationnel, c'est un collegue a qui vous donnez un brief et qui revient avec le code.

### [03:00-07:00] GitHub Copilot — Tab completion et Chat
> Commencons par Copilot. Sa force, c'est la completion inline : il suggere du code en temps reel pendant que vous tapez.
**Action** : Ouvrir un fichier vide `levenshtein.ts` et commencer a taper
```typescript
// Astuce 1 : un commentaire descriptif AVANT la fonction guide Copilot
// Fonction qui calcule la distance de Levenshtein entre deux chaines
function levenshteinDistance(a: string, b: string): number {
  // Copilot suggere l'implementation complete ici
  // Tab pour accepter, Esc pour rejeter, Alt+] pour cycler
}
```
**Action** : Montrer Copilot Chat avec les commandes slash
```
> /explain — Explique le code selectionne
> /fix — Corrige le bug dans le code selectionne
> /tests — Genere des tests pour le code selectionne
> @workspace — Questionne le contexte du projet entier
> #file:src/auth.ts — Reference un fichier specifique
```
**Action** : Montrer Copilot Edits — modification multi-fichiers
```
Prompt: "Ajoute de la validation Zod a tous les DTOs du dossier src/dto/"
→ Copilot modifie tous les fichiers concernes
→ Tu review chaque changement avant de l'accepter
```
> La cle avec Copilot : nommez bien vos variables et ecrivez des commentaires descriptifs. Copilot utilise les noms pour inferer votre intention.

### [07:00-12:00] Claude Code — L'approche agent
> Maintenant passons a Claude Code. C'est un CLI qui fonctionne en mode agent : il peut lire des fichiers, ecrire du code, executer des commandes, et iterer de maniere autonome.
**Action** : Lancer Claude Code et montrer le fichier CLAUDE.md
```markdown
# CLAUDE.md — donne du contexte permanent a Claude Code

## Projet
Application e-commerce NestJS + React.

## Conventions
- Barrel exports (index.ts) dans chaque dossier
- DTOs avec suffixe .dto.ts
- Tests a cote des fichiers sources (colocation)
- Zod pour la validation, pas class-validator

## Commandes
- `pnpm dev` — demarrer en dev
- `pnpm test` — lancer les tests
- `pnpm lint` — lancer ESLint
```
**Action** : Utiliser Claude Code pour un refactoring multi-fichiers
```bash
# Lancer Claude Code
claude

# Demande 1 : Refactoring large
> Refactorise le composant UserProfile pour utiliser React Query
> au lieu de useEffect + fetch. Garde les memes props.

# Demande 2 : Plan mode — planifier avant d'executer
> /plan Migrer de Express a NestJS tout le module auth

# Claude Code propose :
# 1. Creer le module NestJS AuthModule
# 2. Migrer le middleware JWT vers un Guard
# 3. Migrer les routes vers un Controller
# 4. Adapter les tests
# 5. Supprimer l'ancien code Express
# Approuver ? (y/n)
```
> Le Plan mode est crucial pour les refactorings importants. Claude Code analyse la tache, propose un plan detaille, et attend votre validation avant d'executer. Pas de surprise.

### [12:00-15:30] Workflows quotidiens avec l'IA
> Voici les workflows qui marchent le mieux au quotidien.
**Action** : Montrer le workflow TDD avec IA
```
Workflow TDD + IA :
1. VOUS ecrivez le test (RED) — le test definit la spec
2. L'IA implemente pour faire passer le test (GREEN)
3. VOUS ou l'IA refactorisez (REFACTOR)

Pourquoi ca marche ? Le test sert de specification verifiable.
L'IA ne peut pas halluciner si le test passe.
```
**Action** : Montrer les autres workflows
```bash
# Code review avec Claude Code
> Review le diff git staged et signale les problemes de securite,
> performance et lisibilite. Ignore les changements de style.

# Documentation avec IA
> Ajoute la documentation JSDoc a toutes les fonctions exportees
> de src/services/payment.service.ts. Style concis, pas de @author.

# Extraction de composant
> Extrais la logique de filtrage du composant ProductList
> dans un hook custom useProductFilters. Garde les memes types.
```

### [15:30-18:30] Limites, pieges et fichiers de configuration
> L'IA est un outil formidable, mais elle a des limites serieuses qu'il faut connaitre.
**Action** : Montrer les pieges courants
```typescript
// Piege 1 : Hallucinations d'API
import { useOptimistic } from 'react'; // N'existe que depuis React 19
await prisma.user.softDelete(id);      // N'existe pas dans Prisma

// Piege 2 : Dependances fantomes
// L'IA importe des packages qui n'existent pas ou sont deprecies

// Piege 3 : Code non-idiomatique
// Melange callbacks et async/await, patterns inconstants
```
> Defense : toujours verifier les imports, toujours lancer les tests, toujours relire le code genere.
**Action** : Montrer les bonnes pratiques pour CLAUDE.md et .cursorrules
```
Un bon CLAUDE.md / .cursorrules :
- 2-3 phrases sur le projet
- Conventions non-evidentes
- Commandes utiles
- Pieges connus

Anti-patterns :
- 500 lignes de regles → le modele se perd
- Dupliquer la doc officielle → inutile
- Secrets ou credentials → JAMAIS
```

### [18:30-20:30] Comparaison et recommandation finale
> Pour conclure, voici ma recommandation.
**Action** : Afficher le tableau comparatif final
```
| Critere            | Copilot    | Claude Code | Cursor    |
|--------------------|------------|-------------|-----------|
| Completion inline  | Excellent  | Non         | Excellent |
| Agent autonome     | Non        | Excellent   | Moyen     |
| Multi-fichiers     | Edits      | Natif       | Composer  |
| Terminal/CLI       | Non        | Natif       | Non       |
| MCP/Extensions     | Limite     | Natif       | Limite    |
| Prix               | $10/mois   | Usage Claude| $20/mois  |
```
> Ma recommandation : Copilot pour la completion inline au quotidien, Claude Code pour les taches complexes de refactoring et architecture. C'est la combinaison la plus productive.
> Et la regle d'or : l'IA est un copilote, pas un pilote. Vous devez comprendre chaque ligne de code generee. Si vous ne comprenez pas pourquoi le code fonctionne, vous ne pourrez pas debugger quand il cassera.

## Points d'attention pour l'enregistrement
- S'assurer que les suggestions Copilot sont visibles a l'ecran (zoom VS Code)
- Montrer les raccourcis clavier (Tab, Esc, Alt+], Cmd+I) avec un overlay
- Ne pas accelerer les reponses de Claude Code — laisser le temps de lire
- Insister sur la relecture critique du code genere
- Avoir un backup si Copilot ne suggere pas ce qu'on attend
