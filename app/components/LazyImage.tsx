'use client';

import { useState } from 'react';

type LazyImageProps = {
  src: string;
  alt: string;
  className?: string;
  /** Extra inline styles for the <img> element */
  imgStyle?: React.CSSProperties;
};

/**
 * LazyImage — DailyHunt-style progressive image loading.
 *
 * 1. Renders a shimmer skeleton immediately (placeholder).
 * 2. Loads the real image off-screen with loading="lazy" decoding="async".
 * 3. When it loads, fades in the image over the shimmer.
 * 4. If it errors, keeps showing the shimmer (graceful degradation).
 */
export default function LazyImage({ src, alt, className = '', imgStyle }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

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
