# Screencast 00 — Prerequis et paysage de l'IA

## Informations
- **Duree estimee** : 8-10 min
- **Module** : `modules/00-prerequis-paysage-ia.md`
- **Lab associe** : `labs/lab-00-premier-appel-llm/`
- **Prerequis** : Aucun

## Setup
- [ ] Node.js >= 20 installe et verifie (`node -v`)
- [ ] Cle API Anthropic ou OpenAI configuree dans `.env`
- [ ] Terminal ouvert avec le dossier du lab
- [ ] Slides "Paysage IA 2025-2026" pretes
- [ ] Navigateur ouvert sur chat.openai.com et claude.ai

## Script

### [00:00-02:00] Introduction et contexte historique
> Bienvenue dans ce premier screencast du cours IA. On va commencer par un tour d'horizon rapide : d'ou vient l'IA, ou en est-on aujourd'hui, et surtout qu'est-ce que ca change concretement pour nous, developpeurs.
**Action** : Afficher la slide chronologique (1950 Turing -> 2017 Transformers -> 2022 ChatGPT -> 2025 Agents)
```
Timeline:
1950 - Test de Turing
2017 - "Attention Is All You Need" (Transformers)
2022 - ChatGPT (GPT-3.5)
2023 - GPT-4, Claude 2, Llama 2
2024 - Claude 3.5, GPT-4o, Llama 3
2025 - Claude 4, agents autonomes, MCP
```

### [02:00-04:00] Les familles de modeles
> Il y a trois grandes familles de modeles qu'on va manipuler dans ce cours. Les LLM, les modeles d'embedding, et les modeles multimodaux. Voyons ce qui les distingue.
**Action** : Afficher le schema des familles de modeles
```
LLM (Large Language Models)
  - Texte -> Texte
  - Exemples : Claude, GPT, Llama, Mistral

Modeles d'embedding
  - Texte -> Vecteur numerique
  - Exemples : text-embedding-3-small, all-MiniLM-L6-v2

Modeles multimodaux
  - Image/Audio/Video + Texte -> Texte
  - Exemples : Claude 3.5 Sonnet (vision), GPT-4o
```

### [04:00-06:00] Open source vs proprietaire
> Question critique : faut-il utiliser un modele proprietaire ou open source ? La reponse, comme souvent, c'est "ca depend". Regardons les criteres de choix.
**Action** : Montrer le tableau comparatif dans les slides
```
| Critere         | Proprietaire (Claude, GPT) | Open Source (Llama, Mistral) |
|-----------------|---------------------------|------------------------------|
| Performance     | SOTA                      | Tres bon, en progression     |
| Cout            | Pay-per-token             | Infra a gerer               |
| Confidentialite | Donnees envoyees          | 100% local possible          |
| Personnalisation| Limitee                   | Fine-tuning complet          |
| Maintenance     | Zero                      | A votre charge               |
```

### [06:00-08:30] Premier appel a un LLM
> Assez de theorie, passons a la pratique. On va faire notre tout premier appel a un LLM depuis le terminal. Rien de complique, juste un script Node.js de quelques lignes.
**Action** : Ouvrir le terminal, naviguer vers le dossier du lab, creer le fichier
```typescript
// premier-appel.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // lit ANTHROPIC_API_KEY depuis .env

const message = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 256,
  messages: [
    { role: "user", content: "Explique-moi ce qu'est un LLM en 3 phrases." }
  ],
});

console.log(message.content[0].text);
```
**Action** : Executer le script et montrer la reponse
```bash
npx tsx premier-appel.ts
```

### [08:30-10:00] Recapitulatif et transition
> On a couvert le paysage global de l'IA, les familles de modeles, le debat open source vs proprietaire, et surtout on a fait notre premier appel API. Dans le prochain screencast, on va plonger dans le prompting — l'art de bien parler aux LLM.
**Action** : Afficher le recapitulatif et le lien vers le lab complet

## Points d'attention pour l'enregistrement
- Garder un rythme soutenu sur la partie historique, ne pas s'attarder
- Montrer la reponse du LLM en entier, laisser 2-3 secondes de lecture
- Verifier que la cle API est bien masquee dans le terminal
- Mentionner que les couts seront detailles dans le screencast 18
