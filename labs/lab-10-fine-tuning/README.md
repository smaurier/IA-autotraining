# Lab 10 — Fine-tuning

## Objectifs

- Preparer des donnees d'entrainement au format JSONL
- Valider un dataset (champs requis, taille minimale, equilibre)
- Decouper un dataset en ensembles train/validation/test
- Calculer les paramètres entrainables avec LoRA
- Comparer les scores avant/après fine-tuning
- Générer un Modelfile Ollama

## Exercices

### 1. `prepareTrainingData(samples: { input: string; output: string }[]): string`

Convertit un tableau d'exemples en format JSONL (JSON Lines). Chaque ligne est un objet JSON `{"messages": [{"role": "user", "content": input}, {"role": "assistant", "content": output}]}`.

### 2. `validateDataset(data: { input: string; output: string }[], options: { minSize: number; requiredFields: string[] }): { valid: boolean; errors: string[] }`

Verifie que le dataset respecte les contraintes : taille minimale, presence des champs requis dans chaque exemple.

### 3. `splitDataset<T>(data: T[], ratios: { train: number; val: number; test: number }): { train: T[]; val: T[]; test: T[] }`

Decoupe un dataset en trois parties selon les ratios donnes (ex: 0.8 / 0.1 / 0.1).

### 4. `calculateLoraParams(config: { rank: number; dIn: number; dOut: number; numLayers: number }): number`

Calcule le nombre de paramètres entrainables LoRA : `rank * (dIn + dOut) * 2 * numLayers`.

### 5. `compareModelScores(before: { accuracy: number; f1: number; latency: number }, after: { accuracy: number; f1: number; latency: number }): { metric: string; before: number; after: number; improvement: number }[]`

Compare les metriques avant/après fine-tuning et calcule l'amelioration en pourcentage.

### 6. `buildOllamaModelfile(config: { from: string; system: string; parameters: Record<string, number | string> }): string`

Genere un Modelfile Ollama avec les directives FROM, SYSTEM et PARAMETER.

## Lancer les tests

```bash
npx tsx exercise.ts
# ou pour verifier la solution :
npx tsx solution.ts
```
