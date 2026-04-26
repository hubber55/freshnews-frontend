'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Save, X, ChevronLeft, HelpCircle } from 'lucide-react';

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
      const { createClient } = await import('@/app/utils/supabase/client');
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'site_faqs')
        .single();
        
      if (!error && data?.value) {
        try {
          const parsed = JSON.parse(data.value);
          setFaqs(parsed);
        } catch (e) {
          setFaqs([]);
        }
      } else {
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
      const { createClient } = await import('@/app/utils/supabase/client');
      const supabase = createClient();
      
      const { error } = await supabase
        .from('admin_settings')
        .upsert({ key: 'site_faqs', value: JSON.stringify(faqs) }, { onConflict: 'key' });

      if (!error) {
        setMessage('FAQs saved successfully!');
      } else {
        setMessage('Failed to save FAQs: ' + error.message);
      }
    } catch (err: any) {
      setMessage('Failed to save FAQs: ' + err.message);
    }

    setIsSaving(false);
    setTimeout(() => setMessage(null), 3000);
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
    <div className="p-8">
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
        
        <div className="flex items-center gap-3">
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
          message.includes('success') 
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
          faqs.map((faq) => (
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
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-[#ffd42a] mb-2">
                        {faq.question}
                      </h3>
                      <p className="text-white leading-relaxed">
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
          <li>Click the trash icon to delete</li>
          <li>Use "Add New" to create new FAQs</li>
          <li>Remember to click "Save All" when finished</li>
          <li>Questions appear in <span className="text-[#ffd42a]">Yellow</span>, Answers in <span className="text-white">White</span></li>
        </ul>
      </div>
    </div>
  );
}
