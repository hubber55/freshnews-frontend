export type PostRecord = {
  id: number;
  title: string;
  summary: string;
  image_url?: string | null;
  source_name?: string | null;
  tags?: string[] | null;
  published_at?: string | null;
  original_url?: string | null;
};

export function stripHtml(value: string | null | undefined) {
  return (value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildPreview(value: string | null | undefined) {
  const clean = stripHtml(value);
  if (!clean) {
    return '';
  }

  const maxLength = 210;
  const earlyStop = clean.slice(0, Math.min(clean.length, 260));
  const sentenceBreak = earlyStop.search(/[.!?।॥]/);

  if (sentenceBreak >= 80) {
    return earlyStop.slice(0, sentenceBreak + 1).trim();
  }

  if (clean.length <= maxLength) {
    return clean;
  }

  const sliced = clean.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(' ');
  const preview = lastSpace > 120 ? sliced.slice(0, lastSpace) : sliced;

  return `${preview.trim()}...`;
}

export function splitParagraphs(value: string | null | undefined) {
  const clean = value ?? '';
  const explicitParagraphs = clean
    .split(/\n{2,}/)
    .map((part) => stripHtml(part))
    .filter(Boolean);

  if (explicitParagraphs.length >= 2) {
    return explicitParagraphs;
  }

  const flattened = stripHtml(clean);
  if (!flattened) {
    return [];
  }

  const sentences = flattened
    .split(/(?<=[.!?।॥])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (sentences.length >= 4) {
    const chunkSize = Math.ceil(sentences.length / 4);
    const chunks: string[] = [];

    for (let index = 0; index < sentences.length; index += chunkSize) {
      chunks.push(sentences.slice(index, index + chunkSize).join(' ').trim());
    }

    return chunks.filter(Boolean);
  }

  const words = flattened.split(' ').filter(Boolean);
  const chunks: string[] = [];

  for (let index = 0; index < words.length; index += 45) {
    chunks.push(words.slice(index, index + 45).join(' ').trim());
  }

  return chunks.filter(Boolean);
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://freshnews.top';
}

export function shortenTitle(value: string | null | undefined, maxLength = 95) {
  const clean = stripHtml(value);
  if (clean.length <= maxLength) {
    return clean;
  }

  const sliced = clean.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(' ');
  const shortened = lastSpace > 55 ? sliced.slice(0, lastSpace) : sliced;

  return `${shortened.trim()}...`;
}