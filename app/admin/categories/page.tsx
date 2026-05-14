export const runtime = 'edge';
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Plus, Trash2, Folder, Subtitles, Loader2, ChevronRight, AlertCircle } from 'lucide-react';
import Header from '@/app/components/header';
import Footer from '@/app/components/footer';

export default function CategoriesPage() {
  const supabase = createClient();
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newSubcategory, setNewSubcategory] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchCategoriesAndSubcategories();
  }, []);

  async function fetchCategoriesAndSubcategories() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/categories');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      
      setCategories(data.categories || []);
      setSubcategories(data.subcategories || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCategory() {
    if (!newCategory.trim()) return;
    setActionLoading({ ...actionLoading, addCat: true });
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategory.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add category');
      
      setCategories([...categories, data]);
      setNewCategory('');
    } catch (err: any) {
      alert('Error adding category: ' + err.message);
    } finally {
      setActionLoading({ ...actionLoading, addCat: false });
    }
  }

  async function handleDeleteCategory(id: number) {
    if (!confirm('Are you sure you want to delete this category and all its subcategories?')) return;
    setActionLoading({ ...actionLoading, [`delCat_${id}`]: true });
    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete category');
      }
      setCategories(categories.filter(c => c.id !== id));
      setSubcategories(subcategories.filter(sc => sc.category_id !== id));
    } catch (err: any) {
      alert('Error deleting category: ' + err.message);
    } finally {
      setActionLoading({ ...actionLoading, [`delCat_${id}`]: false });
    }
  }

  async function handleAddSubcategory(categoryId: number) {
    const name = newSubcategory[categoryId]?.trim();
    if (!name) return;
    setActionLoading({ ...actionLoading, [`addSub_${categoryId}`]: true });
    try {
      const res = await fetch('/api/admin/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: categoryId, name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add subcategory');
      
      setSubcategories([...subcategories, data]);
      setNewSubcategory({ ...newSubcategory, [categoryId]: '' });
    } catch (err: any) {
      alert('Error adding subcategory: ' + err.message);
    } finally {
      setActionLoading({ ...actionLoading, [`addSub_${categoryId}`]: false });
    }
  }

  async function handleDeleteSubcategory(id: number) {
    if (!confirm('Are you sure you want to delete this subcategory?')) return;
    setActionLoading({ ...actionLoading, [`delSub_${id}`]: true });
    try {
      const res = await fetch(`/api/admin/subcategories?id=${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete subcategory');
      }
      setSubcategories(subcategories.filter(sc => sc.id !== id));
    } catch (err: any) {
      alert('Error deleting subcategory: ' + err.message);
    } finally {
      setActionLoading({ ...actionLoading, [`delSub_${id}`]: false });
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">
      <Header />

      <main className="max-w-[1000px] mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-2xl bg-[#ffd42a]/10">
            <Folder className="text-[#ffd42a]" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Content Hierarchy
            </h1>
            <p className="text-[var(--text-muted)]">
              Manage your main categories and their respective sub-branches
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {/* Add Category Section */}
        <div className="mb-12 p-8 rounded-[2rem] bg-[var(--bg-card)] border border-[var(--border)] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffd42a]/5 blur-3xl rounded-full -mr-16 -mt-16 transition-all group-hover:bg-[#ffd42a]/10" />
          
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Plus size={20} className="text-[#ffd42a]" />
            Create New Main Category
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="flex-1 px-5 py-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border)] text-white focus:outline-none focus:border-[#ffd42a]/50 transition-all text-lg"
              placeholder="e.g., Classifieds, Events, News..."
            />
            <button
              onClick={handleAddCategory}
              disabled={actionLoading.addCat || !newCategory.trim()}
              className="px-8 py-4 bg-[#ffd42a] hover:bg-[#ffdf5e] text-black font-bold rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#ffd42a]/20"
            >
              {actionLoading.addCat ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
              Add Category
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-[#ffd42a]" size={48} />
            <p className="text-[var(--text-muted)] animate-pulse">Organizing categories...</p>
          </div>
        ) : (
          <div className="grid gap-8">
            {categories.map(cat => (
              <div key={cat.id} className="group rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border)] overflow-hidden shadow-2xl transition-all hover:border-[var(--text-muted)]/30">
                <div className="p-8 border-b border-[var(--border)] bg-[var(--bg-primary)]/50 flex justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
                      <Folder className="text-[#ffd42a]" size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-wider">{cat.name}</h2>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    disabled={actionLoading[`delCat_${cat.id}`]}
                    className="p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                    title="Delete Category"
                  >
                    {actionLoading[`delCat_${cat.id}`] ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                  </button>
                </div>

                <div className="p-8">
                  <div className="flex items-center gap-2 mb-6">
                    <Subtitles className="text-[var(--text-muted)]" size={18} />
                    <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest">Available Sub-Branches</h3>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mb-8">
                    {subcategories.filter(sc => sc.category_id === cat.id).map(sub => (
                      <div key={sub.id} className="flex items-center justify-between p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border)] group/sub transition-all hover:bg-[var(--bg-card)]">
                        <div className="flex items-center gap-3">
                          <ChevronRight className="text-[#ffd42a]/50" size={16} />
                          <span className="font-semibold text-white/90">{sub.name}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteSubcategory(sub.id)}
                          disabled={actionLoading[`delSub_${sub.id}`]}
                          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-400 opacity-0 group-hover/sub:opacity-100 transition-all"
                        >
                          {actionLoading[`delSub_${sub.id}`] ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    ))}
                    
                    {subcategories.filter(sc => sc.category_id === cat.id).length === 0 && (
                      <div className="sm:col-span-2 py-8 px-5 rounded-2xl border border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-2">
                        <p className="text-[var(--text-muted)] italic">No subcategories defined yet</p>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <Plus className="text-[#90ee90]/50" size={18} />
                    </div>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={newSubcategory[cat.id] || ''}
                        onChange={(e) => setNewSubcategory({ ...newSubcategory, [cat.id]: e.target.value })}
                        className="flex-1 pl-12 pr-5 py-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border)] text-white focus:outline-none focus:border-[#90ee90]/30 transition-all text-base"
                        placeholder={`Add branch to ${cat.name}...`}
                      />
                      <button
                        onClick={() => handleAddSubcategory(cat.id)}
                        disabled={actionLoading[`addSub_${cat.id}`] || !newSubcategory[cat.id]?.trim()}
                        className="px-6 py-4 bg-[#90ee90]/10 hover:bg-[#90ee90]/20 text-[#90ee90] font-bold rounded-2xl border border-[#90ee90]/20 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {actionLoading[`addSub_${cat.id}`] ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
