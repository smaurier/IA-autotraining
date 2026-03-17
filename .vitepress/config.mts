import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'IA pour Developpeurs JS',
  description:
    'Formation complete IA pour developpeurs JavaScript : prompting, agents, MCP, transformers, RAG, fine-tuning, Ollama (debutant → expert)',
  lang: 'fr-FR',
  srcDir: '.',

  ignoreDeadLinks: true,

  themeConfig: {
    nav: [
      { text: 'Modules', link: '/modules/00-prerequis-et-paysage-ia' },
      { text: 'Labs', link: '/labs/lab-01-prompting-fondamental/README' },
      { text: 'Quizzes', link: '/quizzes/' },
      { text: 'Glossaire', link: '/glossaire' },
    ],

    sidebar: {
      '/modules/': [
        {
          text: 'Partie 1 — Utiliser l\'IA',
          collapsed: false,
          items: [
            { text: '00 - Prerequis & Paysage IA', link: '/modules/00-prerequis-et-paysage-ia' },
            { text: '01 - Prompting Fondamental', link: '/modules/01-prompting-fondamental' },
            { text: '02 - Prompting Avance', link: '/modules/02-prompting-avance' },
            { text: '03 - Copilot & Assistants Code', link: '/modules/03-assistants-code' },
            { text: '04 - API Claude & OpenAI', link: '/modules/04-api-claude-openai' },
            { text: '05 - MCP — Model Context Protocol', link: '/modules/05-mcp-model-context-protocol' },
            { text: '06 - Agents & Orchestration', link: '/modules/06-agents-orchestration' },
          ],
        },
        {
          text: 'Partie 2 — Comprendre l\'IA',
          collapsed: false,
          items: [
            { text: '07 - Maths Essentielles', link: '/modules/07-maths-essentielles' },
            { text: '08 - Reseaux de Neurones from Scratch', link: '/modules/08-neural-network-scratch' },
            { text: '12 - Tokenization & Embeddings', link: '/modules/12-tokenization-embeddings' },
            { text: '09 - Architecture Transformer', link: '/modules/09-transformer-attention' },
            { text: '10 - Entrainement & Fine-tuning', link: '/modules/10-entrainement-fine-tuning' },
            { text: '11 - LLMs Locaux avec Ollama', link: '/modules/11-ollama-llms-locaux' },
          ],
        },
        {
          text: 'Partie 3 — Construire avec l\'IA',
          collapsed: false,
          items: [
            { text: '13 - RAG Fondamental', link: '/modules/13-rag-fondamental' },
            { text: '14 - RAG Avance', link: '/modules/14-rag-avance' },
            { text: '15 - Chatbot RAG Full-Stack', link: '/modules/15-chatbot-rag' },
            { text: '16 - Evaluation & Observabilite LLM', link: '/modules/16-evaluation-observabilite-llm' },
            { text: '17 - Securite & Ethique', link: '/modules/17-securite-ethique' },
            { text: '18 - Production & Couts', link: '/modules/18-production-couts' },
            { text: '19 - Projet Final', link: '/modules/19-projet-final' },
            { text: '20 - Agentic Frameworks', link: '/modules/20-agentic-frameworks' },
          ],
        },
      ],

      '/quizzes/': [
        {
          text: 'Quizzes',
          items: [
            { text: 'Quiz 00 - Prerequis & Paysage IA', link: '/quizzes/quiz-00-prerequis-paysage-ia' },
            { text: 'Quiz 01 - Prompting Fondamental', link: '/quizzes/quiz-01-prompting-fondamental' },
            { text: 'Quiz 02 - Prompting Avance', link: '/quizzes/quiz-02-prompting-avance' },
            { text: 'Quiz 03 - Assistants Code', link: '/quizzes/quiz-03-assistants-code' },
            { text: 'Quiz 04 - API Claude & OpenAI', link: '/quizzes/quiz-04-api-claude-openai' },
            { text: 'Quiz 05 - MCP', link: '/quizzes/quiz-05-mcp' },
            { text: 'Quiz 06 - Agents', link: '/quizzes/quiz-06-agents' },
            { text: 'Quiz 07 - Maths', link: '/quizzes/quiz-07-maths-ia' },
            { text: 'Quiz 08 - Neural Networks', link: '/quizzes/quiz-08-neural-networks' },
            { text: 'Quiz 09 - Transformers', link: '/quizzes/quiz-09-transformers' },
            { text: 'Quiz 10 - Fine-tuning', link: '/quizzes/quiz-10-fine-tuning' },
            { text: 'Quiz 11 - Ollama', link: '/quizzes/quiz-11-ollama' },
            { text: 'Quiz 12 - Embeddings', link: '/quizzes/quiz-12-embeddings' },
            { text: 'Quiz 13 - RAG', link: '/quizzes/quiz-13-rag-fondamental' },
            { text: 'Quiz 14 - RAG Avance', link: '/quizzes/quiz-14-rag-avance' },
            { text: 'Quiz 15 - Chatbot RAG', link: '/quizzes/quiz-15-chatbot-rag' },
            { text: 'Quiz 16 - Evaluation LLM', link: '/quizzes/quiz-16-evaluation-llm' },
            { text: 'Quiz 17 - Securite & Ethique', link: '/quizzes/quiz-17-securite-ethique' },
            { text: 'Quiz 18 - Production', link: '/quizzes/quiz-18-production' },
            { text: 'Quiz 19 - Projet Final', link: '/quizzes/quiz-19-projet-final' },
          ],
        },
      ],
    },

    search: {
      provider: 'local',
    },

    outline: {
      level: [2, 3],
      label: 'Sur cette page',
    },

    docFooter: {
      prev: 'Page precedente',
      next: 'Page suivante',
    },
  },
});
