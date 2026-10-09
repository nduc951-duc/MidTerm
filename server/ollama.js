const ollamaBaseUrl = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434')
  .replace(/\/v1\/?$/, '')
  .replace(/\/$/, '');
export const chatModel = process.env.OLLAMA_MODEL || 'qwen3:4b';
export const embeddingModel = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';

export async function createEmbedding(text) {
  const response = await fetch(`${ollamaBaseUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: embeddingModel, prompt: text }),
  });
  if (!response.ok) {
    throw new Error(`Ollama embedding request failed (${response.status}). Make sure ${embeddingModel} is installed.`);
  }
  const data = await response.json();
  if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
    throw new Error('Ollama returned an empty embedding.');
  }
  return data.embedding;
}
