# Module 11 — LLMs Locaux avec Ollama

## Objectifs du module

- Comprendre les avantages des LLMs locaux (confidentialité, coût, offline)
- Installer et configurer Ollama sur différentes plateformes
- Connaître les modèles disponibles et leurs caractéristiques
- Maîtriser la quantization (FP16, INT8, INT4, GGUF)
- Utiliser l'API REST Ollama depuis Node.js/TypeScript
- Personnaliser un modèle avec un Modelfile
- Comprendre les contraintes GPU vs CPU et la VRAM

---

## 1. Pourquoi exécuter des LLMs en local ?

### Les 5 raisons principales

```
┌──────────────────────────────────────────────────────────────┐
│                   LLM en local vs API cloud                   │
├──────────────────┬───────────────────────────────────────────┤
│ 🔒 Confidentialité │ Aucune donnée ne quitte votre machine    │
│ 💰 Coût zéro       │ Pas de facturation par token             │
│ 📡 Offline         │ Fonctionne sans connexion Internet       │
│ ⚡ Latence         │ Pas de réseau = réponse plus rapide*     │
│ 🔧 Contrôle       │ Choix du modèle, des paramètres, du format│
└──────────────────┴───────────────────────────────────────────┘
  * Pour les petits modèles sur GPU puissant
```

> **Analogie** : Un LLM cloud, c'est comme commander au restaurant — pratique, varié, mais cher et vous ne contrôlez pas la cuisine. Un LLM local, c'est cuisiner chez soi — demandé de l'équipement et du savoir-faire, mais c'est gratuit, personnalisable, et personne ne voit ce que vous mangez.

### Cas d'usage idéaux pour le local

| Cas d'usage | Pourquoi local ? |
|-------------|-----------------|
| Données médicales / juridiques | RGPD, secret professionnel |
| Code source propriétaire | Propriété intellectuelle |
| Développement / prototypage | Itérations rapides sans coût |
| CI/CD (revue de code IA) | Pas de dépendance réseau |
| Offline (avion, zones blanches) | Aucune connectivité |
| Éducation / formation | Budget limité, pas de carte bancaire |
| Tests de prompts en masse | 10 000 appels = $0 |

### Quand NE PAS utiliser le local

| Situation | Raison |
|-----------|--------|
| Besoin du meilleur modèle (Claude Opus, GPT-4o) | Les modèles locaux sont plus petits |
| Pas de GPU | Performance très dégradée en CPU-only |
| Contexte > 32K tokens | Les modèles locaux gèrent mal les longs contextes |
| Application production haute disponibilité | Scaling horizontal complexe |

---

## 2. Installation d'Ollama

### Sur les différentes plateformes

```bash
# macOS (avec Homebrew)
brew install ollama

# Linux (script officiel)
curl -fsSL https://ollama.com/install.sh | sh

# Windows (installer .exe)
# Télécharger depuis https://ollama.com/download

# Docker
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama

# Docker avec GPU NVIDIA
docker run -d --gpus=all -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```

### Vérification de l'installation

```bash
# Vérifier qu'Ollama tourne
ollama --version
# ollama version is 0.5.x

# Le serveur démarre automatiquement
# Vérifier qu'il écoute
curl http://localhost:11434
# Ollama is running

# Télécharger un premier modèle
ollama pull llama3.1:8b

# Tester
ollama run llama3.1:8b "Bonjour, dis-moi un fait sur TypeScript"
```

### Structure des fichiers Ollama

```
# macOS / Linux
~/.ollama/
├── models/
│   ├── manifests/        # Métadonnées des modèles
│   │   └── registry.ollama.ai/
│   │       └── library/
│   │           ├── llama3.1/
│   │           └── mistral/
│   └── blobs/            # Fichiers GGUF (les poids réels)
│       ├── sha256-abc123...
│       └── sha256-def456...
└── logs/

# Windows
C:\Users\<user>\.ollama\
```

---

## 3. Les modèles disponibles

### Catalogue des modèles principaux (2025)

| Modèle | Taille | VRAM requise (Q4) | Forces | License |
|--------|--------|-------------------|--------|---------|
| Llama 3.1 8B | 8B | ~5 Go | Polyvalent, multilingue, excellent rapport qualité/taille | Llama 3.1 |
| Llama 3.1 70B | 70B | ~40 Go | Quasi-GPT-4 en local | Llama 3.1 |
| Mistral 7B v0.3 | 7B | ~4.5 Go | Rapide, bon en français | Apache 2.0 |
| Mixtral 8x7B | 47B (12B actifs) | ~26 Go | MoE, excellent qualité/vitesse | Apache 2.0 |
| Phi-3 Mini | 3.8B | ~2.5 Go | Très petit, excellent en code | MIT |
| Phi-3 Medium | 14B | ~8 Go | Meilleur rapport qualité/taille | MIT |
| Gemma 2 9B | 9B | ~5.5 Go | Google, bon raisonnement | Gemma |
| Gemma 2 27B | 27B | ~16 Go | Excellent, quasi Llama 70B | Gemma |
| DeepSeek Coder V2 | 16B | ~9 Go | Meilleur pour le code | DeepSeek |
| CodeLlama 13B | 13B | ~7.5 Go | Code + infill | Llama 2 |
| Qwen 2.5 7B | 7B | ~4.5 Go | Multilingue, bon en maths | Apache 2.0 |
| DeepSeek R1 | 7B-671B | Variable | Raisonnement (chain-of-thought) | MIT |

### Télécharger et gérer les modèles

```bash
# Télécharger un modèle (avec variante de quantization)
ollama pull llama3.1:8b          # Q4_0 par défaut (~4.7 Go)
ollama pull llama3.1:8b-q8_0     # Qualité supérieure (~8.5 Go)
ollama pull llama3.1:8b-fp16     # Full precision (~16 Go)

# Lister les modèles installés
ollama list
# NAME                   ID           SIZE     MODIFIED
# llama3.1:8b            365c0bd3c000 4.7 GB   2 hours ago
# mistral:7b             f974a74358d6 4.1 GB   1 day ago
# deepseek-coder-v2:16b  8d4e5280ea68 8.9 GB   3 days ago

# Supprimer un modèle
ollama rm mistral:7b

# Informations sur un modèle
ollama show llama3.1:8b
# Affiche : architecture, paramètres, template, system prompt, license
```

### Choisir le bon modèle

```
Votre GPU a combien de VRAM ?
│
├─ 4-6 Go (RTX 3060 6Go, GTX 1660)
│  └─ Phi-3 Mini (3.8B Q4) ou Gemma 2 2B
│
├─ 8 Go (RTX 3060 Ti, RTX 4060)
│  └─ Llama 3.1 8B Q4 ou Mistral 7B Q4
│
├─ 12-16 Go (RTX 4070/4080, RTX 3090)
│  └─ Llama 3.1 8B Q8 ou DeepSeek Coder V2 16B Q4
│
├─ 24 Go (RTX 4090, RTX 3090)
│  └─ Gemma 2 27B Q4 ou Mixtral 8x7B Q4
│
└─ 48+ Go (2× RTX 4090, A100)
   └─ Llama 3.1 70B Q4
```

---

## 4. Quantization : comprendre les formats

### Qu'est-ce que la quantization ?

La quantization réduit la **précision numérique** des poids du modèle pour diminuer la taille et la VRAM requise.

> **Analogie** : Imaginez une photo. En RAW (FP32), elle fait 50 Mo avec tous les détails. En JPEG haute qualité (FP16), elle fait 25 Mo et la différence est invisible. En JPEG basse qualité (INT4), elle fait 6 Mo — on perd un peu de détail, mais c'est parfaitement utilisable.

### Les différents formats

| Format | Bits/poids | Taille 7B | VRAM 7B | Qualité | Usage |
|--------|-----------|-----------|---------|---------|-------|
| FP32 | 32 bits | ~28 Go | ~30 Go | 100% (référence) | Entraînement uniquement |
| FP16 | 16 bits | ~14 Go | ~16 Go | ~99.9% | Inférence haute qualité |
| INT8 (Q8_0) | 8 bits | ~7.5 Go | ~8.5 Go | ~99% | Bon compromis |
| INT4 (Q4_K_M) | 4 bits | ~4.4 Go | ~5 Go | ~95-97% | **Recommandé** pour le local |
| INT4 (Q4_0) | 4 bits | ~3.8 Go | ~4.5 Go | ~93-95% | Maximum de compression |
| INT3 (Q3_K_S) | 3 bits | ~3 Go | ~3.5 Go | ~88-92% | Dernière option |
| INT2 (Q2_K) | 2 bits | ~2.5 Go | ~3 Go | ~80-85% | Déconseillé |

### GGUF : le format standard

**GGUF** (GPT-Generated Unified Format) est le format de fichier standard pour les modèles quantifiés. Créé par le projet **llama.cpp**, c'est le format natif d'Ollama.

```
Fichier GGUF :
┌──────────────────────────────────────┐
│  Header (magic, version, metadata)    │
│  - Architecture (llama, mistral...)   │
│  - Nombre de layers, taille hidden    │
│  - Vocabulaire (tokenizer)            │
│  - Type de quantization               │
├──────────────────────────────────────┤
│  Tensor Data (les poids quantifiés)   │
│  - Chaque tensor a son propre format  │
│  - Q4_K_M : 4.5 bits effectifs/poids │
└──────────────────────────────────────┘
```

### Comprendre les noms de quantization

```
Q4_K_M  → Quantization 4-bit, méthode K-quant, taille Medium
│ │ │
│ │ └─ S=Small (plus compressé), M=Medium (recommandé), L=Large (meilleure qualité)
│ └─── K = k-quant (meilleure méthode, préserve mieux la qualité)
└───── 4 = nombre de bits par poids

Exemples courants dans Ollama :
  Q4_0    → 4 bits basique (rapide mais moindre qualité)
  Q4_K_M  → 4 bits k-quant medium (recommandé ✓)
  Q5_K_M  → 5 bits k-quant medium (meilleur, plus gros)
  Q8_0    → 8 bits (quasi lossless, 2× plus gros)
  F16     → 16 bits flottants (pas de quantization)
```

### Impact sur la qualité : benchmark réel

```typescript
// Résultats typiques de benchmark MMLU pour Llama 3.1 8B
const benchmarks = {
  'F16':    { mmlu: 68.4, humaneval: 62.2, size: '16 Go' },
  'Q8_0':   { mmlu: 68.1, humaneval: 61.8, size: '8.5 Go' },
  'Q5_K_M': { mmlu: 67.6, humaneval: 61.0, size: '5.7 Go' },
  'Q4_K_M': { mmlu: 66.8, humaneval: 59.5, size: '4.7 Go' },
  'Q4_0':   { mmlu: 65.2, humaneval: 57.1, size: '4.0 Go' },
  'Q3_K_S': { mmlu: 61.5, humaneval: 52.3, size: '3.2 Go' },
  'Q2_K':   { mmlu: 54.1, humaneval: 41.0, size: '2.7 Go' },
};

// Conclusion : Q4_K_M perd ~2% de qualité pour 70% de compression
// C'est le sweet spot pour la plupart des usages
```

---

## 5. L'API REST Ollama

### Endpoints disponibles

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/generate` | POST | Complétion de texte (une seule réponse) |
| `/api/chat` | POST | Conversation multi-tours |
| `/api/embeddings` | POST | Générer des embeddings vectoriels |
| `/api/tags` | GET | Lister les modèles installés |
| `/api/show` | POST | Informations sur un modèle |
| `/api/pull` | POST | Télécharger un modèle |
| `/api/delete` | DELETE | Supprimer un modèle |
| `/api/create` | POST | Créer un modèle (Modelfile) |
| `/api/ps` | GET | Modèles actuellement chargés en mémoire |

### `/api/generate` — Complétion simple

```typescript
// Requête non-streaming
async function generate(prompt: string): Promise<string> {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.1:8b',
      prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_predict: 512,
      },
    }),
  });

  const data = await response.json();
  return data.response;
}

// Réponse complète
interface GenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: true;
  context: number[];          // Tokens de contexte (pour continuer)
  total_duration: number;     // Durée totale (ns)
  load_duration: number;      // Temps de chargement du modèle (ns)
  prompt_eval_count: number;  // Nombre de tokens du prompt
  prompt_eval_duration: number;
  eval_count: number;         // Nombre de tokens générés
  eval_duration: number;      // Durée de génération (ns)
}

// Calculer les tokens/seconde
function tokensPerSecond(res: GenerateResponse): number {
  return res.eval_count / (res.eval_duration / 1e9);
}
```

### `/api/chat` — Conversation

```typescript
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    seed?: number;
    repeat_penalty?: number;
  };
}

async function chat(messages: ChatMessage[]): Promise<string> {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.1:8b',
      messages,
      stream: false,
    } satisfies ChatRequest),
  });

  const data = await response.json();
  return data.message.content;
}

// Conversation multi-tours avec historique
class Conversation {
  private history: ChatMessage[] = [];

  constructor(private model: string, systemPrompt?: string) {
    if (systemPrompt) {
      this.history.push({ role: 'system', content: systemPrompt });
    }
  }

  async send(userMessage: string): Promise<string> {
    this.history.push({ role: 'user', content: userMessage });

    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: this.history,
        stream: false,
      }),
    });

    const data = await response.json();
    const assistantMessage = data.message.content;

    this.history.push({ role: 'assistant', content: assistantMessage });
    return assistantMessage;
  }

  getHistory(): ChatMessage[] {
    return [...this.history];
  }

  clearHistory(): void {
    const system = this.history.find((m) => m.role === 'system');
    this.history = system ? [system] : [];
  }
}

// Utilisation
const conv = new Conversation('llama3.1:8b', 'Tu es un expert TypeScript.');
const r1 = await conv.send('Qu\'est-ce qu\'un type guard ?');
console.log(r1);
const r2 = await conv.send('Donne-moi un exemple concret.');
console.log(r2);
```

### `/api/chat` avec streaming

```typescript
async function* chatStream(
  model: string,
  messages: ChatMessage[],
): AsyncGenerator<string> {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: true,  // Active le streaming
    }),
  });

  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    // Chaque ligne est un objet JSON séparé par \n
    const lines = chunk.split('\n').filter(Boolean);

    for (const line of lines) {
      const data = JSON.parse(line);
      if (data.message?.content) {
        yield data.message.content;
      }
    }
  }
}

// Utilisation : affichage progressif
async function streamChat(prompt: string): Promise<void> {
  const messages: ChatMessage[] = [
    { role: 'user', content: prompt },
  ];

  process.stdout.write('Assistant : ');
  for await (const chunk of chatStream('llama3.1:8b', messages)) {
    process.stdout.write(chunk);
  }
  console.log(); // Nouvelle ligne à la fin
}

await streamChat('Explique les closures en 3 phrases.');
```

### `/api/embeddings` — Vecteurs

```typescript
async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch('http://localhost:11434/api/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'nomic-embed-text',  // Modèle d'embedding spécialisé
      prompt: text,
    }),
  });

  const data = await response.json();
  return data.embedding; // Vecteur de 768 dimensions
}

// Modèles d'embedding disponibles dans Ollama
// nomic-embed-text  : 768 dims, 137M params, bon rapport qualité/taille
// mxbai-embed-large : 1024 dims, 335M params, meilleure qualité
// all-minilm        : 384 dims, 23M params, très rapide
```

---

## 6. Paramètres d'inférence

### Les paramètres essentiels

```typescript
interface OllamaOptions {
  // Contrôle de la créativité
  temperature: number;   // 0.0 - 2.0 (défaut: 0.8)
  top_p: number;         // 0.0 - 1.0 (défaut: 0.9) — nucleus sampling
  top_k: number;         // 1 - 100 (défaut: 40) — top-k sampling

  // Contrôle de la longueur
  num_predict: number;   // Max tokens à générer (défaut: 128, -1 = illimité)

  // Contrôle de la répétition
  repeat_penalty: number;  // 1.0 - 2.0 (défaut: 1.1) — pénalité de répétition
  repeat_last_n: number;   // Fenêtre de contexte pour la pénalité (défaut: 64)

  // Reproductibilité
  seed: number;          // Graine aléatoire (même seed = même résultat)

  // Contexte
  num_ctx: number;       // Taille du context window (défaut: 2048-4096)

  // Performance
  num_gpu: number;       // Nombre de layers sur GPU (-1 = tous)
  num_thread: number;    // Threads CPU
}
```

### Impact de la température

```typescript
// Démonstration de l'impact de la température
async function demonstrateTemperature(): Promise<void> {
  const prompt = 'Donne un nom de variable pour stocker une liste d\'utilisateurs';

  const temperatures = [0, 0.3, 0.7, 1.0, 1.5];

  for (const temp of temperatures) {
    const responses: string[] = [];

    // 3 essais par température
    for (let i = 0; i < 3; i++) {
      const res = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          model: 'llama3.1:8b',
          prompt,
          stream: false,
          options: { temperature: temp, num_predict: 20 },
        }),
      });
      const data = await res.json();
      responses.push(data.response.trim());
    }

    console.log(`T=${temp} : ${responses.join(' | ')}`);
  }
}

// Résultat typique :
// T=0   : userList | userList | userList                  (déterministe)
// T=0.3 : userList | users | userList                     (très peu de variation)
// T=0.7 : userList | activeUsers | userCollection         (créatif mais pertinent)
// T=1.0 : registeredPeople | userEntities | memberArray   (très créatif)
// T=1.5 : humanoidDataBucket | entitySwarm | beingRoster  (bizarre)
```

### Guide de choix des paramètres

| Tâche | temperature | top_p | num_predict |
|-------|-------------|-------|-------------|
| Génération de code | 0.1 - 0.3 | 0.9 | 1024 |
| Réponse factuelle | 0 - 0.2 | 0.8 | 512 |
| Conversation | 0.5 - 0.7 | 0.9 | 2048 |
| Écriture créative | 0.8 - 1.2 | 0.95 | 4096 |
| Brainstorming | 1.0 - 1.5 | 1.0 | 2048 |

---

## 7. Modelfile : personnaliser un modèle

### Syntaxe du Modelfile

```dockerfile
# Instruction FROM obligatoire — modèle de base
FROM llama3.1:8b

# System prompt permanent
SYSTEM """Tu es un assistant DevOps senior spécialisé en Docker, Kubernetes et CI/CD.
Tu réponds toujours en français.
Tu fournis des exemples concrets avec des fichiers YAML ou des commandes.
Tu avertis des risques de sécurité quand c'est pertinent."""

# Paramètres d'inférence
PARAMETER temperature 0.4
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER num_predict 2048
PARAMETER repeat_penalty 1.1
PARAMETER stop "<|eot_id|>"

# Template de conversation (optionnel, hérite du modèle de base)
TEMPLATE """{{ if .System }}<|start_header_id|>system<|end_header_id|>

{{ .System }}<|eot_id|>{{ end }}{{ if .Prompt }}<|start_header_id|>user<|end_header_id|>

{{ .Prompt }}<|eot_id|>{{ end }}<|start_header_id|>assistant<|end_header_id|>

{{ .Response }}<|eot_id|>"""

# License (optionnel)
LICENSE "Apache 2.0 — usage interne uniquement"
```

### Instructions du Modelfile

| Instruction | Description | Obligatoire |
|-------------|-------------|-------------|
| `FROM` | Modèle de base ou chemin vers un fichier GGUF | Oui |
| `SYSTEM` | System prompt permanent | Non |
| `PARAMETER` | Paramètres d'inférence | Non |
| `TEMPLATE` | Template Go pour le format de conversation | Non |
| `ADAPTER` | Chemin vers un adapter LoRA (.gguf) | Non |
| `LICENSE` | Texte de license | Non |
| `MESSAGE` | Exemples de conversation (few-shot) | Non |

### Exemples de Modelfiles spécialisés

```dockerfile
# === Modelfile : Reviewer de code TypeScript ===
FROM llama3.1:8b

SYSTEM """Tu es un code reviewer senior TypeScript. Pour chaque code soumis :
1. Identifie les bugs potentiels
2. Suggère des améliorations de typage
3. Vérifie les bonnes pratiques (immutabilité, gestion d'erreurs)
4. Propose une version améliorée
Format ta réponse avec des sections ## claires."""

PARAMETER temperature 0.2
PARAMETER num_predict 4096
```

```dockerfile
# === Modelfile : Générateur de tests Vitest ===
FROM deepseek-coder-v2:16b

SYSTEM """Tu génères des tests unitaires Vitest pour du code TypeScript.
Règles :
- Utilise describe/it/expect
- Couvre les cas nominaux, les edge cases et les erreurs
- Utilise vi.mock() pour les dépendances
- Nomme les tests en français (describe/it)
- Un test par comportement"""

PARAMETER temperature 0.1
PARAMETER num_predict 4096
```

```dockerfile
# === Modelfile avec few-shot examples ===
FROM mistral:7b

SYSTEM "Tu convertis des descriptions en types TypeScript."

MESSAGE user "Un utilisateur avec un nom, un email et un âge optionnel"
MESSAGE assistant """```typescript
interface User {
  name: string;
  email: string;
  age?: number;
}
```"""

MESSAGE user "Une réponse d'API avec un statut, des données génériques et des erreurs optionnelles"
MESSAGE assistant """```typescript
interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  errors?: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
}
```"""

PARAMETER temperature 0.2
```

### Créer et gérer les modèles custom

```bash
# Créer un modèle depuis un Modelfile
ollama create devops-expert -f ./Modelfile.devops

# Créer depuis un fichier GGUF local
# FROM ./models/my-finetuned-model.gguf
ollama create my-model -f ./Modelfile.custom

# Tester le modèle
ollama run devops-expert "Comment configurer un healthcheck Docker ?"

# Copier un modèle (pour faire des variantes)
ollama cp devops-expert devops-expert-v2

# Supprimer
ollama rm devops-expert
```

---

## 8. GPU vs CPU : comprendre la VRAM

### Comment Ollama utilise le hardware

```
┌─────────────────────────────────────────────────────┐
│                    GPU (VRAM)                         │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Poids du modèle (layers sur GPU)                │ │
│  │  + KV Cache (contexte de la conversation)        │ │
│  │  + Espace de travail (calculs intermédiaires)    │ │
│  └─────────────────────────────────────────────────┘ │
│  Si VRAM insuffisante → layers restants en RAM (CPU)  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                    CPU (RAM)                          │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Layers qui ne tiennent pas en VRAM              │ │
│  │  (beaucoup plus lent — 10-50× plus lent)         │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Calcul de la VRAM nécessaire

```typescript
function estimateVRAM(params: {
  modelSizeBillions: number;
  bitsPerWeight: number;
  contextLength: number;
  overhead: number; // 1.1 = 10% overhead
}): { modelGB: number; kvCacheGB: number; totalGB: number } {
  // Poids du modèle
  const modelGB =
    (params.modelSizeBillions * 1e9 * params.bitsPerWeight) / 8 / 1e9;

  // KV Cache approximation
  // ~2 bytes par token par layer pour Q4, plus pour FP16
  const numLayers = Math.round(params.modelSizeBillions * 4); // ~4 layers par B
  const kvCacheGB =
    (2 * numLayers * params.contextLength * 2) / 1e9; // ×2 pour K et V

  const totalGB = (modelGB + kvCacheGB) * params.overhead;

  return {
    modelGB: Math.round(modelGB * 10) / 10,
    kvCacheGB: Math.round(kvCacheGB * 10) / 10,
    totalGB: Math.round(totalGB * 10) / 10,
  };
}

// Exemples
console.log(estimateVRAM({
  modelSizeBillions: 8, bitsPerWeight: 4, contextLength: 4096, overhead: 1.15,
}));
// { modelGB: 4, kvCacheGB: 0.5, totalGB: 5.2 }

console.log(estimateVRAM({
  modelSizeBillions: 70, bitsPerWeight: 4, contextLength: 4096, overhead: 1.15,
}));
// { modelGB: 35, kvCacheGB: 4.5, totalGB: 45.4 }
```

### Performances typiques (tokens/seconde)

| Configuration | Llama 3.1 8B Q4 | Mistral 7B Q4 | Phi-3 Mini Q4 |
|---------------|-----------------|---------------|---------------|
| RTX 4090 (24 Go) | ~80 tok/s | ~90 tok/s | ~120 tok/s |
| RTX 4070 (12 Go) | ~45 tok/s | ~50 tok/s | ~70 tok/s |
| RTX 3060 (12 Go) | ~25 tok/s | ~28 tok/s | ~40 tok/s |
| M2 Pro (16 Go) | ~35 tok/s | ~40 tok/s | ~55 tok/s |
| M3 Max (48 Go) | ~55 tok/s | ~60 tok/s | ~80 tok/s |
| CPU only (i7) | ~3 tok/s | ~4 tok/s | ~8 tok/s |

> **Seuil de confort** : ~15 tok/s est le minimum pour une utilisation interactive confortable (lecture humaine ~5 tok/s).

### Vérifier l'utilisation GPU

```bash
# NVIDIA
nvidia-smi
# Affiche VRAM utilisée, température, utilisation GPU

# Surveillance continue
watch -n 1 nvidia-smi

# Via Ollama — modèles chargés en mémoire
ollama ps
# NAME           ID           SIZE     PROCESSOR   UNTIL
# llama3.1:8b    365c0bd3c000 6.7 GB   100% GPU    4 minutes from now
```

---

## 9. Benchmarking depuis TypeScript

```typescript
interface BenchmarkResult {
  model: string;
  promptTokens: number;
  generatedTokens: number;
  totalDurationMs: number;
  tokensPerSecond: number;
  timeToFirstTokenMs: number;
}

async function benchmarkModel(
  model: string,
  prompt: string,
  maxTokens: number = 256,
): Promise<BenchmarkResult> {
  const start = performance.now();

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: { num_predict: maxTokens, temperature: 0.7 },
    }),
  });

  const data = await response.json();
  const totalDurationMs = performance.now() - start;

  return {
    model,
    promptTokens: data.prompt_eval_count,
    generatedTokens: data.eval_count,
    totalDurationMs: Math.round(totalDurationMs),
    tokensPerSecond: Math.round(
      data.eval_count / (data.eval_duration / 1e9) * 10,
    ) / 10,
    timeToFirstTokenMs: Math.round(data.prompt_eval_duration / 1e6),
  };
}

async function compareBenchmarks(): Promise<void> {
  const models = ['llama3.1:8b', 'mistral:7b', 'phi3:mini'];
  const prompt = 'Écris une fonction TypeScript qui trie un tableau d\'objets par une clé donnée, avec gestion du tri ascendant/descendant.';

  console.log('Modèle            | tok/s | TTFT (ms) | Tokens | Durée (ms)');
  console.log('─'.repeat(70));

  for (const model of models) {
    try {
      const result = await benchmarkModel(model, prompt, 512);
      console.log(
        `${result.model.padEnd(18)}| ${String(result.tokensPerSecond).padEnd(6)}| ` +
        `${String(result.timeToFirstTokenMs).padEnd(10)}| ` +
        `${String(result.generatedTokens).padEnd(7)}| ${result.totalDurationMs}`,
      );
    } catch {
      console.log(`${model.padEnd(18)}| ERREUR (modèle non installé ?)`);
    }
  }
}
```

---

## 10. Intégration avec des outils de développement

### Client Ollama réutilisable

```typescript
class OllamaClient {
  constructor(private baseUrl: string = 'http://localhost:11434') {}

  async isRunning(): Promise<boolean> {
    try {
      const res = await fetch(this.baseUrl);
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    const res = await fetch(`${this.baseUrl}/api/tags`);
    const data = await res.json();
    return data.models.map((m: { name: string }) => m.name);
  }

  async generate(model: string, prompt: string, options?: Record<string, unknown>): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false, options }),
    });
    const data = await res.json();
    return data.response;
  }

  async chat(model: string, messages: ChatMessage[], options?: Record<string, unknown>): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false, options }),
    });
    const data = await res.json();
    return data.message.content;
  }

  async embed(model: string, text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: text }),
    });
    const data = await res.json();
    return data.embedding;
  }

  async *streamChat(
    model: string,
    messages: ChatMessage[],
  ): AsyncGenerator<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: true }),
    });

    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      for (const line of decoder.decode(value, { stream: true }).split('\n').filter(Boolean)) {
        const data = JSON.parse(line);
        if (data.message?.content) yield data.message.content;
      }
    }
  }
}

// Utilisation
const ollama = new OllamaClient();

if (await ollama.isRunning()) {
  const models = await ollama.listModels();
  console.log('Modèles installés :', models);

  const response = await ollama.chat('llama3.1:8b', [
    { role: 'system', content: 'Tu es un expert TypeScript. Réponds en français.' },
    { role: 'user', content: 'Qu\'est-ce qu\'un discriminated union ?' },
  ]);
  console.log(response);
}
```

### Script CLI rapide

```typescript
// cli-ollama.ts — petit utilitaire CLI
import { createInterface } from 'readline';

const rl = createInterface({ input: process.stdin, output: process.stdout });

const model = process.argv[2] || 'llama3.1:8b';
const messages: ChatMessage[] = [
  { role: 'system', content: 'Tu es un assistant développeur. Réponds en français.' },
];

console.log(`Chat avec ${model} (tapez "exit" pour quitter)\n`);

function ask(): void {
  rl.question('Vous > ', async (input) => {
    if (input.toLowerCase() === 'exit') {
      rl.close();
      return;
    }

    messages.push({ role: 'user', content: input });

    process.stdout.write('IA > ');

    const ollama = new OllamaClient();
    let fullResponse = '';

    for await (const chunk of ollama.streamChat(model, messages)) {
      process.stdout.write(chunk);
      fullResponse += chunk;
    }

    console.log('\n');
    messages.push({ role: 'assistant', content: fullResponse });
    ask();
  });
}

ask();
```

---

## Résumé du module

| Concept | Points clés |
|---------|-------------|
| Pourquoi local | Confidentialité, coût zéro, offline, contrôle total |
| Installation | `ollama pull <model>` — fonctionne sur Mac, Linux, Windows, Docker |
| Modèles | Llama 3.1 (polyvalent), Mistral (FR), Phi-3 (petit), DeepSeek (code) |
| Quantization | Q4_K_M = sweet spot (70% compression, ~3% perte qualité) |
| API REST | `/api/chat` (conversation), `/api/generate` (complétion), `/api/embeddings` |
| Paramètres | `temperature` (créativité), `top_p` (nucleus), `num_predict` (longueur) |
| Modelfile | Personnaliser system prompt, paramètres, few-shot examples |
| VRAM | 8 Go = modèles 7-8B, 16 Go = modèles 13-16B, 24 Go = modèles 27B |

---

## 11. Ollama + RAG : avant-gout du Module 13

Ollama n'est pas qu'un chatbot local — c'est aussi un **moteur d'embedding gratuit**. Voici un mini-RAG en 30 lignes qui montre la puissance de la combinaison :

```typescript
// Mini-RAG local avec Ollama — preview de ce que vous construirez en Module 13-15
const ollama = new OllamaClient();

// 1. Vos documents (en vrai : chargés depuis des fichiers)
const docs = [
  "NestJS utilise des décorateurs TypeScript pour définir les modules, contrôleurs et services.",
  "Un Guard dans NestJS implémente CanActivate pour protéger les routes avec JWT.",
  "Les Pipes NestJS valident et transforment les données entrantes avec class-validator.",
];

// 2. Embedder chaque document (gratuit, local, privé)
const docVectors = await Promise.all(
  docs.map(async (doc) => ({
    text: doc,
    vector: await ollama.embed("nomic-embed-text", doc),
  })),
);

// 3. Embedder la question
const question = "Comment sécuriser une route NestJS ?";
const questionVec = await ollama.embed("nomic-embed-text", question);

// 4. Trouver le document le plus pertinent (cosine similarity)
const best = docVectors
  .map((d) => ({ text: d.text, score: cosine(questionVec, d.vector) }))
  .sort((a, b) => b.score - a.score)[0];

// 5. Générer la réponse avec le contexte
const answer = await ollama.chat("mistral", [
  { role: "system", content: `Réponds en te basant sur ce contexte :\n${best.text}` },
  { role: "user", content: question },
]);
console.log(answer);
// → "Pour sécuriser une route NestJS, vous pouvez utiliser un Guard qui implémente CanActivate..."
```

> C'est un aperçu simplifié. Dans les modules 13-15, vous construirez un pipeline RAG complet avec chunking, vector store persistant, hybrid search, et streaming.

---

## Exercices pratiques

1. **Installation** : Installez Ollama, téléchargez 3 modèles de tailles différentes, comparez les temps de réponse
2. **API** : Écrivez un client TypeScript qui utilise `/api/chat` avec streaming et affichez la vitesse en tokens/seconde
3. **Modelfile** : Créez 3 Modelfiles spécialisés (reviewer de code, générateur de tests, rédacteur de docs)
4. **Benchmark** : Comparez 3 modèles sur 10 prompts identiques, mesurez la qualité (scoring subjectif 1-5) et la vitesse
5. **Quantization** : Téléchargez le même modèle en Q4, Q5, Q8 et F16, comparez la qualité sur 5 questions précises
6. **Mini-RAG** : Adaptez l'exemple ci-dessus avec 5-10 paragraphes de votre propre documentation, testez 3 questions

---

<!-- parcours-recommande -->

::: tip Parcours recommandé
1. **Screencast** : [screencast 11 ollama](../screencasts/screencast-11-ollama.md)
2. **Lab** : [lab-11-ollama-local](../labs/lab-11-ollama-local/README)
3. **Quiz** : [quiz 11 ollama](../quizzes/quiz-11-ollama.html)
:::
