import 'dotenv/config';
import OpenAI from 'openai';
import { createApp } from './app.js';
import { createAnswerQuestion } from './ai.js';
import { chatModel } from './ollama.js';
import { retrieveChunks } from './retrieve.js';

const ollamaBaseUrl = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434')
  .replace(/\/v1\/?$/, '')
  .replace(/\/$/, '');
const client = new OpenAI({
  baseURL: `${ollamaBaseUrl}/v1`,
  apiKey: 'ollama', // The SDK requires a string; this local Ollama setup does not validate it.
});
const answerQuestion = createAnswerQuestion({
  model: chatModel,
  createResponse: (request) => client.responses.create(request),
  retrieve: retrieveChunks,
});

const app = createApp({ answerQuestion });

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => console.log(`Lumen Handbook RAG server listening at http://localhost:${port}`));
