# Screencast 01 — Prompting fondamental

## Informations
- **Duree estimee** : 10-12 min
- **Module** : `modules/01-prompting-fondamental.md`
- **Lab associe** : `labs/lab-01-prompting-fondamental/`
- **Prérequis** : Screencast 00

## Setup
- [ ] Navigateur ouvert sur claude.ai
- [ ] Fichier `prompts.ts` du lab pret
- [ ] Terminal avec le projet lab ouvert
- [ ] 3-4 exemples de prompts prepares pour chaque technique

## Script

### [00:00-02:30] Pourquoi le prompting est fondamental
> Le prompting, c'est l'interface entre vous et le modèle. Un bon prompt peut transformer un résultat mediocre en réponse experte. On va voir trois techniques essentielles : zero-shot, few-shot et chain-of-thought.
**Action** : Montrer un exemple de mauvais prompt vs bon prompt dans claude.ai
```
Mauvais prompt:
"Traduis ce texte"

Bon prompt:
"Tu es un traducteur professionnel francais-anglais.
Traduis le texte suivant en anglais britannique,
en conservant le registre formel.
Texte : Les resultats du trimestre depassent les attentes."
```

### [02:30-05:00] Zero-shot prompting
> Le zero-shot, c'est quand on demandé quelque chose au modèle sans lui donner d'exemple. Ça marche bien pour des taches simples et bien definies.
**Action** : Exécuter plusieurs prompts zero-shot et comparer les résultats
```typescript
// zero-shot.ts
const prompts = [
  // Classification simple
  `Classifie le sentiment de cette phrase : "Ce produit est incroyable, je le recommande !"
   Reponds uniquement par : positif, negatif ou neutre.`,

  // Extraction d'information
  `Extrais les entites nommees (personnes, lieux, organisations) du texte suivant
   au format JSON :
   "Marie Dupont travaille chez Airbus a Toulouse depuis 2019."`,

  // Generation structuree
  `Genere un objet JSON representant un utilisateur fictif avec les champs :
   nom, email, age, ville. Reponds uniquement avec le JSON.`
];

for (const prompt of prompts) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });
  console.log(response.content[0].text);
  console.log("---");
}
```

### [05:00-08:00] Few-shot prompting
> Le few-shot, c'est donner des exemples au modèle avant de poser la vraie question. C'est extremement puissant pour les taches ou le format de sortie compte.
**Action** : Montrer la différence de qualite avec et sans exemples
```typescript
// few-shot.ts
const fewShotPrompt = `Tu convertis des descriptions en objets JSON.

Exemples :
Description : "Un chat noir de 3 ans appele Felix"
JSON : {"type": "chat", "couleur": "noir", "age": 3, "nom": "Felix"}

Description : "Une voiture rouge Tesla Model 3 de 2023"
JSON : {"type": "voiture", "couleur": "rouge", "marque": "Tesla", "modele": "Model 3", "annee": 2023}

Description : "Un appartement de 65m2 avec 3 pieces au 5eme etage"
JSON :`;

const response = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 256,
  messages: [{ role: "user", content: fewShotPrompt }],
});
console.log(response.content[0].text);
```

### [08:00-10:30] Chain-of-thought (CoT)
> Le chain-of-thought, c'est demander au modèle de raisonner étape par étape. C'est la technique la plus puissante pour les problèmes complexes — mathematiques, logique, analyse.
**Action** : Comparer une réponse directe vs une réponse avec CoT
```typescript
// chain-of-thought.ts
const sansCoT = `Un magasin vend 3 types de pizzas.
La margherita coute 8 euros, la reine 10 euros, la 4 fromages 12 euros.
Un client achete 2 margheritas, 1 reine et 3 quatre-fromages.
Il a un coupon de reduction de 15%. Quel est le total ?`;

const avecCoT = `${sansCoT}

Raisonne etape par etape avant de donner le resultat final.`;

// Executer les deux et comparer
const [reponseSans, reponseAvec] = await Promise.all([
  client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [{ role: "user", content: sansCoT }],
  }),
  client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [{ role: "user", content: avecCoT }],
  }),
]);

console.log("=== Sans CoT ===");
console.log(reponseSans.content[0].text);
console.log("\n=== Avec CoT ===");
console.log(reponseAvec.content[0].text);
```

### [10:30-12:00] Récapitulatif et bonnes pratiques
> On a vu trois techniques fondamentales. Zero-shot pour les taches simples, few-shot quand le format compte, et chain-of-thought pour le raisonnement. Retenez cette regle : plus la tache est complexe, plus il faut guider le modèle.
**Action** : Afficher le tableau récapitulatif
```
| Technique | Quand l'utiliser           | Tokens consommes |
|-----------|----------------------------|------------------|
| Zero-shot | Taches simples, claires    | Faible           |
| Few-shot  | Format precis requis       | Moyen            |
| CoT       | Raisonnement, logique      | Eleve            |
```

## Points d'attention pour l'enregistrement
- Exécuter les scripts en live, ne pas pre-enregistrer les réponses
- Bien montrer la différence de qualite entre sans CoT et avec CoT
- Faire une pause après chaque réponse pour laisser lire
- Mentionner que le CoT augmente la consommation de tokens
