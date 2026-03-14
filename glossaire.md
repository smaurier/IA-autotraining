# Glossaire IA pour Developpeurs JavaScript

> Reference rapide des termes utilises dans ce cours.

---

## A

**Agent IA** : Programme qui utilise un LLM pour decider quelle action executer, observer le resultat et iterer jusqu'a atteindre un objectif. Voir Module 06.

**Attention (mecanisme)** : Technique permettant au modele de ponderer l'importance relative de chaque token dans la sequence d'entree. Base de l'architecture Transformer. Voir Module 09.

**API (Application Programming Interface)** : Interface permettant d'interagir avec un LLM par programmation (ex: Anthropic Messages API, OpenAI Chat Completions). Voir Module 04.

## B

**Backpropagation** : Algorithme de calcul du gradient de l'erreur, propageant l'erreur de la sortie vers l'entree pour ajuster les poids du reseau. Voir Module 08.

**Batch** : Groupe d'exemples traites simultanement lors de l'entrainement. Le batch size affecte la vitesse et la stabilite de l'apprentissage.

**BPE (Byte Pair Encoding)** : Algorithme de tokenization qui fusionne iterativement les paires de caracteres les plus frequentes. Utilise par GPT et Claude. Voir Module 12.

## C

**Chain-of-Thought (CoT)** : Technique de prompting ou on demande au LLM de raisonner etape par etape avant de donner sa reponse finale. Voir Module 02.

**Chunk / Chunking** : Decoupage d'un document en segments plus petits pour le stockage dans une base vectorielle (RAG). Voir Module 13.

**Claude** : Famille de LLMs developpes par Anthropic. Modeles : Haiku (rapide), Sonnet (equilibre), Opus (puissant). Voir Module 04.

**Completion** : Texte genere par un LLM en reponse a un prompt. Aussi appele "output" ou "reponse".

**Context Window** : Nombre maximum de tokens qu'un LLM peut traiter en une seule requete (prompt + reponse). Ex: 200K tokens pour Claude.

**Cosine Similarity** : Mesure de similarite entre deux vecteurs basee sur l'angle entre eux. Utilisee pour comparer des embeddings. Voir Module 07.

## D

**Decoder** : Partie du Transformer qui genere le texte de sortie token par token. Les LLMs comme GPT et Claude sont des modeles "decoder-only".

**Dot Product (produit scalaire)** : Operation mathematique entre deux vecteurs. Base du calcul d'attention. Voir Module 07.

## E

**Embedding** : Representation numerique (vecteur) d'un texte dans un espace multidimensionnel. Les textes semantiquement proches ont des embeddings proches. Voir Module 12.

**Encoder** : Partie du Transformer qui encode la sequence d'entree. BERT est un modele "encoder-only".

**Epoch** : Un passage complet sur l'ensemble des donnees d'entrainement. Voir Module 10.

**Exponential Backoff** : Strategie de retry ou le delai entre les tentatives augmente exponentiellement. Voir Module 04.

## F

**Few-shot** : Technique de prompting ou on fournit quelques exemples (2-5) dans le prompt pour guider le format de reponse. Voir Module 01.

**Fine-tuning** : Entrainement supplementaire d'un modele pre-entraine sur des donnees specifiques a une tache. Voir Module 10.

**Forward Pass** : Propagation des donnees de l'entree vers la sortie a travers le reseau de neurones. Voir Module 08.

**Function Calling** : Voir Tool Use.

## G

**GGUF** : Format de fichier pour les modeles quantifies, utilise par llama.cpp et Ollama. Voir Module 11.

**Gradient** : Vecteur indiquant la direction et l'amplitude du changement de l'erreur par rapport aux poids. Utilise pour ajuster les parametres.

**Gradient Descent** : Algorithme d'optimisation qui ajuste les poids du reseau dans la direction opposee au gradient pour minimiser l'erreur.

**Guardrails** : Mecanismes de securite limitant les actions d'un agent IA (tools autorises, validation, confirmation humaine). Voir Module 06.

## H

**Hallucination** : Generation de contenu faux ou invente par le LLM, presente avec confiance. Un des risques majeurs des LLMs.

**Human-in-the-loop** : Pattern ou un humain doit approuver certaines actions de l'agent avant execution. Voir Module 06.

**Hyperparametre** : Parametre de configuration de l'entrainement (learning rate, batch size, epochs) defini avant l'entrainement, par opposition aux poids appris.

## I

**Inference** : Utilisation d'un modele entraine pour generer des predictions/reponses. Par opposition a l'entrainement.

**Input Tokens** : Tokens du prompt envoye au LLM. Factures a un tarif different des output tokens.

## J

**JSON-RPC** : Protocole de communication utilise par MCP pour les echanges entre client et serveur. Voir Module 05.

**JSON Schema** : Format de description de la structure des donnees, utilise pour definir les parametres des tools. Voir Module 04.

## K

**KV Cache** : Cache des paires Key-Value calculees lors de l'attention, evitant de recalculer pour les tokens deja traites. Optimisation majeure pour l'inference.

## L

**Learning Rate** : Hyperparametre controlant l'amplitude des ajustements de poids a chaque etape d'entrainement. Trop haut = instable, trop bas = lent.

**LLM (Large Language Model)** : Modele de langage de grande taille entraine sur de larges corpus de texte. Ex: Claude, GPT-4, Llama, Mistral.

**LoRA (Low-Rank Adaptation)** : Technique de fine-tuning qui ajoute de petites matrices d'adaptation plutot que de modifier tous les poids. Economique en memoire. Voir Module 10.

## M

**MCP (Model Context Protocol)** : Protocole ouvert cree par Anthropic standardisant la connexion entre LLMs et sources de donnees/outils externes. Voir Module 05.

**MCP Host** : Application qui heberge le client MCP (ex: Claude Desktop, VS Code). Voir Module 05.

**MCP Server** : Service qui expose des resources, tools et prompts via le protocole MCP. Voir Module 05.

**Matrice** : Tableau 2D de nombres. Les poids d'un reseau de neurones sont stockes dans des matrices. Voir Module 07.

**Max Tokens** : Limite du nombre de tokens dans la reponse du LLM. Parametre important pour controler les couts.

**Multi-head Attention** : Mecanisme ou l'attention est calculee en parallele sur plusieurs "tetes", chacune capturant des patterns differents. Voir Module 09.

## N

**Neural Network (reseau de neurones)** : Modele informatique inspire du cerveau, compose de couches de neurones connectes par des poids. Voir Module 08.

## O

**Ollama** : Outil open-source permettant d'executer des LLMs localement sur sa machine. Voir Module 11.

**One-shot** : Technique de prompting avec un seul exemple. Voir Module 01.

**Output Tokens** : Tokens generes par le LLM en reponse. Generalement plus chers que les input tokens.

**Overfitting** : Quand un modele memorise les donnees d'entrainement au lieu de generaliser. Voir Module 10.

## P

**Perceptron** : Neurone artificiel de base : somme ponderee des entrees + fonction d'activation. Voir Module 08.

**pgvector** : Extension PostgreSQL pour le stockage et la recherche de vecteurs. Utilisee pour le RAG. Voir Module 13.

**Positional Encoding** : Vecteur ajoute aux embeddings pour encoder la position de chaque token dans la sequence. Voir Module 09.

**Prompt** : Texte d'entree envoye au LLM. Peut inclure un system prompt (instructions) et un user prompt (requete).

**Prompt Injection** : Attaque ou un utilisateur tente de faire ignorer les instructions systeme du LLM. Voir Module 17.

## Q

**QLoRA** : Variante de LoRA combinee avec la quantization pour reduire encore la memoire necessaire au fine-tuning. Voir Module 10.

**Quantization** : Reduction de la precision des poids (ex: float32 → int4) pour diminuer la taille du modele et accelerer l'inference. Voir Module 11.

## R

**RAG (Retrieval-Augmented Generation)** : Architecture combinant recherche de documents et generation par LLM. Le LLM repond en se basant sur des documents retrouves. Voir Modules 13-15.

**ReAct** : Pattern agent Reasoning + Acting : le LLM pense, agit (appel d'outil), observe le resultat, et itere. Voir Module 06.

**ReLU (Rectified Linear Unit)** : Fonction d'activation f(x) = max(0, x). Simple et efficace, utilisee dans la plupart des reseaux modernes.

**Resource (MCP)** : Primitive MCP exposant des donnees lisibles par le LLM (fichiers, configs, donnees). Voir Module 05.

**ROUGE** : Metrique d'evaluation mesurant le chevauchement de n-grams entre le texte genere et une reference. Voir Module 16.

## S

**Self-Attention** : Mecanisme ou chaque token calcule son attention par rapport a tous les autres tokens de la meme sequence. Voir Module 09.

**Sigmoid** : Fonction d'activation σ(x) = 1/(1+e^(-x)) qui compresse les valeurs entre 0 et 1. Voir Module 08.

**Softmax** : Fonction qui convertit un vecteur de scores en distribution de probabilites (somme = 1). Voir Module 07.

**SSE (Server-Sent Events)** : Transport MCP pour les serveurs distants via HTTP. Voir Module 05.

**stdio** : Transport MCP par defaut pour les serveurs locaux, communication via stdin/stdout. Voir Module 05.

**Streaming** : Reception de la reponse du LLM token par token au fur et a mesure de la generation, plutot que d'attendre la reponse complete. Voir Module 04.

**System Prompt** : Instructions donnees au LLM pour definir son comportement, son role et ses contraintes. Voir Module 01.

## T

**Temperature** : Parametre controlant la creativite/aleatoire des reponses du LLM. 0 = deterministe, 1 = creatif. Voir Module 01.

**Token** : Unite de base du texte pour un LLM. Un token ≈ 3/4 d'un mot en anglais, moins en francais. Voir Module 12.

**Tokenizer** : Algorithme qui decoupe le texte en tokens. Ex: BPE, WordPiece, SentencePiece. Voir Module 12.

**Tool (MCP)** : Primitive MCP definissant une action executable par le LLM (query DB, call API). Voir Module 05.

**Tool Use** : Capacite d'un LLM a demander l'execution d'outils definis par le developpeur. Aussi appele "function calling". Voir Module 04.

**Transformer** : Architecture de reseau de neurones basee sur le mecanisme d'attention, introduite en 2017. Base de tous les LLMs modernes. Voir Module 09.

## V

**Vecteur** : Liste ordonnee de nombres. Les embeddings sont des vecteurs de haute dimension (768-3072). Voir Module 07.

**Vector Database (base vectorielle)** : Base de donnees specialisee dans le stockage et la recherche de vecteurs par similarite. Ex: pgvector, Pinecone, Chroma. Voir Module 13.

## W

**Weights (poids)** : Parametres numeriques du reseau de neurones, ajustes pendant l'entrainement pour minimiser l'erreur.

## Z

**Zero-shot** : Technique de prompting sans aucun exemple. On decrit la tache directement. Voir Module 01.
