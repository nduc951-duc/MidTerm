import { useState } from 'react';

export default function App() {
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    const question = message.trim();
    if (!question) {
      setError('Please enter a question.');
      return;
    }

    const previous = history;
    setError('');
    setLoading(true);
    setHistory([...previous, { role: 'user', content: question }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          history: previous.slice(-6).map(({ role, content }) => ({ role, content: content.slice(-1000) })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
      setHistory([...previous,
        { role: 'user', content: question },
        { role: 'assistant', content: data.answer, sources: data.sources, retrievedChunks: data.retrievedChunks },
      ]);
      setMessage('');
    } catch (cause) {
      setHistory(previous);
      setError(cause.message || 'Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <header>
        <p className="eyebrow">LUMEN INSTITUTE · STUDENT HANDBOOK 2026–2027</p>
        <h1>Lumen Handbook Assistant</h1>
        <p>Ask questions about the handbook. Answers use the provided knowledge base and show their sources.</p>
      </header>

      <section className="chat" aria-label="Conversation">
        {history.length === 0 && <p className="empty">Try: “What is the current make-up exam fee?”</p>}
        {history.map((entry, index) => (
          <article className={`bubble ${entry.role}`} key={index}>
            <strong>{entry.role === 'user' ? 'You' : 'Assistant'}</strong>
            <p>{entry.content}</p>
            {entry.role === 'assistant' && (
              <>
                <div className="sources">
                  <strong>Sources</strong>
                  {entry.sources?.length
                    ? <ul>{entry.sources.map((source) => <li key={source}>{source}</li>)}</ul>
                    : <p>No supporting section was retrieved.</p>}
                </div>
                <details className="debug">
                  <summary>Retrieved chunks (debug)</summary>
                  {entry.retrievedChunks?.length
                    ? entry.retrievedChunks.map((chunk) => (
                      <section className="retrieved-chunk" key={chunk.label}>
                        <strong>[{chunk.label}] {chunk.source} · similarity {chunk.similarity.toFixed(3)}</strong>
                        <pre>{chunk.content}</pre>
                      </section>
                    ))
                    : <p>No chunks passed the retrieval threshold.</p>}
                </details>
              </>
            )}
          </article>
        ))}
        {loading && <p className="waiting" role="status">Searching the handbook and generating an answer…</p>}
      </section>

      <form onSubmit={submit}>
        <label htmlFor="message">Your question</label>
        <textarea id="message" value={message} onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !event.repeat) {
              event.preventDefault();
              if (!loading) submit(event);
            }
          }}
          placeholder="Ask about tuition, library rules, exams, scholarships..."
          rows="3" maxLength={1000} disabled={loading} />
        <p className="hint">Enter to send · Shift+Enter for a new line</p>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? 'Searching…' : 'Send question'}</button>
      </form>
    </main>
  );
}
