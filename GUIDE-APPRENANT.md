# Guide de l'apprenant -- Intelligence Artificielle pour devs

> **Ce guide est ta boussole.** Ce cours ne fait pas de toi un chercheur en IA.
> Il fait de toi un dev qui sait UTILISER, COMPRENDRE, et CONSTRUIRE avec l'IA.
> Trois verbes, trois phases, dans cet ordre.
>
> **Temps estime** : ~130-170h (4-5 mois a 8-10h/semaine)
>
> **Philosophie** : L'IA n'est pas de la magie. C'est des maths, du code, et des choix
> d'ingenierie. Ce cours demystifie tout ca. Tu n'as pas besoin d'un doctorat --
> tu as besoin de comprendre assez pour prendre de bonnes decisions.

---

## Avant de commencer -- Auto-diagnostic

### Programmation -- le socle

- [ ] Tu es a l'aise en JavaScript/TypeScript ou Python
- [ ] Tu sais faire des appels HTTP (fetch, axios)
- [ ] Tu sais lire et manipuler du JSON
- [ ] Tu comprends les bases de l'async (Promises, callbacks)
- [ ] Tu as deja utilise npm/pip pour installer des packages

**5/5** -> Tu es pret. Attaque le module 00.
**3-4/5** -> Ca ira. Les exemples sont en JS/TS et Python, tu t'adapteras.
**< 3/5** -> Fais d'abord un cours de programmation de base. L'IA sans code, c'est de la theorie.

### IA -- ou en es-tu ?

- [ ] Tu as deja utilise ChatGPT, Claude, ou un autre LLM
- [ ] Tu as deja utilise un assistant code (Copilot, Claude Code, Cursor)
- [ ] Tu as deja appele une API LLM (OpenAI, Anthropic, etc.)
- [ ] Tu sais ce qu'est un embedding (meme vaguement)
- [ ] Tu sais ce qu'est un transformer (meme vaguement)

**5/5** -> Tu peux survoler la Phase 1 et attaquer la Phase 2 directement.
**3-4/5** -> Commence a la Phase 1 mais tu iras vite sur les modules 00-03.
**0-2/5** -> Parfait. La Phase 1 est concue pour toi. Zero prerequis en IA.

### Maths -- pas de panique

- [ ] Tu sais ce qu'est une matrice (meme vaguement)
- [ ] Tu comprends le concept de probabilite
- [ ] Tu as deja vu une fonction de perte (loss function)
- [ ] Tu sais ce qu'est une derivee (meme si c'etait au lycee)

**4/4** -> Le module 07 (maths) sera une revision rapide.
**2-3/4** -> Normal. Le module 07 explique tout ce dont tu as besoin, pas plus.
**0-1/4** -> Ne panique pas. On n'est pas dans un master de maths. Le cours explique les maths necessaires avec des analogies et du code, pas des theoremes.

### Le test decisif

Quelqu'un te demande : "Explique comment fonctionne ChatGPT en 3 phrases."
- Si tu parles de transformer, tokens, attention, et next-token prediction -> Phase 2.
- Si tu dis "c'est un modele de langage qui predit le prochain mot" -> Phase 1, mais tu as la bonne intuition.
- Si tu dis "aucune idee, c'est de la magie" -> Phase 1, et c'est exactement pour ca que ce cours existe.

---

## Les 3 phases de ta progression

### Phase 1 -- Utiliser l'IA (modules 00-06) ~40-55h

> **Objectif** : Devenir un utilisateur expert de l'IA. Prompting, assistants code,
> API, MCP, agents. Tu ne construis pas encore -- tu apprends a piloter.
>
> **Analogie** : Avant de construire une voiture, apprends a conduire.
> Et pas juste "tourner le volant" -- conduire efficacement, connaitre les raccourcis,
> maitriser les outils du tableau de bord.

| Module | Sujet | Temps | Note |
|---|---|---|---|
| 00 | Prerequis et paysage IA | 2h | La carte du territoire -- LLMs, modeles, acteurs |
| 01 | Prompting fondamental | 3h | Zero-shot, few-shot, chain of thought, structured output |
| 02 | Prompting avance | 4h | **Cours cle** -- system prompts, personas, techniques avancees |
| 03 | Assistants code | 3h | Copilot, Claude Code, Cursor -- les utiliser vraiment |
| 04 | API Claude/OpenAI | 4h | **Cours cle** -- appeler un LLM par code, streaming, function calling |
| 05 | MCP (Model Context Protocol) | 3h | Connecter un LLM a des outils externes |
| 06 | Agents et orchestration | 4h | Agents autonomes, chaines, orchestration multi-etapes |

**Conseil** : Le module 02 (prompting avance) est celui qui a le meilleur ROI au quotidien.
Un bon prompt vaut 10x un prompt moyen. Pratique avec ton LLM prefere EN MEME TEMPS
que tu lis le cours -- chaque technique doit etre testee immediatement.

**Checkpoint Phase 1** :
- [ ] Tu sais ecrire un prompt avec des instructions claires, des exemples, et un format de sortie
- [ ] Tu sais utiliser chain-of-thought pour les problemes complexes
- [ ] Tu sais appeler l'API Claude ou OpenAI avec streaming et function calling
- [ ] Tu sais ce qu'est MCP et comment connecter un LLM a un outil (BDD, API, fichiers)
- [ ] Tu sais ce qu'est un agent et la difference avec un simple appel d'API

> **Test** : "Ton prompt retourne des resultats inconsistants. Que fais-tu ?"
> Si tu parles de baisser la temperature, d'ajouter des exemples (few-shot),
> de structurer la sortie en JSON, et de separer les instructions du contexte, c'est bon.

---

### Phase 2 -- Comprendre l'IA (modules 07-12) ~40-55h

> **Objectif** : Comprendre ce qui se passe SOUS le capot.
> Maths essentielles, reseaux de neurones, transformers, fine-tuning,
> tokenization, embeddings. Tu passes de "j'utilise" a "je comprends".
>
> **Analogie** : Tu sais conduire. Maintenant tu ouvres le capot pour comprendre
> le moteur. Pas pour devenir mecanicien, mais pour savoir quand ca surchauffe
> et pourquoi.

| Module | Sujet | Temps | Note |
|---|---|---|---|
| 07 | Maths essentielles | 4h | Vecteurs, matrices, softmax, backprop -- le strict minimum |
| 08 | Neural network from scratch | 5h | **Cours cle** -- construire un reseau de neurones a la main |
| 09 | Transformer et attention | 5h | **Cours cle** -- LE mecanisme qui a tout change |
| 10 | Entrainement et fine-tuning | 4h | Pre-training, SFT, RLHF, LoRA, QLoRA |
| 11 | Ollama et LLMs locaux | 3h | Faire tourner un LLM sur ta machine |
| 12 | Tokenization et embeddings | 4h | **Cours cle** -- comment le texte devient des nombres |

**Attention** : Le module 08 (neural network from scratch) est le plus dur du cours.
C'est aussi le plus formateur. Prends 2-3 sessions pour le faire, pas une seule.
L'objectif n'est pas de memoriser les formules -- c'est de comprendre le FLUX :
input -> forward pass -> loss -> backward pass -> update.

**Conseil** : Le module 12 (embeddings) est crucial pour la Phase 3 (RAG).
Si tu ne comprends pas ce qu'est un embedding, le RAG restera magique.
Un embedding, c'est juste un point dans un espace a N dimensions. C'est tout.

**Checkpoint Phase 2** :
- [ ] Tu sais expliquer ce qu'est un vecteur et un produit scalaire (dot product)
- [ ] Tu sais dessiner le flux forward/backward d'un reseau de neurones simple
- [ ] Tu sais expliquer le mecanisme d'attention en termes simples (Query, Key, Value)
- [ ] Tu sais ce qu'est le fine-tuning et quand il est preferable au prompting
- [ ] Tu sais ce qu'est un token, un embedding, et pourquoi la taille du contexte compte
- [ ] Tu sais faire tourner un LLM local avec Ollama

> **Test** : "Pourquoi les LLMs hallucinent ?"
> Si tu reponds que le modele predit le token le plus probable et non le plus vrai,
> qu'il n'a pas de notion de "verite" mais de "vraisemblance statistique", c'est bon.

---

### Phase 3 -- Construire avec l'IA (modules 13-19 + bonus) ~50-65h

> **Objectif** : Construire des applications qui UTILISENT l'IA.
> RAG, chatbots, evaluation, securite, production, couts.
> Tu passes de "je comprends" a "je livre en production".
>
> **Analogie** : Tu sais conduire et tu comprends le moteur.
> Maintenant tu concois des vehicules pour d'autres personnes.

| Module | Sujet | Temps | Note |
|---|---|---|---|
| 13 | RAG fondamental | 4h | **Cours cle** -- retrieval-augmented generation, le pattern numero 1 |
| 14 | RAG avance | 5h | Chunking, re-ranking, hybrid search, evaluation |
| 15 | Chatbot RAG | 4h | Construire un chatbot avec memoire et sources |
| 16 | Evaluation et observabilite LLM | 4h | **Cours cle** -- mesurer la qualite, tracer les appels |
| 17 | Securite et ethique | 3h | Prompt injection, data leakage, biais, RGPD |
| 18 | Production et couts | 4h | Latence, caching, fallbacks, estimation de couts |
| 19 | Projet final | 8h+ | Une application IA complete de A a Z |
| 20 | Agentic frameworks | 4h | LangChain, LlamaIndex, CrewAI -- quand les utiliser |

**Conseil** : Le RAG (13-14) est LE pattern que tu utiliseras le plus en production.
C'est simple en concept (chercher des docs pertinents, les injecter dans le contexte),
mais plein de subtilites en pratique (chunking, overlap, re-ranking).
Prends le temps de construire un RAG qui marche BIEN, pas juste un qui marche.

**Attention** : Le module 16 (evaluation) est souvent neglige mais il est CRUCIAL.
Un LLM sans evaluation, c'est un deployement a l'aveugle.
Tu ne deploies pas une API sans monitoring -- ne deploie pas un LLM sans eval.

**Checkpoint Phase 3** :
- [ ] Tu sais construire un pipeline RAG complet (ingestion, chunking, embedding, retrieval, generation)
- [ ] Tu sais evaluer la qualite d'un RAG (faithfulness, relevance, answer correctness)
- [ ] Tu sais construire un chatbot avec historique de conversation et sources citees
- [ ] Tu sais identifier et mitiguer les risques de prompt injection
- [ ] Tu sais estimer le cout d'un appel LLM et optimiser (caching, modeles plus petits)
- [ ] Tu as termine le projet final avec une app IA deployable

> **Test** : "Un utilisateur dit que ton chatbot RAG donne des reponses fausses. Par ou tu commences ?"
> Si tu reponds "verifier les chunks recuperes (retrieval quality), puis la fidelite de la reponse
> au contexte (faithfulness), puis le prompt systeme", c'est bon.

---

## Quand tu bloques

### "Je ne comprends pas les maths (module 07-08)"
1. Ne memorise pas les formules. Comprends le FLUX : donnee -> transformation -> erreur -> correction
2. Utilise un notebook Python/JS et execute chaque etape une par une
3. Visualise : un vecteur est une fleche, un dot product mesure "a quel point deux fleches pointent dans la meme direction"
4. Si la backpropagation te perd, pense a une chaine de dominos : chaque couche pousse la suivante

### "Mon RAG retourne des reponses hors sujet"
1. Verifie tes chunks : sont-ils trop grands ? trop petits ? Le bon chunking est le plus important
2. Verifie la qualite de tes embeddings : le modele d'embedding comprend-il ton domaine ?
3. Ajoute un re-ranker entre le retrieval et la generation
4. Verifie ton prompt systeme : dit-il au LLM de NE repondre QUE a partir du contexte fourni ?

### "L'API LLM retourne des erreurs"
1. Rate limiting : ajoute un retry avec backoff exponentiel
2. Timeout : les LLMs sont lents, mets un timeout genereux (30-60s)
3. Token limit : ton prompt + le contexte depasse la fenetre ? Reduis le contexte
4. Streaming : si la reponse est longue, utilise le streaming pour ne pas timeout

### "Mon prompt ne donne pas le resultat voulu"
1. Sois plus explicite : le LLM ne lit pas dans tes pensees
2. Ajoute des exemples (few-shot) : montre ce que tu veux, ne le decris pas seulement
3. Decompose : un prompt qui fait 5 choses echouera. Fais 5 appels simples
4. Baisse la temperature pour de la precision, monte-la pour de la creativite
5. Change de modele : certains sont meilleurs pour certaines taches

### "Le cout de l'API LLM explose"
1. Cache les reponses identiques ou similaires (semantic caching)
2. Utilise un modele plus petit pour les taches simples (classification, extraction)
3. Reduis la taille du contexte : envoie moins de chunks, filtre mieux
4. Pre-filtre avec un embedding search avant d'appeler le LLM
5. Mets des limites : max tokens en sortie, rate limiting par utilisateur

### "Je ne sais pas si mon LLM marche bien"
1. Definis des metriques AVANT de deployer : precision, recall, faithfulness
2. Cree un jeu de test de 50-100 questions/reponses attendues
3. Automatise l'evaluation avec un LLM-as-a-judge (module 16)
4. Monitore en production : log chaque appel, chaque score, chaque feedback utilisateur

---

## Auto-evaluation globale

**Apres Phase 1** : "Comment tu utiliserais un LLM pour generer des emails personnalises ?"
-> Si tu parles de system prompt avec le ton souhaite, de variables dans le user prompt,
de few-shot avec des exemples d'emails, et de validation avant envoi, c'est bon.

**Apres Phase 2** : "Pourquoi un LLM de 7B parametres est moins bon qu'un 70B ?"
-> Si tu parles de capacite de representation, de compression de la connaissance,
et que tu nuances avec "pas toujours, ca depend de la tache et du fine-tuning", c'est bon.

**Apres Phase 3** : "Tu dois construire un assistant interne qui repond aux questions sur la doc de l'entreprise. Architecture ?"
-> Si tu decris un pipeline RAG (ingestion docs -> chunking -> embeddings -> vector store -> retrieval -> LLM -> reponse avec sources), avec evaluation et monitoring, c'est bon.

---

## Rythme recommande

| Rythme | Par semaine | Duree totale |
|---|---|---|
| **Decouverte** (curiosite) | 5-6h | 6-7 mois |
| **Regulier** (objectif pro) | 8-10h | 4-5 mois |
| **Intensif** (reconversion IA) | 12-15h | 2-3 mois |

### Conseils concrets

- **Phase 1 : 3-4 semaines.** Le prompting s'apprend vite si tu pratiques en parallele du cours.
- **Phase 2 : 4-5 semaines. Le module 08 (neural net) merite une semaine entiere.** Ne le bacle pas.
- **Phase 3 : 4-6 semaines. Le RAG (13-15) est le coeur.** Prends ton temps.
- **Le projet final (19) vaut 2-3 semaines.** C'est ton portfolio IA.
- **Pratique chaque concept immediatement.** Ouvre un notebook, appelle l'API, teste un prompt.
- **Les modules sont sequentiels.** Ne saute pas le module 12 (embeddings) pour aller directement au RAG.

### L'erreur classique

Ne fais PAS ca : utiliser LangChain/LlamaIndex (module 20) AVANT de comprendre
ce que ces frameworks font sous le capot (modules 13-18).
Un framework cache la complexite -- c'est bien en production, c'est terrible pour apprendre.
Construis d'abord a la main, puis utilise le framework.

---

## Ressources complementaires

### References essentielles
- [Documentation Anthropic](https://docs.anthropic.com/) -- API Claude, prompting guide
- [Documentation OpenAI](https://platform.openai.com/docs/) -- API, cookbook, best practices
- [Ollama](https://ollama.ai/) -- LLMs locaux, gratuit

### Pour approfondir
- [3Blue1Brown -- Neural Networks](https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi) -- les meilleures visualisations
- *Build a Large Language Model (From Scratch)* (Sebastian Raschka) -- pour aller au fond
- [Hugging Face Course](https://huggingface.co/learn) -- NLP et transformers, gratuit
- [Prompt Engineering Guide](https://www.promptingguide.ai/) -- reference prompting

### Outils a installer
- **Ollama** -- pour les LLMs locaux (Phase 2, module 11)
- **Un notebook** (Jupyter ou VS Code notebooks) -- pour les modules 07-08
- **Une cle API** (Claude ou OpenAI) -- pour les modules 04-06 et toute la Phase 3

---

## Et apres ?

Tu as fini les 20 modules ? Tu es desormais un dev qui maitrise l'IA -- pas un data scientist,
mais quelqu'un qui sait construire, evaluer, et deployer des applications IA en production.

Prochaines etapes :
1. **Construis un projet RAG reel** -- sur tes propres donnees, deploye, avec monitoring
2. **Explore les agents** -- le module 20 (agentic frameworks) ouvre la porte
3. **Combine avec tes autres competences** -- NestJS + RAG, Vue + chatbot, PostgreSQL + pgvector
4. **Suis l'actualite** -- l'IA bouge vite. Lis Hugging Face, Anthropic blog, et arxiv (les papiers importants)
5. **Contribue** -- ecris un article, donne un talk, partage ce que tu as appris
