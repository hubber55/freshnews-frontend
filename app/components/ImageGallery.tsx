'use client';

import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
      const index = Math.round(scrollRef.current.scrollLeft / (scrollRef.current.offsetWidth || 1));
      setCurrentIndex(index);
    }
  };

  const scrollToImage = (index: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: index * scrollRef.current.offsetWidth,
        behavior: 'smooth'
      });
    }
  };

  if (!images || images.length === 0) return null;

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-black/10">
      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {images.map((url, idx) => (
          <div
            key={idx}
            className="w-full flex-shrink-0 snap-center flex items-center justify-center bg-black/5"
            style={{ minHeight: '200px', maxHeight: '520px' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${alt} - ${idx + 1}`}
              loading={idx === 0 ? 'eager' : 'lazy'}
              style={{
                width: '100%',
                maxHeight: '520px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          {/* Left Arrow — always visible on desktop, not just on hover */}
          <button
            onClick={() => scrollToImage(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 text-white border border-white/20 hover:bg-black/80 transition-all z-20 disabled:opacity-20 disabled:cursor-not-allowed hidden md:flex items-center justify-center"
            aria-label="Previous image"
          >
            <ChevronLeft size={22} />
          </button>

          {/* Right Arrow — always visible on desktop */}
          <button
            onClick={() => scrollToImage(currentIndex + 1)}
            disabled={currentIndex === images.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 text-white border border-white/20 hover:bg-black/80 transition-all z-20 disabled:opacity-20 disabled:cursor-not-allowed hidden md:flex items-center justify-center"
            aria-label="Next image"
          >
            <ChevronRight size={22} />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-10 pointer-events-none">
            {images.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx ? 'bg-[#00cfff] w-6' : 'bg-white/40 w-1.5'
                }`}
              />
            ))}
          </div>

          {/* Counter badge */}
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[11px] px-2.5 py-1 rounded-full font-bold z-10 border border-white/10">
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}
