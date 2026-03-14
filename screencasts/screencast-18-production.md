# Screencast 18 — Production & Couts

## Informations
- **Duree estimee** : 20-25 min
- **Module** : `modules/18-production-couts.md`
- **Lab associe** : `labs/lab-18-production-couts/`
- **Prerequis** : Module 17 complete, chatbot RAG fonctionnel

## Setup
- [ ] Chatbot RAG du module 15 fonctionnel
- [ ] Ollama avec `llama3.1:8b` et `nomic-embed-text`
- [ ] Terminal et VS Code ouverts sur le dossier du lab
- [ ] Tableau des prix des modeles pret (slide ou fichier)
- [ ] `pnpm install` deja execute

## Script

### [00:00-03:00] Combien coute un LLM en production ?
> Avant de deployer, la premiere question du CTO sera : "Combien ca coute ?" On va apprendre a calculer. Les prix varient de 100x entre les modeles.
**Action** : Afficher le tableau des prix
```
| Modele              | Input ($/M tokens) | Output ($/M tokens) |
|---------------------|--------------------|--------------------|
| GPT-4o-mini         | $0.15              | $0.60              |
| Claude Haiku 3.5    | $0.80              | $4.00              |
| Claude Sonnet 4     | $3.00              | $15.00             |
| Claude Opus 4       | $15.00             | $75.00             |
| Gemini 1.5 Flash    | $0.075             | $0.30              |
| Llama 3.1 8B (local)| $0.00              | $0.00              |
```
**Action** : Calculer le cout d'un scenario RAG concret
```typescript
// cost-calculator.ts
function estimateCost(model: string, inputTokens: number, outputTokens: number): string {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o-mini':     { input: 0.15, output: 0.6 },
    'claude-sonnet-4': { input: 3,    output: 15 },
    'claude-opus-4':   { input: 15,   output: 75 },
  };

  const p = pricing[model]!;
  const cost = (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
  return `$${cost.toFixed(6)}`;
}

// Scenario RAG typique : 3000 tokens input (question + contexte), 500 tokens output
console.log('GPT-4o-mini :', estimateCost('gpt-4o-mini', 3000, 500));     // $0.000750
console.log('Claude Sonnet:', estimateCost('claude-sonnet-4', 3000, 500)); // $0.016500
console.log('Claude Opus :', estimateCost('claude-opus-4', 3000, 500));    // $0.082500

// Projection 100K requetes/mois :
// GPT-4o-mini  : $75/mois
// Claude Sonnet: $1650/mois
// Claude Opus  : $8250/mois
```
```bash
npx tsx cost-calculator.ts
```
> 100x de difference entre GPT-4o-mini et Claude Opus. Le choix du modele est LA decision financiere la plus impactante.

### [03:00-07:00] Semantic Cache : eviter les appels redondants
> Le semantic cache evite d'appeler le LLM quand une question similaire a deja ete posee. "Comment installer Node.js ?" et "Installer NodeJS comment ?" c'est la meme question — pas besoin de payer deux fois.
**Action** : Montrer le concept et l'implementation
```
Sans cache :
  "Comment installer Node.js ?"  --> LLM --> $0.003 (500ms)
  "Comment installer NodeJS ?"   --> LLM --> $0.003 (500ms)
  "Installer node js comment ?"  --> LLM --> $0.003 (500ms)
  Total : 3 appels, $0.009

Avec semantic cache :
  "Comment installer Node.js ?"  --> LLM --> $0.003 (500ms) --> CACHE
  "Comment installer NodeJS ?"   --> CACHE HIT --> $0.00 (5ms)
  "Installer node js comment ?"  --> CACHE HIT --> $0.00 (5ms)
  Total : 1 appel, $0.003 (67% d'economie)
```
**Action** : Implementer le SemanticCache
```typescript
// semantic-cache.ts (extrait)
class SemanticCache {
  private entries: CacheEntry[] = [];
  private readonly threshold = 0.92; // Seuil de similarite

  async get(question: string, embedder: Embedder): Promise<{ hit: boolean; answer?: string }> {
    const queryEmb = await embedder.embed(question);

    for (const entry of this.entries) {
      const similarity = cosineSimilarity(queryEmb, entry.embedding);
      if (similarity >= this.threshold) {
        entry.hitCount++;
        return { hit: true, answer: entry.answer };
      }
    }
    return { hit: false };
  }

  async set(question: string, answer: string, embedder: Embedder): Promise<void> {
    const embedding = await embedder.embed(question);
    this.entries.push({ question, embedding, answer, hitCount: 0, createdAt: new Date() });
  }
}
```
```bash
npx tsx semantic-cache-demo.ts
```
**Action** : Tester avec des reformulations et montrer les cache hits

### [07:00-10:00] Rate Limiting : le token bucket
> Le rate limiting protege votre budget et vos quotas. Le token bucket est l'algorithme le plus utilise : un seau se remplit a un debit constant, chaque requete consomme des tokens du seau. Seau vide = requete refusee.
**Action** : Implementer le TokenBucket
```typescript
// token-bucket.ts
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(private capacity: number, private refillRate: number) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  consume(count = 1): boolean {
    this.refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// Config typique : 100 requetes max, 2 par seconde
const limiter = new TokenBucket(100, 2);

if (!limiter.consume()) {
  return res.status(429).json({ error: 'Rate limit depasse', retryAfterMs: 500 });
}
```
> En production, on a un bucket par utilisateur. Un utilisateur qui fait 100 requetes en une minute est soit un bot, soit un bug.

### [10:00-13:30] Fallback Models : la resilience
> Que se passe-t-il si Claude est en panne ? On a besoin d'une cascade de fallback : si le modele principal echoue, on essaie le suivant.
**Action** : Montrer la cascade de modeles
```
Requete --> Claude Sonnet --timeout/erreur--> GPT-4o
                |                               |
              OK v                            erreur
            Reponse                              v
                                           GPT-4o-mini
                                                |
                                              erreur
                                                v
                                          Ollama (local)
                                                |
                                              erreur
                                                v
                                    "Service temporairement indisponible"
```
**Action** : Implementer le FallbackLLMClient
```typescript
// fallback-llm.ts (extrait)
class FallbackLLMClient {
  private models: FallbackModel[];

  async chat(messages: ChatMessage[]): Promise<{ answer: string; model: string }> {
    for (const model of this.models) {
      for (let retry = 0; retry <= model.maxRetries; retry++) {
        try {
          const answer = await this.callWithTimeout(model, messages);
          return { answer, model: model.name };
        } catch (error) {
          console.warn(`[Fallback] ${model.name} echoue : ${error.message}`);
        }
      }
    }
    throw new Error('Tous les modeles ont echoue');
  }
}

const client = new FallbackLLMClient([
  { name: 'Claude Sonnet', provider: 'anthropic', timeoutMs: 30000, priority: 1 },
  { name: 'GPT-4o', provider: 'openai', timeoutMs: 30000, priority: 2 },
  { name: 'Llama 3.1', provider: 'ollama', timeoutMs: 60000, priority: 3 },
]);
```
```bash
npx tsx fallback-demo.ts
```

### [13:30-16:00] Optimisation de la latence
> La latence perdue pour l'utilisateur est repartie : reseau (20-100ms), time to first token (200-2000ms), generation (500-5000ms). Voici les leviers.
**Action** : Afficher les strategies
```
| Strategie        | Gain latence      | Complexite | Impact qualite |
|------------------|-------------------|------------|----------------|
| Streaming        | Percu ~80% mieux  | Faible     | Aucun          |
| Modele plus petit| 2-5x plus rapide  | Nul        | Leger          |
| Prompt plus court| Proportionnel     | Faible     | Variable       |
| Semantic cache   | ~99% (cache hit)  | Moyenne    | Aucun          |
| Appels paralleles| Divise par N      | Moyenne    | Aucun          |
```
**Action** : Montrer l'optimisation du prompt
```typescript
// Avant : 850 tokens (~$0.003)
const longPrompt = `Tu es un assistant expert en developpement web.
Tu as une connaissance approfondie de JavaScript, TypeScript, React...
Tu dois toujours fournir des reponses detaillees, avec des exemples...`;

// Apres : 280 tokens (~$0.001) -- meme qualite
const shortPrompt = `Expert TS/Node/NestJS/PostgreSQL. Projet : chatbot RAG.
Question : Comment optimiser les requetes SQL ?`;

// Economie : ~67% de tokens en moins
```

### [16:00-19:00] Self-hosted vs API Cloud
> La question qui revient toujours : heberger soi-meme ou utiliser une API cloud ?
**Action** : Afficher l'arbre de decision
```
Les donnees sont-elles sensibles/reglementees ?
+-- OUI --> Self-hosted obligatoire
+-- NON v

Budget mensuel > $500/mois ?
+-- NON --> API Cloud (plus simple)
+-- OUI v

Expertise infra (DevOps, GPU) disponible ?
+-- NON --> API Cloud (cout maintenance > economies)
+-- OUI v

Qualite d'un 8B/70B suffisante ?
+-- NON --> API Cloud (Claude Opus, GPT-4o meilleurs)
+-- OUI --> Self-hosted (economies significatives)
```
```
| Critere         | Self-hosted            | API Cloud              |
|-----------------|------------------------|------------------------|
| Cout initial    | $5K-$50K (GPU)         | $0                     |
| Cout 100K req   | ~$200 (electricite)    | $100-$5000 (tokens)    |
| Qualite         | 8B ~ Haiku             | Opus/Sonnet = top tier |
| Confidentialite | Totale                 | Depend du provider     |
| Maintenance     | Elevee                 | Nulle                  |
| Scaling         | Complexe (K8s, GPU)    | Automatique            |
```

### [19:00-22:00] Monitoring en production
> En production, on monitore trois choses : les couts, la latence et le throughput. On a besoin d'un dashboard en temps reel.
**Action** : Montrer le ProductionMonitor
```typescript
// production-monitor.ts (extrait)
class ProductionMonitor {
  record(event: { model: string; inputTokens: number; outputTokens: number;
                  latencyMs: number; cached: boolean }): void {
    const cost = this.computeCost(event);
    this.events.push({ ...event, timestamp: new Date(), cost: event.cached ? 0 : cost });
  }

  printReport(hours = 24): void {
    const d = this.getDashboard(hours);
    console.log(`Requetes : ${d.totalRequests}`);
    console.log(`Cout total : $${d.totalCost.toFixed(4)}`);
    console.log(`Latence moyenne : ${d.avgLatencyMs}ms`);
    console.log(`Cache hit rate : ${(d.cacheHitRate * 100).toFixed(1)}%`);
  }
}
```
```bash
npx tsx monitor-demo.ts
```
**Action** : Montrer le rapport avec les couts par modele et la latence p95

### [22:00-23:30] Alertes de couts
> Derniere brique : les alertes automatiques quand le budget est depasse ou la latence explose.
**Action** : Montrer la configuration des alertes
```typescript
const alerts = new CostAlertManager(
  10,  // $10/jour max
  3,   // alerte si spike 3x au-dessus de la moyenne
);

const newAlerts = alerts.check(monitor);
// [CRITICAL] Budget quotidien depasse : $12.50 > $10.00
// [WARNING] Projection : $15.30/jour (80% du budget)
```

### [23:30-25:00] Recapitulatif et transition
> On a couvert tout ce qu'il faut pour la production : calcul des couts, semantic cache pour economiser 60%+, rate limiting pour proteger le budget, fallback pour la resilience, optimisation de la latence, et monitoring continu. Le dernier screencast met tout ca ensemble dans le projet final.
**Action** : Afficher le recapitulatif
```
Resume :
- Couts : $0.15 a $75/M tokens -- le choix du modele est critique
- Semantic cache : similarite cosinus, seuil 0.92, ~60% d'economie
- Rate limiting : token bucket par utilisateur
- Fallback : cascade Claude --> GPT --> Ollama --> erreur
- Latence : streaming, prompt court, modele plus petit
- Self-hosted : donnees sensibles OU budget > $500/mois + expertise
- Monitoring : couts, latence, cache hit rate, alertes
```

## Points d'attention pour l'enregistrement
- Les calculs de couts doivent etre precis — verifier les prix actuels avant
- Le semantic cache est une demo tres visuelle (montrer le cache hit en direct)
- Le fallback peut etre simule en coupant Ollama puis en le relancant
- La partie self-hosted vs cloud est une discussion, pas une demo
- Insister sur le fait que le semantic cache est le levier numero 1
- Mentionner que les prix changent souvent — toujours verifier avant de planifier
