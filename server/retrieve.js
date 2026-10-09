import { createEmbedding } from './ollama.js';
import { supabaseRequest } from './supabase.js';

export const KNOWLEDGE_BASE_ID = 'lumen-student-handbook-2026-2027';

export async function retrieveChunks(question, { matchCount = 4, minSimilarity = 0.35 } = {}) {
  let queryEmbedding;
  try {
    queryEmbedding = await createEmbedding(`search_query: ${question}`);
  } catch (error) {
    console.error('Ollama embedding request failed:', error.message);
    throw Object.assign(error, {
      publicMessage: 'The embedding model is unavailable. Run "ollama pull nomic-embed-text" and try again.',
    });
  }

  let rows;
  try {
    rows = await supabaseRequest('rpc/match_kb_chunks', {
      method: 'POST',
      body: JSON.stringify({
        query_embedding: queryEmbedding,
        match_count: matchCount,
        match_threshold: minSimilarity,
        kb_id_filter: KNOWLEDGE_BASE_ID,
      }),
    });
  } catch (error) {
    console.error('Supabase vector search failed:', error.message);
    throw Object.assign(error, {
      publicMessage: 'Could not search Supabase. Check the project URL, secret key, SQL schema, and network connection.',
    });
  }

  console.log('\nRetrieved chunks:');
  for (const row of rows) {
    console.log(`[${row.source}] similarity=${Number(row.similarity).toFixed(3)}\n${row.content}\n`);
  }
  if (rows.length === 0) console.log('(No chunks passed the similarity threshold.)');
  return rows;
}
