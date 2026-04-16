'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/app/utils/supabase/client';

export default function CategoriesPage() {
  const supabase = createClient();
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newSubcategory, setNewSubcategory] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategoriesAndSubcategories();
  }, []);

  async function fetchCategoriesAndSubcategories() {
    setLoading(true);
    const { data: cats, error: catError } = await supabase.from('ad_categories').select('*').order('name');
    if (catError) console.error('Error fetching categories:', catError);
    else setCategories(cats || []);

    const { data: subcats, error: subcatError } = await supabase.from('ad_subcategories').select('*').order('name');
    if (subcatError) console.error('Error fetching subcategories:', subcatError);
    else setSubcategories(subcats || []);
    setLoading(false);
  }

  async function handleAddCategory() {
    if (!newCategory.trim()) return;
    const { data, error } = await supabase.from('ad_categories').insert([{ name: newCategory.trim() }]).select();
    if (error) {
      alert('Error adding category: ' + error.message);
    } else if (data) {
      setCategories([...categories, data[0]]);
      setNewCategory('');
    }
  }

  async function handleDeleteCategory(id: number) {
    if (!confirm('Are you sure you want to delete this category and all its subcategories?')) return;
    const { error } = await supabase.from('ad_categories').delete().eq('id', id);
    if (error) {
      alert('Error deleting category: ' + error.message);
    } else {
      fetchCategoriesAndSubcategories(); // Refetch all data
    }
  }

  async function handleAddSubcategory(categoryId: number) {
    const name = newSubcategory[categoryId]?.trim();
    if (!name) return;
    const { data, error } = await supabase.from('ad_subcategories').insert([{ category_id: categoryId, name }]).select();
    if (error) {
      alert('Error adding subcategory: ' + error.message);
    } else if (data) {
      setSubcategories([...subcategories, data[0]]);
      setNewSubcategory({ ...newSubcategory, [categoryId]: '' });
    }
  }

  async function handleDeleteSubcategory(id: number) {
    if (!confirm('Are you sure you want to delete this subcategory?')) return;
    const { error } = await supabase.from('ad_subcategories').delete().eq('id', id);
    if (error) {
      alert('Error deleting subcategory: ' + error.message);
    } else {
      setSubcategories(subcategories.filter(sc => sc.id !== id));
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Manage Categories & Subcategories</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Add New Category</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="w-full p-2 border rounded bg-gray-800 text-white"
            placeholder="New category name"
          />
          <button onClick={handleAddCategory} className="bg-green-500 text-white px-4 py-2 rounded">Add</button>
        </div>
      </div>

      <div className="space-y-8">
        {categories.map(cat => (
          <div key={cat.id} className="border p-4 rounded-lg bg-gray-900">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{cat.name}</h2>
              <button onClick={() => handleDeleteCategory(cat.id)} className="bg-red-600 text-white px-3 py-1 rounded">Delete Category</button>
            </div>

            <div className="ml-4 space-y-2">
              <h3 className="font-medium">Subcategories:</h3>
              {subcategories.filter(sc => sc.category_id === cat.id).map(sub => (
                <div key={sub.id} className="flex justify-between items-center">
                  <span>{sub.name}</span>
                  <button onClick={() => handleDeleteSubcategory(sub.id)} className="bg-red-500 text-white px-2 py-1 rounded text-sm">Delete</button>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newSubcategory[cat.id] || ''}
                  onChange={(e) => setNewSubcategory({ ...newSubcategory, [cat.id]: e.target.value })}
                  className="w-full p-2 border rounded bg-gray-800 text-white"
                  placeholder="New subcategory name"
                />
                <button onClick={() => handleAddSubcategory(cat.id)} className="bg-green-500 text-white px-3 py-1 rounded">Add</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
