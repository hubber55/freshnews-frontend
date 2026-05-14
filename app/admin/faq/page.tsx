'use client';
export const runtime = 'edge';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Save, X, ChevronLeft, HelpCircle, ChevronUp, ChevronDown } from 'lucide-react';

type FAQItem = {
  id: number;
  question: string;
  answer: string;
};

export default function AdminFAQPage() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFaqs() {
      try {
        const res = await fetch('/api/admin/settings');
        if (!res.ok) throw new Error('Failed to fetch settings');
        const data = await res.json();
        const faqSetting = data.settings?.find((s: any) => s.key === 'site_faqs');
        
        if (faqSetting?.value) {
          try {
            const parsed = JSON.parse(faqSetting.value);
            setFaqs(Array.isArray(parsed) ? parsed : []);
          } catch (e) {
            setFaqs([]);
          }
        } else {
          setFaqs([]);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setFaqs([]);
      }
      setIsLoading(false);
    }
    
    fetchFaqs();
  }, []);

  const handleAddNew = () => {
    const newId = faqs.length > 0 ? Math.max(...faqs.map(f => f.id)) + 1 : 1;
    const newFAQ: FAQItem = {
      id: newId,
      question: 'New Question',
      answer: 'New Answer',
    };
    setFaqs([...faqs, newFAQ]);
    startEditing(newFAQ);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this FAQ?')) {
      setFaqs(faqs.filter(f => f.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setEditQuestion('');
        setEditAnswer('');
      }
    }
  };

  const startEditing = (faq: FAQItem) => {
    setEditingId(faq.id);
    setEditQuestion(faq.question);
    setEditAnswer(faq.answer);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditQuestion('');
    setEditAnswer('');
  };

  const saveEditing = () => {
    if (!editQuestion.trim() || !editAnswer.trim()) {
      setMessage('Question and answer cannot be empty');
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setFaqs(faqs.map(f => 
      f.id === editingId 
        ? { ...f, question: editQuestion.trim(), answer: editAnswer.trim() }
        : f
    ));
    setEditingId(null);
    setEditQuestion('');
    setEditAnswer('');
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'site_faqs', value: JSON.stringify(faqs) }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save FAQs');
      }

      setMessage('FAQs saved successfully!');
    } catch (err: any) {
      setMessage('Failed to save FAQs: ' + err.message);
    }

    setIsSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newFaqs = [...faqs];
    [newFaqs[index - 1], newFaqs[index]] = [newFaqs[index], newFaqs[index - 1]];
    setFaqs(newFaqs);
  };

  const moveDown = (index: number) => {
    if (index === faqs.length - 1) return;
    const newFaqs = [...faqs];
    [newFaqs[index], newFaqs[index + 1]] = [newFaqs[index + 1], newFaqs[index]];
    setFaqs(newFaqs);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffd42a]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 pb-32">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin"
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-white transition-colors"
        >
          <ChevronLeft size={20} />
          Back to Dashboard
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#ffd42a]/10 p-3">
            <HelpCircle size={24} className="text-[#ffd42a]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Manage FAQs</h1>
            <p className="text-[var(--text-muted)] text-sm">Add, edit, or delete FAQ entries</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              const defaultFaqs = [
                {
                  id: 0,
                  question: 'What are your unique features?',
                  answer: 'We are more than just a news source! You can post your own Classifieds, local Events, Ads, and even your own News stories. \n\nKey features include:\n- **Read Aloud:** Simply close your eyes, relax, and let our site read the news for you. Perfect for driving (connect to Bluetooth in your car) or relaxing. You can skip between stories or go back to a previous one easily. This feature is also available for Classifieds!\n- **Zoom In:** Unlike many other apps, we allow you to zoom in on images and content to take a closer look at what matters to you.',
                },
                {
                  id: 1,
                  question: 'What is FreshNews?',
                  answer: 'FreshNews is a Malayalam news aggregator platform where you can read the latest news, submit your own news stories, events, and classified advertisements for free.',
                },
                {
                  id: 2,
                  question: 'How do I submit news or events?',
                  answer: 'Simply create an account using your WhatsApp number, then click on "Submit News" or "Submit Events" from the menu. Fill in the details and your submission will be reviewed by our editors before publishing.',
                },
                {
                  id: 3,
                  question: 'Is it free to post classified ads?',
                  answer: 'Yes! Posting classified advertisements on FreshNews is completely free. You can post ads for jobs, real estate, services, items for sale, and more.',
                },
                {
                  id: 7,
                  question: 'What is the ideal size for advertisements?',
                  answer: 'For the best results, use a 16:9 aspect ratio (e.g., 1280x720 pixels) for mobile users, or a 21:9 aspect ratio (e.g., 1600x685 pixels) for desktop users. To ensure your message is never cut off, keep important text and logos within the central 60% of the image.',
                }
              ];
              if (confirm('This will load the default system FAQs into your list. You can then edit or save them. Continue?')) {
                setFaqs(defaultFaqs);
              }
            }}
            className="flex items-center gap-2 rounded-lg border border-[#ffd42a]/30 bg-[#ffd42a]/5 px-4 py-2 font-bold text-[#ffd42a] hover:bg-[#ffd42a]/10 transition-all"
          >
            Load Defaults
          </button>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 rounded-lg bg-[#00cfff] px-4 py-2 font-bold text-[#0d1117] hover:brightness-110 transition-all"
          >
            <Plus size={18} />
            Add New
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-[#90ee90] px-4 py-2 font-bold text-[#0d1117] hover:brightness-110 transition-all disabled:opacity-50"
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 rounded-xl p-4 text-sm font-semibold ${
          message.includes('successfully') 
            ? 'bg-[#90ee90]/10 border border-[#90ee90]/30 text-[#90ee90]' 
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message}
        </div>
      )}

      {/* FAQ List */}
      <div className="space-y-4">
        {faqs.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)]">
            No FAQs yet. Click "Add New" to create one.
          </div>
        ) : (
          faqs.map((faq, index) => (
            <div
              key={faq.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden"
            >
              {editingId === faq.id ? (
                // Edit Mode
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Question <span className="text-[#ffd42a]">(Yellow Heading)</span>
                    </label>
                    <input
                      type="text"
                      value={editQuestion}
                      onChange={(e) => setEditQuestion(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-[#ffd42a] font-bold focus:border-[#ffd42a] focus:outline-none"
                      placeholder="Enter question..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Answer <span className="text-white">(White Text)</span>
                    </label>
                    <textarea
                      value={editAnswer}
                      onChange={(e) => setEditAnswer(e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#ffd42a] focus:outline-none resize-vertical"
                      placeholder="Enter answer..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={saveEditing}
                      className="flex items-center gap-2 rounded-lg bg-[#90ee90] px-4 py-2 font-bold text-[#0d1117] hover:brightness-110"
                    >
                      <Save size={16} />
                      Save
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 font-bold text-[var(--text-secondary)] hover:bg-[var(--border)]"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div 
                  className="p-6 cursor-pointer hover:bg-[var(--bg-primary)] transition-colors"
                  onClick={() => startEditing(faq)}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-1 mt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveUp(index);
                        }}
                        disabled={index === 0}
                        className="p-1 rounded bg-white/5 text-[var(--text-muted)] hover:bg-white/10 hover:text-white disabled:opacity-0"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveDown(index);
                        }}
                        disabled={index === faqs.length - 1}
                        className="p-1 rounded bg-white/5 text-[var(--text-muted)] hover:bg-white/10 hover:text-white disabled:opacity-0"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-[#ffd42a] mb-2">
                        {faq.question}
                      </h3>
                      <p className="text-white leading-relaxed whitespace-pre-line">
                        {faq.answer}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(faq.id);
                      }}
                      className="flex-shrink-0 p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete FAQ"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-muted)]">
        <p className="font-semibold mb-2">Instructions:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Click on any FAQ to edit it</li>
          <li>Use the arrows on the left to reorder FAQs</li>
          <li>Click the trash icon to delete</li>
          <li>Use "Add New" to create new FAQs</li>
          <li>Use "Load Defaults" to quickly pull in standard system FAQs</li>
          <li>Remember to click "Save All" when finished</li>
          <li>Questions appear in <span className="text-[#ffd42a]">Yellow</span>, Answers in <span className="text-white">White</span></li>
        </ul>
      </div>
    </div>
  );
}
