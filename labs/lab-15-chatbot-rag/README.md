# Lab 15 — Chatbot RAG

## Objectifs

- Gerer un historique de conversation multi-tours
- Compresser l'historique pour respecter les limites de tokens
- Construire un prompt RAG integrant historique et contexte
- Estimer le nombre de tokens d'un texte
- Extraire les citations d'une reponse generee

## Exercices

### 1. `createConversation(systemPrompt: string): { messages: { role: string; content: string }[] }`

Cree un nouvel objet conversation initialise avec un message systeme.

### 2. `addMessage(conv: { messages: { role: string; content: string }[] }, role: string, content: string): void`

Ajoute un message a la conversation (mutation in-place).

### 3. `compressHistory(messages: { role: string; content: string }[], maxMessages: number): { role: string; content: string }[]`

Compresse l'historique en gardant le premier message (systeme) et les `maxMessages - 1` derniers messages.

### 4. `buildRagChatPrompt(history: { role: string; content: string }[], context: string[], question: string): string`

Construit un prompt complet : historique formate, contexte RAG numerote, puis la question.

### 5. `countTokensEstimate(text: string): number`

Estime le nombre de tokens d'un texte : `Math.ceil(text.length / 4)`.

### 6. `extractCitations(text: string): { text: string; sources: number[] }`

Extrait les numeros de citation `[1]`, `[2]`, etc. d'un texte et retourne le texte nettoye avec la liste des numeros de sources.
