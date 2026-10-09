# Lumen Handbook RAG Chatbot

An English-language RAG chatbot for the Lumen Institute Student Handbook 2026–2027. It retrieves handbook chunks from Supabase before asking a local Ollama model to answer. Each answer displays its source sections and the retrieved chunks used for debugging.

## Models and retrieval settings

| Setting | Value |
|---|---|
| LLM | `qwen3:4b` via Ollama |
| Embedding model | `nomic-embed-text` via Ollama |
| Vector store | Supabase PostgreSQL with `pgvector` |
| Chunking | Split by numbered handbook section; maximum 350 words per chunk, with 50-word overlap when a section is longer |
| Retrieval | Top 4 chunks, cosine similarity threshold 0.35 |

The LLM and embedding model do different jobs. `qwen3:4b` writes the answer; `nomic-embed-text` creates vectors for handbook chunks and questions. Ollama documents embedding models and the embedding API [here](https://ollama.com/blog/embedding-models).

## Requirements

- Node.js 20 or newer.
- Ollama running locally.
- Supabase project with the `vector` extension enabled.
- The supplied Lumen handbook file at `server/data/KB-A_Lumen-Institute-Student-Handbook.md`.

Download the models once:

```powershell
ollama pull qwen3:4b
ollama pull nomic-embed-text
```

## Configure Supabase

1. In the Supabase Dashboard, enable the `vector` extension under **Database → Extensions**.
2. Open the SQL Editor and run the contents of `server/schema.sql`. It creates the `kb_chunks` table and `match_kb_chunks` search function.
3. Copy `server/.env.example` to `server/.env` and set `SUPABASE_URL` and the server-side `SUPABASE_SECRET_KEY`. The code also accepts the legacy `SUPABASE_SERVICE_ROLE_KEY`. Keep either secret on the server; never put it in the React client.

Supabase stores vectors using `pgvector`; the vector column dimension must match the embedding model. This project expects 768 dimensions for `nomic-embed-text`. See the [Supabase vector columns guide](https://supabase.com/docs/guides/ai/vector-columns).

## Ingest the handbook

Run this after applying the SQL schema and configuring `.env`:

```powershell
cd server
npm install
npm run ingest
```

The script reads only the handbook file, keeps each section heading as source metadata, creates embeddings locally with Ollama, and replaces the existing Lumen handbook chunks in Supabase.

## Run the chatbot

Open two terminals from the project root.

```powershell
cd server
npm run dev
```

```powershell
cd client
npm install
npm run dev
```

Open the Vite URL shown in the client terminal, usually `http://localhost:5173`. The backend listens on port 3001. Ask a question in English, such as “What is the current make-up exam fee?” Each answer shows its source sections. Open **Retrieved chunks (debug)** to inspect the text and similarity scores; the backend also prints retrieved chunks in its terminal.

## Request flow

```text
Question → React App.jsx → POST /api/chat → Express app.js
         → Ollama embedding → Supabase pgvector search
         → retrieved chunks + question → Ollama qwen3:4b
         → answer, sources, debug chunks → React UI
```

| File | Responsibility |
|---|---|
| `client/src/App.jsx` | English chat interface, conversation state, sources, and debug view |
| `server/app.js` | HTTP route and request validation |
| `server/chunk.js` | Section-aware Markdown chunking and chunk settings |
| `server/ollama.js` | Local embeddings and model configuration |
| `server/ingest.js` | Loads the KB, creates embeddings, and writes chunks to Supabase |
| `server/retrieve.js` | Embeds questions and retrieves/logs matching chunks |
| `server/supabase.js` | Server-side Supabase REST requests |
| `server/ai.js` | Grounded prompt, refusal behavior, citations, and response formatting |
| `server/schema.sql` | Vector table and similarity-search function |
| `server/data/KB-A_Lumen-Institute-Student-Handbook.md` | The student's provided knowledge base |

## RAG behavior and grading checks

- The chatbot is instructed to answer only from retrieved chunks and cite source labels.
- The backend checks that an answer cites labels from the retrieved set; if it does not, it returns the required “I don't know” response.
- If no chunk meets the retrieval threshold, it returns `I don't know based on the provided knowledge base.`
- Later amendments in Section 11 override earlier handbook rules. Try questions about the make-up exam fee, the late library fine, and the Honors installment plan.
- Try an unsupported question such as “Does the handbook list cafeteria opening hours?” and inspect whether the bot refuses to guess.
- Use **Retrieved chunks (debug)** and the server terminal log to show what the vector search returned.

## Environment variables

See `server/.env.example`. `OLLAMA_MODEL` selects the chat model, `OLLAMA_EMBEDDING_MODEL` selects the embedding model, `SUPABASE_URL` and `SUPABASE_SECRET_KEY` connect the server to Supabase, and `PORT` selects the Express port.
