'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/app/utils/supabase/client';

export default function SubmitPage() {
  const supabase = createClient();
  const router = useRouter();
  const [type, setType] = useState('news'); // news, classified, ad
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [imageType, setImageType] = useState('url');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [hyperlinkText, setHyperlinkText] = useState('Visit us');
  const [premiumAd, setPremiumAd] = useState(false);
  const [newsForAd, setNewsForAd] = useState(false);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsTags, setNewsTags] = useState('');
  const [newsImageType, setNewsImageType] = useState('url');
  const [newsImageUrl, setNewsImageUrl] = useState('');
  const [newsImageFile, setNewsImageFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [filteredSubcategories, setFilteredSubcategories] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/login');
      }
    }
    checkUser();
    fetchCategoriesAndSubcategories();
  }, [router]);

  async function fetchCategoriesAndSubcategories() {
    const { data: cats, error: catError } = await supabase.from('ad_categories').select('*').order('name');
    if (catError) console.error('Error fetching categories:', catError);
    else setCategories(cats || []);

    const { data: subcats, error: subcatError } = await supabase.from('ad_subcategories').select('*').order('name');
    if (subcatError) console.error('Error fetching subcategories:', subcatError);
    else setSubcategories(subcats || []);
  }

  useEffect(() => {
    if (selectedCategory) {
      setFilteredSubcategories(subcategories.filter(sc => sc.category_id === parseInt(selectedCategory, 10)));
    } else {
      setFilteredSubcategories([]);
    }
    setSelectedSubcategory('');
  }, [selectedCategory, subcategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validation
    if (title.length > 70) {
      setError('Title must be 70 characters or less');
      setIsSubmitting(false);
      return;
    }
    if (content.length > 500) {
      setError('Content must be 500 characters or less');
      setIsSubmitting(false);
      return;
    }
    if (newsForAd) {
      if (newsTitle.length > 70) {
        setError('News title must be 70 characters or less');
        setIsSubmitting(false);
        return;
      }
      if (newsContent.length > 500) {
        setError('News content must be 500 characters or less');
        setIsSubmitting(false);
        return;
      }
    }

    const formData = new FormData();
    formData.append('type', type);
    formData.append('title', title);
    formData.append('content', content);
    formData.append('tags', tags);
    formData.append('categoryId', selectedCategory);
    formData.append('subcategoryId', selectedSubcategory);
    if (imageFile) {
      formData.append('imageFile', imageFile);
    } else {
      formData.append('imageUrl', imageUrl);
    }
    formData.append('externalUrl', externalUrl);
    formData.append('hyperlinkText', hyperlinkText);
    formData.append('isPremium', String(premiumAd));
    formData.append('newsForAd', String(newsForAd));

    if (newsForAd) {
      formData.append('newsTitle', newsTitle);
      formData.append('newsContent', newsContent);
      formData.append('newsTags', newsTags);
      if (newsImageFile) {
        formData.append('newsImageFile', newsImageFile);
      } else {
        formData.append('newsImageUrl', newsImageUrl);
      }
    }

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Submission failed');
      }

      alert('Submission successful! It will be reviewed by an admin.');
      router.push('/');

    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] px-4 py-10">
      <div className="mx-auto w-full max-w-[600px]">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-2xl">
          <h1 className="text-center text-4xl font-extrabold text-[#ffd42a] uppercase tracking-wide" style={{ fontFamily: 'var(--font-en)' }}>
            Submit
          </h1>

          {error && (
            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-semibold text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">Submission Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
              >
                <option value="news">News</option>
                <option value="classified">Classified</option>
                <option value="ad">Main Ad</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
              >
                <option value="">Select Category</option>
                {/* TODO: Fetch categories from admin-defined list */}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">Subcategory</label>
              <select
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
              >
                <option value="">Select Subcategory</option>
                {/* TODO: Fetch subcategories based on category */}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">Title (max 70 chars)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 70))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">Content (max 500 chars)</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 500))}
                rows={4}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">Tags (comma separated)</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">Image</label>
              <select
                value={imageType}
                onChange={(e) => setImageType(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
              >
                <option value="url">Image URL</option>
                <option value="upload">Upload Image</option>
              </select>
              {imageType === 'url' ? (
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
                />
              ) : (
                <input
                  type="file"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  accept="image/*"
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#ffd42a] file:text-[#1a1a1a] hover:file:bg-[#ffe066]"
                />
              )}
            </div>

            {type === 'ad' && (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="premium"
                    checked={premiumAd}
                    onChange={(e) => setPremiumAd(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border)] bg-[var(--bg-primary)] text-[#ffd42a] focus:ring-[#ffd42a]"
                  />
                  <label htmlFor="premium" className="text-sm font-bold text-[var(--text-secondary)]">Premium Ad (currently free)</label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="newsForAd"
                    checked={newsForAd}
                    onChange={(e) => setNewsForAd(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border)] bg-[var(--bg-primary)] text-[#ffd42a] focus:ring-[#ffd42a]"
                  />
                  <label htmlFor="newsForAd" className="text-sm font-bold text-[var(--text-secondary)]">Add News for this Ad (optional)</label>
                </div>

                {newsForAd && (
                  <div className="space-y-4 border-t border-[var(--border)] pt-4">
                    <h3 className="text-lg font-bold text-[#ffd42a]">News for Ad</h3>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">News Title (max 70 chars)</label>
                      <input
                        value={newsTitle}
                        onChange={(e) => setNewsTitle(e.target.value.slice(0, 70))}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">News Content (max 500 chars)</label>
                      <textarea
                        value={newsContent}
                        onChange={(e) => setNewsContent(e.target.value.slice(0, 500))}
                        rows={4}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">News Tags (comma separated)</label>
                      <input
                        value={newsTags}
                        onChange={(e) => setNewsTags(e.target.value)}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">News Image</label>
                      <select
                        value={newsImageType}
                        onChange={(e) => setNewsImageType(e.target.value)}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
                      >
                        <option value="url">Image URL</option>
                        <option value="upload">Upload Image</option>
                      </select>
                      {newsImageType === 'url' ? (
                        <input
                          value={newsImageUrl}
                          onChange={(e) => setNewsImageUrl(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
                        />
                      ) : (
                        <input
                          type="file"
                          onChange={(e) => setNewsImageFile(e.target.files?.[0] || null)}
                          accept="image/*"
                          className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#ffd42a] file:text-[#1a1a1a] hover:file:bg-[#ffe066]"
                        />
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#00cfff] px-4 py-3 font-extrabold text-[#0d1117] shadow-md hover:brightness-110 disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}