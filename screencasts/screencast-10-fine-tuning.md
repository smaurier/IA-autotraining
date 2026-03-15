# Screencast 10 — Fine-tuning : LoRA et Ollama Modelfile

## Informations
- **Duree estimee** : 18-22 min
- **Module** : `modules/10-fine-tuning.md`
- **Lab associe** : `labs/lab-10-fine-tuning/`
- **Prérequis** : Screencast 08, 11

## Setup
- [ ] Ollama installe et fonctionnel (`ollama --version`)
- [ ] Modèle `llama3.2:3b` déjà telecharge
- [ ] Fichier `Modelfile` du lab pret
- [ ] Slides sur le concept de LoRA
- [ ] Dataset d'exemple au format JSONL

## Script

### [00:00-02:30] Pourquoi fine-tuner un modèle
> Les modèles génériques sont puissants, mais parfois on a besoin d'un modèle specialise — un modèle qui parle comme votre marque, qui connait votre jargon metier, ou qui suit un format très précis. C'est la que le fine-tuning entre en jeu.
**Action** : Afficher le spectre des options de personnalisation
```
Niveau de personnalisation :

  Prompting    Few-shot    RAG         Fine-tuning    Pre-training
  (zero cout)  (faible)   (moyen)     (eleve)        (enorme)
  ────────────────────────────────────────────────────────────────>
  Facile                                                  Difficile
  Rapide                                                  Lent
  Generique                                               Specialise

Quand fine-tuner ?
✓ Le prompting et le RAG ne suffisent pas
✓ Vous avez un format de sortie tres specifique
✓ Vous avez > 100 exemples de qualite
✓ Vous avez besoin de latence minimale

Quand NE PAS fine-tuner ?
✗ Le few-shot donne deja de bons resultats
✗ Vous avez moins de 50 exemples
✗ Le modele doit acceder a des donnees dynamiques (→ RAG)
```

### [02:30-05:30] LoRA : l'astuce qui rend le fine-tuning accessible
> Le fine-tuning complet d'un LLM nécessité des centaines de GPU. LoRA — Low-Rank Adaptation — est une technique maligne : au lieu de modifier tous les poids du modèle, on ajoute de petites matrices d'adaptation. Le modèle original ne change pas, on ajoute juste un "adaptateur" leger.
**Action** : Expliquer LoRA avec un schema
```
Fine-tuning classique :          LoRA :
┌─────────────────────┐          ┌─────────────────────┐
│  Poids originaux    │          │  Poids originaux    │ (geles)
│  (modifies)         │          │  + Adaptateur LoRA  │ (petit, entraine)
│  ~7 milliards       │          │    ~1-10 millions   │
│  parametres         │          │    parametres       │
└─────────────────────┘          └─────────────────────┘

Taille du modele : 100%          Taille ajoutee : 0.1-1%
GPU requis : 4x A100             GPU requis : 1x RTX 4090
Temps : jours                    Temps : heures

LoRA fonctionne en decomposant la matrice de poids :
  W_new = W_original + B × A
  ou B est [d × r] et A est [r × d]
  avec r << d (rang faible, typiquement 8-64)
```

### [05:30-08:30] Créer un Modelfile Ollama
> Avec Ollama, on peut créer des modèles personnalises via un Modelfile. Ce n'est pas du vrai fine-tuning LoRA (ça nécessité un entrainement), mais c'est un excellent moyen de customiser le comportement d'un modèle local.
**Action** : Créer et tester un Modelfile
```dockerfile
# Modelfile-expert-code
FROM llama3.2:3b

# Parametres de generation
PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER num_predict 2048
PARAMETER stop "<|end|>"

# System prompt integre au modele
SYSTEM """Tu es un expert TypeScript et Node.js senior.

Regles strictes :
1. Reponds toujours en francais
2. Code en TypeScript strict (jamais de any)
3. Inclus les imports
4. Ajoute des commentaires JSDoc
5. Propose des tests unitaires si pertinent
6. Signale les edge cases et erreurs possibles

Format :
- Explication courte (2-3 phrases max)
- Code
- Points d'attention
"""

# Template de conversation
TEMPLATE """{{ if .System }}<|start_header_id|>system<|end_header_id|>
{{ .System }}<|eot_id|>{{ end }}{{ if .Prompt }}<|start_header_id|>user<|end_header_id|>
{{ .Prompt }}<|eot_id|>{{ end }}<|start_header_id|>assistant<|end_header_id|>
{{ .Response }}<|eot_id|>"""
```
**Action** : Construire et tester le modèle
```bash
# Creer le modele custom
ollama create expert-code -f Modelfile-expert-code

# Tester
ollama run expert-code "Comment implementer un debounce generique ?"

# Comparer avec le modele de base
ollama run llama3.2:3b "Comment implementer un debounce generique ?"
```

### [08:30-10:30] Preparer des donnees pour un vrai fine-tuning
> Si vous voulez aller plus loin avec un vrai fine-tuning LoRA, voici comment preparer vos donnees. Le format standard, c'est du JSONL avec des paires instruction/réponse.
**Action** : Montrer le format de donnees et les bonnes pratiques
```jsonl
{"messages":[{"role":"system","content":"Expert TypeScript"},{"role":"user","content":"Explique les generics"},{"role":"assistant","content":"Les generics en TypeScript permettent..."}]}
{"messages":[{"role":"system","content":"Expert TypeScript"},{"role":"user","content":"Difference entre interface et type"},{"role":"assistant","content":"Les interfaces et les types..."}]}
```
```typescript
// prepare-dataset.ts — Validation du dataset
import { z } from "zod";
import * as fs from "fs";

const MessageSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string().min(1),
  })).min(2),
});

const lines = fs.readFileSync("dataset.jsonl", "utf-8").split("\n").filter(Boolean);
let valid = 0;
let invalid = 0;

for (const line of lines) {
  const result = MessageSchema.safeParse(JSON.parse(line));
  if (result.success) valid++;
  else { invalid++; console.error("Invalide :", result.error.message); }
}

console.log(`Dataset : ${valid} valides, ${invalid} invalides sur ${lines.length} total`);
console.log(`Taille recommandee : 100-10000 exemples de qualite`);
```

### [10:30-12:00] Récapitulatif et quand choisir quoi
> En résumé, le fine-tuning est un outil puissant mais rarement nécessaire. Dans 90% des cas, le prompting ou le RAG suffisent.
**Action** : Afficher l'arbre de decision
```
Votre modele ne donne pas de bons resultats ?
  │
  ├── Ameliorez le prompt (gratuit, immediat)
  │     └── Toujours pas bon ?
  │           │
  │           ├── Ajoutez du few-shot (faible cout)
  │           │     └── Toujours pas bon ?
  │           │           │
  │           │           ├── Ajoutez du RAG (cout moyen)
  │           │           │     └── Toujours pas bon ?
  │           │           │           │
  │           │           │           └── Fine-tuning LoRA (cout eleve)
  │           │           │
  │           │           └── Changez de modele (Sonnet -> Opus)
  │           │
  │           └── Verifiez vos exemples (qualite > quantite)
  │
  └── Verifiez que le probleme vient bien du modele
```

## Points d'attention pour l'enregistrement
- Ollama doit etre déjà installe — ne pas perdre de temps sur l'installation (screencast 11)
- La création du Modelfile est quasi instantanee, bien montrer le résultat
- Bien distinguer Modelfile (customisation système) vs LoRA (vrai entrainement)
- Insister sur l'arbre de decision : fine-tuning = dernier recours
