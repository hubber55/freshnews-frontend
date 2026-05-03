'use client';

import { useState, useEffect, useRef } from 'react';

// Default placeholder image for news
const DEFAULT_PLACEHOLDER = '/images/news-placeholder.svg';

type LazyImageProps = {
  src: string;
  alt: string;
  className?: string;
  /** Extra inline styles for the <img> element */
  imgStyle?: React.CSSProperties;
  /**
   * When true, the image is above the fold — skip shimmer and load immediately
   * with loading="eager" and fetchpriority="high" for best LCP performance.
   * When false (default), use DailyHunt-style shimmer + lazy loading.
   */
  eager?: boolean;
};

/**
 * LazyImage — DailyHunt-style progressive image loading with retry logic.
 *
 * - `eager=true`  → above-the-fold images: no shimmer, loading="eager", fetchpriority="high"
 * - `eager=false` → below-the-fold images: shimmer placeholder + loading="lazy"
 */
export default function LazyImage({ src, alt, className = '', imgStyle, eager = false }: LazyImageProps) {
  const [loaded, setLoaded] = useState(eager);
  const [errored, setErrored] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset state when src changes
  useEffect(() => {
    setCurrentSrc(src);
    setLoaded(eager);
    setErrored(false);
    setRetryCount(0);
  }, [src, eager]);

  // Handle cached images that don't trigger onLoad
  useEffect(() => {
    if (imgRef.current?.complete) {
      setLoaded(true);
    }
  }, [currentSrc]);

  const handleError = () => {
    if (retryCount < 1 && currentSrc !== DEFAULT_PLACEHOLDER) {
      // Retry once with placeholder
      setRetryCount(1);
      setCurrentSrc(DEFAULT_PLACEHOLDER);
    } else {
      setErrored(true);
    }
  };

  if (eager) {
    // Above-the-fold: render immediately, no shimmer, high priority
    return errored ? (
      <div className="lazy-error" aria-label="Image unavailable">
        <span>📰</span>
      </div>
    ) : (
      <img
        src={currentSrc}
        alt={alt}
        loading="eager"
        // @ts-expect-error — fetchpriority is valid HTML but not yet in TS types
        fetchpriority="high"
        decoding="sync"
        referrerPolicy="no-referrer"
        className={`lazy-img lazy-img--loaded ${className}`}
        style={imgStyle}
        onError={handleError}
      />
    );
  }

  return (
    <>
      {/* Shimmer visible until image is loaded */}
      {!loaded && !errored && (
        <div className="lazy-shimmer" aria-hidden="true" />
      )}

      {/* The actual image — invisible until loaded, then fades in */}
      {!errored && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className={`lazy-img ${loaded ? 'lazy-img--loaded' : ''} ${className}`}
          style={imgStyle}
          onLoad={() => setLoaded(true)}
          onError={handleError}
        />
      )}

      {/* Fallback when image cannot load */}
      {errored && (
        <div className="lazy-error" aria-label="Image unavailable">
          <span>📰</span>
        </div>
      )}
    </>
  );
}
