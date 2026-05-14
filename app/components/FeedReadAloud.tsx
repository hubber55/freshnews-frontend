'use client';

import { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, formatDistanceToNow, isToday } from 'date-fns';

interface FeedReadAloudProps {
  tag: string;
  posts: {
    id: number;
    title: string;
    summary: string;
    published_at?: string;
  }[];
}

export default function FeedReadAloud({ tag, posts }: FeedReadAloudProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const wakeLockRef = useRef<any>(null);
  const isReadingRef = useRef(false);
  const skipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      setSupported(true);
    }
    return () => stopSpeaking();
  }, []);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {}
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  const stopSpeaking = () => {
    if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
    if (synthRef.current) synthRef.current.cancel();
    isReadingRef.current = false;
    setIsSpeaking(false);
    setCurrentIndex(null);
    releaseWakeLock();
  };

  const stripHtml = (html: string) => {
    if (typeof window === 'undefined') return html;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const speakSequentially = (index: number) => {
    if (!synthRef.current || !isReadingRef.current) return;
    if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);

    if (index >= posts.length) {
      stopSpeaking();
      return;
    }

    if (index < 0) return;

    setCurrentIndex(index);
    synthRef.current.cancel();
    
    const rawTitle = posts[index].title;
    const rawSummary = stripHtml(posts[index].summary);
    
    let cleanSummary = rawSummary.replace(/([\u0D00-\u0D7F])\.([\u0D00-\u0D7F])/g, '$1$2');
    
    // Pattern to find common credit lines at the end and move to front
    const creditRegex = /(Photo and News Source|News Source|വാർത്താ ഉറവിടം|കടപ്പാട്|Courtesy|Source)\s*:.*$/i;
    const creditMatch = cleanSummary.match(creditRegex);
    let creditText = "";
    
    if (creditMatch) {
      creditText = creditMatch[0];
      cleanSummary = cleanSummary.replace(creditRegex, "").trim();
    }

    // TRUNCATION LOGIC: Stop at the first sign of garbage text remaining
    const garbagePatterns = [
      /photo\s*and\s*news\s*source/i,
      /photo\s*and/i,
      /photo\s*end/i,
      /photo\s*credits?/i,
      /ഫോട്ടോ\s*അവസാനിപ്പിക്കുന്നു/i,
      /ഫോട്ടോ\s*കടപ്പാട്/i
    ];

    for (const pattern of garbagePatterns) {
      const match = cleanSummary.match(pattern);
      if (match && match.index !== undefined) {
        cleanSummary = cleanSummary.substring(0, match.index).trim();
      }
    }

    const cleanTitle = rawTitle.replace(/([\u0D00-\u0D7F])\.([\u0D00-\u0D7F])/g, '$1$2');
    
    // Calculate time text for narration
    let timeText = "";
    if (posts[index].published_at) {
      const pDate = new Date(posts[index].published_at);
      if (isToday(pDate)) {
        timeText = formatDistanceToNow(pDate, { addSuffix: true }).replace('about ', '');
      } else {
        timeText = format(pDate, 'MMMM d, yyyy');
      }
    }

    let fullPostText = "";
    if (index === 0) {
      fullPostText = `${tag} വിഭാഗത്തിലെ പ്രധാന വാർത്തകൾ കേൾക്കാം. ${creditText}. ${timeText}. ${cleanTitle}. ${cleanSummary}`;
    } else {
      fullPostText = `അടുത്ത വാർത്ത. ${creditText}. ${timeText}. ${cleanTitle}. ${cleanSummary}`;
    }

    const utterance = new SpeechSynthesisUtterance(fullPostText);
    const voices = synthRef.current.getVoices();
    const mlVoice = voices.find(v => v.lang.includes('ml-IN') || v.lang.includes('ml'));
    if (mlVoice) utterance.voice = mlVoice;
    
    utterance.lang = 'ml-IN';
    utterance.rate = 1.0;

    utterance.onend = () => {
      if (isReadingRef.current) {
        skipTimeoutRef.current = setTimeout(() => speakSequentially(index + 1), 1000);
      }
    };

    utterance.onerror = (e) => {
      if (e.error === 'interrupted') return;
      if (isReadingRef.current) stopSpeaking();
    };
    
    synthRef.current.speak(utterance);
  };

  const handleStart = async () => {
    if (!supported || !synthRef.current) return;
    setIsSpeaking(true);
    isReadingRef.current = true;
    await requestWakeLock();
    speakSequentially(0);
  };

  const handleNext = () => {
    if (currentIndex !== null && currentIndex < posts.length - 1) {
      speakSequentially(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex !== null && currentIndex > 0) {
      speakSequentially(currentIndex - 1);
    }
  };

  if (!supported || posts.length === 0) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {isSpeaking && (
          <div className="flex items-center gap-1 p-0.5 bg-[#ffd42a] rounded-xl text-black shadow-lg border border-transparent">
            <button 
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-2 hover:bg-black/10 rounded-lg disabled:opacity-20 transition-all active:scale-90"
            >
              <ChevronLeft size={18} strokeWidth={3} />
            </button>
            
            <button
              onClick={stopSpeaking}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-black/5 rounded-lg transition-all active:scale-95"
            >
              <VolumeX size={16} />
              <div className="flex flex-col items-start leading-none">
                <span className="text-[11px] font-black uppercase tracking-tighter">നിർത്തുക</span>
                <span className="text-[9px] font-bold opacity-70">
                  {currentIndex! + 1} / {posts.length}
                </span>
              </div>
            </button>

            <button 
              onClick={handleNext}
              disabled={currentIndex === posts.length - 1}
              className="p-2 hover:bg-black/10 rounded-lg disabled:opacity-20 transition-all active:scale-90"
            >
              <ChevronRight size={18} strokeWidth={3} />
            </button>
          </div>
        )}

        {!isSpeaking && (
          <button
            onClick={handleStart}
            className="group flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#ffd42a]/10 border border-[#ffd42a]/30 text-[#ffd42a] hover:bg-[#ffd42a]/20 hover:border-[#ffd42a] transition-all active:scale-95 shadow-sm"
          >
            <Volume2 size={16} className="group-hover:animate-bounce" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[12px] font-black uppercase tracking-wider">വാർത്തകൾ കേൾക്കാം</span>
              <span className="text-[9px] opacity-70 font-bold">{posts.length} വാർത്തകൾ</span>
            </div>
          </button>
        )}
      </div>
      
      {isSpeaking && (
        <div className="flex items-center gap-1.5 pr-2">
          <span className="text-[9px] font-bold text-[#ffd42a] tracking-widest animate-pulse uppercase">Active</span>
          <div className="flex gap-0.5 h-2 items-end">
            <div className="w-0.5 bg-[#ffd42a] animate-[bounce_1s_infinite] h-full"></div>
            <div className="w-0.5 bg-[#ffd42a] animate-[bounce_1.2s_infinite] h-[70%]"></div>
            <div className="w-0.5 bg-[#ffd42a] animate-[bounce_0.8s_infinite] h-[40%]"></div>
          </div>
        </div>
      )}
    </div>
  );
}
