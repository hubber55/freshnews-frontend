import Link from 'next/link';

// Deterministic color from tag string so each tag always gets the same color
const TAG_COLORS = [
  'bg-[#e63946]',  // red
  'bg-[#2196f3]',  // blue
  'bg-[#00b894]',  // green
  'bg-[#ff9800]',  // orange
  'bg-[#9c27b0]',  // purple
  'bg-[#00bcd4]',  // cyan
  'bg-[#e91e63]',  // pink
  'bg-[#4caf50]',  // green2
  'bg-[#ff5722]',  // deep orange
  'bg-[#3f51b5]',  // indigo
  'bg-[#009688]',  // teal
  'bg-[#795548]',  // brown
  'bg-[#607d8b]',  // blue-grey
  'bg-[#f44336]',  // red2
  'bg-[#8bc34a]',  // lime
];

function hashTag(tag: string): number {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

type TagBadgeProps = {
  tag: string;
  withHash?: boolean;
};

export default function TagBadge({ tag, withHash = true }: TagBadgeProps) {
  const trimmed = tag.trim();
  const colorClass = TAG_COLORS[hashTag(trimmed) % TAG_COLORS.length];

  return (
    <Link
      href={`/?tag=${encodeURIComponent(trimmed)}`}
      className={`${colorClass} inline-block rounded-full px-5 py-1.5 text-[11.5px] font-extrabold text-white transition-opacity hover:opacity-80`}
    >
      {withHash ? `#${trimmed}` : trimmed}
    </Link>
  );
}
