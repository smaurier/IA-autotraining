# Module 10 — Entraînement & Fine-Tuning

## Objectifs du module

- Comprendre les phases d'entraînement d'un LLM : pré-entraînement, SFT, RLHF, DPO
- Maîtriser les techniques de fine-tuning efficace : LoRA et QLoRA
- Savoir préparer et formater un dataset de fine-tuning
- Évaluer un modèle avec les métriques standard (perplexité, BLEU, MMLU, HumanEval)
- Décider quand fine-tuner vs RAG vs prompting avancé
- Créer un modèle personnalisé avec Ollama Modelfile

---

## 1. Les phases d'entraînement d'un LLM

### Vue d'ensemble

L'entraînement d'un LLM se fait en **plusieurs étapes**, chacune avec un objectif distinct :

```
┌──────────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Pré-entraînement │ ──→ │     SFT      │ ──→ │  RLHF / DPO  │ ──→ │  Fine-tuning │
│  (Base Model)     │     │ (Instruction  │     │ (Alignement   │     │  spécialisé  │
│                   │     │  Tuning)      │     │  humain)      │     │  (LoRA/QLoRA)│
└──────────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
     Internet              Q/A humains         Préférences            Vos données
     complet               annotés             comparatives           métier
```

> **Analogie** : Imaginez la formation d'un développeur. Le pré-entraînement, c'est l'école d'ingénieur (culture générale massive). Le SFT, c'est le premier stage (apprendre à répondre correctement aux demandes). Le RLHF, c'est le feedback du tech lead (apprendre les préférences de qualité). Le fine-tuning spécialisé, c'est la spécialisation métier (devenir expert React, DevOps, etc.).

### Comparatif des phases

| Phase | Données | Coût | Durée | Qui le fait ? |
|-------|---------|------|-------|---------------|
| Pré-entraînement | Teraoctets de texte web | $1M - $100M+ | Semaines/mois | OpenAI, Meta, Google, Mistral |
| SFT | ~10K-100K exemples Q/A | $1K - $50K | Heures/jours | Labs IA + communauté |
| RLHF/DPO | ~10K-50K comparaisons | $10K - $100K | Jours | Labs IA |
| Fine-tuning LoRA | 100 - 10K exemples | $1 - $100 | Minutes/heures | **Vous** |

---

## 2. Pré-entraînement : next token prediction

### Le concept fondamental

Le pré-entraînement repose sur une tâche d'une simplicité trompeuse : **prédire le prochain token**.

```
Entrée : "Le développeur a écrit une fonction qui"
Cible :  "retourne"

Entrée : "Le développeur a écrit une fonction qui retourne"
Cible :  "un"

Entrée : "Le développeur a écrit une fonction qui retourne un"
Cible :  "tableau"
```

Le modèle voit des **trillions** de tokens provenant d'Internet, de livres, de code source, d'articles scientifiques. À force de prédire le token suivant, il apprend :

- La syntaxe et la grammaire de toutes les langues
- Les relations sémantiques entre concepts
- La logique de programmation
- Le raisonnement implicite

### Implémentation simplifiée du concept

```typescript
// Illustration conceptuelle — le vrai entraînement utilise PyTorch/JAX
interface TrainingExample {
  inputTokens: number[];  // Séquence d'entrée
  targetToken: number;    // Token suivant à prédire
}

function createTrainingExamples(text: string, tokenizer: Tokenizer): TrainingExample[] {
  const tokens = tokenizer.encode(text);
  const examples: TrainingExample[] = [];

  for (let i = 1; i < tokens.length; i++) {
    examples.push({
      inputTokens: tokens.slice(0, i),
      targetToken: tokens[i],
    });
  }

  return examples;
}

// Pour la phrase "function add(a, b) { return a + b }"
// On génère :
// [function]           → prédire "add"
// [function, add]      → prédire "("
// [function, add, (]   → prédire "a"
// ...etc
```

### La loss function : cross-entropy

```typescript
// La perte mesure à quel point le modèle est "surpris" par le bon token
function crossEntropyLoss(predictedProbs: number[], targetIndex: number): number {
  return -Math.log(predictedProbs[targetIndex]);
}

// Si le modèle prédit P("retourne") = 0.8 → loss = -ln(0.8) = 0.22 (faible, bien !)
// Si le modèle prédit P("retourne") = 0.01 → loss = -ln(0.01) = 4.6 (élevée, mauvais !)

// La perplexité est e^(loss moyenne) — plus elle est basse, meilleur est le modèle
function perplexity(avgLoss: number): number {
  return Math.exp(avgLoss);
}
```

### Données de pré-entraînement

| Dataset | Taille | Contenu |
|---------|--------|---------|
| Common Crawl | ~400 To | Pages web crawlées |
| The Stack | ~6 To | Code source (GitHub) |
| Wikipedia | ~20 Go | Encyclopédie multilangue |
| Books3 | ~100 Go | Livres numérisés |
| ArXiv | ~50 Go | Articles scientifiques |
| RedPajama v2 | ~30 To | Mix open source |

> **Point clé** : Le pré-entraînement est **hors de portée** pour un développeur individuel. Un entraînement de Llama 3 70B a nécessité ~16 000 GPU H100 pendant plusieurs semaines.

---

## 3. SFT — Supervised Fine-Tuning

### Pourquoi le SFT ?

Après le pré-entraînement, le modèle sait **compléter du texte** mais ne sait pas **répondre à des instructions**. Le SFT lui apprend le format conversation.

```
AVANT SFT (modèle de base) :
  Input:  "Explique les closures en JavaScript"
  Output: "et TypeScript. Les closures sont un concept..."
  → Il complète le texte, il ne répond pas !

APRÈS SFT :
  Input:  "Explique les closures en JavaScript"
  Output: "Une closure est une fonction qui capture les variables
           de son scope englobant, même après que ce scope a terminé
           son exécution. Voici un exemple..."
  → Il répond à l'instruction !
```

### Format des données SFT

```typescript
// Format conversation (le plus courant)
interface SFTExample {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}

const sftDataset: SFTExample[] = [
  {
    messages: [
      {
        role: 'system',
        content: 'Tu es un assistant expert en TypeScript.',
      },
      {
        role: 'user',
        content: 'Comment typer une fonction générique en TypeScript ?',
      },
      {
        role: 'assistant',
        content: `Une fonction générique utilise un paramètre de type entre chevrons :

\`\`\`typescript
function identity<T>(value: T): T {
  return value;
}

// TypeScript infère le type automatiquement
const str = identity("hello"); // string
const num = identity(42);       // number
\`\`\`

Le paramètre \`T\` est remplacé par le type réel à l'appel.`,
      },
    ],
  },
  // ... 10K-100K exemples similaires
];
```

### Format JSONL pour l'entraînement

```jsonl
{"messages":[{"role":"system","content":"Expert TS"},{"role":"user","content":"Qu'est-ce qu'un type guard ?"},{"role":"assistant","content":"Un type guard est..."}]}
{"messages":[{"role":"system","content":"Expert TS"},{"role":"user","content":"Explique les mapped types"},{"role":"assistant","content":"Les mapped types..."}]}
```

---

## 4. RLHF — Reinforcement Learning from Human Feedback

### Le problème que résout le RLHF

Le SFT apprend au modèle **à répondre**, mais pas **à bien répondre**. Le RLHF aligne le modèle avec les **préférences humaines**.

```
Question : "Comment supprimer un fichier en Node.js ?"

Réponse A (techniquement correcte, mais dangereuse) :
  "Utilisez child_process.exec('rm -rf /path')"

Réponse B (sûre et idiomatique) :
  "Utilisez fs.unlink() ou fs.rm() avec la gestion d'erreurs appropriée"

→ Des annotateurs humains marquent B > A
→ Le modèle apprend à préférer les réponses sûres et idiomatiques
```

### Le processus en 3 étapes

```
Étape 1 : Collecter des comparaisons humaines
┌─────────────┐
│  Prompt P    │ → Générer Réponse A et Réponse B
│              │ → Humain choisit : B > A
└─────────────┘

Étape 2 : Entraîner un Reward Model (RM)
┌─────────────┐
│  RM(P, R)    │ → Score numérique
│              │   RM(P, B) = 0.85
│              │   RM(P, A) = 0.32
└─────────────┘

Étape 3 : Optimiser le LLM avec PPO (Proximal Policy Optimization)
┌─────────────┐
│  LLM génère  │ → RM donne un score → PPO ajuste les poids
│  une réponse  │   pour maximiser le score RM
└─────────────┘
```

### Limites du RLHF

| Problème | Description |
|----------|-------------|
| Coût | Annotateurs humains qualifiés = cher |
| Reward hacking | Le modèle peut "tricher" le reward model |
| Instabilité | PPO est notoirement instable à entraîner |
| Subjectivité | Les préférences humaines varient |

---

## 5. DPO — Direct Preference Optimization

### DPO : la simplification du RLHF

DPO a été proposé en 2023 comme alternative plus simple au RLHF. L'idée clé : **pas besoin de reward model séparé**.

```
RLHF : LLM → Reward Model → PPO → LLM mis à jour
                                    (3 composants, instable)

DPO :  LLM + Paires de préférences → LLM mis à jour
                                      (1 seul composant, stable)
```

> **Analogie** : Le RLHF, c'est comme apprendre à cuisiner en demandant à un critique gastronomique de noter chaque plat, puis en ajustant ses recettes. Le DPO, c'est comme avoir directement des paires "ce plat est meilleur que celui-là" et apprendre les patterns qui font la différence.

### Données DPO

```typescript
interface DPOExample {
  prompt: string;
  chosen: string;   // La meilleure réponse
  rejected: string; // La moins bonne réponse
}

const dpoDataset: DPOExample[] = [
  {
    prompt: 'Écris une fonction de tri en TypeScript',
    chosen: `\`\`\`typescript
function sort<T>(arr: T[], compareFn: (a: T, b: T) => number): T[] {
  return [...arr].sort(compareFn);
}
\`\`\`
Cette implémentation est immutable (ne modifie pas le tableau original) et générique.`,
    rejected: `function sort(arr) {
  arr.sort();
  return arr;
}
Voilà une fonction de tri.`,
  },
  // ... milliers de paires
];
```

### DPO vs RLHF

| Critère | RLHF | DPO |
|---------|------|-----|
| Complexité | Élevée (3 composants) | Faible (1 composant) |
| Stabilité | PPO instable | Stable (loss supervisée) |
| Mémoire GPU | ~3x le modèle | ~2x le modèle |
| Qualité | Référence historique | Comparable ou meilleure |
| Adoption 2025 | En déclin | Standard de l'industrie |

---

## 6. LoRA & QLoRA — Fine-tuning efficace

### Le problème du fine-tuning classique

Un fine-tuning complet de Llama 3 8B nécessite :
- ~32 Go de VRAM juste pour les poids du modèle (FP16)
- ~64 Go pour les gradients et l'optimiseur
- **Total : ~96 Go de VRAM** → impossible sur un GPU grand public

### LoRA : Low-Rank Adaptation

L'idée de LoRA est brillante : au lieu de modifier **tous** les poids du modèle, on ajoute de **petites matrices** entraînables à côté des poids gelés.

```
Fine-tuning classique :              LoRA :
┌─────────────────────┐              ┌─────────────────────┐
│  W (matrice originale) │            │  W (gelée, inchangée) │
│  Taille : 4096 × 4096  │            │  +                     │
│  = 16M paramètres       │            │  A (4096 × 16) × B (16 × 4096) │
│  TOUS modifiés           │            │  = 131K paramètres (0.8%) │
└─────────────────────┘              └─────────────────────┘
```

> **Analogie** : Imaginez un orchestre de 100 musiciens (les poids du modèle). Le fine-tuning classique remplace chaque musicien. LoRA ajoute 2-3 musiciens solistes qui ajustent le son d'ensemble. Le résultat est quasi identique, mais beaucoup plus simple.

### Implémentation conceptuelle LoRA

```typescript
// Illustration du concept LoRA en TypeScript
interface LoRAConfig {
  rank: number;          // r = rang de la décomposition (4, 8, 16, 32)
  alpha: number;         // facteur d'échelle (souvent 2 × rank)
  targetModules: string[]; // quels layers adapter (q_proj, v_proj, etc.)
  dropout: number;       // dropout sur les matrices LoRA
}

class LoRALayer {
  private W: number[][];   // Poids originaux — GELÉS
  private A: number[][];   // Matrice down-projection (d × r) — ENTRAÎNABLE
  private B: number[][];   // Matrice up-projection (r × d) — ENTRAÎNABLE
  private scaling: number;

  constructor(
    originalWeights: number[][],
    private config: LoRAConfig,
  ) {
    const d = originalWeights.length;
    const r = config.rank;

    this.W = originalWeights; // Gelé, pas de gradient
    this.A = this.randomInit(d, r);      // Initialisé aléatoirement
    this.B = this.zeroInit(r, d);        // Initialisé à zéro → ΔW = 0 au début
    this.scaling = config.alpha / config.rank;
  }

  forward(x: number[]): number[] {
    // y = W·x + (A·B)·x × scaling
    const original = matmul(this.W, x);
    const loraPath = scale(matmul(this.B, matmul(this.A, x)), this.scaling);
    return add(original, loraPath);
  }

  private randomInit(rows: number, cols: number): number[][] {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => Math.random() * 0.02 - 0.01),
    );
  }

  private zeroInit(rows: number, cols: number): number[][] {
    return Array.from({ length: rows }, () => Array(cols).fill(0));
  }
}

// Utilisation typique
const loraConfig: LoRAConfig = {
  rank: 16,              // Rang 16 = bon compromis qualité/efficacité
  alpha: 32,             // Alpha = 2 × rank (règle empirique)
  targetModules: ['q_proj', 'k_proj', 'v_proj', 'o_proj'], // Layers d'attention
  dropout: 0.05,
};
```

### QLoRA : LoRA + Quantization

QLoRA combine LoRA avec une **quantization 4-bit** du modèle de base :

| Technique | VRAM pour Llama 3 8B | Qualité |
|-----------|---------------------|---------|
| Full fine-tuning FP16 | ~96 Go | 100% (référence) |
| LoRA FP16 | ~18 Go | ~99% |
| QLoRA (4-bit + LoRA) | **~6 Go** | ~97% |

```
QLoRA = Modèle base quantifié en 4-bit (lecture seule)
      + Matrices LoRA en FP16 (entraînables)
      + Double quantification des constantes de quantification

→ Un Llama 3 8B fine-tuné sur un GPU 8 Go (RTX 3060/4060) !
```

### Quand utiliser quel rang LoRA ?

| Rang (r) | Paramètres ajoutés | Cas d'usage |
|----------|-------------------|-------------|
| 4 | ~0.2% | Ajustement léger de style |
| 8 | ~0.4% | Adaptation de domaine simple |
| 16 | ~0.8% | **Recommandé par défaut** |
| 32 | ~1.6% | Tâche complexe, nouveau domaine |
| 64 | ~3.2% | Quasi full fine-tuning |

---

## 7. Datasets : format et préparation

### Formats standards

```typescript
// Format Alpaca (instructions simples)
interface AlpacaFormat {
  instruction: string;
  input: string;      // Optionnel — contexte additionnel
  output: string;
}

// Format ShareGPT (conversations multi-tours)
interface ShareGPTFormat {
  conversations: Array<{
    from: 'human' | 'gpt' | 'system';
    value: string;
  }>;
}

// Format ChatML (OpenAI / standard)
interface ChatMLFormat {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}
```

### Préparation d'un dataset en TypeScript

```typescript
import { readFile, writeFile } from 'fs/promises';

interface RawQA {
  question: string;
  answer: string;
  category: string;
}

interface TrainingMessage {
  messages: Array<{ role: string; content: string }>;
}

async function prepareDataset(inputPath: string, outputPath: string): Promise<void> {
  const raw: RawQA[] = JSON.parse(await readFile(inputPath, 'utf-8'));

  // 1. Filtrage qualité
  const filtered = raw.filter((qa) => {
    if (qa.answer.length < 50) return false;      // Réponses trop courtes
    if (qa.answer.length > 4000) return false;     // Réponses trop longues
    if (qa.question.length < 10) return false;     // Questions vagues
    if (hasPII(qa.answer)) return false;           // Pas de données personnelles
    return true;
  });

  console.log(`Filtrage : ${raw.length} → ${filtered.length} exemples`);

  // 2. Conversion en format ChatML
  const training: TrainingMessage[] = filtered.map((qa) => ({
    messages: [
      {
        role: 'system',
        content: `Tu es un assistant expert en ${qa.category}. Réponds de manière précise et concise.`,
      },
      { role: 'user', content: qa.question },
      { role: 'assistant', content: qa.answer },
    ],
  }));

  // 3. Shuffle
  const shuffled = training.sort(() => Math.random() - 0.5);

  // 4. Split train/eval (90/10)
  const splitIdx = Math.floor(shuffled.length * 0.9);
  const train = shuffled.slice(0, splitIdx);
  const evalSet = shuffled.slice(splitIdx);

  // 5. Écriture JSONL
  const toJsonl = (data: TrainingMessage[]) =>
    data.map((d) => JSON.stringify(d)).join('\n');

  await writeFile(`${outputPath}/train.jsonl`, toJsonl(train));
  await writeFile(`${outputPath}/eval.jsonl`, toJsonl(evalSet));

  console.log(`Train : ${train.length} | Eval : ${evalSet.length}`);
}

function hasPII(text: string): boolean {
  const patterns = [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,       // Téléphone
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, // Email
    /\b\d{2}[/.-]\d{2}[/.-]\d{4}\b/,        // Date de naissance
  ];
  return patterns.some((p) => p.test(text));
}
```

### Règles de qualité d'un dataset

| Règle | Pourquoi |
|-------|----------|
| Diversité des instructions | Éviter l'overfitting sur un style |
| Réponses détaillées | Modèle apprend la profondeur |
| Pas de PII | RGPD + sécurité |
| Cohérence du system prompt | Le modèle apprend le persona |
| Balance des catégories | Pas 90% d'un seul sujet |
| 100+ exemples minimum | En dessous, le prompting suffit |
| Validation humaine | Vérifier un échantillon aléatoire |

---

## 8. Hugging Face Hub

### L'écosystème Hugging Face

Hugging Face est le **GitHub des modèles IA**. Il héberge :

- **700 000+ modèles** (LLMs, vision, audio...)
- **150 000+ datasets**
- **300 000+ Spaces** (démos interactives)

### Télécharger un modèle via API

```typescript
// Utiliser l'API Hugging Face depuis Node.js
const HF_TOKEN = process.env.HF_TOKEN;

async function downloadModel(modelId: string): Promise<void> {
  const response = await fetch(
    `https://huggingface.co/api/models/${modelId}`,
    {
      headers: { Authorization: `Bearer ${HF_TOKEN}` },
    },
  );

  const modelInfo = await response.json();
  console.log(`Modèle : ${modelInfo.modelId}`);
  console.log(`Taille : ${modelInfo.safetensors?.total ?? 'inconnue'}`);
  console.log(`License : ${modelInfo.cardData?.license ?? 'non spécifiée'}`);
  console.log(`Downloads : ${modelInfo.downloads}`);
}

// Lister les datasets disponibles
async function searchDatasets(query: string): Promise<void> {
  const response = await fetch(
    `https://huggingface.co/api/datasets?search=${query}&sort=downloads&direction=-1&limit=5`,
  );

  const datasets = await response.json();
  for (const ds of datasets) {
    console.log(`${ds.id} — ${ds.downloads} downloads`);
  }
}
```

### Modèles populaires pour le fine-tuning (2025)

| Modèle | Taille | License | Cas d'usage |
|--------|--------|---------|-------------|
| Llama 3.1 8B | 8B | Llama 3.1 | Polyvalent, excellent rapport qualité/taille |
| Mistral 7B v0.3 | 7B | Apache 2.0 | Europe, multilingue |
| Phi-3 Mini | 3.8B | MIT | Petit, rapide, bon en code |
| Gemma 2 9B | 9B | Gemma | Très bon en raisonnement |
| DeepSeek Coder V2 | 16B | DeepSeek | Spécialisé code |
| Qwen 2.5 7B | 7B | Apache 2.0 | Multilingue, bon en maths |

---

## 9. Évaluation des modèles

### Métriques principales

#### Perplexité (PPL)

```typescript
// La perplexité mesure la "surprise" du modèle face au texte
// Plus elle est basse, meilleur est le modèle

function calculatePerplexity(losses: number[]): number {
  const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
  return Math.exp(avgLoss);
}

// Interprétation :
// PPL = 1    → le modèle prédit parfaitement (impossible en pratique)
// PPL = 10   → excellent
// PPL = 50   → correct
// PPL = 1000 → mauvais
```

#### BLEU (traduction / génération)

```typescript
// BLEU compare les n-grammes générés vs la référence
function calculateBLEU(generated: string[], reference: string[]): number {
  const nGramScores: number[] = [];

  for (let n = 1; n <= 4; n++) {
    const genNgrams = getNgrams(generated, n);
    const refNgrams = getNgrams(reference, n);

    const matches = genNgrams.filter((ng) => refNgrams.includes(ng)).length;
    const precision = matches / genNgrams.length;
    nGramScores.push(precision);
  }

  // Moyenne géométrique des précisions 1-4 grammes
  const geoMean = Math.pow(
    nGramScores.reduce((a, b) => a * b, 1),
    1 / nGramScores.length,
  );

  // Brevity penalty si la génération est trop courte
  const bp = generated.length < reference.length
    ? Math.exp(1 - reference.length / generated.length)
    : 1;

  return bp * geoMean;
}

function getNgrams(tokens: string[], n: number): string[] {
  const ngrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '));
  }
  return ngrams;
}
```

#### Benchmarks standard

| Benchmark | Mesure | Domaine |
|-----------|--------|---------|
| MMLU | Connaissances générales (57 sujets) | Culture générale |
| HumanEval | Génération de code (Python) | Code |
| GSM8K | Raisonnement mathématique | Maths |
| MT-Bench | Qualité conversationnelle | Chat |
| TruthfulQA | Véracité des réponses | Factualité |
| MBPP | Code simple (974 problèmes) | Code |
| ARC | Raisonnement scientifique | Science |
| HellaSwag | Complétion de phrases | Langage |

### Évaluation pratique avec Ollama

```typescript
interface EvalResult {
  prompt: string;
  expected: string;
  generated: string;
  score: number;
}

async function evaluateModel(
  modelName: string,
  evalSet: Array<{ prompt: string; expected: string }>,
): Promise<EvalResult[]> {
  const results: EvalResult[] = [];

  for (const { prompt, expected } of evalSet) {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        model: modelName,
        prompt,
        stream: false,
        options: { temperature: 0 }, // Déterministe pour l'évaluation
      }),
    });

    const data = await response.json();
    const generated = data.response;

    // Score simple : similarité avec la réponse attendue
    const score = computeSimilarity(generated, expected);
    results.push({ prompt, expected, generated, score });
  }

  const avgScore = results.reduce((a, r) => a + r.score, 0) / results.length;
  console.log(`Score moyen : ${(avgScore * 100).toFixed(1)}%`);

  return results;
}

function computeSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...wordsA].filter((w) => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.length / union.size; // Jaccard
}
```

---

## 10. Quand fine-tuner vs RAG vs prompting ?

### L'arbre de décision

```
Votre besoin :
│
├─ Le modèle manque de connaissances spécifiques ?
│  └─ → RAG (ajoutez vos données comme contexte)
│
├─ Le modèle ne respecte pas le bon format/style ?
│  └─ → Prompting avancé (few-shot, system prompt détaillé)
│     └─ Toujours insuffisant ?
│        └─ → Fine-tuning (SFT avec exemples du bon format)
│
├─ Le modèle doit apprendre un "comportement" nouveau ?
│  └─ → Fine-tuning (DPO avec paires de préférences)
│
├─ Le modèle est trop lent / trop cher ?
│  └─ → Fine-tuning d'un petit modèle pour remplacer un gros
│
└─ Les données changent souvent ?
   └─ → RAG (les données sont mises à jour sans ré-entraînement)
```

### Tableau comparatif détaillé

| Critère | Prompting | RAG | Fine-tuning |
|---------|-----------|-----|-------------|
| Coût de mise en place | Nul | Moyen | Élevé |
| Temps de mise en place | Minutes | Heures/jours | Jours/semaines |
| Données fraîches | Non | **Oui** | Non (snapshot) |
| Format/style personnalisé | Limité | Limité | **Excellent** |
| Latence à l'inférence | Basse | Moyenne (retrieval) | Basse |
| Maintenance | Facile | Moyenne | Difficile |
| Données nécessaires | 0 | Documents | 100-10K exemples annotés |
| Combinable | — | + Prompting | + RAG + Prompting |

> **Conseil pratique** : Commencez **toujours** par le prompting. Passez au RAG si vous avez besoin de données externes. Le fine-tuning est le **dernier recours**, mais c'est le plus puissant pour le style et le comportement.

---

## 11. Coûts et ressources GPU

### Coût du fine-tuning selon la méthode

| Méthode | GPU minimum | VRAM | Coût cloud (1h) | Temps typique |
|---------|-------------|------|------------------|---------------|
| Full FT 7B | A100 80Go | 80 Go | ~$2/h | 2-8h |
| LoRA 7B | A100 40Go | 40 Go | ~$1.5/h | 1-4h |
| QLoRA 7B | RTX 4090 | 24 Go | ~$0.5/h | 1-4h |
| QLoRA 7B | RTX 4060 Ti | 16 Go | Local (gratuit) | 2-8h |
| Full FT 70B | 8× A100 | 640 Go | ~$16/h | 12-48h |
| QLoRA 70B | A100 80Go | 80 Go | ~$2/h | 4-12h |

### Plateformes cloud GPU

| Plateforme | GPU disponibles | Prix H100/h | Avantage |
|------------|----------------|-------------|----------|
| RunPod | H100, A100, 4090 | ~$3.5 | Pas d'engagement |
| Lambda Labs | H100, A100 | ~$3.0 | Simple, fiable |
| Vast.ai | Varié (marketplace) | ~$2.5 | Moins cher, moins fiable |
| Google Colab Pro | T4, A100 | ~$0.12 (unité) | Idéal pour débuter |
| AWS SageMaker | ml.g5, ml.p4 | ~$5+ | Enterprise |

---

## 12. Exemple pratique : Ollama Modelfile

### Créer un modèle personnalisé

Ollama permet de créer des modèles custom via un `Modelfile` — sans faire de vrai fine-tuning, mais en personnalisant le comportement.

```dockerfile
# Modelfile pour un assistant TypeScript spécialisé
FROM llama3.1:8b

# System prompt permanent
SYSTEM """Tu es TypeScript Expert, un assistant spécialisé en TypeScript et Node.js.

Règles :
1. Toujours répondre avec des exemples de code TypeScript (jamais JavaScript pur)
2. Utiliser les types stricts (no any, no implicit any)
3. Préférer les patterns fonctionnels (map, filter, reduce) aux boucles
4. Toujours inclure la gestion d'erreurs
5. Répondre en français
6. Être concis mais précis
"""

# Paramètres d'inférence
PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER num_predict 2048
PARAMETER stop "<|eot_id|>"
PARAMETER stop "<|end_of_text|>"

# Template de conversation (format Llama 3)
TEMPLATE """{{ if .System }}<|start_header_id|>system<|end_header_id|>

{{ .System }}<|eot_id|>{{ end }}{{ if .Prompt }}<|start_header_id|>user<|end_header_id|>

{{ .Prompt }}<|eot_id|>{{ end }}<|start_header_id|>assistant<|end_header_id|>

{{ .Response }}<|eot_id|>"""
```

### Créer et utiliser le modèle

```bash
# Créer le modèle
ollama create ts-expert -f ./Modelfile

# Tester en CLI
ollama run ts-expert "Comment implémenter le pattern Observer ?"

# Lister les modèles
ollama list
```

### Utiliser depuis Node.js

```typescript
async function askTSExpert(question: string): Promise<string> {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'ts-expert',
      messages: [{ role: 'user', content: question }],
      stream: false,
    }),
  });

  const data = await response.json();
  return data.message.content;
}

// Test
const answer = await askTSExpert(
  'Comment typer un middleware Express avec des generics ?',
);
console.log(answer);
```

### Modelfile avec adapter LoRA (après fine-tuning réel)

```dockerfile
# Modelfile avec un adapter LoRA fine-tuné
FROM llama3.1:8b

# Charger l'adapter LoRA (fichier .gguf exporté depuis un entraînement)
ADAPTER ./my-lora-adapter.gguf

SYSTEM "Tu es un assistant spécialisé pour l'API interne de notre entreprise."

PARAMETER temperature 0.2
PARAMETER num_predict 4096
```

---

## 13. Pipeline complet : du dataset au modèle déployé

### Récapitulatif du workflow

```
1. DÉFINIR L'OBJECTIF
   └─ Que doit faire le modèle que le prompting ne fait pas ?

2. PRÉPARER LES DONNÉES
   └─ Collecter → Nettoyer → Formater (JSONL) → Split train/eval

3. CHOISIR LA MÉTHODE
   └─ QLoRA (petit budget) / LoRA (qualité) / Full FT (max perf)

4. CHOISIR LE MODÈLE DE BASE
   └─ Llama 3.1 8B (polyvalent) / Mistral 7B (EU) / Phi-3 (petit)

5. ENTRAÎNER
   └─ Plateforme : Colab / RunPod / local
   └─ Framework : Unsloth / Axolotl / HF Transformers

6. ÉVALUER
   └─ Perplexité sur eval set + métriques métier + test humain

7. EXPORTER & DÉPLOYER
   └─ Export GGUF → Ollama Modelfile → API REST

8. MONITORER
   └─ Qualité des réponses, latence, coût, drift
```

### Script d'orchestration

```typescript
interface FineTuneConfig {
  baseModel: string;
  dataset: string;
  method: 'lora' | 'qlora' | 'full';
  loraRank: number;
  epochs: number;
  learningRate: number;
  batchSize: number;
  outputDir: string;
}

const config: FineTuneConfig = {
  baseModel: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
  dataset: './data/train.jsonl',
  method: 'qlora',
  loraRank: 16,
  epochs: 3,
  learningRate: 2e-4,
  batchSize: 4,
  outputDir: './output/ts-expert-v1',
};

// Note : l'entraînement réel se fait en Python avec unsloth/transformers
// Ce script TypeScript orchestre le pipeline autour

async function runPipeline(cfg: FineTuneConfig): Promise<void> {
  console.log('=== 1. Validation du dataset ===');
  const stats = await validateDataset(cfg.dataset);
  console.log(`  ${stats.total} exemples, ${stats.avgLength} tokens moyens`);

  console.log('=== 2. Lancement de l\'entraînement ===');
  // Appel à un script Python via child_process
  const { execSync } = await import('child_process');
  execSync(
    `python train.py \
      --model ${cfg.baseModel} \
      --dataset ${cfg.dataset} \
      --method ${cfg.method} \
      --lora-rank ${cfg.loraRank} \
      --epochs ${cfg.epochs} \
      --lr ${cfg.learningRate} \
      --batch-size ${cfg.batchSize} \
      --output ${cfg.outputDir}`,
    { stdio: 'inherit' },
  );

  console.log('=== 3. Évaluation ===');
  const evalResults = await evaluateModel(
    `${cfg.outputDir}/merged`,
    './data/eval.jsonl',
  );
  console.log(`  Score : ${evalResults}`);

  console.log('=== 4. Export GGUF pour Ollama ===');
  execSync(
    `python -m llama_cpp.convert \
      --input ${cfg.outputDir}/merged \
      --output ${cfg.outputDir}/model.gguf \
      --quantize Q4_K_M`,
    { stdio: 'inherit' },
  );

  console.log('=== 5. Création du Modelfile Ollama ===');
  const modelfile = `FROM ${cfg.outputDir}/model.gguf
SYSTEM "Assistant spécialisé TypeScript."
PARAMETER temperature 0.3`;

  await import('fs/promises').then((fs) =>
    fs.writeFile(`${cfg.outputDir}/Modelfile`, modelfile),
  );

  execSync(`ollama create ts-expert-v1 -f ${cfg.outputDir}/Modelfile`);
  console.log('Modèle disponible : ollama run ts-expert-v1');
}

async function validateDataset(
  path: string,
): Promise<{ total: number; avgLength: number }> {
  const { readFile } = await import('fs/promises');
  const lines = (await readFile(path, 'utf-8')).trim().split('\n');
  const totalTokens = lines.reduce((sum, line) => {
    const msg = JSON.parse(line);
    const content = msg.messages.map((m: { content: string }) => m.content).join(' ');
    return sum + content.split(/\s+/).length;
  }, 0);

  return { total: lines.length, avgLength: Math.round(totalTokens / lines.length) };
}
```

---

## Résumé du module

| Concept | Points clés |
|---------|-------------|
| Pré-entraînement | Next token prediction sur des trillions de tokens. Hors de portée individuel |
| SFT | Apprend au modèle à suivre des instructions. Format conversation JSONL |
| RLHF | Aligne le modèle avec les préférences humaines via reward model + PPO |
| DPO | Alternative plus simple au RLHF, sans reward model séparé |
| LoRA | Matrices de faible rang ajoutées aux poids gelés. ~1% de paramètres |
| QLoRA | LoRA + quantization 4-bit. Fine-tuning sur GPU 16 Go |
| Évaluation | Perplexité, BLEU, MMLU, HumanEval + métriques métier |
| Décision | Prompting → RAG → Fine-tuning (dans cet ordre) |
| Ollama Modelfile | Personnalisation rapide sans entraînement réel |

---

## Exercices pratiques

1. **Dataset** : Créez un dataset de 50 paires Q/A sur un sujet de votre choix au format JSONL ChatML
2. **Évaluation** : Écrivez un script TypeScript qui évalue les réponses d'un modèle Ollama sur votre dataset
3. **Modelfile** : Créez un Modelfile Ollama spécialisé pour votre domaine et testez-le
4. **Benchmark** : Comparez les réponses de 3 modèles Ollama sur 10 questions identiques et scorez-les
5. **Analyse** : Pour un cas d'usage donné (ex : chatbot support client), argumentez le choix entre prompting, RAG et fine-tuning

---

<!-- parcours-recommande -->

::: tip Parcours recommandé
1. **Screencast** : [screencast 10 fine tuning](../screencasts/screencast-10-fine-tuning.md)
2. **Lab** : [lab-10-fine-tuning](../labs/lab-10-fine-tuning/README)
3. **Quiz** : [quiz 10 fine tuning](../quizzes/quiz-10-fine-tuning.html)
:::
