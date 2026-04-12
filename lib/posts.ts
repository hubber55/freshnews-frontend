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

  const sentences = clean.match(/[^.!?]+[.!?]?/g)?.map((item) => item.trim()).filter(Boolean) ?? [clean];
  let preview = '';

  for (const sentence of sentences) {
    const nextValue = preview ? `${preview} ${sentence}` : sentence;
    preview = nextValue.trim();
    if (preview.length >= 170 || preview.endsWith('.')) {
      break;
    }
  }

  if (!/[.!?]$/.test(preview)) {
    const periodIndex = clean.indexOf('.', Math.min(clean.length - 1, 120));
    if (periodIndex > 0) {
      return clean.slice(0, periodIndex + 1).trim();
    }
  }

  return preview;
}

export function splitParagraphs(value: string | null | undefined) {
  return (value ?? '')
    .split(/\n{2,}/)
    .map((part) => stripHtml(part))
    .filter(Boolean);
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://freshnews.top';
}