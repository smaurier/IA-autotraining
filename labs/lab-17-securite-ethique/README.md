# Lab 17 — Sécurité et ethique

## Objectifs

- Detecter les injections directes dans les entrees utilisateur
- Detecter les injections indirectes dans les documents
- Assainir les entrees utilisateur (longueur, caracteres de controle)
- Classifier le niveau de risque d'un contenu
- Supprimer les informations personnelles identifiables (PII)
- Evaluer le niveau de risque selon l'EU AI Act

## Exercices

### 1. `detectDirectInjection(input: string): { detected: boolean; patterns: string[] }`

Detecte les patterns d'injection directe : "ignore previous", "system prompt", "you are now", "forget your instructions".

### 2. `detectIndirectInjection(document: string): { detected: boolean; patterns: string[] }`

Detecte les injections indirectes dans un document : instructions cachees comme "IMPORTANT:", "IGNORE ABOVE", balises `<script>`, encodage base64 suspect.

### 3. `sanitizeInput(input: string, maxLength: number): string`

Assainit l'entree : trim, limite a `maxLength` caracteres, supprime les caracteres de controle (ASCII 0-31 sauf newline et tab).

### 4. `classifyRiskLevel(content: string): 'high' | 'medium' | 'low'`

Classifie le risque d'un contenu : `high` si contient des mots-clés dangereux (password, credit card, ssn), `medium` si contient des donnees personnelles (email, phone, address), `low` sinon.

### 5. `scrubPII(text: string): string`

Remplace les emails et numéros de telephone par `[REDACTED]`.

### 6. `checkEuAiActTier(system: { usesPersonalData: boolean; autonomous: boolean; sector: string }): 'unacceptable' | 'high' | 'limited' | 'minimal'`

Evalue le tier de risque EU AI Act : `unacceptable` si secteur "social_scoring" ou "manipulation", `high` si secteur "healthcare"/"law_enforcement"/"education", `limited` si utilise des donnees personnelles, `minimal` sinon.
