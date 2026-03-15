# Module 18 — Production & Coûts

## Objectifs du module

- Comprendre les coûts des LLMs et savoir les calculer
- Implémenter un semantic cache pour réduire les appels API
- Mettre en place du rate limiting avec un token bucket
- Configurer des fallback models pour la résilience
- Optimiser la latence (streaming, edge, choix de modèle)
- Maîtriser le prompt optimization pour réduire les tokens
- Comparer self-hosted vs API cloud avec un framework de décision
- Monitorer les coûts, la latence et le throughput en production

---

## 1. Coûts des LLMs

### Tableau comparatif des prix (2025)

| Modèle | Input ($/M tokens) | Output ($/M tokens) | Context max | Notes |
|--------|-------------------|--------------------|--------------| ------|
| GPT-4o | $2.50 | $10.00 | 128K | Bon rapport qualité/prix |
| GPT-4o-mini | $0.15 | $0.60 | 128K | Très économique |
| Claude Sonnet 4 | $3.00 | $15.00 | 200K | Excellent en code |
| Claude Haiku 3.5 | $0.80 | $4.00 | 200K | Rapide, économique |
| Claude Opus 4 | $15.00 | $75.00 | 200K | Maximum qualité |
| Gemini 1.5 Pro | $1.25 | $5.00 | 2M | Context gigantesque |
| Gemini 1.5 Flash | $0.075 | $0.30 | 1M | Ultra économique |
| Llama 3.1 8B (local) | $0.00 | $0.00 | 128K | Coût = électricité |
| Llama 3.1 70B (API) | $0.50 | $0.70 | 128K | Via Groq/Together |
| Mistral Large | $2.00 | $6.00 | 128K | Souveraineté EU |

### Calculer le coût d'une requête

```typescript
interface TokenPricing {
  model: string;
  inputPerMillion: number;  // $ par million de tokens input
  outputPerMillion: number; // $ par million de tokens output
}

interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  costPerQuery: string;
}

const PRICING: Record<string, TokenPricing> = {
  'gpt-4o':          { model: 'gpt-4o',          inputPerMillion: 2.5,  outputPerMillion: 10 },
  'gpt-4o-mini':     { model: 'gpt-4o-mini',     inputPerMillion: 0.15, outputPerMillion: 0.6 },
  'claude-sonnet-4': { model: 'claude-sonnet-4',  inputPerMillion: 3,    outputPerMillion: 15 },
  'claude-haiku-3.5':{ model: 'claude-haiku-3.5', inputPerMillion: 0.8,  outputPerMillion: 4 },
  'claude-opus-4':   { model: 'claude-opus-4',    inputPerMillion: 15,   outputPerMillion: 75 },
  'gemini-flash':    { model: 'gemini-flash',     inputPerMillion: 0.075,outputPerMillion: 0.3 },
};

function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): CostEstimate {
  const pricing = PRICING[model];
  if (!pricing) throw new Error(`Modèle inconnu : ${model}`);

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;

  return {
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    costPerQuery: `$${(inputCost + outputCost).toFixed(6)}`,
  };
}

// Exemples concrets
function scenarioAnalysis(): void {
  const scenarios = [
    { name: 'Chatbot support (simple)', inputTokens: 500, outputTokens: 300 },
    { name: 'RAG avec contexte', inputTokens: 3000, outputTokens: 500 },
    { name: 'Génération de code longue', inputTokens: 2000, outputTokens: 2000 },
    { name: 'Résumé de document', inputTokens: 10000, outputTokens: 1000 },
  ];

  const models = ['gpt-4o-mini', 'claude-sonnet-4', 'claude-opus-4'];

  console.log('Scénario                      | gpt-4o-mini | Claude Sonnet | Claude Opus');
  console.log('─'.repeat(85));

  for (const scenario of scenarios) {
    const costs = models.map((m) =>
      estimateCost(m, scenario.inputTokens, scenario.outputTokens).costPerQuery.padEnd(12),
    );
    console.log(`${scenario.name.padEnd(30)}| ${costs.join('| ')}`);
  }

  // Projection mensuelle
  console.log('\n--- Projection pour 100K requêtes/mois (RAG) ---');
  for (const model of models) {
    const cost = estimateCost(model, 3000, 500);
    const monthly = cost.totalCost * 100_000;
    console.log(`${model.padEnd(20)}: $${monthly.toFixed(2)}/mois`);
  }
}

// Résultat:
// gpt-4o-mini   : $25.50/mois   ← économique
// claude-sonnet : $115.50/mois  ← bon rapport qualité/prix
// claude-opus   : $525.00/mois  ← premium
```

### Estimation des tokens

```typescript
/**
 * Estimer le nombre de tokens d'un texte
 * Règle empirique : ~4 caractères/token en anglais, ~3.5 en français
 */
function estimateTokens(text: string, language: 'en' | 'fr' = 'fr'): number {
  const charsPerToken = language === 'en' ? 4 : 3.5;
  return Math.ceil(text.length / charsPerToken);
}

/**
 * Estimation plus précise basée sur les mots
 * ~1.3 token par mot en anglais, ~1.5 en français
 */
function estimateTokensByWords(text: string, language: 'en' | 'fr' = 'fr'): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  const tokensPerWord = language === 'en' ? 1.3 : 1.5;
  return Math.ceil(words * tokensPerWord);
}

// Pour le code TypeScript : ~2.5 caractères/token (beaucoup de tokens spéciaux)
function estimateCodeTokens(code: string): number {
  return Math.ceil(code.length / 2.5);
}
```

---

## 2. Semantic Cache

### Concept

Le semantic cache évite d'appeler le LLM quand une question **similaire** a déjà été posée.

```
Sans cache :
  Q: "Comment installer Node.js ?"     → LLM → Réponse (500ms, $0.003)
  Q: "Comment installer NodeJS ?"      → LLM → Réponse (500ms, $0.003)
  Q: "Installer node js comment ?"     → LLM → Réponse (500ms, $0.003)
  Total : 3 appels, $0.009

Avec semantic cache :
  Q: "Comment installer Node.js ?"     → LLM → Réponse (500ms, $0.003) → CACHE
  Q: "Comment installer NodeJS ?"      → CACHE HIT → Réponse (5ms, $0.00)
  Q: "Installer node js comment ?"     → CACHE HIT → Réponse (5ms, $0.00)
  Total : 1 appel, $0.003 (67% d'économie)
```

> **Analogie** : Le cache classique compare les clés exactement (comme chercher un livre par son ISBN). Le semantic cache compare le SENS (comme chercher un livre par son sujet — "guide d'installation Node" et "installer Node.js" trouvent le même livre).

### Implémentation

```typescript
interface CacheEntry {
  question: string;
  embedding: number[];
  answer: string;
  model: string;
  createdAt: Date;
  hitCount: number;
  tokensSaved: number;
}

class SemanticCache {
  private entries: CacheEntry[] = [];
  private readonly similarityThreshold: number;
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(options?: {
    similarityThreshold?: number;
    maxEntries?: number;
    ttlMinutes?: number;
  }) {
    this.similarityThreshold = options?.similarityThreshold ?? 0.92;
    this.maxEntries = options?.maxEntries ?? 10000;
    this.ttlMs = (options?.ttlMinutes ?? 60) * 60 * 1000;
  }

  /**
   * Chercher une réponse en cache
   */
  async get(
    question: string,
    embedder: { embed: (text: string) => Promise<number[]> },
  ): Promise<{ hit: boolean; answer?: string; similarity?: number }> {
    const queryEmbedding = await embedder.embed(question);

    // Nettoyer les entrées expirées
    this.evictExpired();

    let bestMatch: CacheEntry | null = null;
    let bestSimilarity = 0;

    for (const entry of this.entries) {
      const similarity = cosineSimilarity(queryEmbedding, entry.embedding);
      if (similarity > bestSimilarity && similarity >= this.similarityThreshold) {
        bestSimilarity = similarity;
        bestMatch = entry;
      }
    }

    if (bestMatch) {
      bestMatch.hitCount++;
      return {
        hit: true,
        answer: bestMatch.answer,
        similarity: bestSimilarity,
      };
    }

    return { hit: false };
  }

  /**
   * Ajouter une entrée au cache
   */
  async set(
    question: string,
    answer: string,
    model: string,
    embedder: { embed: (text: string) => Promise<number[]> },
  ): Promise<void> {
    const embedding = await embedder.embed(question);

    // Vérifier si une entrée similaire existe déjà
    for (const entry of this.entries) {
      if (cosineSimilarity(embedding, entry.embedding) >= this.similarityThreshold) {
        return; // Pas besoin d'ajouter un doublon
      }
    }

    // Éviction LRU si plein
    if (this.entries.length >= this.maxEntries) {
      this.entries.sort((a, b) => a.hitCount - b.hitCount);
      this.entries.shift();
    }

    const inputTokens = estimateTokens(question);
    const outputTokens = estimateTokens(answer);

    this.entries.push({
      question,
      embedding,
      answer,
      model,
      createdAt: new Date(),
      hitCount: 0,
      tokensSaved: inputTokens + outputTokens,
    });
  }

  /**
   * Statistiques du cache
   */
  getStats(): {
    entries: number;
    totalHits: number;
    totalTokensSaved: number;
    estimatedCostSaved: number;
  } {
    const totalHits = this.entries.reduce((sum, e) => sum + e.hitCount, 0);
    const totalTokensSaved = this.entries.reduce(
      (sum, e) => sum + e.tokensSaved * e.hitCount,
      0,
    );

    return {
      entries: this.entries.length,
      totalHits,
      totalTokensSaved,
      estimatedCostSaved: (totalTokensSaved / 1_000_000) * 3, // ~$3/M tokens
    };
  }

  private evictExpired(): void {
    const now = Date.now();
    this.entries = this.entries.filter(
      (e) => now - e.createdAt.getTime() < this.ttlMs,
    );
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}
```

### Intégration dans le pipeline

```typescript
class CachedLLMClient {
  private cache: SemanticCache;

  constructor(
    private llm: { chat: (msgs: Array<{ role: string; content: string }>) => Promise<string> },
    private embedder: { embed: (text: string) => Promise<number[]> },
    private model: string,
  ) {
    this.cache = new SemanticCache({
      similarityThreshold: 0.93,
      maxEntries: 5000,
      ttlMinutes: 120,
    });
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
  ): Promise<{ answer: string; cached: boolean; similarity?: number }> {
    // Utiliser le dernier message user comme clé de cache
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) throw new Error('No user message found');

    // Chercher en cache
    const cacheResult = await this.cache.get(lastUserMsg.content, this.embedder);

    if (cacheResult.hit) {
      console.log(`[CACHE HIT] similarity=${cacheResult.similarity?.toFixed(3)}`);
      return {
        answer: cacheResult.answer!,
        cached: true,
        similarity: cacheResult.similarity,
      };
    }

    // Cache miss → appel LLM
    const answer = await this.llm.chat(messages);

    // Mettre en cache
    await this.cache.set(lastUserMsg.content, answer, this.model, this.embedder);

    return { answer, cached: false };
  }

  getStats() {
    return this.cache.getStats();
  }
}
```

---

## 3. Rate Limiting : Token Bucket

### Concept

Le token bucket limite le débit de requêtes pour éviter les dépassements de quota et les coûts incontrôlés.

```
┌────────────────────────────────────────┐
│         Token Bucket                    │
│                                         │
│  Capacité : 100 tokens                  │
│  Remplissage : 10 tokens/seconde        │
│                                         │
│  [████████████████████░░░░░░░░░░]       │
│   80 tokens restants                    │
│                                         │
│  Requête → coûte N tokens du bucket     │
│  Si pas assez → attendre ou refuser     │
└────────────────────────────────────────┘
```

### Implémentation

```typescript
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,        // Nombre max de tokens
    private refillRate: number,      // Tokens ajoutés par seconde
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Tenter de consommer des tokens
   * Retourne true si autorisé, false sinon
   */
  consume(count: number = 1): boolean {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }

    return false;
  }

  /**
   * Attendre que les tokens soient disponibles
   */
  async waitForTokens(count: number = 1): Promise<void> {
    while (!this.consume(count)) {
      const waitTime = ((count - this.tokens) / this.refillRate) * 1000;
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitTime, 1000)));
    }
  }

  /**
   * Temps d'attente estimé pour N tokens
   */
  estimateWaitMs(count: number): number {
    this.refill();
    if (this.tokens >= count) return 0;
    return ((count - this.tokens) / this.refillRate) * 1000;
  }

  getStatus(): { available: number; capacity: number; refillRate: number } {
    this.refill();
    return {
      available: Math.floor(this.tokens),
      capacity: this.capacity,
      refillRate: this.refillRate,
    };
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// Rate limiter par utilisateur
class UserRateLimiter {
  private buckets = new Map<string, TokenBucket>();

  constructor(
    private capacityPerUser: number,
    private refillRatePerUser: number,
  ) {}

  canProceed(userId: string, tokenCost: number): boolean {
    if (!this.buckets.has(userId)) {
      this.buckets.set(
        userId,
        new TokenBucket(this.capacityPerUser, this.refillRatePerUser),
      );
    }

    return this.buckets.get(userId)!.consume(tokenCost);
  }

  getWaitTime(userId: string, tokenCost: number): number {
    const bucket = this.buckets.get(userId);
    if (!bucket) return 0;
    return bucket.estimateWaitMs(tokenCost);
  }
}

// Configuration typique
const rateLimiter = new UserRateLimiter(
  100,  // 100 requêtes max accumulables
  2,    // 2 requêtes/seconde autorisées
);

// Middleware NestJS
function rateLimitMiddleware(limiter: UserRateLimiter) {
  return (req: { headers: Record<string, string>; body?: { estimatedTokens?: number } }, res: { status: (n: number) => { json: (b: unknown) => void } }, next: () => void) => {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const tokenCost = req.body?.estimatedTokens ?? 1;

    if (!limiter.canProceed(userId, tokenCost)) {
      const waitTime = limiter.getWaitTime(userId, tokenCost);
      return res.status(429).json({
        error: 'Rate limit dépassé',
        retryAfterMs: Math.ceil(waitTime),
      });
    }

    next();
  };
}
```

---

## 4. Fallback Models

### Stratégie de fallback

```
┌─────────────────────────────────────────────────────────┐
│                  Cascade de modèles                      │
│                                                          │
│  Requête → Claude Sonnet ───timeout/erreur───→ GPT-4o    │
│                                │                │        │
│                              OK ↓              erreur    │
│                            Réponse               ↓       │
│                                          GPT-4o-mini     │
│                                                │         │
│                                              erreur      │
│                                                ↓         │
│                                         Ollama (local)   │
│                                                │         │
│                                              erreur      │
│                                                ↓         │
│                                    "Désolé, service      │
│                                     temporairement       │
│                                     indisponible"        │
└─────────────────────────────────────────────────────────┘
```

```typescript
interface FallbackModel {
  name: string;
  provider: 'anthropic' | 'openai' | 'ollama';
  model: string;
  timeoutMs: number;
  maxRetries: number;
  priority: number;
}

class FallbackLLMClient {
  private models: FallbackModel[];

  constructor(models: FallbackModel[]) {
    this.models = models.sort((a, b) => a.priority - b.priority);
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
  ): Promise<{ answer: string; model: string; attempts: number }> {
    let lastError: Error | null = null;
    let attempts = 0;

    for (const model of this.models) {
      for (let retry = 0; retry <= model.maxRetries; retry++) {
        attempts++;
        try {
          const answer = await this.callModel(model, messages);
          return { answer, model: model.name, attempts };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.warn(
            `[Fallback] ${model.name} tentative ${retry + 1}/${model.maxRetries + 1} échouée: ${lastError.message}`,
          );
        }
      }
    }

    throw new Error(
      `Tous les modèles ont échoué après ${attempts} tentatives. Dernière erreur : ${lastError?.message}`,
    );
  }

  private async callModel(
    model: FallbackModel,
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), model.timeoutMs);

    try {
      switch (model.provider) {
        case 'anthropic':
          return await this.callAnthropic(model.model, messages, controller.signal);
        case 'openai':
          return await this.callOpenAI(model.model, messages, controller.signal);
        case 'ollama':
          return await this.callOllama(model.model, messages, controller.signal);
        default:
          throw new Error(`Provider inconnu : ${model.provider}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private async callAnthropic(
    model: string,
    messages: Array<{ role: string; content: string }>,
    signal: AbortSignal,
  ): Promise<string> {
    const systemMsg = messages.find((m) => m.role === 'system');
    const chatMsgs = messages.filter((m) => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system: systemMsg?.content,
        messages: chatMsgs,
      }),
      signal,
    });

    if (!response.ok) throw new Error(`Anthropic ${response.status}`);
    const data = await response.json();
    return data.content[0].text;
  }

  private async callOpenAI(
    model: string,
    messages: Array<{ role: string; content: string }>,
    signal: AbortSignal,
  ): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages, max_tokens: 2048 }),
      signal,
    });

    if (!response.ok) throw new Error(`OpenAI ${response.status}`);
    const data = await response.json();
    return data.choices[0].message.content;
  }

  private async callOllama(
    model: string,
    messages: Array<{ role: string; content: string }>,
    signal: AbortSignal,
  ): Promise<string> {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false }),
      signal,
    });

    if (!response.ok) throw new Error(`Ollama ${response.status}`);
    const data = await response.json();
    return data.message.content;
  }
}

// Configuration
const fallbackClient = new FallbackLLMClient([
  {
    name: 'Claude Sonnet',
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    timeoutMs: 30000,
    maxRetries: 1,
    priority: 1,
  },
  {
    name: 'GPT-4o',
    provider: 'openai',
    model: 'gpt-4o',
    timeoutMs: 30000,
    maxRetries: 1,
    priority: 2,
  },
  {
    name: 'Llama 3.1 (local)',
    provider: 'ollama',
    model: 'llama3.1:8b',
    timeoutMs: 60000,
    maxRetries: 0,
    priority: 3,
  },
]);
```

---

## 5. Optimisation de la latence

### Sources de latence

```
Latence totale d'une requête LLM :
┌──────────────────────────────────────────────────┐
│  Réseau    : 20-100ms (API cloud)                 │
│  TTFT      : 200-2000ms (Time To First Token)     │
│  Génération: 500-5000ms (selon nb tokens)          │
│  Post-traitement : 10-50ms                         │
│                                                    │
│  Total typique : 800ms - 8000ms                    │
└──────────────────────────────────────────────────┘
```

### Stratégies d'optimisation

| Stratégie | Gain de latence | Complexité | Impact qualité |
|-----------|----------------|------------|----------------|
| **Streaming** | Perçu ~80% mieux | Faible | Aucun |
| **Modèle plus petit** | 2-5× plus rapide | Nul | Léger |
| **Prompt plus court** | Proportionnel | Faible | Variable |
| **Semantic cache** | ~99% (cache hit) | Moyenne | Aucun |
| **Parallel calls** | Divisé par N | Moyenne | Aucun |
| **Edge deployment** | -50ms réseau | Élevée | Aucun |

### Prompt optimization

```typescript
// Avant : 850 tokens (~$0.003)
const longPrompt = `
Tu es un assistant expert en développement web. Tu as une connaissance approfondie
de JavaScript, TypeScript, React, Vue, Angular, Node.js, et de l'ensemble de
l'écosystème moderne du développement web. Tu dois toujours fournir des réponses
détaillées, avec des exemples de code quand c'est pertinent. Tu dois suivre les
bonnes pratiques et conventions de l'industrie. Tu dois être pédagogue et expliquer
les concepts clairement.

Voici le contexte de la question :
L'utilisateur travaille sur un projet TypeScript avec Node.js et NestJS.
Il utilise PostgreSQL comme base de données et Docker pour le déploiement.
Le projet est un chatbot RAG avec ingestion de documents.

Question de l'utilisateur : Comment optimiser les requêtes SQL ?
`;

// Après : 280 tokens (~$0.001) — même qualité
const shortPrompt = `Expert TS/Node/NestJS/PostgreSQL. Projet : chatbot RAG.

Question : Comment optimiser les requêtes SQL ?`;

// Techniques d'optimisation du prompt :
// 1. Supprimer les redondances ("tu dois" répété)
// 2. Utiliser des abréviations (TS pour TypeScript)
// 3. Mettre le contexte en mots-clés, pas en phrases
// 4. Garder le system prompt minimal (les détails dans le user prompt)
// 5. Supprimer les politesses et le padding

// Économie : ~67% de tokens en moins = ~67% de coût input en moins
```

### Batch processing

```typescript
interface BatchJob {
  id: string;
  messages: Array<{ role: string; content: string }>;
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: string;
  error?: string;
}

class BatchProcessor {
  private queue: BatchJob[] = [];
  private concurrency: number;
  private processing = 0;

  constructor(
    private llm: { chat: (msgs: Array<{ role: string; content: string }>) => Promise<string> },
    concurrency: number = 5,
  ) {
    this.concurrency = concurrency;
  }

  /**
   * Ajouter un job au batch
   */
  add(messages: Array<{ role: string; content: string }>): string {
    const id = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.queue.push({ id, messages, status: 'pending' });
    return id;
  }

  /**
   * Traiter tout le batch
   */
  async processAll(
    onProgress?: (completed: number, total: number) => void,
  ): Promise<BatchJob[]> {
    const total = this.queue.length;
    let completed = 0;

    const process = async (job: BatchJob): Promise<void> => {
      job.status = 'processing';
      try {
        job.result = await this.llm.chat(job.messages);
        job.status = 'done';
      } catch (error) {
        job.error = error instanceof Error ? error.message : 'Unknown error';
        job.status = 'error';
      }
      completed++;
      onProgress?.(completed, total);
    };

    // Traiter en parallèle avec concurrency limitée
    const pending = [...this.queue];
    const results: Promise<void>[] = [];

    while (pending.length > 0 || this.processing > 0) {
      while (this.processing < this.concurrency && pending.length > 0) {
        const job = pending.shift()!;
        this.processing++;
        results.push(
          process(job).finally(() => { this.processing--; }),
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    await Promise.all(results);
    return this.queue;
  }

  getResults(): BatchJob[] {
    return [...this.queue];
  }
}

// Utilisation
const batch = new BatchProcessor(llmClient, 5);

// Ajouter 100 jobs
for (const question of questions) {
  batch.add([
    { role: 'system', content: 'Réponds en 2 phrases max.' },
    { role: 'user', content: question },
  ]);
}

// Traiter avec 5 requêtes en parallèle
const results = await batch.processAll((done, total) => {
  console.log(`Progression : ${done}/${total}`);
});
```

---

## 6. Self-hosted vs API Cloud

### Framework de décision

```
┌──────────────────────────────────────────────────────────┐
│              ARBRE DE DÉCISION                            │
│                                                           │
│  Les données sont-elles sensibles/réglementées ?          │
│  ├─ OUI → Self-hosted obligatoire                        │
│  └─ NON ↓                                                │
│                                                           │
│  Le budget mensuel est-il > $500/mois ?                   │
│  ├─ NON → API Cloud (plus simple, moins de maintenance)  │
│  └─ OUI ↓                                                │
│                                                           │
│  Avez-vous l'expertise infra (DevOps, GPU) ?              │
│  ├─ NON → API Cloud (coût maintenance > économies)       │
│  └─ OUI ↓                                                │
│                                                           │
│  La qualité d'un 8B/70B est-elle suffisante ?             │
│  ├─ NON → API Cloud (Claude Opus, GPT-4o sont meilleurs) │
│  └─ OUI → Self-hosted (économies significatives)          │
└──────────────────────────────────────────────────────────┘
```

### Comparatif détaillé

| Critère | Self-hosted (Ollama/vLLM) | API Cloud (Claude/GPT) |
|---------|--------------------------|----------------------|
| Coût initial | $5K-$50K (GPU) | $0 |
| Coût mensuel (100K req) | ~$200 (électricité) | $100-$5000 (tokens) |
| Qualité | 8B~Haiku, 70B~Sonnet | Opus/Sonnet = top tier |
| Latence | ~20-80 tok/s (local) | ~30-100 tok/s (réseau) |
| Confidentialité | Totale | Dépend du provider |
| Maintenance | Élevée (GPU, updates) | Nulle |
| Scaling | Complexe (K8s, GPU) | Automatique |
| Disponibilité | Votre responsabilité | 99.9%+ SLA |
| Temps de setup | Jours/semaines | Minutes |

### Architecture GPU cloud

```yaml
# docker-compose.yml pour vLLM en production
version: '3.8'

services:
  vllm:
    image: vllm/vllm-openai:latest
    command:
      - "--model"
      - "meta-llama/Meta-Llama-3.1-8B-Instruct"
      - "--tensor-parallel-size"
      - "1"
      - "--max-model-len"
      - "8192"
      - "--gpu-memory-utilization"
      - "0.9"
    ports:
      - "8000:8000"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    volumes:
      - model_cache:/root/.cache/huggingface
    restart: unless-stopped

  # Load balancer pour multiple instances
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - vllm

volumes:
  model_cache:
```

---

## 7. Monitoring en production

### Dashboard de coûts

```typescript
interface CostDashboard {
  period: { start: Date; end: Date };
  totalCost: number;
  totalTokens: { input: number; output: number };
  totalRequests: number;
  avgCostPerRequest: number;
  avgLatencyMs: number;
  cacheHitRate: number;
  byModel: Record<string, {
    requests: number;
    cost: number;
    avgLatency: number;
    p95Latency: number;
  }>;
  byHour: Array<{
    hour: string;
    requests: number;
    cost: number;
    latency: number;
  }>;
}

class ProductionMonitor {
  private events: Array<{
    timestamp: Date;
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    cached: boolean;
    cost: number;
  }> = [];

  record(event: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    cached: boolean;
  }): void {
    const pricing = PRICING[event.model];
    const cost = pricing
      ? (event.inputTokens * pricing.inputPerMillion +
         event.outputTokens * pricing.outputPerMillion) / 1_000_000
      : 0;

    this.events.push({
      ...event,
      timestamp: new Date(),
      cost: event.cached ? 0 : cost,
    });
  }

  getDashboard(periodHours: number = 24): CostDashboard {
    const since = new Date(Date.now() - periodHours * 3600 * 1000);
    const filtered = this.events.filter((e) => e.timestamp >= since);

    const totalCost = filtered.reduce((s, e) => s + e.cost, 0);
    const totalInput = filtered.reduce((s, e) => s + e.inputTokens, 0);
    const totalOutput = filtered.reduce((s, e) => s + e.outputTokens, 0);
    const avgLatency = filtered.length > 0
      ? filtered.reduce((s, e) => s + e.latencyMs, 0) / filtered.length
      : 0;
    const cacheHits = filtered.filter((e) => e.cached).length;

    // Par modèle
    const byModel: CostDashboard['byModel'] = {};
    for (const event of filtered) {
      if (!byModel[event.model]) {
        byModel[event.model] = { requests: 0, cost: 0, avgLatency: 0, p95Latency: 0 };
      }
      byModel[event.model].requests++;
      byModel[event.model].cost += event.cost;
    }

    // Calculer les latences par modèle
    for (const model of Object.keys(byModel)) {
      const modelEvents = filtered.filter((e) => e.model === model);
      const latencies = modelEvents.map((e) => e.latencyMs).sort((a, b) => a - b);
      byModel[model].avgLatency = Math.round(
        latencies.reduce((a, b) => a + b, 0) / latencies.length,
      );
      byModel[model].p95Latency = latencies[Math.floor(latencies.length * 0.95)] ?? 0;
    }

    return {
      period: { start: since, end: new Date() },
      totalCost,
      totalTokens: { input: totalInput, output: totalOutput },
      totalRequests: filtered.length,
      avgCostPerRequest: filtered.length > 0 ? totalCost / filtered.length : 0,
      avgLatencyMs: Math.round(avgLatency),
      cacheHitRate: filtered.length > 0 ? cacheHits / filtered.length : 0,
      byModel,
      byHour: [], // Simplifié ici
    };
  }

  /**
   * Rapport texte pour les logs
   */
  printReport(periodHours: number = 24): void {
    const d = this.getDashboard(periodHours);

    console.log(`\n=== Rapport LLM (${periodHours}h) ===`);
    console.log(`Requêtes totales : ${d.totalRequests}`);
    console.log(`Coût total : $${d.totalCost.toFixed(4)}`);
    console.log(`Coût moyen/req : $${d.avgCostPerRequest.toFixed(6)}`);
    console.log(`Latence moyenne : ${d.avgLatencyMs}ms`);
    console.log(`Cache hit rate : ${(d.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`Tokens : ${d.totalTokens.input} in / ${d.totalTokens.output} out`);

    console.log('\nPar modèle :');
    for (const [model, stats] of Object.entries(d.byModel)) {
      console.log(
        `  ${model.padEnd(25)} | ${String(stats.requests).padEnd(6)} req | ` +
        `$${stats.cost.toFixed(4).padEnd(8)} | avg ${stats.avgLatency}ms | p95 ${stats.p95Latency}ms`,
      );
    }
  }
}
```

### Alertes de coûts

```typescript
interface CostAlert {
  type: 'daily_budget' | 'spike' | 'anomaly';
  message: string;
  currentValue: number;
  threshold: number;
}

class CostAlertManager {
  private dailyBudget: number;
  private spikeMultiplier: number;

  constructor(dailyBudget: number = 10, spikeMultiplier: number = 3) {
    this.dailyBudget = dailyBudget;
    this.spikeMultiplier = spikeMultiplier;
  }

  check(monitor: ProductionMonitor): CostAlert[] {
    const alerts: CostAlert[] = [];
    const dashboard = monitor.getDashboard(24);

    // Budget quotidien
    if (dashboard.totalCost > this.dailyBudget) {
      alerts.push({
        type: 'daily_budget',
        message: `Budget quotidien dépassé : $${dashboard.totalCost.toFixed(2)} > $${this.dailyBudget}`,
        currentValue: dashboard.totalCost,
        threshold: this.dailyBudget,
      });
    }

    // Projection
    const hourlyRate = dashboard.totalCost / 24;
    const projectedDaily = hourlyRate * 24;
    if (projectedDaily > this.dailyBudget * 0.8 && dashboard.totalCost < this.dailyBudget) {
      alerts.push({
        type: 'daily_budget',
        message: `Projection : $${projectedDaily.toFixed(2)}/jour (80% du budget)`,
        currentValue: projectedDaily,
        threshold: this.dailyBudget,
      });
    }

    return alerts;
  }
}
```

---

## Résumé du module

| Concept | Points clés |
|---------|-------------|
| Coûts | $0.15-$75/M tokens selon le modèle. Calculer avant de déployer |
| Semantic cache | Similarité cosinus sur les questions. ~60% d'économie possible |
| Rate limiting | Token bucket par utilisateur. Protège budget et quotas |
| Fallback models | Cascade de modèles : premium → économique → local |
| Latence | Streaming, modèle plus petit, prompt court, cache |
| Prompt optimization | Réduire les tokens = réduire les coûts |
| Self-hosted vs Cloud | Données sensibles → local. Budget < $500 → cloud |
| Monitoring | Coût, latence, cache hit rate, alertes budgétaires |

---

## Exercices pratiques

1. **Calcul de coûts** : Pour votre projet RAG du module 15, estimez le coût mensuel avec 3 modèles différents pour 10K, 50K et 100K requêtes
2. **Semantic cache** : Intégrez le semantic cache dans votre chatbot et mesurez le taux de hit sur 100 questions (dont 30 reformulations)
3. **Rate limiter** : Ajoutez un rate limiter par utilisateur à votre API NestJS avec une limite de 20 requêtes/minute
4. **Fallback** : Configurez une cascade Claude Sonnet → GPT-4o-mini → Ollama et testez la résilience en coupant les providers
5. **Dashboard** : Créez un endpoint /admin/costs qui retourne le dashboard de monitoring des 24 dernières heures
