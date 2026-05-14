export const runtime = 'edge';
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Megaphone, Trash2, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, MessageSquareCheck, XCircle } from 'lucide-react';

type MarketingNumber = { id: number; phone_number: string; status: string; category: string };

export default function MarketingAdminPage() {
  const [stats, setStats] = useState({ pending: 0, messaged: 0, replied: 0, invalid: 0 });
  const [allNumbers, setAllNumbers] = useState<MarketingNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [numbersInput, setNumbersInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [expandedStat, setExpandedStat] = useState<string | null>(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [selectedSubcatName, setSelectedSubcatName] = useState<string>('');

  const [templates, setTemplates] = useState<any[]>([]);
  const [newTemplateCatId, setNewTemplateCatId] = useState<string>('');
  const [newTemplateSubcat, setNewTemplateSubcat] = useState<string>('');
  const [newTemplateText, setNewTemplateText] = useState<string>('');

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/marketing');
      const data = await res.json();
      setStats(data.stats || { pending: 0, messaged: 0, replied: 0 });
      setAllNumbers(data.numbers || []);
      setTemplates(data.templates || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetch('/api/admin/categories')
      .then(res => res.json())
      .then(data => {
        setCategories(data.categories || []);
        setSubcategories(data.subcategories || []);
      })
      .catch(console.error);
  }, []);

  const handleUpload = async () => {
    if (!numbersInput.trim() || !selectedSubcatName) {
      setMessage('Error: Please select a subcategory and enter numbers.');
      return;
    }
    setIsSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload_numbers', numbers: numbersInput, category: selectedSubcatName })
      });
      const data = await res.json();
      if (data.ok) {
        setMessage(`Success! Processed ${data.added} numbers. (Duplicates ignored)`);
        setNumbersInput('');
        fetchStats();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setMessage(`Failed: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTemplate = async () => {
    if (!newTemplateSubcat || !newTemplateText.trim()) return;
    try {
      await fetch('/api/admin/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_template', category: newTemplateSubcat, message_text: newTemplateText.trim() })
      });
      setNewTemplateText('');
      fetchStats();
    } catch { alert('Failed to add template'); }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      await fetch('/api/admin/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_template', id })
      });
      fetchStats();
    } catch { alert('Failed to delete template'); }
  };

  const handleClearReplied = async () => {
    if (!confirm('Are you sure you want to delete all messaged and replied numbers?')) return;
    try {
      await fetch('/api/admin/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_replied' })
      });
      fetchStats();
      setMessage('Successfully cleared old contacted numbers.');
    } catch { alert('Failed to clear'); }
  };

  const toggleExpand = (status: string) => {
    setExpandedStat(prev => prev === status ? null : status);
  };

  const filteredNumbers = (status: string) => allNumbers.filter(n => n.status === status);

  const statCards = [
    { key: 'pending', label: 'Pending Queue', icon: Clock, color: '#ffd42a', count: stats.pending },
    { key: 'messaged', label: 'Messaged', icon: MessageSquareCheck, color: '#00ffff', count: stats.messaged },
    { key: 'replied', label: 'Replied', icon: AlertCircle, color: '#25D366', count: stats.replied },
    { key: 'invalid', label: 'No WhatsApp', icon: XCircle, color: '#ef4444', count: stats.invalid },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/admin" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-white transition-colors mb-4">
            <ArrowLeft size={16} />
            <span>Back to Admin</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-white mb-2 flex items-center gap-3">
            <Megaphone className="text-[#25D366]" size={32} />
            WhatsApp Outreach
          </h1>
          <p className="text-[var(--text-muted)]">Upload classifieds numbers and manage your marketing queue.</p>
        </div>
      </div>

      {/* STATS WITH EXPANDABLE NUMBER LISTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {statCards.map(({ key, label, icon: Icon, color, count }) => (
          <div key={key} className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] overflow-hidden">
            <button
              className="w-full p-6 flex flex-col items-center text-center hover:bg-white/5 transition-colors"
              onClick={() => toggleExpand(key)}
            >
              <Icon style={{ color }} className="mb-2" size={32} />
              <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-wider mb-1">{label}</p>
              <h3 className="text-4xl font-black text-white">{loading ? '...' : count}</h3>
              {count > 0 && (
                <div className="mt-2 text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                  {expandedStat === key ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {expandedStat === key ? 'Hide numbers' : 'Show numbers'}
                </div>
              )}
            </button>

            {expandedStat === key && filteredNumbers(key).length > 0 && (
              <div className="border-t border-[var(--border)] max-h-64 overflow-y-auto">
                {filteredNumbers(key).map(n => (
                  <div key={n.id} className="flex items-center justify-between px-4 py-2 border-b border-white/5 last:border-0 hover:bg-white/5">
                    <div>
                      <span className="text-white font-mono text-sm">{n.phone_number}</span>
                      <span className="ml-2 text-[10px] text-[var(--text-muted)] uppercase">{n.category}</span>
                    </div>
                    {n.status === 'messaged' && (
                      <span title="Messaged" className="flex items-center gap-1 text-[10px] font-bold text-[#00ffff]">
                        <MessageSquareCheck size={14} />
                        Sent
                      </span>
                    )}
                    {n.status === 'replied' && (
                      <span title="Replied" className="flex items-center gap-1 text-[10px] font-bold text-[#25D366]">
                        <CheckCircle size={14} />
                        Replied
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* UPLOAD NUMBERS */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Upload Numbers</h2>
          <button
            onClick={handleClearReplied}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg text-sm font-bold hover:bg-red-500/20 transition-colors"
          >
            <Trash2 size={16} /> Delete Replied / Messaged
          </button>
        </div>
        <p className="text-[var(--text-secondary)] text-sm mb-4">
          Select the Category and Subcategory for these numbers, then paste numbers separated by commas or new lines. The system will automatically remove duplicates.
        </p>
        <div className="flex gap-4 mb-4">
          <select
            className="flex-1 bg-[#1a1a1a] border border-[var(--border)] rounded-xl p-3 text-white focus:outline-none focus:border-[#25D366] transition-colors"
            value={selectedCatId}
            onChange={(e) => { setSelectedCatId(e.target.value); setSelectedSubcatName(''); }}
          >
            <option value="">1. Select Category...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            className="flex-1 bg-[#1a1a1a] border border-[var(--border)] rounded-xl p-3 text-white focus:outline-none focus:border-[#25D366] transition-colors disabled:opacity-50"
            value={selectedSubcatName}
            onChange={(e) => setSelectedSubcatName(e.target.value)}
            disabled={!selectedCatId}
          >
            <option value="">2. Select Subcategory...</option>
            {subcategories.filter(sc => sc.category_id.toString() === selectedCatId).map(sc => (
              <option key={sc.id} value={sc.name}>{sc.name}</option>
            ))}
          </select>
        </div>
        <textarea
          className="w-full h-32 bg-[#1a1a1a] border border-[var(--border)] rounded-xl p-4 text-white focus:outline-none focus:border-[#25D366] transition-colors mb-4 resize-none font-mono text-sm"
          placeholder={"919876543210\n918888888888\n917777777777"}
          value={numbersInput}
          onChange={(e) => setNumbersInput(e.target.value)}
        />
        <div className="flex items-center gap-4">
          <button
            onClick={handleUpload}
            disabled={isSubmitting || !numbersInput.trim() || !selectedSubcatName}
            className="bg-[#25D366] text-black font-bold py-3 px-8 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : 'Save Numbers to Queue'}
          </button>
          {message && (
            <span className={`text-sm font-bold ${message.startsWith('Error') || message.startsWith('Failed') ? 'text-red-500' : 'text-[#25D366]'}`}>
              {message}
            </span>
          )}
        </div>
      </div>

      {/* MESSAGE TEMPLATES */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] mb-6">
        <h2 className="text-xl font-bold text-white mb-2">Message Templates</h2>
        <p className="text-[var(--text-secondary)] text-sm mb-4">
          Create multiple variations of opening questions for each subcategory. The bot will pick one randomly when sending to avoid WhatsApp bans.
        </p>
        <div className="flex gap-4 mb-4">
          <select
            className="w-1/3 bg-[#1a1a1a] border border-[var(--border)] rounded-xl p-3 text-white focus:outline-none focus:border-[#25D366]"
            value={newTemplateCatId}
            onChange={(e) => { setNewTemplateCatId(e.target.value); setNewTemplateSubcat(''); }}
          >
            <option value="">Category...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            className="w-1/3 bg-[#1a1a1a] border border-[var(--border)] rounded-xl p-3 text-white focus:outline-none focus:border-[#25D366] disabled:opacity-50"
            value={newTemplateSubcat}
            onChange={(e) => setNewTemplateSubcat(e.target.value)}
            disabled={!newTemplateCatId}
          >
            <option value="">Subcategory...</option>
            {subcategories.filter(sc => sc.category_id.toString() === newTemplateCatId).map(sc => (
              <option key={sc.id} value={sc.name}>{sc.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            className="flex-1 bg-[#1a1a1a] border border-[var(--border)] rounded-xl p-3 text-white focus:outline-none focus:border-[#25D366]"
            placeholder="e.g. Hi, is the property still available for sale?"
            value={newTemplateText}
            onChange={(e) => setNewTemplateText(e.target.value)}
          />
          <button
            onClick={handleAddTemplate}
            disabled={!newTemplateSubcat || !newTemplateText.trim()}
            className="bg-[#25D366] text-black font-bold px-6 rounded-xl hover:opacity-90 disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="flex items-center justify-between p-4 rounded-xl bg-[#1a1a1a] border border-[var(--border)]">
              <div>
                <span className="text-xs font-bold text-[#25D366] uppercase tracking-wider mb-1 block">{t.category}</span>
                <p className="text-white text-sm">{t.message_text}</p>
              </div>
              <button onClick={() => handleDeleteTemplate(t.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {templates.length === 0 && (
            <p className="text-[var(--text-muted)] text-sm italic">No templates added yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
