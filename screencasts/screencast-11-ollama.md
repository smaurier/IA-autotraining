# Screencast 11 — Ollama et LLMs Locaux

## Informations
- **Duree estimee** : 20-25 min
- **Module** : `modules/11-ollama-llms-locaux.md`
- **Lab associe** : `labs/lab-11-ollama-local/`
- **Prérequis** : Modules 00-10 completes, GPU recommande (8 Go+ VRAM)

## Setup
- [ ] Ollama installe et fonctionnel (`ollama --version`)
- [ ] Terminal ouvert
- [ ] Editeur VS Code avec le dossier du lab
- [ ] `nvidia-smi` ou équivalent pret (si GPU)
- [ ] Connexion Internet (pour le pull initial des modèles)

## Script

### [00:00-02:30] Pourquoi exécuter un LLM en local ?
> Jusqu'ici, on a utilise des APIs cloud — Claude, OpenAI. C'est pratique, mais il y a des cas où vous DEVEZ exécuter en local : donnees medicales ou juridiques, code source proprietaire, prototypage sans frais, ou tout simplement en avion sans WiFi. On va voir comment faire avec Ollama.
**Action** : Afficher le tableau comparatif local vs cloud
```
Local vs API Cloud :
| Critere         | API Cloud (Claude, GPT) | Local (Ollama)          |
|-----------------|-------------------------|-------------------------|
| Confidentialite | Donnees envoyees        | 100% sur votre machine  |
| Cout            | Pay-per-token           | 0 euro (electricite)    |
| Offline         | Impossible              | Fonctionne sans reseau  |
| Qualite         | SOTA (meilleurs modeles)| Bonne, en progression   |
| Maintenance     | Zero                    | A votre charge          |
```

### [02:30-05:00] Installation et premier modèle
> L'installation d'Ollama est triviale. Sur Mac c'est brew, sur Linux un script curl, sur Windows un installer. Une fois installe, on telecharge un modèle et on le teste en une ligne.
**Action** : Ouvrir le terminal et installer Ollama
```bash
# Verifier l'installation
ollama --version

# Verifier que le serveur tourne
curl http://localhost:11434
# "Ollama is running"

# Telecharger Llama 3.1 8B (4.7 Go en Q4)
ollama pull llama3.1:8b

# Premier test !
ollama run llama3.1:8b "Bonjour, explique-moi ce qu'est TypeScript en 2 phrases."
```
**Action** : Montrer la réponse et le temps de génération

### [05:00-08:00] Catalogue des modèles et choix selon le GPU
> Ollama donne acces a des dizaines de modèles. Le choix depend de votre GPU — plus exactement de la VRAM. Voici le guide de selection.
**Action** : Afficher l'arbre de decision GPU/modèle
```
Votre GPU a combien de VRAM ?
|
+-- 4-6 Go (GTX 1660, RTX 3060 6Go)
|   --> Phi-3 Mini (3.8B) ou Gemma 2 2B
|
+-- 8 Go (RTX 3060 Ti, RTX 4060)
|   --> Llama 3.1 8B Q4 ou Mistral 7B Q4
|
+-- 12-16 Go (RTX 4070, RTX 3090)
|   --> Llama 3.1 8B Q8 ou DeepSeek Coder V2 16B Q4
|
+-- 24 Go (RTX 4090)
|   --> Gemma 2 27B Q4 ou Mixtral 8x7B Q4
```
**Action** : Lister les modèles installes et en telecharger un second
```bash
ollama list

# Telecharger un modele specialise code
ollama pull deepseek-coder-v2:16b

# Comparer les reponses
ollama run deepseek-coder-v2:16b "Ecris une fonction TypeScript qui inverse un tableau generique."
```

### [08:00-11:00] Quantization : comprendre Q4, Q8, F16
> Vous avez vu "Q4" dans les noms de modèles. C'est la quantization — on compresse les poids du modèle pour qu'il tienne en mémoire. Moins de bits = plus petit mais moins précis.
**Action** : Afficher le schema de quantization
```
Q4_K_M --> Quantization 4-bit, methode K-quant, taille Medium
|  |  |
|  |  +-- S=Small (plus compresse), M=Medium (recommande), L=Large
|  +---- K = k-quant (meilleure methode)
+------- 4 = nombre de bits par poids

Impact sur Llama 3.1 8B :
| Format  | Taille | VRAM   | Qualite |
|---------|--------|--------|---------|
| F16     | 16 Go  | ~16 Go | ~100%   |
| Q8_0    | 8.5 Go | ~9 Go  | ~99%    |
| Q4_K_M  | 4.7 Go | ~5 Go  | ~96%    | <-- Sweet spot
| Q2_K    | 2.7 Go | ~3 Go  | ~82%    |
```
> La regle d'or : Q4_K_M perd environ 3% de qualite pour 70% de compression. C'est le sweet spot pour la plupart des usages locaux.

### [11:00-14:30] L'API REST Ollama depuis TypeScript
> Ollama expose une API REST sur localhost:11434. On va l'appeler depuis TypeScript — d'abord une completion simple, puis une conversation multi-tours.
**Action** : Créer le fichier `ollama-chat.ts` et l'exécuter
```typescript
// ollama-chat.ts
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function chat(messages: ChatMessage[]): Promise<string> {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.1:8b',
      messages,
      stream: false,
    }),
  });

  const data = await response.json();
  return data.message.content;
}

// Test
const reply = await chat([
  { role: 'system', content: 'Tu es un expert TypeScript. Reponds en francais.' },
  { role: 'user', content: "Qu'est-ce qu'un type guard ?" },
]);
console.log(reply);
```
```bash
npx tsx ollama-chat.ts
```
**Action** : Montrer la réponse, puis ajouter le streaming

### [14:30-17:30] Streaming et mesure de performance
> En mode streaming, on recoit les tokens un par un — exactement comme ChatGPT. Profitons-en pour mesurer les tokens par seconde.
**Action** : Créer `ollama-stream.ts`
```typescript
// ollama-stream.ts
async function streamChat(prompt: string): Promise<void> {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.1:8b',
      prompt,
      stream: false,
      options: { temperature: 0.7, num_predict: 256 },
    }),
  });

  const data = await response.json();
  const tokPerSec = data.eval_count / (data.eval_duration / 1e9);

  console.log(data.response);
  console.log(`\n--- ${data.eval_count} tokens en ${(data.eval_duration / 1e9).toFixed(1)}s = ${tokPerSec.toFixed(1)} tok/s ---`);
}

await streamChat('Ecris une fonction debounce en TypeScript avec les types generiques.');
```
```bash
npx tsx ollama-stream.ts
```
**Action** : Montrer le résultat avec la vitesse en tokens/seconde
> Le seuil de confort est environ 15 tokens par seconde — c'est suffisant pour lire en temps réel. En dessous, c'est utilisable mais un peu lent.

### [17:30-20:30] Modelfile : personnaliser un modèle
> On peut créer des modèles custom avec un Modelfile. C'est comme un Dockerfile mais pour les LLMs — on choisit un modèle de base, on ajoute un system prompt permanent, et on fixe les paramètres.
**Action** : Créer et utiliser un Modelfile
```dockerfile
# Modelfile.reviewer
FROM llama3.1:8b

SYSTEM """Tu es un code reviewer senior TypeScript. Pour chaque code soumis :
1. Identifie les bugs potentiels
2. Suggere des ameliorations de typage
3. Verifie les bonnes pratiques
4. Propose une version amelioree
Reponds toujours en francais."""

PARAMETER temperature 0.2
PARAMETER num_predict 2048
```
```bash
# Creer le modele custom
ollama create ts-reviewer -f ./Modelfile.reviewer

# Tester
ollama run ts-reviewer "function add(a, b) { return a + b }"
```
**Action** : Montrer la review de code générée

### [20:30-23:00] GPU vs CPU et vérification VRAM
> Dernier point critique : la VRAM. Si votre modèle ne tient pas entièrement en GPU, les couches restantes vont en RAM CPU — et c'est 10 a 50 fois plus lent.
**Action** : Vérifier l'utilisation GPU
```bash
# NVIDIA : voir la VRAM utilisee
nvidia-smi

# Ollama : voir les modeles charges
ollama ps
# NAME           SIZE     PROCESSOR   UNTIL
# llama3.1:8b    6.7 GB   100% GPU    4 minutes from now
```
> Si vous voyez "100% GPU" c'est parfait. Si c'est "50% GPU / 50% CPU", votre modèle est trop gros pour votre carte.

### [23:00-25:00] Récapitulatif et transition
> On a couvert l'essentiel d'Ollama : installation, choix de modèles, quantization, API REST en TypeScript, streaming, Modelfile et gestion du GPU. Vous avez maintenant un LLM qui tourne sur votre machine, gratuitement, sans envoyer la moindre donnee a l'exterieur. Dans le prochain screencast, on va plonger dans la tokenization et les embeddings — les fondations du RAG.
**Action** : Afficher le récapitulatif
```
Resume :
- Ollama = LLMs locaux en une commande
- Q4_K_M = meilleur compromis taille/qualite
- API REST sur localhost:11434
- /api/chat pour la conversation, /api/generate pour la completion
- Modelfile pour personnaliser system prompt + parametres
- Verifier la VRAM avec nvidia-smi et ollama ps
```

## Points d'attention pour l'enregistrement
- Vérifier que Ollama est demarre AVANT le screencast
- Avoir les modèles déjà telecharges (le pull prend du temps)
- Masquer les chemins personnels dans le terminal
- Montrer nvidia-smi uniquement si GPU NVIDIA disponible
- Garder un rythme soutenu sur la partie quantization, c'est dense
