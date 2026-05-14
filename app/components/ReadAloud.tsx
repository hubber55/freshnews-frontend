'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';

interface ReadAloudProps {
  title: string;
  paragraphs: string[];
  onProgress?: (data: { paragraphIndex: number | null; wordIndex: number | null; charIndex: number | null }) => void;
}

export default function ReadAloud({ title, paragraphs, onProgress }: ReadAloudProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const bellBtnRef = useRef<HTMLButtonElement>(null);
  const wakeLockRef = useRef<any>(null);
  const isReadingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      setSupported(true);
    }

    return () => {
      stopSpeaking();
    };
  }, []);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      console.error('Wake Lock error:', err);
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    isReadingRef.current = false;
    setIsSpeaking(false);
    releaseWakeLock();
    onProgress?.({ paragraphIndex: null, wordIndex: null, charIndex: null });
  };

  const speakSequentially = (index: number) => {
    if (!synthRef.current || !isReadingRef.current) return;

    if (index >= paragraphs.length) {
      stopSpeaking();
      return;
    }

    const textToRead = index === -1 ? title : paragraphs[index];
    
    // Malayalam Abbreviation Fix:
    // This removes dots between Malayalam characters (e.g., കെ.പി.സി.സി -> കെപിസിസി)
    // so the TTS reads them as a single word instead of pausing at every dot.
    const cleanText = textToRead.replace(/([\u0D00-\u0D7F])\.([\u0D00-\u0D7F])/g, '$1$2');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    const voices = synthRef.current.getVoices();
    const mlVoice = voices.find(v => v.lang.includes('ml-IN') || v.lang.includes('ml'));
    if (mlVoice) utterance.voice = mlVoice;
    
    utterance.lang = 'ml-IN';
    utterance.rate = 0.85;

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        onProgress?.({ 
          paragraphIndex: index, 
          wordIndex: null, // We'll use charIndex to match spans in the UI
          charIndex: event.charIndex 
        });
      }
    };

    utterance.onstart = () => {
      onProgress?.({ paragraphIndex: index, wordIndex: 0, charIndex: 0 });
    };

    utterance.onend = () => {
      if (isReadingRef.current) {
        setTimeout(() => speakSequentially(index + 1), 500);
      }
    };

    utterance.onerror = () => stopSpeaking();

    synthRef.current.speak(utterance);
  };

  // Glow animation logic
  useEffect(() => {
    if (!isSpeaking || !supported) return;
    
    let timer: NodeJS.Timeout;
    function runGlow() {
      if (!bellBtnRef.current) return;
      bellBtnRef.current.classList.add('fx-glow-gold');
      setTimeout(() => {
        bellBtnRef.current?.classList.remove('fx-glow-gold');
      }, 5000);
      timer = setTimeout(runGlow, 8000);
    }
    runGlow();
    return () => clearTimeout(timer);
  }, [isSpeaking, supported]);

  const handleSpeak = async () => {
    if (!supported || !synthRef.current) return;

    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    setIsSpeaking(true);
    isReadingRef.current = true;
    await requestWakeLock();
    speakSequentially(-1);
  };

  if (!supported) return null;

  return (
    <div className="flex justify-end items-center gap-3 py-2 w-full">
      {isSpeaking && (
        <div className="flex gap-1 items-center">
          <span className="text-[10px] text-[#ffd42a]/60 font-bold uppercase animate-pulse tracking-tighter">വാർത്ത വായിക്കുന്നു</span>
          <div className="flex gap-0.5 h-3 items-end mb-1">
            <div className="w-0.5 bg-[#ffd42a] animate-[bounce_1s_infinite] h-full"></div>
            <div className="w-0.5 bg-[#ffd42a] animate-[bounce_1.2s_infinite] h-[70%]"></div>
            <div className="w-0.5 bg-[#ffd42a] animate-[bounce_0.8s_infinite] h-[40%]"></div>
          </div>
        </div>
      )}

      <button
        ref={bellBtnRef}
        onClick={handleSpeak}
        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full border transition-all active:scale-95 relative ${
          isSpeaking 
            ? 'bg-[#ffd42a] text-black border-transparent shadow-[0_4px_20px_rgba(255,212,42,0.5)]' 
            : 'bg-[#ffd42a]/10 border-[#ffd42a]/30 text-[#ffd42a] hover:bg-[#ffd42a]/20 hover:border-[#ffd42a]'
        }`}
      >
        {isSpeaking ? (
          <VolumeX size={18} />
        ) : (
          <Volume2 size={18} />
        )}
        
        <span className="text-[12px] font-black uppercase tracking-wider">
          {isSpeaking ? 'നിർത്തുക' : 'വാർത്ത കേൾക്കാം'}
        </span>
      </button>
    </div>
  );
}
