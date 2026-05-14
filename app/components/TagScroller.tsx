'use client';

import { useState } from 'react';
import Link from 'next/link';

type TagScrollerProps = {
  tags: string[];
  activeTag: string;
};

export default function TagScroller({ tags, activeTag }: TagScrollerProps) {
  const [optimisticTag, setOptimisticTag] = useState<string | null>(null);
  
  const currentActive = optimisticTag !== null ? optimisticTag : activeTag;

  return (
    <div className="mx-auto mt-4 w-full max-w-[1100px] px-5 sm:px-6">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
        {tags.map((tag: string) => (
          <Link
            key={tag}
            href={`/?tag=${encodeURIComponent(tag)}`}
            onClick={() => setOptimisticTag(tag)}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-extrabold transition-all duration-200 ${
              currentActive === tag
                ? 'border-[#00ffff] bg-transparent text-[#00ffff] shadow-[0_0_10px_rgba(0,255,255,0.3)]'
                : 'border-[var(--border)] bg-transparent text-[var(--text-muted)] hover:border-[#00ffff]/50 hover:text-[#00ffff]/80'
            }`}
            style={{ fontFamily: 'var(--font-en)' }}
          >
            {tag}
          </Link>
        ))}
      </div>
    </div>
  );
}
