'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Megaphone, Trash2, CheckCircle, Clock, AlertCircle, Edit2, Search, Filter } from 'lucide-react';

export default function MarketingAdminPage() {
  const [stats, setStats] = useState({ pending: 0, messaged: 0, replied: 0 });
  const [loading, setLoading] = useState(true);
  const [numbersInput, setNumbersInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [selectedSubcatName, setSelectedSubcatName] = useState<string>('');
  const [sourceInput, setSourceInput] = useState('');

  const [templates, setTemplates] = useState<any[]>([]);
  const [newTemplateSubcat, setNewTemplateSubcat] = useState<string>('');
  const [newTemplateText, setNewTemplateText] = useState<string>('');

  const [numbers, setNumbers] = useState<any[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchStats = async () => {
    try {
      const url = new URL('/api/admin/marketing', window.location.origin);
      if (filterSource) url.searchParams.append('source', filterSource);
      if (filterStatus) url.searchParams.append('status', filterStatus);

      const res = await fetch(url.toString());
      const data = await res.json();
      setStats(data.stats || { pending: 0, messaged: 0, replied: 0 });
      setTemplates(data.templates || []);
      setNumbers(data.numbers || []);
      setSources(data.sources || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [filterSource, filterStatus]);

  useEffect(() => {
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
        body: JSON.stringify({ 
          action: 'upload_numbers', 
          numbers: numbersInput, 
          category: categories.find(c => c.id.toString() === selectedCatId)?.name,
          subcategory: selectedSubcatName,
          source: sourceInput.trim()
        })
      });
      const data = await res.json();
      
      if (data.ok) {
        setMessage(`Success! Processed ${data.added} numbers.`);
        setNumbersInput('');
        setSourceInput('');
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

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      await fetch('/api/admin/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_number', id, status: newStatus })
      });
      fetchStats();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const handleDeleteNumber = async (id: number) => {
    if (!confirm('Delete this number?')) return;
    try {
      await fetch('/api/admin/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_number', id })
      });
      fetchStats();
    } catch (e) {
      alert('Failed to delete number');
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
    } catch (e) {
      alert('Failed to add template');
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      await fetch('/api/admin/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_template', id })
      });
      fetchStats();
    } catch (e) {
      alert('Failed to delete template');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto">
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
          <p className="text-[var(--text-muted)]">Manage your WhatsApp marketing queue and templates.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex flex-col items-center text-center">
          <Clock className="text-[#ffd42a] mb-2" size={32} />
          <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-wider mb-1">Pending Queue</p>
          <h3 className="text-4xl font-black text-white">{loading ? '...' : stats.pending}</h3>
        </div>
        <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex flex-col items-center text-center">
          <CheckCircle className="text-[#00cfff] mb-2" size={32} />
          <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-wider mb-1">Messaged</p>
          <h3 className="text-4xl font-black text-white">{loading ? '...' : stats.messaged}</h3>
        </div>
        <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex flex-col items-center text-center">
          <AlertCircle className="text-[#25D366] mb-2" size={32} />
          <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-wider mb-1">Replied</p>
          <h3 className="text-4xl font-black text-white">{loading ? '...' : stats.replied}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Left Column: Upload */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
            <h2 className="text-xl font-bold text-white mb-4">Upload Numbers</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select 
                  className="bg-[#1a1a1a] border border-[var(--border)] rounded-xl p-3 text-white text-sm focus:border-[#25D366]"
                  value={selectedCatId}
                  onChange={(e) => {
                    setSelectedCatId(e.target.value);
                    setSelectedSubcatName('');
                  }}
                >
                  <option value="">1. Category...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select 
                  className="bg-[#1a1a1a] border border-[var(--border)] rounded-xl p-3 text-white text-sm focus:border-[#25D366] disabled:opacity-50"
                  value={selectedSubcatName}
                  onChange={(e) => setSelectedSubcatName(e.target.value)}
                  disabled={!selectedCatId}
                >
                  <option value="">2. Subcategory...</option>
                  {subcategories.filter(sc => sc.category_id.toString() === selectedCatId).map(sc => (
                    <option key={sc.id} value={sc.name}>{sc.name}</option>
                  ))}
                </select>
                <input 
                  type="text"
                  placeholder="3. Source (e.g. OLX, Meta)"
                  className="bg-[#1a1a1a] border border-[var(--border)] rounded-xl p-3 text-white text-sm focus:border-[#25D366]"
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                />
              </div>

              <textarea
                className="w-full h-40 bg-[#1a1a1a] border border-[var(--border)] rounded-xl p-4 text-white focus:border-[#25D366] resize-none font-mono text-xs"
                placeholder="Paste numbers (newline or comma separated)..."
                value={numbersInput}
                onChange={(e) => setNumbersInput(e.target.value)}
              />
              
              <div className="flex items-center justify-between">
                <button
                  onClick={handleUpload}
                  disabled={isSubmitting || !numbersInput.trim() || !selectedSubcatName}
                  className="bg-[#25D366] text-black font-bold py-3 px-8 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? 'Saving...' : 'Save to Queue'}
                </button>
                {message && (
                  <span className={`text-sm font-bold ${message.includes('Error') ? 'text-red-500' : 'text-[#25D366]'}`}>
                    {message}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
            <h2 className="text-xl font-bold text-white mb-4">Message Templates</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <select 
                  className="flex-1 bg-[#1a1a1a] border border-[var(--border)] rounded-xl p-3 text-white text-sm focus:border-[#25D366]"
                  value={newTemplateSubcat}
                  onChange={(e) => setNewTemplateSubcat(e.target.value)}
                >
                  <option value="">Select Subcategory...</option>
                  {subcategories.map(sc => <option key={sc.id} value={sc.name}>{sc.name}</option>)}
                </select>
              </div>
              <div className="flex gap-4">
                <input 
                  type="text"
                  className="flex-1 bg-[#1a1a1a] border border-[var(--border)] rounded-xl p-3 text-white text-sm focus:border-[#25D366]"
                  placeholder="e.g. Hi, is the property still available?"
                  value={newTemplateText}
                  onChange={(e) => setNewTemplateText(e.target.value)}
                />
                <button onClick={handleAddTemplate} className="bg-[#25D366] text-black font-bold px-6 rounded-xl hover:opacity-90">Add</button>
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                {templates.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-[#1a1a1a] border border-[var(--border)]">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-[#25D366] uppercase tracking-widest">{t.category}</span>
                      <p className="text-white text-sm truncate">{t.message_text}</p>
                    </div>
                    <button onClick={() => handleDeleteTemplate(t.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Numbers Management */}
        <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Numbers Queue</h2>
            <div className="flex gap-2">
              <select 
                className="bg-[#1a1a1a] border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-white"
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
              >
                <option value="">All Sources</option>
                {sources.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select 
                className="bg-[#1a1a1a] border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-white"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="messaged">Messaged</option>
                <option value="replied">Replied</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="pb-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Number</th>
                  <th className="pb-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Source</th>
                  <th className="pb-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                  <th className="pb-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {numbers.map((num) => (
                  <tr key={num.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 text-sm text-white font-mono">{num.phone_number}</td>
                    <td className="py-3 text-sm text-[var(--text-secondary)]">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">{num.source || 'N/A'}</span>
                    </td>
                    <td className="py-3">
                      <select 
                        value={num.status}
                        onChange={(e) => handleUpdateStatus(num.id, e.target.value)}
                        className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border bg-transparent ${
                          num.status === 'replied' ? 'text-[#25D366] border-[#25D366]/50' : 
                          num.status === 'messaged' ? 'text-[#00cfff] border-[#00cfff]/50' : 
                          'text-[#ffd42a] border-[#ffd42a]/50'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="messaged">Messaged</option>
                        <option value="replied">Replied</option>
                      </select>
                    </td>
                    <td className="py-3 text-right">
                      <button 
                        onClick={() => handleDeleteNumber(num.id)}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {numbers.length === 0 && (
              <div className="py-20 text-center text-[var(--text-muted)] italic text-sm">
                No numbers matching current filters.
              </div>
            )}
          </div>
          
          {numbers.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--border)] text-[10px] text-[var(--text-muted)] text-center">
              Showing latest {numbers.length} numbers. Sort/Filter to find specific entries.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
