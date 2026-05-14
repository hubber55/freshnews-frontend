export type PostRecord = {
  id: number;
  title: string;
  summary: string;
  image_url?: string | null;
  source_name?: string | null;
  tags?: string[] | null;
  published_at?: string | null;
  original_url?: string | null;
  is_deleted?: boolean;
  redirect_to?: string | null;
  faq?: Array<{ q: string; a: string }> | null;
  is_locked?: boolean;
  locked_position?: number | null;
  locked_until?: string | null;
};

export function stripHtml(value: string | null | undefined) {
  return (value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasMinimumWords(value: string | null | undefined, minWords = 70) {
  const clean = stripHtml(value);
  if (!clean) {
    return false;
  }

  return clean.split(/\s+/).filter(Boolean).length >= minWords;
}

export function limitWords(value: string | null | undefined, maxWords = 10) {
  const clean = stripHtml(value);
  if (!clean) {
    return '';
  }

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return clean;
  }

  return `${words.slice(0, maxWords).join(' ')}...`;
}

/**
 * Build a short snippet for homepage cards.
 * For Malayalam text a char-limit of ~100 is roughly 2 lines.
 */
export function buildPreview(value: string | null | undefined, maxLength = 140) {
  const clean = stripHtml(value);
  if (!clean) {
    return '';
  }

  const earlyStop = clean.slice(0, Math.min(clean.length, maxLength + 60));
  const sentenceBreak = earlyStop.search(/[.!?।॥]/);

  if (sentenceBreak >= 45 && sentenceBreak <= maxLength + 20) {
    return earlyStop.slice(0, sentenceBreak + 1).trim();
  }

  if (clean.length <= maxLength) {
    return clean;
  }

  const sliced = clean.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(' ');
  const preview = lastSpace > Math.floor(maxLength * 0.6) ? sliced.slice(0, lastSpace) : sliced;

  return `${preview.trim()}...`;
}

/**
 * Split a summary (which may contain HTML paragraph / br tags) into
 * real paragraphs for the detail page.
 *
 * Strategy:
 *   1. Convert </p>, <br>, <br/> into \n\n  BEFORE stripping the rest of the
 *      HTML so that paragraph boundaries survive.
 *   2. Split on double-newlines.
 *   3. If that yields fewer than 2 chunks, fall back to sentence-based splitting.
 */
export function splitParagraphs(value: string | null | undefined) {
  const raw = value ?? '';

  // -- Step 1: convert block-level boundaries to double-newlines -----------
  const withBreaks = raw
    .replace(/<\/p\s*>/gi, '\n\n')            // end of paragraph
    .replace(/<br\s*\/?>/gi, '\n\n')           // <br> / <br/>
    .replace(/<\/div\s*>/gi, '\n\n')           // end of div
    .replace(/<\/li\s*>/gi, '\n\n')            // end of list item
    .replace(/<\/h[1-6]\s*>/gi, '\n\n');       // end of heading

  // -- Step 2: strip remaining tags, then split on newline clusters --------
  const stripped = withBreaks
    .replace(/<[^>]*>/g, '')                   // remove remaining tags
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ');                  // collapse spaces (keep newlines)

  const explicitParagraphs = stripped
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  // If we already have good paragraphs, just return them
  if (explicitParagraphs.length >= 3) {
    return explicitParagraphs;
  }

  // -- Step 3: fallback – sentence-based grouping for continuous blocks -----
  // Split text at full stops after approximately 4-5 lines (~45-55 words)
  // to create natural reading paragraphs.
  const flattened = stripped.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!flattened) {
    return [];
  }

  const sentences = flattened.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [flattened];
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentWordCount = 0;
  const targetWordsPerParagraph = 50; // ~4-5 lines

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;
    
    const sentenceWordCount = trimmedSentence.split(/\s+/).length;
    
    // If adding this sentence would exceed target, start new paragraph
    if (currentWordCount > 0 && currentWordCount + sentenceWordCount > targetWordsPerParagraph) {
      chunks.push(currentChunk.join(' ').trim());
      currentChunk = [trimmedSentence];
      currentWordCount = sentenceWordCount;
    } else {
      currentChunk.push(trimmedSentence);
      currentWordCount += sentenceWordCount;
    }
  }
  
  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' ').trim());
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

export function formatSourceName(name: string | null | undefined): string {
  if (!name) return 'FreshNews';
  let formatted = name.replace(/Kerala Kaumudi Latest/gi, 'Kerala Kaumudi');
  formatted = formatted.replace(/Oneindia Malayalam/gi, 'OneIndia');
  return formatted.trim();
}

export function getFirstValidTag(tags: string[] | null | undefined, defaultTag: string): string {
  if (!tags || tags.length === 0) return defaultTag;
  const dateRegex = /\b\d{1,2}(st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b/i;
  const validTags = tags.filter(tag => !dateRegex.test(tag.trim()));
  return validTags.length > 0 ? formatSourceName(validTags[0]) : defaultTag;
}
