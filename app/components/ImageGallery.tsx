'use client';

import { useState, useRef } from 'react';
import LazyImage from './LazyImage';

interface ImageGalleryProps {
  images: string[];
  alt?: string;
}

export default function ImageGallery({ images, alt = 'Image' }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollRef.current) {
      const index = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
      setCurrentIndex(index);
    }
  };

  if (!images || images.length === 0) return null;

  return (
    <div className="relative w-full group overflow-hidden rounded-xl bg-black/20">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {images.map((url, idx) => (
          <div key={idx} className="w-full flex-shrink-0 snap-center relative aspect-video">
            <LazyImage
              src={url}
              alt={`${alt} - ${idx + 1}`}
              className="w-full h-full max-h-[500px] object-cover rounded-xl"
              eager={idx === 0}
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          {/* Navigation Dots */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10 pointer-events-none">
            {images.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx ? 'bg-[#00cfff] w-6' : 'bg-white/40 w-1.5'
                }`}
              />
            ))}
          </div>
          
          {/* Index Indicator (Mobile) */}
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider z-10 border border-white/10">
            {currentIndex + 1} / {images.length}
          </div>

          {/* Swipe Hint for First Visit (Optional, can be added later) */}
        </>
      )}
    </div>
  );
}
