# Module 00 — Prérequis & Paysage IA

<!-- nav-cours-précédent -->

> **Cours précédent** : [WebGPU & 3D](../../20-webgpu-3d/modules/29-projet-final-expert.md). Si tu arrives ici sans avoir fait les cours précédents, consulte le [guide de démarrage](../../GUIDE-DEMARRAGE.md).

## Objectifs du module

A l'issue de ce module, vous serez capable de :

- Vérifier que votre environnement de développement est pret pour le cours
- Comprendre la terminologie essentielle de l'IA (ML, DL, LLM, token, embedding, etc.)
- Situer les modèles de langage dans l'histoire recente de l'IA
- Distinguer modèles proprietaires et open-source
- Comprendre les paramètres clés qui influencent le comportement d'un LLM
- Choisir le bon modèle selon votre cas d'usage

---

## 1. Prérequis techniques

### 1.1 Ce que vous devez maîtriser

Ce cours s'adresse a des développeurs JavaScript/TypeScript ayant une experience professionnelle. Avant de commencer, assurez-vous de maîtriser les bases suivantes.

#### TypeScript

Vous devez etre a l'aise avec :

- Les types de base (`string`, `number`, `boolean`, `unknown`, `any`)
- Les interfaces et les types
- Les génériques (`<T>`)
- `async` / `await` et les `Promise`
- Les modules ESM (`import` / `export`)

```typescript
// Vous devez comprendre ce code sans difficulte
interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

async function sendMessages(messages: Message[]): Promise<string> {
  const response = await fetch("https://api.example.com/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.completion;
}
```

#### Node.js et npm/pnpm

- Créer un projet avec `npm init` ou `pnpm init`
- Installer des dépendances
- Utiliser des variables d'environnement (`.env`)
- Exécuter des scripts TypeScript avec `tsx` ou `ts-node`

#### Bases HTTP

- Méthodes HTTP (GET, POST, PUT, DELETE)
- Headers (Authorization, Content-Type)
- Codes de statut (200, 400, 401, 429, 500)
- JSON comme format d'echange

### 1.2 Preparation de l'environnement

```bash
# Verifier les versions
node --version   # >= 20.x
pnpm --version   # >= 9.x (ou npm >= 10.x)

# Creer le projet du cours
mkdir ia-playground && cd ia-playground
pnpm init

# Installer les dependances de base
pnpm add typescript tsx dotenv
pnpm add @anthropic-ai/sdk openai
pnpm add -D @types/node

# Initialiser TypeScript
npx tsc --init --target ES2022 --module NodeNext --moduleResolution NodeNext --strict
```

Creez un fichier `.env` à la racine :

```bash
# .env — NE JAMAIS COMMITER CE FICHIER
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx
```

Creez un fichier `src/hello.ts` pour vérifier que tout fonctionne :

```typescript
// src/hello.ts
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const client = new Anthropic();

async function main() {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    messages: [{ role: "user", content: 'Dis "Bonjour" en 5 langues.' }],
  });

  console.log(message.content[0]);
}

main();
```

```bash
npx tsx src/hello.ts
```

Si vous voyez une réponse du modèle, votre environnement est pret.

---

## 2. Terminologie essentielle

### 2.1 Les grands concepts

| Terme                                 | Definition                                                                                                                               | Analogie                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **IA** (Intelligence Artificielle)    | Domaine de l'informatique visant a créer des systèmes capables de realiser des taches qui necessitent normalement l'intelligence humaine | Un parapluie qui englobe tout le reste                                         |
| **ML** (Machine Learning)             | Sous-domaine de l'IA ou les machines apprennent à partir de donnees sans etre explicitement programmees                                  | Apprendre a reconnaitre des chats en regardant des milliers de photos de chats |
| **DL** (Deep Learning)                | Sous-domaine du ML utilisant des réseaux de neurones profonds (multiples couches)                                                        | Un cerveau artificiel avec des milliards de connexions                         |
| **LLM** (Large Language Model)        | Modèle de deep learning entraine sur d'enormes quantites de texte, capable de générer et comprendre du langage                           | Un autocomplete surpuissant qui a lu une grande partie d'Internet              |
| **NLP** (Natural Language Processing) | Domaine de l'IA traitant du langage humain                                                                                               | Apprendre à un ordinateur a lire et écrire                                     |

### 2.2 Vocabulaire des LLMs

#### Token

Un token est l'unite de base que le modèle manipule. Ce n'est ni un mot, ni un caractere — c'est un morceau de texte défini par le tokenizer du modèle.

```typescript
// Exemples de tokenisation (approximatif)
// "Bonjour"     → ["Bon", "jour"]           → 2 tokens
// "Hello world" → ["Hello", " world"]        → 2 tokens
// "développeur" → ["dé", "velopp", "eur"]    → 3 tokens
// "TypeScript"  → ["Type", "Script"]         → 2 tokens
// "{"           → ["{"]                      → 1 token

// Regle empirique :
// - Anglais : ~4 caracteres par token, ~0.75 mots par token
// - Francais : ~3 caracteres par token (un peu moins efficace)
// - Code : variable, les mots-cles courants sont souvent 1 token
```

> **Pourquoi c'est important ?** Les LLMs facturent par token (input + output). La taille de la context window est aussi mesuree en tokens. Un prompt trop long coute cher et peut depasser la limite du modèle.

#### Embedding

Un embedding est une representation numérique (vecteur) d'un texte dans un espace a haute dimension. Les textes semantiquement proches ont des embeddings proches.

```typescript
// Conceptuellement, un embedding ressemble a ca :
const embeddingChat = [0.12, -0.45, 0.78, 0.33 /* ... 1536 dimensions */];
const embeddingConversation = [0.11, -0.44, 0.77, 0.34 /* ... proches ! */];
const embeddingVoiture = [0.89, 0.12, -0.56, 0.01 /* ... tres differents */];

// La distance cosinus entre "chat" et "conversation" sera faible
// La distance entre "chat" et "voiture" sera grande
```

#### Inference

L'inference est le processus par lequel un modèle entraine généré une réponse à partir d'une entree. Quand vous envoyez un prompt a Claude et recevez une réponse, c'est de l'inference.

#### Prompt et Completion

- **Prompt** : le texte que vous envoyez au modèle (votre question, vos instructions)
- **Completion** : la réponse générée par le modèle

```typescript
// Le prompt
const prompt = "Explique les closures en JavaScript en 3 phrases.";

// La completion (generee par le LLM)
// "Une closure est une fonction qui se souvient de son environnement
//  lexical meme apres que la fonction englobante a termine son execution..."
```

#### Context Window (fenêtre de contexte)

La context window est la quantite maximale de tokens qu'un modèle peut traiter en une seule requête (prompt + completion combines).

```
┌─────────────────────────────────────────────────────────┐
│                    Context Window                        │
│                                                         │
│  ┌──────────────────────┐  ┌─────────────────────────┐  │
│  │   Tokens d'entree    │  │  Tokens de sortie       │  │
│  │   (votre prompt)     │  │  (la completion)        │  │
│  │                      │  │                         │  │
│  │  system prompt       │  │  reponse generee        │  │
│  │  + historique conv.  │  │  par le modele          │  │
│  │  + message actuel    │  │                         │  │
│  └──────────────────────┘  └─────────────────────────┘  │
│                                                         │
│  Total = input tokens + output tokens <= context window  │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Analogie fondamentale : le LLM comme autocomplete

Imaginez l'autocomplete de votre telephone, mais en infiniment plus puissant :

1. Votre telephone predit le prochain **mot** à partir des quelques mots précédents
2. Un LLM predit le prochain **token** à partir de toute la conversation précédente
3. Votre telephone a ete entraine sur vos SMS ; un LLM a ete entraine sur une immense partie d'Internet

```
Telephone :  "Salut, ca va ?" → predit "bien" ou "?"
LLM :        "Explique les closures en JS" → genere un paragraphe complet et structure
```

Le LLM ne "comprend" pas comme un humain. Il est extraordinairement bon pour predire la suite la plus probable d'un texte. Mais cette capacité de prediction, a grande echelle, produit un comportement qui ressemble fortement a de la comprehension.

> **A retenir** : un LLM généré du texte token par token, de gauche a droite, en choisissant le token le plus probable (module les paramètres de temperature). Il ne "reflechit" pas en arriere, il ne "relit" pas ce qu'il a écrit. C'est une prediction sequentielle massivement parallelisee.

---

## 3. Histoire rapide des LLMs

### 3.1 La timeline

| Annee | Modèle / Événement                     | Impact                                                        |
| ----- | -------------------------------------- | ------------------------------------------------------------- |
| 2017  | **Attention Is All You Need** (Google) | Invention de l'architecture Transformer                       |
| 2018  | **GPT-1** (OpenAI)                     | 117M paramètres, premier GPT                                  |
| 2019  | **GPT-2** (OpenAI)                     | 1.5B paramètres, "trop dangereux pour etre publie"            |
| 2020  | **GPT-3** (OpenAI)                     | 175B paramètres, few-shot learning emergent                   |
| 2021  | **Codex** (OpenAI)                     | GPT-3 fine-tune sur du code → GitHub Copilot                  |
| 2022  | **ChatGPT** (OpenAI)                   | GPT-3.5 avec RLHF, explosion grand public                     |
| 2023  | **GPT-4** (OpenAI)                     | Multimodal (texte + image), raisonnement ameliore             |
| 2023  | **Claude 2** (Anthropic)               | Context window de 100K tokens                                 |
| 2023  | **Llama 2** (Meta)                     | Open-source, democratisation                                  |
| 2023  | **Mistral 7B** (Mistral AI)            | Petit modèle open-source très performant                      |
| 2024  | **Claude 3** (Anthropic)               | Famille Opus/Sonnet/Haiku, leadership sur certains benchmarks |
| 2024  | **GPT-4o** (OpenAI)                    | Multimodal natif (texte, image, audio)                        |
| 2024  | **Llama 3.1** (Meta)                   | 405B paramètres, open-source competitif                       |
| 2024  | **Mistral Large** (Mistral AI)         | Modèle proprietaire competitif                                |
| 2025  | **Claude 4** (Anthropic)               | Opus, Sonnet — agents, raisonnement etendu                    |
| 2025  | **Gemini 2** (Google)                  | Intégration profonde dans l'ecosysteme Google                 |

### 3.2 L'architecture Transformer

Sans entrer dans les details mathematiques, voici l'intuition :

```
┌─────────────────────────────────────────────────┐
│                  Transformer                      │
│                                                   │
│  Entree: "Le chat est sur le ___"                │
│                                                   │
│  1. Tokenisation → [Le][chat][est][sur][le][___] │
│                                                   │
│  2. Embedding → chaque token devient un vecteur  │
│                                                   │
│  3. Self-Attention → chaque token "regarde"      │
│     tous les autres pour comprendre le contexte  │
│     "chat" fait attention a "sur" et "le"        │
│                                                   │
│  4. Feed-Forward → transformation non-lineaire   │
│                                                   │
│  5. Repetition (N couches empilees)              │
│                                                   │
│  6. Prediction → probabilite pour chaque token   │
│     possible: "tapis"=0.35, "lit"=0.12, ...      │
│                                                   │
│  Sortie: "tapis" (token le plus probable)        │
└─────────────────────────────────────────────────┘
```

Le mécanisme de **self-attention** est la clé : il permet à chaque token de "faire attention" a tous les autres tokens du contexte, ce qui capture les relations a longue distance dans le texte.

### 3.3 De GPT-1 a aujourd'hui : l'echelle change tout

L'une des découvertes les plus surprenantes est que des capacites **emergentes** apparaissent quand on augmente la taille du modèle :

- **GPT-1** (117M params) : généré du texte coherent mais basique
- **GPT-2** (1.5B params) : écrit des articles convaincants
- **GPT-3** (175B params) : few-shot learning, traduction, code simple
- **GPT-4** (taille inconnue, estimee >1T params) : raisonnement complexe, multimodal

C'est comme si un telephone qui autocomplete des mots devenait, a force d'etre agrandi, capable de rediger des dissertations. Personne ne l'avait complètement prévu.

---

## 4. Modeles proprietaires vs open-source

### 4.1 Modeles proprietaires

Ces modèles sont accessibles uniquement via API. Vous ne pouvez pas les telecharger, les modifier ou les heberger vous-même.

#### Claude (Anthropic)

```typescript
// Utilisation de Claude via l'API
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [
    { role: "user", content: "Explique le pattern Observer en TypeScript." },
  ],
});
```

- **Opus** : le plus puissant, raisonnement complexe, code de haute qualite
- **Sonnet** : excellent rapport performance/cout, le plus utilise
- **Haiku** : le plus rapide et economique, ideal pour les taches simples

#### GPT (OpenAI)

- **GPT-4o** : multimodal, rapide, bon rapport qualite/prix
- **GPT-4o mini** : très economique, suffisant pour beaucoup de taches
- **o1 / o3** : modèles de raisonnement (thinking models)

#### Gemini (Google)

- **Gemini 2.0 Flash** : rapide, multimodal natif
- **Gemini 2.0 Pro** : plus puissant, context window enorme (jusqu'a 2M tokens)

### 4.2 Modeles open-source

Ces modèles peuvent etre telecharges, modifies et heberges sur votre propre infrastructure.

#### Llama (Meta)

- **Llama 3.1 405B** : le plus gros modèle open-source, competitif avec GPT-4
- **Llama 3.1 70B** : excellent rapport taille/performance
- **Llama 3.1 8B** : suffisant pour beaucoup de taches, tourneable sur un bon GPU

#### Mistral (Mistral AI)

- **Mistral Large** : competitif avec GPT-4 (mais proprietaire via API)
- **Mixtral 8x22B** : architecture MoE (Mixture of Experts), efficace
- **Mistral 7B** : petit, rapide, open-source

#### Autres modèles open-source notables

- **Phi-3** (Microsoft) : petits modèles très performants pour leur taille
- **Gemma 2** (Google) : modèles legers dérivés de Gemini
- **CodeLlama** (Meta) : specialise code
- **DeepSeek Coder** : specialise code, open-source

### 4.3 Proprietaire vs Open-source : comment choisir ?

| Critere               | Proprietaire                                 | Open-source                                           |
| --------------------- | -------------------------------------------- | ----------------------------------------------------- |
| **Performance brute** | Generalement superieure (Opus, GPT-4)        | S'ameliore rapidement, Llama 3.1 405B est competitif  |
| **Cout par requête**  | Pay-per-use via API                          | Gratuit une fois heberge (mais cout infra)            |
| **Latence**           | Depend du provider, généralement optimise    | Depend de votre infra, peut etre plus rapide en local |
| **Confidentialite**   | Donnees envoyees au provider                 | Donnees restent chez vous                             |
| **Personnalisation**  | Limitee (system prompt, fine-tuning parfois) | Totale (fine-tuning, modification, etc.)              |
| **Maintenance**       | Zero (le provider géré tout)                 | A votre charge (GPU, mises a jour, etc.)              |
| **Disponibilité**     | SLA du provider, risque de downtime          | Sous votre controle                                   |

> **Conseil pour debuter** : commencez avec les APIs proprietaires (Claude ou GPT). L'infra pour heberger des modèles open-source est un sujet en soi. Une fois que vous maitrisez les concepts, explorez l'open-source avec Ollama pour le développement local.

---

## 5. Parametres des LLMs

### 5.1 Temperature

La temperature controle le "degre de creativite" du modèle. Techniquement, elle modifie la distribution de probabilite des tokens.

```
Temperature = 0.0 (deterministe)
┌────────────────────────────────────────────┐
│ "tapis"  ████████████████████████  (0.85)  │
│ "lit"    ███                       (0.10)  │
│ "canape" █                         (0.04)  │
│ "sol"    ▏                         (0.01)  │
└────────────────────────────────────────────┘
→ Choisit presque toujours "tapis"

Temperature = 1.0 (creatif)
┌────────────────────────────────────────────┐
│ "tapis"  ██████████████             (0.45) │
│ "lit"    ████████                   (0.25) │
│ "canape" █████                      (0.15) │
│ "sol"    ████                       (0.10) │
│ "frigo"  █                          (0.05) │
└────────────────────────────────────────────┘
→ Plus de variete, parfois surprenant

Temperature = 2.0 (chaotique)
┌────────────────────────────────────────────┐
│ "tapis"  █████                      (0.22) │
│ "lit"    ████                       (0.18) │
│ "canape" ████                       (0.16) │
│ "sol"    ███                        (0.14) │
│ "frigo"  ███                        (0.12) │
│ "lune"   ██                         (0.10) │
│ "code"   ██                         (0.08) │
└────────────────────────────────────────────┘
→ Quasi aleatoire, souvent incoherent
```

```typescript
// Temperature basse (0.0-0.3) : generation de code, extraction de donnees, classification
const codeResponse = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  temperature: 0, // Deterministe : meme input → meme output
  messages: [
    {
      role: "user",
      content: "Ecris une fonction qui trie un tableau par quicksort.",
    },
  ],
});

// Temperature haute (0.7-1.0) : ecriture creative, brainstorming
const creativeResponse = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  temperature: 0.9, // Plus de variete et de creativite
  messages: [
    {
      role: "user",
      content: "Propose 10 noms originaux pour une startup de dev tools.",
    },
  ],
});
```

### 5.2 Top-p (nucleus sampling)

Au lieu de considerer tous les tokens possibles, on ne garde que les tokens dont la probabilite cumulee atteint `p`.

```
top_p = 0.9 signifie :
"Ne considere que les tokens qui, ensemble, representent 90% de la probabilite"

Tokens tries par probabilite :
  "tapis"   0.45  ─┐
  "lit"     0.25   ├─ cumul = 0.90 → on garde ceux-la
  "canape"  0.20  ─┘
  "sol"     0.05  ─── elimine (au-dela de 90%)
  "frigo"   0.03  ─── elimine
  "lune"    0.02  ─── elimine
```

> **En pratique** : modifiez soit la temperature, soit top-p, mais rarement les deux en même temps. Anthropic recommande d'utiliser principalement la temperature.

### 5.3 Top-k

On ne garde que les `k` tokens les plus probables, quel que soit leur probabilite cumulee.

```
top_k = 3 :
  "tapis"   0.45  ─┐
  "lit"     0.25   ├─ on garde les top 3
  "canape"  0.20  ─┘
  "sol"     0.05  ─── elimine
  ...
```

### 5.4 Max tokens

Le nombre maximum de tokens que le modèle peut générer dans sa réponse.

```typescript
// Reponse courte
const short = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 100, // ~75 mots en francais
  messages: [{ role: "user", content: "Resume le pattern Singleton." }],
});

// Reponse longue
const long = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 4096, // ~3000 mots
  messages: [
    {
      role: "user",
      content: "Ecris un tutoriel complet sur les design patterns.",
    },
  ],
});
```

> **Attention** : `max_tokens` est une limite haute. Si le modèle n'a besoin que de 50 tokens pour repondre, il s'arretera a 50 même si vous avez mis `max_tokens: 4096`. Vous ne payez que les tokens effectivement generes.

### 5.5 Stop sequences

Des chaines de caracteres qui, si le modèle les généré, arretent la génération.

````typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  stop_sequences: ["```", "---", "FIN"],
  messages: [
    {
      role: "user",
      content: "Ecris une fonction, arrete-toi après le bloc de code.",
    },
  ],
});
````

### 5.6 Tableau recapitulatif des parametres

| Parametre        | Valeur typique | Quand l'ajuster                        | Impact                         |
| ---------------- | -------------- | -------------------------------------- | ------------------------------ |
| `temperature`    | 0.0 - 1.0      | Code: 0, creatif: 0.7-1.0              | Creativite vs determinisme     |
| `top_p`          | 0.9 - 1.0      | Rarement (utiliser temperature plutot) | Diversite du vocabulaire       |
| `top_k`          | 40 - 100       | Rarement                               | Nombre de candidats consideres |
| `max_tokens`     | 256 - 8192     | Selon la longueur attendue             | Limite de la reponse           |
| `stop_sequences` | `[]`           | Quand vous voulez un format precis     | Arret conditionnel             |

---

## 6. Tableau comparatif des modeles

### 6.1 Modeles Claude (Anthropic)

| Modele               | Context Window | Forces                                     | Faiblesses                             | Prix input/output (par 1M tokens) |
| -------------------- | -------------- | ------------------------------------------ | -------------------------------------- | --------------------------------- |
| **Claude Opus 4**    | 200K           | Raisonnement complexe, code expert, agents | Lent, cher                             | ~$15 / $75                        |
| **Claude Sonnet 4**  | 200K           | Excellent equilibre, code solide, rapide   | Moins bon que Opus sur les cas limites | ~$3 / $15                         |
| **Claude Haiku 3.5** | 200K           | Ultra-rapide, tres economique              | Moins precis sur les taches complexes  | ~$0.25 / $1.25                    |

### 6.2 Modeles GPT (OpenAI)

| Modele          | Context Window | Forces                         | Faiblesses                                   | Prix input/output (par 1M tokens) |
| --------------- | -------------- | ------------------------------ | -------------------------------------------- | --------------------------------- |
| **GPT-4o**      | 128K           | Multimodal, rapide, polyvalent | Moins bon que Opus sur le raisonnement       | ~$2.50 / $10                      |
| **GPT-4o mini** | 128K           | Tres economique, rapide        | Performance limitee sur les taches complexes | ~$0.15 / $0.60                    |
| **o1**          | 200K           | Raisonnement (thinking model)  | Lent, cher, pas de streaming                 | ~$15 / $60                        |

### 6.3 Modeles open-source

| Modele             | Parametres | Context Window | Forces                       | Utilisation                  |
| ------------------ | ---------- | -------------- | ---------------------------- | ---------------------------- |
| **Llama 3.1 405B** | 405B       | 128K           | Proche de GPT-4, open-source | Necesssite un cluster de GPU |
| **Llama 3.1 70B**  | 70B        | 128K           | Bon rapport taille/perf      | 1-2 GPU haut de gamme        |
| **Llama 3.1 8B**   | 8B         | 128K           | Petit, rapide, fine-tunable  | 1 GPU ou CPU (quantifie)     |
| **Mistral 7B**     | 7B         | 32K            | Tres efficace pour sa taille | 1 GPU ou CPU (quantifie)     |
| **Mixtral 8x22B**  | 176B (MoE) | 64K            | Architecture MoE innovante   | 2-4 GPU                      |
| **Phi-3 mini**     | 3.8B       | 128K           | Minuscule mais performant    | CPU, edge, mobile            |

### 6.4 Comment choisir ?

```
Votre tache ─── Est-ce critique (prod, précision haute) ?
                │
                ├── OUI → Claude Opus / GPT-4o / o1
                │         (selon budget et besoin)
                │
                └── NON → Budget contraint ?
                          │
                          ├── OUI → Claude Haiku / GPT-4o mini
                          │         ou modèle open-source
                          │
                          └── NON → Claude Sonnet / GPT-4o
                                    (meilleur rapport qualite/prix)
```

Pour le developpement et le prototypage, **Claude Sonnet** ou **GPT-4o** sont generalement les meilleurs choix. Reservez Opus/o1 pour les taches qui necessitent vraiment un raisonnement complexe.

---

## 7. Exercices pratiques

### Exercice 1 — Verification de l'environnement

Creez un script `src/check-env.ts` qui :

1. Verifie que `ANTHROPIC_API_KEY` est definie
2. Envoie un message simple a Claude
3. Affiche le nombre de tokens utilises (input et output)
4. Affiche le modele utilise

```typescript
// src/check-env.ts
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

async function checkEnvironment() {
  // 1. Vérifier la clé API
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY non definie dans .env");
    process.exit(1);
  }
  console.log("Cle API Anthropic: OK");

  // 2. Envoyer un message test
  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 100,
    messages: [
      { role: "user", content: 'Reponds uniquement "OK" si tu fonctionnes.' },
    ],
  });

  // 3. Afficher les informations
  console.log("Modèle:", message.model);
  console.log("Tokens input:", message.usage.input_tokens);
  console.log("Tokens output:", message.usage.output_tokens);
  console.log(
    "Reponse:",
    message.content[0].type === "text" ? message.content[0].text : "",
  );
  console.log("\nEnvironnement pret !");
}

checkEnvironment().catch(console.error);
```

### Exercice 2 — Comparaison de temperatures

Creez un script qui envoie le meme prompt avec differentes temperatures (0, 0.5, 1.0) et compare les resultats.

```typescript
// src/temperature-compare.ts
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const client = new Anthropic();
const prompt =
  "Invente un nom pour une variable qui stocke une liste d'utilisateurs actifs.";

async function generateWithTemperature(temp: number): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 50,
    temperature: temp,
    messages: [{ role: "user", content: prompt }],
  });

  return message.content[0].type === "text" ? message.content[0].text : "";
}

async function main() {
  const temperatures = [0, 0.5, 1.0];

  for (const temp of temperatures) {
    console.log(`\n=== Temperature: ${temp} ===`);
    // Générer 3 réponses pour voir la variabilite
    for (let i = 0; i < 3; i++) {
      const result = await generateWithTemperature(temp);
      console.log(`  Essai ${i + 1}: ${result.trim()}`);
    }
  }
}

main().catch(console.error);
```

### Exercice 3 — Compteur de tokens

Ecrivez une fonction qui estime le nombre de tokens d'un texte (regle empirique : ~4 caracteres par token en anglais, ~3 en francais) et comparez avec le decompte reel retourne par l'API.

### Exercice 4 — Quiz de terminologie

Sans regarder le cours, definissez en une phrase chacun de ces termes :

1. Token
2. Embedding
3. Context window
4. Temperature
5. Inference
6. RLHF (Reinforcement Learning from Human Feedback)
7. Fine-tuning
8. Prompt engineering

---

## 8. Points cles a retenir

1. **Un LLM est un autocomplete surpuissant** : il predit le prochain token, un a la fois, de gauche a droite
2. **Les tokens ne sont pas des mots** : un mot peut faire 1 a 4+ tokens selon la langue et le tokenizer
3. **La context window est votre contrainte principale** : tout (system prompt, historique, reponse) doit tenir dedans
4. **La temperature est votre levier principal** : 0 pour le code/extraction, 0.7-1.0 pour le creatif
5. **Commencez par les APIs proprietaires** (Claude Sonnet) puis explorez l'open-source quand vous etes a l'aise
6. **Les modeles evoluent tres vite** : ce tableau comparatif sera partiellement obsolete dans 6 mois — l'important est de comprendre les concepts

---

## Ressources supplementaires

- [Documentation Anthropic](https://docs.anthropic.com/)
- [Documentation OpenAI](https://platform.openai.com/docs)
- [Attention Is All You Need (paper original)](https://arxiv.org/abs/1706.03762)
- [Ollama](https://ollama.com/) — Executer des LLMs open-source en local
- [Tokenizer de OpenAI](https://platform.openai.com/tokenizer) — Visualiser la tokenisation

---

<!-- parcours-recommande -->

::: tip Parcours recommandé

1. **Screencast** : [screencast 00 prerequis paysage ia](../screencasts/screencast-00-prerequis-paysage-ia.md)
2. **Lab** : [lab-00-paysage-ia](../labs/lab-00-paysage-ia/README)
3. **Quiz** : [quiz 00 prerequis paysage ia](../quizzes/quiz-00-prerequis-paysage-ia.html)
   :::
