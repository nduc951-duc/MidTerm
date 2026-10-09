import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chunkMarkdown } from './chunk.js';
import { createEmbedding, embeddingModel } from './ollama.js';
import { KNOWLEDGE_BASE_ID } from './retrieve.js';
import { requireSupabaseConfig, supabaseRequest } from './supabase.js';

const kbPath = fileURLToPath(new URL('./data/KB-A_Lumen-Institute-Student-Handbook.md', import.meta.url));

async function main() {
  requireSupabaseConfig();
  const markdown = await readFile(kbPath, 'utf8');
  const chunks = chunkMarkdown(markdown);
  if (chunks.length === 0) throw new Error('No numbered handbook sections were found in the KB file.');

  console.log(`Creating ${chunks.length} chunks with ${embeddingModel}...`);
  const rows = [];
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    const embedding = await createEmbedding(`search_document: ${chunk.content}`);
    if (embedding.length !== 768) {
      throw new Error(`Expected 768 embedding values, received ${embedding.length}. Check the embedding model and schema.`);
    }
    rows.push({
      kb_id: KNOWLEDGE_BASE_ID,
      chunk_index: index,
      section_number: chunk.sectionNumber,
      section_title: chunk.sectionTitle,
      source: chunk.source,
      content: chunk.content,
      embedding,
    });
    console.log(`Embedded ${index + 1}/${chunks.length}: ${chunk.source}`);
  }

  await supabaseRequest(`kb_chunks?kb_id=eq.${encodeURIComponent(KNOWLEDGE_BASE_ID)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });
  await supabaseRequest('kb_chunks', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(rows),
  });
  console.log(`Indexed ${rows.length} chunks in Supabase.`);
}

main().catch((error) => {
  console.error(`Ingestion failed: ${error.message}`);
  process.exitCode = 1;
});
