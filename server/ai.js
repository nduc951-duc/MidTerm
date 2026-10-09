function publicError(status, publicMessage) {
  return Object.assign(new Error(publicMessage), { status, publicMessage });
}

export function createAnswerQuestion({ createResponse, model, retrieve }) {
  return async function answerQuestion({ message, history }) {
    const recentContext = history.slice(-4).map((entry) => entry.content).join('\n');
    const searchText = recentContext ? `${recentContext}\n${message}` : message;
    let chunks;
    try {
      chunks = await retrieve(searchText);
    } catch (error) {
      throw publicError(502, error.publicMessage ?? 'The knowledge base could not be searched. Check Ollama and Supabase.');
    }

    if (chunks.length === 0) {
      return {
        answer: "I don't know based on the provided knowledge base.",
        sources: [],
        retrievedChunks: [],
      };
    }

    const context = chunks.map((chunk, index) =>
      `[S${index + 1}] ${chunk.source}\n${chunk.content}`).join('\n\n');
    const input = [
      ...history.slice(-6),
      { role: 'user', content: `Question: ${message}\n\nRetrieved knowledge base chunks:\n${context}` },
    ];

    let answer;
    try {
      const response = await createResponse({
        model,
        instructions: [
          'You are the Lumen Institute Student Handbook assistant.',
          'Answer in English using only the retrieved knowledge base chunks in the user message.',
          'If the chunks do not contain enough evidence, say exactly: "I don\'t know based on the provided knowledge base."',
          'Do not use outside knowledge or invent policies, dates, fees, or exceptions.',
          'Cite each factual answer with the provided source label, such as [S1].',
          'If later amendments conflict with earlier handbook text, follow the later amendment and explain its effective date when provided.',
        ].join(' '),
        input,
      });
      answer = response.output_text?.trim();
      if (!answer) throw new Error('Empty model output');
    } catch {
      throw publicError(502, 'The AI model did not return an answer. Check Ollama and try again.');
    }

    const allowedLabels = new Set(chunks.map((_, index) => `S${index + 1}`));
    const citedLabels = [...answer.matchAll(/\[(S\d+)\]/g)].map((match) => match[1]);
    const hasGroundedCitation = citedLabels.length > 0 && citedLabels.every((label) => allowedLabels.has(label));
    if (!hasGroundedCitation) {
      answer = "I don't know based on the provided knowledge base.";
    }

    const sources = hasGroundedCitation
      ? [...new Set(citedLabels.map((label) => chunks[Number(label.slice(1)) - 1].source))]
      : [];
    return {
      answer,
      sources,
      retrievedChunks: chunks.map((chunk, index) => ({
        label: `S${index + 1}`,
        source: chunk.source,
        content: chunk.content,
        similarity: Number(chunk.similarity),
      })),
    };
  };
}
