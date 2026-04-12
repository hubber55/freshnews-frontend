'use client';

import { Facebook, MessageCircle, Share2, Twitter } from 'lucide-react';

type ShareButtonsProps = {
  title: string;
  url: string;
};

export default function ShareButtons({ title, url }: ShareButtonsProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <div className="mt-8 border-t border-[#373737] pt-6">
      <div className="mb-3 text-[17px] font-bold text-white">Share:</div>
      <div className="flex flex-wrap gap-3">
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded bg-[#1877f2] px-4 py-3 text-sm font-semibold text-white"
        >
          <Facebook size={18} />
          Facebook
        </a>
        <a
          href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded bg-[#1d9bf0] px-4 py-3 text-sm font-semibold text-white"
        >
          <Twitter size={18} />
          X
        </a>
        <a
          href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded bg-[#25d366] px-4 py-3 text-sm font-semibold text-white"
        >
          <MessageCircle size={18} />
          WhatsApp
        </a>
        <button
          type="button"
          onClick={handleNativeShare}
          className="inline-flex items-center gap-2 rounded bg-[#303030] px-4 py-3 text-sm font-semibold text-white"
        >
          <Share2 size={18} />
          Share
        </button>
      </div>
    </div>
  );
}