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
          {/* Desktop Navigation Arrows */}
          <button
            onClick={() => scrollToImage(currentIndex - 1)}
            disabled={currentIndex === 0}
            className={`absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white backdrop-blur-sm border border-white/10 transition-all duration-300 opacity-0 group-hover:opacity-100 hidden md:flex hover:bg-black/60 disabled:hidden z-10`}
            aria-label="Previous image"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={() => scrollToImage(currentIndex + 1)}
            disabled={currentIndex === images.length - 1}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white backdrop-blur-sm border border-white/10 transition-all duration-300 opacity-0 group-hover:opacity-100 hidden md:flex hover:bg-black/60 disabled:hidden z-10`}
            aria-label="Next image"
          >
            <ChevronRight size={20} />
          </button>

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
          
          {/* Index Indicator */}
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider z-10 border border-white/10">
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}
