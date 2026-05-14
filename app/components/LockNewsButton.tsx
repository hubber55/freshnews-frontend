'use client';

import { useState } from 'react';
import { Info, Lock } from 'lucide-react';
import Link from 'next/link';

interface LockNewsButtonProps {
  postId: number;
}

export default function LockNewsButton({ postId }: LockNewsButtonProps) {
  return (
    <div className="relative flex items-center gap-1.5">
      <Link 
        href={`/lock-news/${postId}`}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00ffff]/10 border border-[#00ffff]/30 text-[#00ffff] hover:bg-[#00ffff] hover:text-black transition-all group"
      >
        <Lock size={10} className="group-hover:scale-110 transition-transform" />
        <span className="text-[9px] font-black uppercase tracking-wider">Lock News</span>
      </Link>
    </div>
  );
}
