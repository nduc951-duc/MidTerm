const MAX_WORDS = 350;
const OVERLAP_WORDS = 50;

function splitWords(words) {
  const parts = [];
  const step = MAX_WORDS - OVERLAP_WORDS;
  for (let start = 0; start < words.length; start += step) {
    parts.push(words.slice(start, start + MAX_WORDS).join(' '));
  }
  return parts;
}

export function chunkMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let current = null;

  for (const line of lines) {
    const heading = line.match(/^##\s+(\d+)\.\s+(.+)$/);
    if (heading) {
      if (current) sections.push(current);
      current = { number: Number(heading[1]), title: heading[2].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  return sections.flatMap((section) => {
    const content = section.lines.join('\n').trim();
    const words = content.split(/\s+/).filter(Boolean);
    const pieces = words.length > MAX_WORDS ? splitWords(words) : [content];
    return pieces.filter(Boolean).map((text, partIndex) => ({
      sectionNumber: section.number,
      sectionTitle: section.title,
      source: `Section ${section.number} — ${section.title}`,
      partIndex,
      content: `Section ${section.number}: ${section.title}\n${text}`,
    }));
  });
}

export const chunkSettings = { maxWords: MAX_WORDS, overlapWords: OVERLAP_WORDS };
