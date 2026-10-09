import express from 'express';

function validHistory(history) {
  return Array.isArray(history)
    && history.length <= 6
    && history.every((entry) => entry && typeof entry === 'object'
      && ['user', 'assistant'].includes(entry.role)
      && typeof entry.content === 'string'
      && entry.content.length > 0
      && entry.content.length <= 1000);
}

export function createApp({ answerQuestion }) {
  const app = express();
  app.use(express.json({ limit: '16kb' }));

  app.post('/api/chat', async (request, response) => {
    const { message, history = [] } = request.body ?? {};
    if (typeof message !== 'string' || !message.trim() || message.length > 1000 || !validHistory(history)) {
      return response.status(400).json({ error: 'Please enter a question of up to 1,000 characters.' });
    }

    try {
      const result = await answerQuestion({ message: message.trim(), history });
      return response.json(result);
    } catch (error) {
      return response.status(error.status ?? 500).json({ error: error.publicMessage ?? 'The request could not be processed.' });
    }
  });

  app.use((error, _request, response, _next) => {
    if (error instanceof SyntaxError || error.status === 413) {
      return response.status(400).json({ error: 'The request is invalid or too large.' });
    }
    return response.status(500).json({ error: 'The request could not be processed.' });
  });

  return app;
}
