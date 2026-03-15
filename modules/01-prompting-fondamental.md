# Module 01 — Prompting Fondamental

## Objectifs du module

A l'issue de ce module, vous serez capable de :

- Comprendre la difference entre zero-shot et few-shot prompting
- Structurer vos prompts avec les roles system, user et assistant
- Utiliser le chain-of-thought pour ameliorer le raisonnement
- Demander des sorties structurees (JSON, markdown, listes)
- Appliquer les bonnes pratiques de prompting
- Eviter les anti-patterns courants

---

## 1. Les bases du prompting

### 1.1 Qu'est-ce qu'un prompt ?

Un prompt est l'ensemble des instructions et du contexte que vous envoyez a un LLM pour obtenir une reponse. C'est votre interface avec le modele.

> **Analogie** : Pensez au prompt comme a un brief donne a un developpeur freelance tres competent mais qui ne connait rien de votre projet. Plus votre brief est clair, precis et contextuellement riche, meilleur sera le resultat.

### 1.2 La structure d'un appel API

```typescript
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  system: 'Tu es un expert TypeScript senior.', // System prompt
  messages: [
    { role: 'user', content: 'Explique les generics.' },       // User message
    { role: 'assistant', content: 'Les generics en TypeScript...' }, // Assistant (prefill optionnel)
    { role: 'user', content: 'Donne un exemple concret.' },    // Suite de conversation
  ],
})
```

### 1.3 Les trois roles

| Role | Description | Quand l'utiliser |
|------|------------|-----------------|
| **system** | Instructions globales, personnalite, contraintes | Toujours — definit le comportement general |
| **user** | Messages de l'utilisateur, questions, demandes | Chaque requete |
| **assistant** | Reponses precedentes du modele (ou prefill) | Conversations multi-tours, prefill pour forcer un format |

```typescript
// Le system prompt definit le "qui" et les regles
const systemPrompt = `Tu es un assistant technique specialise en TypeScript et Node.js.

Regles :
- Reponds toujours en francais
- Inclus des exemples de code TypeScript
- Sois concis : pas plus de 200 mots sauf si on te le demande
- Si tu ne sais pas, dis-le clairement`

// Le user message definit le "quoi"
const userMessage = 'Comment gerer les erreurs async en TypeScript ?'
```

---

## 2. Zero-shot vs Few-shot Prompting

### 2.1 Zero-shot : aucun exemple

En zero-shot, vous donnez simplement l'instruction sans aucun exemple. Le modele s'appuie uniquement sur son entrainement.

```typescript
// Zero-shot : classement de sentiment
const zeroShot = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 50,
  messages: [{
    role: 'user',
    content: 'Classifie le sentiment de ce texte comme "positif", "negatif" ou "neutre" :\n\n"Ce produit est absolument horrible, je regrette mon achat."',
  }],
})
// → "negatif"
```

Le zero-shot fonctionne bien pour les taches simples et non-ambigues.

### 2.2 Few-shot : apprendre par l'exemple

En few-shot, vous fournissez quelques exemples (generalement 2 a 5) du comportement attendu avant de poser votre vraie question.

```typescript
// Few-shot : extraction de donnees structurees
const fewShot = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 200,
  messages: [
    {
      role: 'user',
      content: 'Extrais le nom, le role et la techno principale.\n\nTexte: "Marie est dev frontend chez Acme, elle fait du React."',
    },
    {
      role: 'assistant',
      content: '{"nom": "Marie", "role": "dev frontend", "techno": "React"}',
    },
    {
      role: 'user',
      content: 'Extrais le nom, le role et la techno principale.\n\nTexte: "Pierre travaille comme lead backend et utilise principalement Go."',
    },
    {
      role: 'assistant',
      content: '{"nom": "Pierre", "role": "lead backend", "techno": "Go"}',
    },
    {
      role: 'user',
      content: 'Extrais le nom, le role et la techno principale.\n\nTexte: "Sophie est architecte cloud, specialisee en Terraform et AWS."',
    },
  ],
})
// → {"nom": "Sophie", "role": "architecte cloud", "techno": "Terraform"}
```

### 2.3 Quand utiliser quoi ?

| Methode | Cas d'usage | Avantages | Inconvenients |
|---------|------------|-----------|---------------|
| **Zero-shot** | Taches simples, classification evidente, resume | Moins de tokens, plus rapide | Peut etre ambigu |
| **Few-shot** | Format de sortie specifique, tache peu commune, nuances a capturer | Plus precis, format garanti | Plus de tokens (= plus cher) |

> **Regle empirique** : commencez toujours en zero-shot. Si le resultat n'est pas satisfaisant, ajoutez 2-3 exemples. Si ca ne suffit toujours pas, ameliorez votre system prompt.

### 2.4 Bonnes pratiques pour le few-shot

```typescript
// BON : exemples diversifies qui couvrent les cas limites
const goodFewShot = [
  // Exemple positif simple
  { input: 'Super produit, je recommande !', output: 'positif' },
  // Exemple negatif simple
  { input: 'Nul, ne marche pas.', output: 'negatif' },
  // Exemple ambigu (le plus important !)
  { input: 'Ca fait le job, sans plus.', output: 'neutre' },
  // Exemple avec negation (piege courant)
  { input: 'Pas mal du tout, je suis agreablement surpris.', output: 'positif' },
]

// MAUVAIS : tous les exemples sont similaires
const badFewShot = [
  { input: 'Genial !', output: 'positif' },
  { input: 'Super !', output: 'positif' },
  { input: 'Magnifique !', output: 'positif' },
  // Le modele va penser que tout est positif...
]
```

---

## 3. Chain-of-Thought (CoT)

### 3.1 Le probleme : les LLMs "sautent" aux conclusions

Les LLMs generent token par token, de gauche a droite. Sans incitation a reflechir, ils peuvent donner une reponse impulsive, surtout pour les problemes qui necessitent un raisonnement en plusieurs etapes.

```typescript
// Sans CoT — le modele peut se tromper
const sansCoT = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 100,
  messages: [{
    role: 'user',
    content: 'Un magasin fait 15% de remise sur un article a 80€, puis 10% de remise supplementaire. Quel est le prix final ?',
  }],
})
// Risque de repondre directement "60€" (en faisant 25% sur 80€) → FAUX
```

### 3.2 La solution : forcer le raisonnement etape par etape

```typescript
// Avec CoT — le modele raisonne avant de repondre
const avecCoT = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 500,
  messages: [{
    role: 'user',
    content: `Un magasin fait 15% de remise sur un article a 80€, puis 10% de remise supplementaire. Quel est le prix final ?

Reflechis etape par etape avant de donner ta reponse.`,
  }],
})
// Le modele va :
// 1. Calculer 15% de 80€ = 12€ → prix apres 1ere remise = 68€
// 2. Calculer 10% de 68€ = 6.80€ → prix final = 61.20€
// → Correct !
```

### 3.3 Pourquoi ca marche ?

> **Analogie** : imaginez qu'on vous demande de resoudre un calcul mental complexe. Si vous devez donner la reponse instantanement, vous risquez de vous tromper. Mais si on vous donne un papier brouillon pour poser le calcul, vous etes beaucoup plus precis. Le CoT est le "papier brouillon" du LLM.

Le mecanisme technique est le suivant :
- Le LLM genere token par token
- Quand il ecrit les etapes intermediaires, ces tokens deviennent du contexte pour les tokens suivants
- Le raisonnement intermediaire "guide" la generation finale

### 3.4 Variantes du CoT

```typescript
// 1. CoT simple : "Reflechis etape par etape"
const simple = 'Reflechis etape par etape avant de repondre.'

// 2. CoT structure : imposer un format
const structure = `Avant de repondre, suis ces etapes :
1. Identifie les elements cles du probleme
2. Liste les contraintes
3. Propose une solution
4. Verifie que la solution respecte les contraintes
5. Donne ta reponse finale`

// 3. CoT avec role
const roleCoT = `Tu es un architecte logiciel senior.
Quand on te pose une question technique :
1. Reformule le probleme dans tes propres mots
2. Identifie 2-3 approches possibles
3. Compare leurs avantages/inconvenients
4. Recommande la meilleure approche avec justification`
```

### 3.5 Exemple concret : review de code avec CoT

```typescript
const codeReview = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 2048,
  system: `Tu es un reviewer de code TypeScript senior.

Pour chaque code soumis, suis ce processus :
1. LIS le code en entier et identifie son objectif
2. VERIFIE la correction (bugs, edge cases, erreurs logiques)
3. EVALUE la qualite (lisibilite, maintenabilite, typage)
4. CHERCHE les problemes de securite
5. PROPOSE des ameliorations concretes avec du code

Utilise ce format :
## Objectif du code
## Bugs et erreurs
## Qualite du code
## Securite
## Ameliorations proposees`,
  messages: [{
    role: 'user',
    content: `Review ce code :

\`\`\`typescript
async function getUser(id: string) {
  const res = await fetch('/api/users/' + id)
  const data = await res.json()
  return data
}
\`\`\``,
  }],
})
```

---

## 4. Temperature et son impact

### 4.1 Rappel

La temperature controle la diversite de la sortie. On l'a vu au module 00, mais voyons maintenant comment l'utiliser strategiquement dans le prompting.

### 4.2 Matrice cas d'usage / temperature

| Cas d'usage | Temperature recommandee | Raison |
|------------|------------------------|--------|
| Generation de code | 0.0 - 0.2 | Determinisme, correction |
| Extraction de donnees | 0.0 | Precision maximale |
| Classification | 0.0 | Pas besoin de creativite |
| Reformulation de texte | 0.3 - 0.5 | Un peu de variete, mais fidele |
| Ecriture de documentation | 0.3 - 0.5 | Claire mais pas ennuyeuse |
| Brainstorming | 0.7 - 1.0 | Maximum de creativite |
| Ecriture creative | 0.8 - 1.0 | Originalite |
| Generation de tests | 0.3 - 0.5 | Variete des cas, mais correct |

### 4.3 Impact sur le code genere

```typescript
// Avec temperature 0 : toujours le meme code, previsible
// "Ecris une fonction qui inverse une chaine" → probablement split/reverse/join a chaque fois

// Avec temperature 0.7 : differentes approches
// Essai 1: split('').reverse().join('')
// Essai 2: boucle for decroissante
// Essai 3: Array.from(str).reduceRight(...)
// Essai 4: recursion

// Utile pour generer des tests varies !
async function generateTestCases(
  functionDescription: string,
  count: number,
): Promise<string[]> {
  const results: string[] = []

  for (let i = 0; i < count; i++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      temperature: 0.7,  // Variete dans les cas de test
      messages: [{
        role: 'user',
        content: `Genere UN cas de test unitaire original pour cette fonction :
${functionDescription}

Donne uniquement le code du test, sans explication.`,
      }],
    })

    if (response.content[0].type === 'text') {
      results.push(response.content[0].text)
    }
  }

  return results
}
```

---

## 5. Structured Output : obtenir du JSON, du markdown, des listes

### 5.1 Le probleme

Par defaut, un LLM genere du texte libre. Mais en tant que developpeur, vous avez besoin de sorties **parsables** : du JSON, des listes, des tableaux.

### 5.2 Strategie 1 : demander le format explicitement

```typescript
// Demander du JSON dans le prompt
const jsonResponse = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 500,
  messages: [{
    role: 'user',
    content: `Analyse ce message et extrais les informations au format JSON.

Message: "Salut, je suis Antoine Dupont, developpeur fullstack chez TechCorp. Je cherche un freelance React pour 3 mois a Paris, budget 600€/jour."

Reponds UNIQUEMENT avec le JSON, sans texte autour. Schema :
{
  "nom": string,
  "role": string,
  "entreprise": string,
  "besoin": string,
  "duree": string,
  "lieu": string,
  "budget": string
}`,
  }],
})
```

### 5.3 Strategie 2 : assistant prefill

Avec l'API Claude, vous pouvez "pre-remplir" le debut de la reponse de l'assistant pour forcer le format.

```typescript
// Prefill : forcer le modele a commencer par "{"
const prefillResponse = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 500,
  messages: [
    {
      role: 'user',
      content: 'Analyse ce code et donne les metriques : function add(a: number, b: number) { return a + b }',
    },
    {
      role: 'assistant',
      content: '{',  // Prefill : force la reponse a commencer par "{"
    },
  ],
})

// Le modele va continuer a partir de "{" et generer du JSON valide
// Attention : la reponse commence APRES le prefill, donc elle ne contient pas "{"
const fullJson = '{' + (prefillResponse.content[0].type === 'text' ? prefillResponse.content[0].text : '')
const metrics = JSON.parse(fullJson)
```

### 5.4 Strategie 3 : system prompt avec schema

```typescript
const structuredAnalysis = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  system: `Tu es un analyseur de code. Tu reponds TOUJOURS au format JSON suivant, sans texte supplementaire :

{
  "language": "typescript" | "javascript" | "other",
  "complexity": "low" | "medium" | "high",
  "issues": [
    {
      "severity": "error" | "warning" | "info",
      "line": number,
      "message": string,
      "suggestion": string
    }
  ],
  "score": number (0-100)
}`,
  messages: [{
    role: 'user',
    content: `Analyse ce code :

\`\`\`typescript
function fetchData(url) {
  let data = null
  fetch(url).then(r => r.json()).then(d => { data = d })
  return data
}
\`\`\``,
  }],
})
```

### 5.5 Parser la reponse de maniere robuste

Le modele peut parfois ajouter du texte avant ou apres le JSON. Voici comment gerer ca :

```typescript
function extractJson<T>(text: string): T {
  // Chercher le premier { et le dernier }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Aucun JSON trouve dans la reponse')
  }

  const jsonStr = text.slice(start, end + 1)

  try {
    return JSON.parse(jsonStr) as T
  } catch (error) {
    throw new Error(`JSON invalide : ${(error as Error).message}`)
  }
}

// Utilisation
interface CodeAnalysis {
  language: string
  complexity: string
  issues: Array<{
    severity: string
    line: number
    message: string
    suggestion: string
  }>
  score: number
}

const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
const analysis = extractJson<CodeAnalysis>(responseText)
console.log(`Score: ${analysis.score}/100`)
console.log(`Issues: ${analysis.issues.length}`)
```

### 5.6 Demander des listes et des tableaux markdown

```typescript
// Demander une liste structuree
const listPrompt = `Liste les 5 design patterns les plus utiles en TypeScript.

Pour chaque pattern, donne :
- **Nom** : le nom du pattern
- **Categorie** : creational, structural ou behavioral
- **Cas d'usage** : quand l'utiliser en 1 phrase
- **Exemple** : un snippet TypeScript de 3-5 lignes

Utilise le format markdown avec des titres ### pour chaque pattern.`

// Demander un tableau
const tablePrompt = `Compare ces 3 ORM TypeScript dans un tableau markdown :
- Prisma
- TypeORM
- Drizzle

Colonnes : Nom, Typage, Performance, Courbe d'apprentissage, Migrations, Stars GitHub`
```

---

## 6. Bonnes pratiques de prompting

### 6.1 Etre specifique

```typescript
// MAUVAIS : vague
const vague = 'Fais-moi un composant.'

// BON : specifique
const specifique = `Cree un composant React TypeScript "UserCard" qui :
- Affiche le nom, l'email et l'avatar d'un utilisateur
- Accepte une prop "user" de type { name: string; email: string; avatarUrl: string }
- Utilise Tailwind CSS pour le style
- Inclut un bouton "Contacter" qui appelle une prop "onContact"
- Gere le cas ou avatarUrl est undefined (afficher les initiales)
- Exporte le composant par defaut`
```

### 6.2 Donner du contexte

```typescript
// MAUVAIS : pas de contexte
const sansContexte = 'Corrige ce bug.'

// BON : contexte complet
const avecContexte = `Contexte : application e-commerce Nuxt 3, TypeScript strict.
Le composant ProductList utilise un composable "useProducts" qui fetch une API REST.

Bug : quand l'utilisateur change de page rapidement, les resultats de la page precedente
s'affichent brievement avant ceux de la nouvelle page (race condition).

Code actuel :
\`\`\`typescript
const { data: products } = await useFetch('/api/products', {
  query: { page: currentPage.value },
})
\`\`\`

Comment corriger cette race condition ?`
```

### 6.3 Definir le format de sortie

```typescript
const formatDefini = `Analyse cette pull request et donne ton avis.

Format de reponse attendu :
## Resume
(2-3 phrases)

## Points positifs
- (liste a puces)

## Problemes trouves
- [ ] (checklist)

## Suggestion de refactoring
\`\`\`typescript
(code ameliore)
\`\`\`

## Verdict
APPROUVE / CHANGEMENTS DEMANDES / A DISCUTER`
```

### 6.4 Definir ce que le modele ne doit PAS faire

```typescript
const contraintes = `Reponds a la question technique ci-dessous.

Contraintes :
- Ne genere PAS de code si ce n'est pas demande
- Ne dis PAS "en tant que modele de langage..."
- Ne repete PAS la question dans ta reponse
- Si tu n'es pas sur a 90%, dis-le explicitement
- Maximum 150 mots`
```

### 6.5 Utiliser des delimiteurs

```typescript
// Utiliser des delimiteurs clairs pour separer les sections du prompt
const avecDelimiteurs = `Tu es un traducteur technique.

<source_text>
TypeScript generics allow you to create reusable components that work
with a variety of types rather than a single one.
</source_text>

<target_language>francais</target_language>

<glossary>
- generics = generiques (garder le terme anglais entre parentheses)
- components = composants
- types = types (ne pas traduire)
</glossary>

Traduis le texte source dans la langue cible en respectant le glossaire.`
```

### 6.6 Tableau recapitulatif des bonnes pratiques

| Pratique | Exemple | Impact |
|----------|---------|--------|
| Etre specifique | "Cree un composant X avec les props Y" | Reponse precise, moins d'iterations |
| Donner du contexte | "Dans un projet Nuxt 3 avec TypeScript..." | Reponse adaptee a votre stack |
| Definir le format | "Reponds en JSON avec ce schema..." | Sortie parsable et previsible |
| Definir les contraintes | "Maximum 100 mots, pas de code" | Evite le hors-sujet |
| Utiliser des delimiteurs | `<code>...</code>`, `---`, XML tags | Separation claire des sections |
| Donner des exemples | Few-shot avec 2-3 cas | Format et style garantis |

---

## 7. Anti-patterns a eviter

### 7.1 Le prompt vague

```typescript
// ANTI-PATTERN : le prompt vague
const vague = 'Aide-moi avec mon code.'
// Le modele ne sait pas quel code, quel probleme, quel langage...

// CORRECTIF : etre precis
const precis = `Mon composant Vue 3 <UserList> ne se met pas a jour quand le tableau
"users" change. Voici le code : [...]. Pourquoi le watch ne se declenche pas ?`
```

### 7.2 Le prompt contradictoire

```typescript
// ANTI-PATTERN : instructions contradictoires
const contradictoire = `Explique en detail les closures en JavaScript.
Sois tres bref, maximum 2 phrases.
Inclus 5 exemples de code.`
// "en detail" + "maximum 2 phrases" + "5 exemples" → impossible !

// CORRECTIF : choisir une direction
const coherent = `Explique les closures en JavaScript.
Donne une definition en 2 phrases, puis un seul exemple de code commente.`
```

### 7.3 Le prompt trop long (prompt bloat)

```typescript
// ANTI-PATTERN : repeter les memes instructions 5 fois
const bloat = `Tu es un expert.
Reponds en expert.
Sois un expert TypeScript.
En tant qu'expert TypeScript, reponds...
N'oublie pas que tu es un expert.`

// CORRECTIF : dire les choses une fois, clairement
const concis = `Tu es un expert TypeScript senior. Reponds de maniere concise et technique.`
```

### 7.4 Le prompt sans format de sortie

```typescript
// ANTI-PATTERN : pas de format defini
const sansFormat = 'Liste les avantages de TypeScript.'
// Le modele peut repondre en paragraphe, en liste, en tableau...

// CORRECTIF : specifier le format
const avecFormat = `Liste les 5 principaux avantages de TypeScript.
Format : liste a puces, une phrase par avantage, pas d'introduction ni de conclusion.`
```

### 7.5 Le prompt qui "menace" le modele

```typescript
// ANTI-PATTERN : menaces et manipulations
const menace = 'Si tu ne reponds pas correctement, je vais annuler mon abonnement !'
// Ca ne fonctionne pas — le modele n'a pas de notion de consequence

// CORRECTIF : etre clair sur les attentes
const clair = 'Reponds uniquement si tu es confiant dans ta reponse. Sinon, dis-le.'
```

### 7.6 Le prompt qui demande d'inventer

```typescript
// ANTI-PATTERN : demander des faits sans preciser
const inventionRisk = 'Quel est le benchmark de performance de la lib xyz-utils v4.2.3 ?'
// Si la lib n'existe pas, le modele va probablement inventer des chiffres !

// CORRECTIF : permettre au modele de dire qu'il ne sait pas
const safe = `Quel est le benchmark de performance de la lib xyz-utils v4.2.3 ?
Si tu ne connais pas cette lib ou si tu n'as pas ces informations, dis-le clairement.`
```

---

## 8. Exemples complets en TypeScript

### 8.1 Chatbot CLI simple

```typescript
// src/chatbot-cli.ts
import Anthropic from '@anthropic-ai/sdk'
import * as readline from 'node:readline'
import 'dotenv/config'

const client = new Anthropic()

const systemPrompt = `Tu es un assistant de developpement TypeScript.
- Reponds en francais
- Sois concis (max 200 mots sauf si on demande plus)
- Inclus du code TypeScript quand c'est pertinent
- Si tu ne sais pas, dis-le`

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const conversationHistory: Message[] = []

async function chat(userMessage: string): Promise<string> {
  conversationHistory.push({ role: 'user', content: userMessage })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: conversationHistory,
  })

  const assistantMessage = response.content[0].type === 'text'
    ? response.content[0].text
    : ''

  conversationHistory.push({ role: 'assistant', content: assistantMessage })

  return assistantMessage
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  console.log('Chatbot TypeScript (tapez "quit" pour quitter)\n')

  const askQuestion = () => {
    rl.question('Vous > ', async (input) => {
      const trimmed = input.trim()
      if (trimmed.toLowerCase() === 'quit') {
        rl.close()
        return
      }

      try {
        const response = await chat(trimmed)
        console.log(`\nAssistant > ${response}\n`)
      } catch (error) {
        console.error('Erreur:', (error as Error).message)
      }

      askQuestion()
    })
  }

  askQuestion()
}

main()
```

### 8.2 Generateur de tests unitaires

```typescript
// src/test-generator.ts
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'node:fs'
import 'dotenv/config'

const client = new Anthropic()

async function generateTests(sourceCode: string, framework: 'vitest' | 'jest' = 'vitest'): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    temperature: 0.2,
    system: `Tu es un expert en tests unitaires TypeScript.
Tu generes des tests ${framework} complets, incluant :
- Les cas nominaux (happy path)
- Les cas limites (edge cases)
- Les cas d'erreur
- Les types des mocks si necessaire

Reponds UNIQUEMENT avec le code de test, sans explication.
Le code doit etre pret a executer.`,
    messages: [{
      role: 'user',
      content: `Genere les tests unitaires pour ce code :\n\n\`\`\`typescript\n${sourceCode}\n\`\`\``,
    }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

// Utilisation
async function main() {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error('Usage: npx tsx src/test-generator.ts <fichier.ts>')
    process.exit(1)
  }

  const sourceCode = readFileSync(filePath, 'utf-8')
  console.log(`Generation des tests pour ${filePath}...\n`)

  const tests = await generateTests(sourceCode)
  console.log(tests)
}

main().catch(console.error)
```

### 8.3 Extracteur de donnees structure

```typescript
// src/data-extractor.ts
import Anthropic from '@anthropic-ai/sdk'
import 'dotenv/config'

const client = new Anthropic()

interface ExtractedContact {
  name: string
  email: string | null
  phone: string | null
  company: string | null
  role: string | null
}

async function extractContact(text: string): Promise<ExtractedContact> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    temperature: 0,
    system: `Extrais les informations de contact du texte fourni.
Reponds UNIQUEMENT avec un JSON valide, sans texte autour.
Utilise null pour les champs non trouves.

Schema :
{
  "name": string,
  "email": string | null,
  "phone": string | null,
  "company": string | null,
  "role": string | null
}`,
    messages: [
      // Few-shot examples
      {
        role: 'user',
        content: 'Jean Martin, CTO chez DataFlow, jean@dataflow.io, 06 12 34 56 78',
      },
      {
        role: 'assistant',
        content: '{"name":"Jean Martin","email":"jean@dataflow.io","phone":"06 12 34 56 78","company":"DataFlow","role":"CTO"}',
      },
      // Actual request
      {
        role: 'user',
        content: text,
      },
    ],
  })

  const responseText = response.content[0].type === 'text' ? response.content[0].text : '{}'
  return JSON.parse(responseText) as ExtractedContact
}

// Utilisation
async function main() {
  const texts = [
    'Bonjour, je suis Sophie Leclerc, dev senior chez Acme Corp. Mon mail : sophie.l@acme.com',
    'Pierre (freelance React) — contact : pierre.dev@gmail.com ou 07 98 76 54 32',
    'Maria travaille comme designer UX',
  ]

  for (const text of texts) {
    const contact = await extractContact(text)
    console.log(`\nTexte: "${text}"`)
    console.log('Extrait:', JSON.stringify(contact, null, 2))
  }
}

main().catch(console.error)
```

---

## 9. Exercices pratiques

### Exercice 1 — Zero-shot vs Few-shot

Creez un script qui classifie des commits Git en categories (feat, fix, refactor, docs, test, chore). Implementez une version zero-shot et une version few-shot. Comparez les resultats sur 10 messages de commit reels de vos projets.

### Exercice 2 — Chain-of-Thought pour le debug

Ecrivez un prompt qui prend un message d'erreur TypeScript et le code correspondant, puis :
1. Explique l'erreur en francais simple
2. Identifie la cause racine etape par etape
3. Propose un correctif avec du code

Testez avec au moins 3 erreurs TypeScript differentes.

### Exercice 3 — Structured Output robuste

Creez une fonction `analyzePackageJson(content: string)` qui utilise Claude pour analyser un `package.json` et retourner un objet type avec :
- `outdatedDeps: string[]` (dependances potentiellement obsoletes)
- `securityConcerns: string[]` (scripts suspects, dependances risquees)
- `suggestions: string[]` (ameliorations possibles)
- `score: number` (0-100)

Gerez les cas d'erreur (JSON invalide du LLM, timeout, etc.).

### Exercice 4 — System prompt engineering

Creez 3 system prompts differents pour un meme cas d'usage (assistant de code review) :
1. Un prompt minimaliste (2-3 lignes)
2. Un prompt detaille avec regles et format (15-20 lignes)
3. Un prompt avec few-shot integre (exemples de bonnes reviews)

Comparez la qualite des reviews sur le meme code source.

---

## 10. Points cles a retenir

1. **Zero-shot d'abord, few-shot si necessaire** : ne complexifiez pas sans raison
2. **Le CoT est votre meilleur ami** : "Reflechis etape par etape" ameliore presque toujours les reponses complexes
3. **Definissez toujours le format de sortie** : surtout si vous allez parser la reponse programmatiquement
4. **Le system prompt est votre fondation** : investissez du temps a le peaufiner
5. **Les anti-patterns coutent cher** : un prompt vague = plus d'iterations = plus de tokens = plus d'argent
6. **Testez, itérez, mesurez** : le prompting est empirique, pas theorique
