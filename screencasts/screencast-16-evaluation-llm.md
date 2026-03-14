# Screencast 16 — Evaluation & Observabilite LLM

## Informations
- **Duree estimee** : 20-25 min
- **Module** : `modules/16-evaluation-observabilite-llm.md`
- **Lab associe** : `labs/lab-16-evaluation-observabilite/`
- **Prerequis** : Module 15 complete, chatbot RAG fonctionnel

## Setup
- [ ] Chatbot RAG du module 15 fonctionnel
- [ ] Ollama avec `llama3.1:8b` et `nomic-embed-text`
- [ ] Jeu de test de 10 questions avec reponses attendues
- [ ] Terminal et VS Code ouverts sur le dossier du lab
- [ ] `pnpm install` deja execute

## Script

### [00:00-02:30] Pourquoi evaluer un systeme LLM ?
> Avec du code classique, c'est simple : `add(2, 3)` retourne 5 ou pas. Avec un LLM, "Explique les closures" peut donner mille reponses differentes — toutes correctes ou toutes fausses. Comment savoir si votre chatbot fonctionne bien ? Il faut mesurer.
**Action** : Afficher les 3 niveaux d'evaluation
```
Niveau 1 -- OFFLINE (avant deploiement)
  Benchmarks, metriques automatiques, eval datasets
  "Le modele est-il capable ?"

Niveau 2 -- ONLINE (en production)
  A/B testing, feedback utilisateurs, taux de satisfaction
  "Les utilisateurs sont-ils contents ?"

Niveau 3 -- OBSERVABILITE (continu)
  Logs, traces, couts, latence, taux d'hallucination
  "Le systeme fonctionne-t-il correctement ?"
```

### [02:30-05:30] Metriques classiques : BLEU et ROUGE
> BLEU mesure la precision des n-grammes — combien de mots generes sont dans la reference. ROUGE mesure le rappel — combien de mots de la reference sont dans la generation. Les deux ont une limite majeure : ils comparent des mots, pas du sens.
**Action** : Implementer BLEU en TypeScript et tester
```typescript
// bleu-demo.ts (extrait)
function computeBLEU(generated: string, reference: string, maxN = 4): number {
  const genTokens = generated.toLowerCase().split(/\s+/);
  const refTokens = reference.toLowerCase().split(/\s+/);
  const precisions: number[] = [];

  for (let n = 1; n <= maxN; n++) {
    const genNgrams = extractNgrams(genTokens, n);
    const refNgrams = new Set(extractNgrams(refTokens, n));
    const matches = genNgrams.filter(ng => refNgrams.has(ng)).length;
    precisions.push(genNgrams.length > 0 ? matches / genNgrams.length : 0);
  }

  // Brevity penalty + moyenne geometrique
  const bp = genTokens.length < refTokens.length
    ? Math.exp(1 - refTokens.length / genTokens.length) : 1;
  const logAvg = precisions.reduce((s, p) => s + Math.log(Math.max(p, 1e-10)), 0) / maxN;
  return bp * Math.exp(logAvg);
}

// Test
const score = computeBLEU(
  'Le chat est assis sur le tapis',
  'Le chat se repose sur le tapis bleu'
);
console.log(`BLEU: ${(score * 100).toFixed(1)}%`); // ~45%
```
```bash
npx tsx bleu-demo.ts
```
> "Le felin se repose" et "Le chat dort" ont un faible BLEU mais le meme sens. C'est pourquoi on utilise aussi le LLM-as-judge.

### [05:30-09:00] LLM-as-Judge : le standard de l'industrie
> L'idee : utiliser un LLM pour evaluer la sortie d'un autre LLM. On lui donne la question, la reponse, et des criteres — il note de 1 a 5 avec justification.
**Action** : Implementer le LLM-as-Judge
```typescript
// judge-demo.ts
async function llmAsJudge(question: string, answer: string): Promise<JudgeResult> {
  const prompt = `Evalue la qualite de cette reponse.

Question : ${question}
Reponse : ${answer}

Criteres (note de 1 a 5) :
1. Exactitude : factuellement correcte ?
2. Completude : couvre tous les aspects ?
3. Clarte : bien structuree ?
4. Pertinence : repond a la question ?
5. Concision : pas de digressions ?

Reponds en JSON : {"exactitude": X, "completude": X, "clarte": X,
"pertinence": X, "concision": X, "score_global": X, "justification": "..."}`;

  const response = await llm.chat([
    { role: 'system', content: 'Evaluateur. JSON uniquement.' },
    { role: 'user', content: prompt },
  ]);

  return JSON.parse(response);
}
```
```bash
npx tsx judge-demo.ts
```
**Action** : Montrer le score et la justification
> L'avantage du LLM-as-judge : il comprend le SENS, pas juste les mots. L'inconvenient : il a ses propres biais.

### [09:00-13:00] Metriques RAG : les 4 piliers
> Pour un RAG specifiquement, on mesure 4 choses : la fidelite au contexte, la pertinence de la reponse, la precision du contexte, et le recall du contexte.
**Action** : Afficher les 4 metriques et leur calcul
```
Question --> Retrieval --> Contexte --> LLM --> Reponse

Context Precision : Les chunks recuperes sont-ils pertinents ?
  = Chunks pertinents / Total chunks recuperes

Context Recall : A-t-on trouve tous les chunks necessaires ?
  = Chunks pertinents trouves / Total pertinents existants

Faithfulness : La reponse est-elle fidele au contexte ?
  = Affirmations supportees / Total affirmations

Answer Relevancy : La reponse repond-elle a la question ?
  = Similarite cosinus(question, questions-generees-depuis-reponse)
```
**Action** : Executer l'evaluation sur le chatbot du module 15
```typescript
// rag-eval.ts
const evaluator = new RAGEvaluator(llm, embedder);

const result = await evaluator.evaluate({
  question: 'Comment creer un module NestJS ?',
  answer: ragAnswer,
  contexts: retrievedChunks,
  reference: 'Un module se cree avec @Module() decorator...',
});

console.log(`Faithfulness: ${result.faithfulness.toFixed(2)}`);
console.log(`Relevancy:    ${result.answerRelevancy.toFixed(2)}`);
console.log(`Precision:    ${result.contextPrecision.toFixed(2)}`);
console.log(`Recall:       ${result.contextRecall.toFixed(2)}`);
```
```bash
npx tsx rag-eval.ts
```

### [13:00-16:00] Detection d'hallucinations
> L'hallucination est le risque principal d'un RAG. Le LLM invente des faits, des URLs, des numeros de version qui n'existent pas dans le contexte.
**Action** : Montrer les types d'hallucinations
```
Types d'hallucinations :
| Type           | Exemple                                    |
|----------------|-------------------------------------------|
| Factuelle      | "TypeScript cree en 2005" (faux : 2012)   |
| Attribution    | "Selon la doc..." (la doc ne dit pas ca)  |
| Contradiction  | Le contexte dit X, la reponse dit Y       |
| Fabrication    | URLs, versions, noms de fonctions fictifs  |
```
**Action** : Montrer le detecteur d'hallucinations
```typescript
async function detectHallucinations(answer: string, contexts: string[]): Promise<HallucinationCheck> {
  const response = await llm.chat([{
    role: 'user',
    content: `Contexte : ${contexts.join('\n---\n')}
Reponse a verifier : ${answer}
Identifie les hallucinations. JSON : {"hallucinations": [...], "supported_claims": N, "total_claims": N}`,
  }]);

  const parsed = JSON.parse(response);
  return {
    isHallucinated: parsed.hallucinations.length > 0,
    confidence: 1 - (parsed.supported_claims / Math.max(parsed.total_claims, 1)),
    hallucinations: parsed.hallucinations,
  };
}
```

### [16:00-19:30] Observabilite : tracer chaque requete
> En production, il faut tracer chaque requete : combien de temps pour l'embedding, le retrieval, la generation ? Combien de tokens consommes ? Quel cout ?
**Action** : Implementer le LLMLogger
```typescript
// llm-logger.ts (extrait)
class LLMLogger {
  async trace<T>(traceId: string, spanType: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const durationMs = Math.round(performance.now() - start);

      this.logs.push({ traceId, spanType, durationMs, timestamp: new Date() });
      return result;
    } catch (error) {
      this.logs.push({ traceId, spanType, durationMs: 0, error: true });
      throw error;
    }
  }
}

// Utilisation dans le pipeline RAG
const traceId = `trace-${Date.now()}`;
const embedding = await logger.trace(traceId, 'embedding', () => embedder.embed(question));
const chunks = await logger.trace(traceId, 'retrieval', () => store.search(embedding, 5));
const answer = await logger.trace(traceId, 'generation', () => llm.chat(messages));
```
**Action** : Montrer le dashboard de metriques
```
=== Rapport LLM (24h) ===
Requetes totales : 142
Cout total : $0.4250
Latence moyenne : 2340ms
Tokens : 45000 in / 18000 out

Par etape :
  embedding  : avg 45ms
  retrieval  : avg 12ms
  generation : avg 2280ms   <-- le bottleneck
```

### [19:30-22:00] Langfuse : observabilite open source
> Langfuse est une plateforme open source qui fait tout ca avec un dashboard web. On peut la self-hoster en Docker ou utiliser la version cloud.
**Action** : Montrer l'architecture Langfuse
```
Votre Application
  +-- Langfuse SDK
  |   - Traces (chaque requete utilisateur)
  |   - Spans (etapes : embedding, retrieval, generation)
  |   - Generations (appels LLM)
  |   - Scores (evaluation automatique)
  |
  v HTTPS
Langfuse Server (self-hosted ou cloud)
  - Dashboard (latence, cout, scores)
  - Traces explorer
  - Prompt management
```
> L'alternative proprietaire est Langsmith (de LangChain) — plus complet mais cloud uniquement.

### [22:00-25:00] Alerting et recapitulatif
> Derniere brique : les alertes. On configure des seuils sur la latence, le cout, les hallucinations et le taux d'erreur. Si un seuil est depasse, on alerte.
**Action** : Montrer la configuration des alertes
```typescript
const alertConfig = {
  latencyWarningMs: 5000,     // Warning au-dessus de 5s
  latencyCriticalMs: 15000,   // Critique au-dessus de 15s
  costDailyLimit: 10,         // $10/jour max
  hallucinationThreshold: 0.2, // 20% max d'hallucinations
  errorRateThreshold: 0.05,   // 5% max d'erreurs
};
```
**Action** : Afficher le recapitulatif
```
Resume :
- BLEU/ROUGE : metriques textuelles (mots, pas le sens)
- LLM-as-Judge : evaluation semantique, standard industrie
- 4 metriques RAG : faithfulness, relevancy, precision, recall
- Hallucinations : detection automatique par contexte
- Observabilite : traces, latence, couts, tokens
- Langfuse : dashboard open source self-hosted
- Alerting : seuils sur latence, couts, hallucinations, erreurs
```

## Points d'attention pour l'enregistrement
- Avoir le chatbot du module 15 fonctionnel pour les demos d'evaluation
- Preparer un jeu de 5 questions avec reponses de reference
- Le LLM-as-Judge necessite un modele de bonne qualite (llama3.1:8b minimum)
- La partie Langfuse peut etre montree avec des captures d'ecran si pas installe
- Insister sur le fait que mesurer AVANT d'optimiser est la cle
- La detection d'hallucinations est le point qui interesse le plus les stagiaires
