# Screencast 07 — Maths Essentielles pour l'IA

## Informations
- **Duree estimee** : 22-25 min
- **Module** : `modules/07-maths-essentielles.md`
- **Lab associe** : `labs/lab-07-maths-ia/`
- **Prerequis** : Aucun (module autonome)

## Setup
- [ ] Terminal avec le projet lab ouvert
- [ ] Fichiers TypeScript prets pour chaque section (vecteurs, matrices, activation, gradient)
- [ ] Pas de dependance externe — tout en TypeScript pur
- [ ] Editeur avec coloration syntaxique visible

## Script

### [00:00-02:30] Introduction — Pourquoi les maths ?
> Ce module couvre uniquement les maths dont vous avez besoin pour comprendre les reseaux de neurones et les transformers. Pas de theorie abstraite, pas de demonstrations formelles — juste ce qu'il faut pour lire du code d'IA et comprendre ce qui se passe sous le capot. Vous n'avez pas besoin de connaitre la metallurgie pour conduire, mais comprendre le moteur aide a diagnostiquer les problemes.
**Action** : Afficher le plan
```
| Section | Concept               | Pourquoi c'est utile                         |
|---------|-----------------------|----------------------------------------------|
| 1       | Vecteurs              | Les donnees en IA sont des vecteurs          |
| 2       | Matrices              | Les transformations sont des multiplications |
| 3       | Fonctions d'activation| Elles introduisent la non-linearite          |
| 4       | Derivees et gradient  | Le moteur de l'apprentissage                 |
| 5       | Cross-entropy loss    | La fonction de cout des LLMs                 |
```

### [02:30-06:30] Vecteurs — La brique de base
> Un vecteur, c'est simplement une liste ordonnee de nombres. En TypeScript, c'est un `number[]`. En IA, tout est vecteur : un pixel RGB c'est [r, g, b], un mot tokenise c'est un vecteur de 768 dimensions.
**Action** : Montrer les operations fondamentales
```typescript
type Vector = number[];

// Addition de vecteurs
function vectorAdd(a: Vector, b: Vector): Vector {
  return a.map((val, i) => val + b[i]);
}

// Produit scalaire — L'OPERATION LA PLUS IMPORTANTE EN IA
// Mesure a quel point deux vecteurs pointent dans la meme direction
function dotProduct(a: Vector, b: Vector): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

// Norme — la longueur d'un vecteur (Pythagore generalise)
function norm(v: Vector): number {
  return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
}
```
**Action** : Montrer la similarite cosinus avec un exemple concret
```typescript
// Similarite cosinus — LA metrique pour comparer des embeddings
function cosineSimilarity(a: Vector, b: Vector): number {
  return dotProduct(a, b) / (norm(a) * norm(b));
}

// Resultat entre -1 et 1
const roi: Vector = [0.9, 0.1, 0.8, 0.2];
const reine: Vector = [0.85, 0.15, 0.82, 0.18];
const banane: Vector = [0.1, 0.9, 0.05, 0.95];

console.log(cosineSimilarity(roi, reine));  // → 0.998 (tres similaires)
console.log(cosineSimilarity(roi, banane)); // → 0.31  (peu similaires)
```
> Le produit scalaire est au coeur du mecanisme d'attention dans les transformers. C'est comme ca qu'un token regarde les autres tokens pour decider lesquels sont pertinents.

### [06:30-10:00] Matrices — Les transformations
> Une matrice est un tableau rectangulaire de nombres. En IA, les poids d'un reseau de neurones sont des matrices. Quand on dit qu'un modele a 7 milliards de parametres, ce sont 7 milliards de nombres dans des matrices.
**Action** : Montrer la multiplication matrice-vecteur
```typescript
type Matrix = number[][];

// Multiplication matrice × vecteur — L'OPERATION FONDAMENTALE
// Chaque couche d'un reseau transforme un vecteur via cette operation
function matVecMul(m: Matrix, v: Vector): Vector {
  return m.map((row) => dotProduct(row, v));
}

// Exemple : une couche de neurones (3 entrees → 2 sorties)
const poids: Matrix = [
  [0.5, -0.3, 0.8],  // neurone 1
  [0.1, 0.7, -0.2],  // neurone 2
];
const entree: Vector = [1.0, 0.5, 0.3];
const sortie = matVecMul(poids, entree);
// neurone 1 : 0.5*1.0 + (-0.3)*0.5 + 0.8*0.3 = 0.59
// neurone 2 : 0.1*1.0 + 0.7*0.5 + (-0.2)*0.3 = 0.39
// → [0.59, 0.39]
```
**Action** : Afficher le schema
```
Poids (2×3)         Entree (3)      Sortie (2)
┌───────────────┐   ┌─────┐         ┌──────┐
│ 0.5 -0.3  0.8│ × │ 1.0 │    =    │ 0.59 │
│ 0.1  0.7 -0.2│   │ 0.5 │         │ 0.39 │
└───────────────┘   │ 0.3 │         └──────┘
                    └─────┘
```
> La multiplication matricielle, c'est comme une chaine de montage. Chaque matrice transforme les donnees d'une facon. Le resultat de plusieurs matrices enchainee est la composition de toutes ces transformations.

### [10:00-14:00] Fonctions d'activation — La non-linearite
> Sans fonctions d'activation, un reseau de neurones n'est qu'une suite de multiplications matricielles — et ca reste lineaire. On ne pourrait apprendre que des lignes droites. Les fonctions d'activation ajoutent la non-linearite qui permet d'apprendre n'importe quelle relation complexe.
**Action** : Montrer les 4 fonctions principales
```typescript
// Sigmoid — ecrase entre 0 et 1 (portes LSTM, sortie binaire)
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

// ReLU — LA PLUS UTILISEE (couches cachees modernes)
// Ultra simple : negatif → 0, positif → inchange
function relu(x: number): number {
  return Math.max(0, x);
}

// Tanh — ecrase entre -1 et 1 (centree, bonne pour RNN)
function tanh(x: number): number {
  return Math.tanh(x);
}

// Softmax — transforme des scores en PROBABILITES (somme = 1)
// C'est la derniere couche de TOUT LLM
function softmax(logits: Vector): Vector {
  const maxLogit = Math.max(...logits);
  const exps = logits.map(l => Math.exp(l - maxLogit));
  const sum = exps.reduce((s, e) => s + e, 0);
  return exps.map(e => e / sum);
}
```
**Action** : Executer softmax avec un exemple LLM
```typescript
// Un LLM predit le prochain token
const logits: Vector = [2.0, 1.0, 0.1];
const probas = softmax(logits);
// → [0.659, 0.242, 0.099]
// "le" a 65.9% de chances, "un" 24.2%, "chat" 9.9%
// Total = 100%
```
> Softmax est comme un vote pondere. Chaque logit est la conviction d'un expert. Softmax normalise pour obtenir des pourcentages ou l'expert le plus convaincu obtient la plus grosse part.
**Action** : Afficher le tableau comparatif
```
| Fonction | Intervalle | Utilisation typique      | Avantage           |
|----------|-----------|--------------------------|---------------------|
| Sigmoid  | [0, 1]    | Sortie binaire, gates    | Probabiliste        |
| ReLU     | [0, +inf) | Couches cachees          | Rapide, simple      |
| Tanh     | [-1, 1]   | Couches cachees RNN      | Centree a zero      |
| Softmax  | [0,1] Σ=1 | Derniere couche LLM      | Distribution proba  |
```

### [14:00-18:30] Derivees et descente de gradient
> Les derivees, c'est ce qui permet au reseau d'apprendre. Imaginez que vous etes sur une colline dans le brouillard. Vous ne voyez rien, mais vous sentez la pente sous vos pieds. La derivee, c'est cette pente. Le gradient, c'est la direction de la pente la plus raide. Pour descendre et minimiser l'erreur, on va dans le sens oppose au gradient.
**Action** : Montrer la derivee numerique et le gradient
```typescript
// Derivee numerique
function numericalDerivative(f: (x: number) => number, x: number): number {
  const h = 1e-7;
  return (f(x + h) - f(x - h)) / (2 * h);
}

// Exemple : derivee de x² au point x = 3 → devrait etre 6
console.log(numericalDerivative(x => x * x, 3)); // → 6.0

// Gradient = vecteur de toutes les derivees partielles
function numericalGradient(f: (p: Vector) => number, params: Vector): Vector {
  const h = 1e-7;
  return params.map((_, i) => {
    const plus = [...params]; plus[i] += h;
    const minus = [...params]; minus[i] -= h;
    return (f(plus) - f(minus)) / (2 * h);
  });
}
```
**Action** : Implementer la descente de gradient complete
```typescript
function gradientDescent(
  lossFunction: (params: Vector) => number,
  initialParams: Vector,
  learningRate: number,
  epochs: number,
): Vector {
  let params = [...initialParams];

  for (let epoch = 0; epoch < epochs; epoch++) {
    const loss = lossFunction(params);
    const gradient = numericalGradient(lossFunction, params);

    // Mise a jour : params = params - learningRate * gradient
    params = params.map((p, i) => p - learningRate * gradient[i]);

    if (epoch % 100 === 0) {
      console.log(`Epoch ${epoch}: loss = ${loss.toFixed(6)}`);
    }
  }
  return params;
}

// Trouver le minimum de f(x, y) = (x-2)² + (y-3)²
const result = gradientDescent(
  p => (p[0] - 2) ** 2 + (p[1] - 3) ** 2,
  [10, 10], // Depart loin du minimum
  0.1,       // Learning rate
  500,       // Epochs
);
console.log(result); // → [2.0000, 3.0000] — converge vers le minimum !
```
> Le learning rate est crucial : trop grand et ca diverge, trop petit et ca converge en 10 000 epochs. C'est le parametre le plus important a regler dans l'entrainement.

### [18:30-22:00] Cross-Entropy Loss — La fonction de cout des LLMs
> La cross-entropy mesure la distance entre la prediction du modele et la realite. C'est LA fonction de cout de tous les LLMs. Elle penalise fortement les predictions confiantes qui ont tort.
**Action** : Montrer l'implementation et les exemples
```typescript
function crossEntropyLoss(predicted: Vector, targetIndex: number): number {
  const epsilon = 1e-15;
  const clipped = Math.max(predicted[targetIndex], epsilon);
  return -Math.log(clipped);
}

// Le modele est confiant ET correct → faible loss
const good: Vector = [0.9, 0.05, 0.05];
console.log(crossEntropyLoss(good, 0)); // → 0.105 (bien !)

// Le modele est confiant MAIS a tort → grosse loss
const bad: Vector = [0.05, 0.05, 0.9];
console.log(crossEntropyLoss(bad, 0));  // → 2.996 (mauvais !)

// Le modele hesite → loss moyenne
const unsure: Vector = [0.33, 0.33, 0.34];
console.log(crossEntropyLoss(unsure, 0)); // → 1.109
```
> Comme un meteo qui donne 90% de pluie et il pleut — faible erreur. Mais s'il donne 10% de pluie et il pleut — grosse erreur. La cross-entropy capture exactement ca.
**Action** : Montrer le gradient elegant de softmax + cross-entropy
```typescript
// Le gradient est incroyablement simple :
// ∂Loss/∂logit_i = predicted_i - target_i
function softmaxCrossEntropyGradient(predicted: Vector, targetIndex: number): Vector {
  return predicted.map((p, i) => (i === targetIndex ? p - 1 : p));
}

// Exemple : prediction [0.659, 0.242, 0.099], cible = token 0
// Gradient = [-0.341, 0.242, 0.099]
// → "augmente le score du token 0, diminue les autres"
```

### [22:00-25:00] Recapitulatif — Le pipeline complet
> On a vu toutes les briques mathematiques. Voici comment elles s'assemblent dans un forward pass.
**Action** : Afficher le pipeline complet
```
Pipeline d'un forward pass :

  Entree      Poids         Activation     Softmax       Loss
  [x₁,x₂] → [W×x + b] → [ReLU/etc] → [probas] → cross-entropy
              matrices      non-lin.     somme=1     nombre unique

Backward pass (apprentissage) :
  Loss → gradient → ajuster les poids → recommencer
```
**Action** : Afficher le tableau recapitulatif
```
| Concept            | En une phrase                                     |
|--------------------|---------------------------------------------------|
| Vecteur            | Une liste de nombres = une donnee en IA            |
| Produit scalaire   | Mesure la similarite entre deux vecteurs           |
| Matrice            | Les poids du reseau, transforment les vecteurs     |
| ReLU               | Max(0, x) — la plus utilisee                      |
| Softmax            | Transforme des scores en probabilites              |
| Derivee            | La pente — comment la sortie change                |
| Gradient           | Direction de la descente la plus raide             |
| Descente gradient  | Ajuster les poids pour minimiser l'erreur          |
| Cross-entropy      | Penalise les predictions confiantes et fausses     |
```
> Avec ces bases, vous etes prets pour le module suivant : construire un reseau de neurones from scratch en TypeScript.

## Points d'attention pour l'enregistrement
- Executer chaque snippet en live et montrer les resultats numeriques
- Prendre le temps d'expliquer le produit scalaire — c'est LE concept fondamental
- Pour la descente de gradient, montrer les epochs qui defilent avec la loss qui diminue
- Pas de formules mathematiques a l'ecran — uniquement du code TypeScript
- Faire des pauses apres chaque section pour laisser assimiler
