'use client';

import { useState } from 'react';

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
 * LazyImage — DailyHunt-style progressive image loading.
 *
 * - `eager=true`  → above-the-fold images: no shimmer, loading="eager", fetchpriority="high"
 * - `eager=false` → below-the-fold images: shimmer placeholder + loading="lazy"
 */
export default function LazyImage({ src, alt, className = '', imgStyle, eager = false }: LazyImageProps) {
  const [loaded, setLoaded] = useState(eager); // eager images are treated as already loaded
  const [errored, setErrored] = useState(false);

  if (eager) {
    // Above-the-fold: render immediately, no shimmer, high priority
    return errored ? (
      <div className="lazy-error" aria-label="Image unavailable">
        <span>📰</span>
      </div>
    ) : (
      <img
        src={src}
        alt={alt}
        loading="eager"
        // @ts-expect-error — fetchpriority is valid HTML but not yet in TS types
        fetchpriority="high"
        decoding="sync"
        className={`lazy-img lazy-img--loaded ${className}`}
        style={imgStyle}
        onError={() => setErrored(true)}
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
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`lazy-img ${loaded ? 'lazy-img--loaded' : ''} ${className}`}
          style={imgStyle}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
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
