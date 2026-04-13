import Link from 'next/link';

// Deterministic color from tag string so each tag always gets the same color
// Specific allowed Dark colors
const TAG_COLORS = [
  'bg-[#8b0000]',  // Dark Red
  'bg-[#000080]',  // Navy Blue
  'bg-[#5d4037]',  // Dark Brown
  'bg-[#ad1457]',  // Dark Pink
  'bg-[#1b5e20]',  // Dark Green
];

function getTagColor(tag: string, index?: number): string {
  // If index is provided, use it to ensure uniqueness if the list is small
  if (typeof index === 'number') {
    return TAG_COLORS[index % TAG_COLORS.length];
  }
  
  // Fallback to deterministic hash
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

type TagBadgeProps = {
  tag: string;
  withHash?: boolean;
  index?: number;
};

export default function TagBadge({ tag, withHash = true, index }: TagBadgeProps) {
  const trimmed = tag.trim();
  const colorClass = getTagColor(trimmed, index);

  return (
    <Link
      href={`/?tag=${encodeURIComponent(trimmed)}`}
      className={`${colorClass} inline-block rounded-full px-5 py-1.5 text-[11.5px] font-extrabold text-white transition-opacity hover:opacity-80`}
    >
      {withHash ? `#${trimmed}` : trimmed}
    </Link>
  );
}
