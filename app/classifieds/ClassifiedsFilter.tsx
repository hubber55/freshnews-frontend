'use client';

import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';

type ClassifiedFilterProps = {
  allTags: string[];
  onFilterChange: (search: string, activeTag: string | null) => void;
};

export default function ClassifiedsFilter({ allTags, onFilterChange }: ClassifiedFilterProps) {
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Ghost text for inline autocomplete
  const ghostText = useMemo(() => {
    if (search.length < 2) return '';
    const match = allTags.find(tag => 
      tag.toLowerCase().startsWith(search.toLowerCase()) && 
      tag.toLowerCase() !== search.toLowerCase()
    );
    if (match) {
      return match.slice(search.length);
    }
    return '';
  }, [search, allTags]);

  const suggestions = useMemo(() => {
    if (search.length < 2 || !showSuggestions) return [];
    return allTags.filter(tag => 
      tag.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 5);
  }, [search, allTags, showSuggestions]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setShowSuggestions(true);
    onFilterChange(val, activeTag);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Tab' || e.key === 'Enter') && ghostText) {
      e.preventDefault();
      const completedText = search + ghostText;
      setSearch(completedText);
      setShowSuggestions(false);
      onFilterChange(completedText, activeTag);
    }
  };

  const selectSuggestion = (tag: string) => {
    setSearch(tag);
    setShowSuggestions(false);
    onFilterChange(tag, activeTag);
  };

  const renderWithBold = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <b key={i} className="text-white font-black">{part}</b>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div className="mb-8 space-y-4">
      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10 text-white/60 group-focus-within:text-[#00ffff] transition-colors">
          <Search size={18} />
        </div>
        
        <div className="relative flex items-center">
          {/* Ghost Text Overlay */}
          <div className="absolute left-12 right-4 py-4 text-[15px] pointer-events-none whitespace-pre">
            <span className="text-transparent">{search}</span>
            <span className="text-white/40">{ghostText}</span>
          </div>

          <input
            type="text"
            placeholder="Search by town, city, or keyword..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="w-full rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] py-4 pl-12 pr-4 text-[15px] text-[#ffffff] placeholder:text-[#ffffff] focus:border-[#00ffff] focus:outline-none focus:ring-1 focus:ring-[#00ffff] transition-all"
          />
        </div>

        {search && (
          <button 
            onClick={() => {
              setSearch('');
              onFilterChange('', activeTag);
            }}
            className="absolute inset-y-0 right-4 flex items-center text-[var(--text-muted)] hover:text-white z-10"
          >
            <X size={16} />
          </button>
        )}

        {/* Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-2 rounded-2xl bg-[#161b22]/95 backdrop-blur-xl border border-[var(--border)] overflow-hidden shadow-2xl">
            {suggestions.map((tag) => (
              <button
                key={tag}
                onClick={() => selectSuggestion(tag)}
                className="w-full text-left px-5 py-3.5 text-[14px] text-white/80 hover:bg-[#00ffff]/10 hover:text-[#00ffff] transition-colors border-b border-[var(--border)] last:border-0 flex items-center gap-3"
              >
                <Search size={14} className="opacity-50" />
                {renderWithBold(tag, search)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
