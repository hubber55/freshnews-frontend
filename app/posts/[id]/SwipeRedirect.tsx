'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SwipeRedirectProps {
  category?: string;
}

export default function SwipeRedirect({ category }: SwipeRedirectProps) {
  const router = useRouter();
  const [startY, setStartY] = useState<number | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        setStartY(e.touches[0].clientY);
      } else {
        setStartY(null);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startY === null) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      if (diff > 150) {
        // Redirect to category or main classifieds
        if (category) {
          router.push(`/classifieds?tag=${category}`);
        } else {
          router.push('/classifieds');
        }
        setStartY(null);
      }
    };

    const handleTouchEnd = () => {
      setStartY(null);
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [startY, router, category]);

  return null;
}
