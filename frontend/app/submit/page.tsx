'use client';
// BUILD_VERSION: 20250427 - 500 words limit

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Header from '../components/header';
import keralaLocations from '../../data/kerala_locations.json';

// Define types for better state management
type Category = { id: number; name: string };
type Subcategory = { id: number; name: string; category_id: number };
type AppUser = { name: string };
const locations = keralaLocations as Record<string, string[]>;
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024; // 3MB

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function compressImageFile(file: File, maxBytes = MAX_UPLOAD_BYTES): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed');
  }

  if (file.size <= maxBytes) {
    return file;
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image for compression'));
    image.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  let width = img.width;
  let height = img.height;
  const maxDimension = 800; // Resize to mobile view size
  if (Math.max(width, height) > maxDimension) {
    const ratio = maxDimension / Math.max(width, height);
    width = Math.max(1, Math.floor(width * ratio));
    height = Math.max(1, Math.floor(height * ratio));
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to initialize image compressor');
  }
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.9;
  let compressedBlob: Blob | null = null;
  while (quality >= 0.4) {
    compressedBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
    );
    if (compressedBlob && compressedBlob.size <= maxBytes) {
      break;
    }
    quality -= 0.1;
  }

  if (!compressedBlob) {
    throw new Error('Image compression failed');
  }

  if (compressedBlob.size > maxBytes) {
    throw new Error('Image is too large. Please choose an image smaller than 3MB.');
  }

  const baseName = file.name.replace(/\.[^.]+$/, '');
  return new File([compressedBlob], `${baseName}.jpg`, { type: 'image/jpeg' });
}

function SubmitContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Get type from query param or default to 'news'
  const typeParam = searchParams.get('type');
  const [type, setType] = useState(typeParam || 'news'); // news, ad, event, classified
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [maxImages, setMaxImages] = useState(5); // Default to 5, can be overridden by admin settings
  const [externalUrl, setExternalUrl] = useState('');
  const [hyperlinkText, setHyperlinkText] = useState('Visit us');
  const [newsForAd, setNewsForAd] = useState(false);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsTags, setNewsTags] = useState('');
  const [newsImageFile, setNewsImageFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  
  // Location States
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedTown, setSelectedTown] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch max upload images setting
  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from('admin_settings').select('key, value').eq('key', 'max_upload_images').single();
      if (data?.value) setMaxImages(parseInt(data.value, 10));
    }
    fetchSettings();
  }, [supabase]);

  // Check auth status using same API as header
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!data.name) {
          router.push('/login');
        } else {
          setUser({ name: data.name });
        }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  // Update type when query param changes
  useEffect(() => {
    if (typeParam) {
      setType(typeParam);
    }
  }, [typeParam]);

  // Auto-select Classifieds category
  useEffect(() => {
    if (type === 'classified' && categories.length > 0) {
      const classifiedCat = categories.find(c => c.name.toLowerCase() === 'classified' || c.name.toLowerCase() === 'classifieds');
      if (classifiedCat) {
        setSelectedCategory(classifiedCat.id.toString());
      }
    } else if (type === 'ad') {
      setSelectedCategory('');
      setSelectedSubcategory('');
    }
  }, [type, categories]);

  const fetchCategoriesAndSubcategories = useCallback(async () => {
    const { data: cats, error: catError } = await supabase.from('ad_categories').select('*').order('name');
    if (catError) console.error('Error fetching categories:', catError);
    else setCategories(cats || []);

    const { data: subcats, error: subcatError } = await supabase.from('ad_subcategories').select('*').order('name');
    if (subcatError) console.error('Error fetching subcategories:', subcatError);
    else setSubcategories(subcats || []);
  }, [supabase]);

  useEffect(() => {
    if (user) {
      fetchCategoriesAndSubcategories();
    }
  }, [user, fetchCategoriesAndSubcategories]);

  useEffect(() => {
    if (selectedCategory) {
      setFilteredSubcategories(subcategories.filter(sc => sc.category_id === parseInt(selectedCategory, 10)));
    } else {
      setFilteredSubcategories([]);
    }
    setSelectedSubcategory('');
  }, [selectedCategory, subcategories]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await res.json();
        
        const address = data.address;
        const district = address.state_district || address.county || '';
        
        // Match OSM district string to our JSON keys
        const dName = district.replace(' District', '').trim();
        const match = Object.keys(locations).find(k => k.toLowerCase().includes(dName.toLowerCase()) || dName.toLowerCase().includes(k.toLowerCase()));
        
        if (match) {
          setSelectedDistrict(match);
          setSelectedTown(''); // Let user pick town manually since OSM towns don't always perfectly match our list
        } else {
          alert("Could not automatically determine your district in Kerala. Please select manually.");
        }
      } catch {
        alert("Failed to determine location");
      } finally {
        setIsLocating(false);
      }
    }, () => {
      alert("Location access denied or failed");
      setIsLocating(false);
    });
  };

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
    // 500 words max for content
    const contentWordCount = content.trim().split(/\s+/).length;
    if (contentWordCount > 500) {
      setError('Content must be 500 words or less');
      setIsSubmitting(false);
      return;
    }
    if (newsForAd) {
      if (newsTitle.length > 70) {
        setError('News title must be 70 characters or less');
        setIsSubmitting(false);
        return;
      }
      const newsWordCount = newsContent.trim().split(/\s+/).length;
      if (newsWordCount > 500) {
        setError('News content must be 500 words or less');
        setIsSubmitting(false);
        return;
      }
    }

    if ((type === 'ad' || type === 'classified') && (!selectedDistrict || !selectedTown)) {
      setError('Please select a district and town for your listing.');
      setIsSubmitting(false);
      return;
    }

    if (imageFiles.length === 0) {
      setError('Please upload at least one image.');
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append('type', type);
    formData.append('title', title);
    formData.append('content', content);
    formData.append('tags', tags.join(','));
    formData.append('categoryId', selectedCategory);
    formData.append('subcategoryId', selectedSubcategory);
    
    // Append all images
    imageFiles.forEach((file, index) => {
      formData.append(`imageFile_${index}`, file);
    });
    formData.append('imageCount', imageFiles.length.toString());
    formData.append('externalUrl', externalUrl);
    formData.append('hyperlinkText', hyperlinkText);
    formData.append('isPremium', String(type === 'ad'));
    formData.append('newsForAd', String(newsForAd));

    if (type === 'ad' || type === 'classified') {
      formData.append('location', `Kerala, ${selectedDistrict}, ${selectedTown}`);
    }

    if (newsForAd) {
      formData.append('newsTitle', newsTitle);
      formData.append('newsContent', newsContent);
      formData.append('newsTags', newsTags);
      if (newsImageFile) formData.append('newsImageFile', newsImageFile);
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

      alert('Will Publish after Approval');
      router.push('/');

    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Submission failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />
      <div className="mx-auto mt-8 w-full max-w-[800px] px-5 sm:px-6">
        <div className="overflow-hidden rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 sm:p-8">
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
                <option value="event">Event</option>
                <option value="classified">Classifieds</option>
                <option value="ad">Main Ad</option>
              </select>
            </div>

            {type === 'classified' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">Classifieds Type</label>
                  <select
                    value={selectedSubcategory}
                    onChange={(e) => setSelectedSubcategory(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
                  >
                    <option value="">Select Type</option>
                    {filteredSubcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {type === 'classified' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">District</label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => {
                      setSelectedDistrict(e.target.value);
                      setSelectedTown('');
                    }}
                    required
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
                  >
                    <option value="">Select District</option>
                    {Object.keys(locations).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 flex items-center justify-between text-sm font-bold text-[var(--text-secondary)]">
                    <span>Town / City</span>
                    <button type="button" onClick={handleDetectLocation} className="text-[#00cfff] text-xs hover:underline flex items-center gap-1">
                      📍 {isLocating ? 'Locating...' : 'Detect District'}
                    </button>
                  </label>
                  <select
                    value={selectedTown}
                    onChange={(e) => setSelectedTown(e.target.value)}
                    required
                    disabled={!selectedDistrict}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff] disabled:opacity-50"
                  >
                    <option value="">Select Town</option>
                    {selectedDistrict && locations[selectedDistrict]?.map((t: string) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">
                Title (English or Malayalam - max 70 chars)
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 70))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">
                Content (English or Malayalam - Max 500 words)
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">
                Tags
                <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
                  (please enter upto 5 tags, comma separated - maximum 20 characters each)
                </span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 rounded-full bg-[#ff69b4] px-3 py-1 text-xs font-semibold text-white"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((_, i) => i !== index))}
                      className="ml-1 hover:text-red-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value.slice(0, 20))}
                onKeyDown={(e) => {
                  if (e.key === ',' || e.key === 'Enter') {
                    e.preventDefault();
                    const newTag = tagInput.trim();
                    if (newTag && tags.length < 5 && !tags.includes(newTag)) {
                      setTags([...tags, newTag]);
                    }
                    setTagInput('');
                  }
                }}
                placeholder={tags.length >= 5 ? 'Maximum 5 tags reached' : 'Type tag and press comma or Enter'}
                disabled={tags.length >= 5}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff] disabled:opacity-50"
              />
            </div>

            {(type === 'ad' || type === 'classified') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">External URL (optional)</label>
                  <input
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">Link Text</label>
                  <input
                    value={hyperlinkText}
                    onChange={(e) => setHyperlinkText(e.target.value)}
                    placeholder="Visit us"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">
                Photos (Up to {maxImages})
              </label>
              <div className="flex flex-wrap gap-3">
                {imageFiles.map((file, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-[var(--border)] group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Upload ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImageFiles(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
                
                {imageFiles.length < maxImages && (
                  <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-[#00cfff] rounded-lg cursor-pointer bg-[var(--bg-primary)] hover:bg-[#00cfff]/10 transition-colors">
                    <svg className="w-8 h-8 text-[#00cfff] mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    <span className="text-[10px] font-bold text-[#00cfff] uppercase">Add Photo</span>
                    <input
                      type="file"
                      multiple
                      onChange={async (e) => {
                        const picked = e.target.files ? Array.from(e.target.files) : [];
                        if (picked.length === 0) return;
                        
                        const remaining = maxImages - imageFiles.length;
                        const toProcess = picked.slice(0, remaining);
                        
                        try {
                          const compressed = await Promise.all(toProcess.map(f => compressImageFile(f)));
                          setImageFiles(prev => [...prev, ...compressed]);
                          setError(null);
                        } catch (error: unknown) {
                          setError(getErrorMessage(error, 'Image processing failed'));
                        }
                      }}
                      accept="image/*"
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                First photo will be your main featured image.
              </p>
            </div>

            {type === 'ad' && (
              <>
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
                      <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">News Content (Maximum 500 words allowed)</label>
                      <textarea
                        value={newsContent}
                        onChange={(e) => setNewsContent(e.target.value)}
                        rows={6}
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
                      <input
                        type="file"
                        onChange={async (e) => {
                          const picked = e.target.files?.[0] || null;
                          if (!picked) {
                            setNewsImageFile(null);
                            return;
                          }
                          try {
                            const compressed = await compressImageFile(picked);
                            setNewsImageFile(compressed);
                        } catch (error: unknown) {
                          setError(getErrorMessage(error, 'News image processing failed'));
                          e.currentTarget.value = '';
                          setNewsImageFile(null);
                        }
                        }}
                        accept="image/*"
                        className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#ffd42a] file:text-[#1a1a1a] hover:file:bg-[#ffe066]"
                      />
                      <p className="mt-1 text-xs text-[var(--text-muted)]">Upload only. Max 3MB (auto-compressed when needed).</p>
                    </div>
                  </div>
                )}
              </>
            )}

            <p className="text-center text-sm text-[var(--text-muted)] italic">
              ( All submissions -subject to Editor approval )
            </p>

            <button
              type="submit"
              disabled={isSubmitting || loading}
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

export default function SubmitPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
      <SubmitContent />
    </Suspense>
  );
}
