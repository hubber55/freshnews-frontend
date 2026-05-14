'use client';

import { useState } from 'react';
import ReadAloud from '../../components/ReadAloud';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import { formatSourceName } from '../../../lib/posts';

interface BodyItem {
  text: string;
  isCredit: boolean;
}

interface ArticleContentProps {
  post: {
    id: number;
    title: string;
    summary: string;
    image_url?: string | null;
    original_url?: string | null;
    source_name?: string | null;
    published_at?: string | null;
  };
  bodyItems: BodyItem[];
  readingTime: string;
}

export default function ArticleContent({ post, bodyItems, readingTime }: ArticleContentProps) {
  const [progress, setProgress] = useState<{ paragraphIndex: number | null; charIndex: number | null }>({
    paragraphIndex: null,
    charIndex: null
  });

  const publishedDate = post.published_at ? new Date(post.published_at) : null;

  // Extract only text paragraphs for the reader (skip credits)
  const readableParagraphs = bodyItems
    .filter(item => !item.isCredit)
    .map(item => item.text);

  // Map readable index back to total bodyItems index
  const getBodyItemIndex = (readableIdx: number | null) => {
    if (readableIdx === null || readableIdx === -1) return readableIdx;
    let count = 0;
    for (let i = 0; i < bodyItems.length; i++) {
      if (!bodyItems[i].isCredit) {
        if (count === readableIdx) return i;
        count++;
      }
    }
    return null;
  };

  const activeBodyIdx = getBodyItemIndex(progress.paragraphIndex);

  // Helper to render text with word highlighting
  const renderHighlightedText = (text: string, isParagraphActive: boolean, currentCharIndex: number | null) => {
    if (!isParagraphActive || currentCharIndex === null) return text;

    // Split into words but keep track of original char offsets
    const words = text.split(/(\s+)/);
    let offset = 0;

    return words.map((word, idx) => {
      const start = offset;
      offset += word.length;
      
      // Check if this word contains the current char index
      const isWordActive = currentCharIndex >= start && currentCharIndex < offset;

      return (
        <span 
          key={idx} 
          className={`transition-colors duration-200 ${isWordActive ? 'bg-yellow-400 text-black font-black px-0.5 rounded' : ''}`}
        >
          {word}
        </span>
      );
    });
  };

  return (
    <>
      {/* TITLE WITH HIGHLIGHT */}
      <h1 className={`post-title mb-5 transition-all duration-700 ${
        progress.paragraphIndex === -1 ? 'scale-[1.005]' : 'text-[#00ffff]'
      }`}>
        {renderHighlightedText(post.title, progress.paragraphIndex === -1, progress.charIndex)}
      </h1>

      {/* READ ALOUD BUTTON */}
      <div className="mb-6 flex justify-end">
        <ReadAloud 
          title={post.title} 
          paragraphs={readableParagraphs} 
          onProgress={(data) => setProgress({ paragraphIndex: data.paragraphIndex, charIndex: data.charIndex })}
        />
      </div>
      
      {/* META */}
      <div className="mb-6 flex flex-wrap items-center gap-4 border-t border-b border-[var(--border)] py-3 text-[12px] text-[#ffd42a]" style={{ fontFamily: 'var(--font-en)' }}>
        <span className="px-2.5 py-1 rounded bg-[#ffd42a]/10 text-[#ffd42a] font-bold text-[10px] uppercase tracking-wider border border-[#ffd42a]/30">
          Article
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={14} />
          {readingTime}
        </span>
      </div>

      {/* IMAGE */}
      {/* IMAGE */}
      <div className="mb-8 w-full overflow-hidden rounded-xl">
        {post.image_url ? (
          (post.image_url.startsWith('["') ? JSON.parse(post.image_url) : [post.image_url]).map((url: string, idx: number) => (
            <img
              key={idx}
              src={url}
              alt={`${post.title} - Image ${idx + 1}`}
              className="w-full max-h-[500px] object-cover object-center rounded-lg shadow-lg"
            />
          ))
        ) : (
          <div className="flex h-48 w-full items-center justify-center bg-[#21262d] text-sm text-[var(--text-muted)] rounded-lg">
            No Image Available
          </div>
        )}
      </div>

      {/* SUMMARY DISCLAIMER - DIRECTLY BELOW IMAGE */}
      <div className="mb-8 px-2">
        <p className="text-[12px] font-bold text-[#00ffff] italic leading-relaxed">
          Note: This is just a Summary. Read the full article at the source below..
        </p>
      </div>

      {/* BODY WITH HIGHLIGHTING */}
      <div className="article-body text-[var(--text-primary)]">

        {bodyItems.map((item, index) => {
          if (item.isCredit) {
            const [prefix, ...nameParts] = item.text.split(':');
            const sourceName = nameParts.join(':').trim();
            return (
              <p key={index} className="text-[14px] italic opacity-90 mt-12 mb-8 leading-relaxed font-semibold">
                {prefix}: <span className="text-[#00ffff]">
                  {post.original_url ? <a href={post.original_url} target="_blank" rel="nofollow" className="hover:underline underline-offset-4 decoration-2">{sourceName || formatSourceName(post.source_name)}</a> : (sourceName || formatSourceName(post.source_name))}
                </span>
              </p>
            );
          }

          const isActive = index === activeBodyIdx;

          return (
            <p
              key={index}
              className={`mb-6 leading-loose transition-all duration-500 rounded-xl ${
                isActive 
                  ? 'bg-[#ffd42a]/10 text-white font-medium p-4 -mx-2 border-l-[6px] border-[#ffd42a] shadow-lg' 
                  : 'text-[var(--text-primary)]'
              }`}
            >
              {renderHighlightedText(item.text, isActive, progress.charIndex)}
            </p>
          );
        })}
      </div>
    </>
  );
}
