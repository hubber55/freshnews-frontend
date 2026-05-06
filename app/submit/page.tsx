'use client';
// BUILD_VERSION: 20250427 - 500 words limit

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { X } from 'lucide-react';
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

  // Even if small, we process to ensure correct format/metadata stripping
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
  
  // Use a more modern max dimension (1200px is good for high-res mobile & desktop)
  const maxDimension = 1200; 
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
  
  // Use better interpolation if possible
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  // We aim for a target size around 500KB - 800KB which is perfect for news
  const targetBytes = 800 * 1024; 
  let quality = 0.8; // Start with 0.8 quality (great balance)
  let compressedBlob: Blob | null = null;
  
  while (quality >= 0.3) {
    compressedBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
    );
    
    // If we're under target bytes or at minimum quality, we stop
    if (compressedBlob && (compressedBlob.size <= targetBytes || quality <= 0.3)) {
      break;
    }
    quality -= 0.1;
  }

  if (!compressedBlob) {
    throw new Error('Image compression failed');
  }

  // Final hard check against the absolute limit
  if (compressedBlob.size > maxBytes) {
    throw new Error('Image is still too large even after compression. Please use a smaller file.');
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
  const editId = searchParams.get('editId');

  const [type, setType] = useState(typeParam || 'news'); // news, ad, event, classified
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [price, setPrice] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
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
  const [existingImages, setExistingImages] = useState<string[]>([]);
  
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

  // Check auth status and fetch edit data if needed
  useEffect(() => {
    async function checkAuthAndLoad() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!data.name) {
          router.push('/login');
          return;
        }
        setUser({ name: data.name });

        // If editing, load submission data
        if (editId) {
          const subRes = await fetch(`/api/submissions/${editId}`);
          if (subRes.ok) {
            const sub = await subRes.json();
            setTitle(sub.title || '');
            setContent(sub.content || '');
            setPrice(sub.price || '');
            setContactPhone(sub.contact_phone || '');
            setType(sub.type || 'news');
            setExternalUrl(sub.external_url || '');
            setHyperlinkText(sub.hyperlink_text || 'Visit us');
            
            // Handle Tags
            const subTags = sub.tags || [];
            setTags(subTags.filter((t: string) => t.toLowerCase() !== 'classifieds'));
            
            // Handle Location
            if (sub.location) {
              const parts = sub.location.split(',').map((s: string) => s.trim());
              if (parts.length >= 3) {
                setSelectedDistrict(parts[1]);
                setSelectedTown(parts[2]);
              }
            }

            // Handle Category/Subcategory
            if (sub.category_id) setSelectedCategory(sub.category_id.toString());
            if (sub.subcategory_id) setSelectedSubcategory(sub.subcategory_id.toString());

            // Handle Images
            if (sub.image_url) {
              const imgs = sub.image_url.startsWith('[') ? JSON.parse(sub.image_url) : [sub.image_url];
              setExistingImages(imgs);
              setImagePreviews(imgs);
            }
          }
        }
      } catch (err) {
        console.error('Error loading submission for edit:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuthAndLoad();
  }, [router, editId]);

  // Update type when query param changes
  useEffect(() => {
    if (typeParam && !editId) {
      setType(typeParam);
    }
  }, [typeParam, editId]);

  // Auto-select Classifieds category
  useEffect(() => {
    if (type === 'classified' && categories.length > 0 && !editId) {
      const classifiedCat = categories.find(c => c.name.toLowerCase() === 'classified' || c.name.toLowerCase() === 'classifieds');
      if (classifiedCat) {
        setSelectedCategory(classifiedCat.id.toString());
      }
    } else if (type === 'ad' && !editId) {
      setSelectedCategory('');
      setSelectedSubcategory('');
    }
  }, [type, categories, editId]);

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

  const removeImage = (index: number) => {
    // If it's an existing image, we just remove it from preview/files if it was added
    // If it's a new file
    if (index >= existingImages.length || imageFiles.length > 0) {
       // logic here is a bit tricky since we combined previews
       // For simplicity, if they touch images, they should re-upload or we clear new files
    }

    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => {
      if (prev[index].startsWith('blob:')) {
        URL.revokeObjectURL(prev[index]);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validation
    if (title.length > 80) {
      setError('Title must be 80 characters or less');
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

    if ((type === 'ad' || type === 'classified') && (!selectedDistrict || !selectedTown)) {
      setError('Please select a district and town for your listing.');
      setIsSubmitting(false);
      return;
    }

    if (!editId && imageFiles.length === 0) {
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
      formData.append('price', price);
      formData.append('contactPhone', contactPhone);
    }

    if (newsForAd) {
      formData.append('newsTitle', newsTitle);
      formData.append('newsContent', newsContent);
      formData.append('newsTags', newsTags);
      if (newsImageFile) formData.append('newsImageFile', newsImageFile);
    }

    try {
      const url = editId ? `/api/submissions/${editId}` : '/api/submit';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Submission failed');
      }

      if (editId) {
        alert(`You had edited your Ad "${title}" - It will be Live again after Admin Approval. Avoid unnecessary editing of Ad, to avoid Live disruptions`);
      } else {
        alert('Will Publish after Approval');
      }
      router.push('/profile');

    } catch (error: unknown) {
      const msg = getErrorMessage(error, 'Submission failed');
      setError(msg);
      alert('Error: ' + msg);
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

            {(type === 'ad' || type === 'classified') && (() => {
              const subcatName = filteredSubcategories.find(s => s.id === parseInt(selectedSubcategory, 10))?.name || '';
              const isJob = subcatName.toLowerCase().includes('job') || subcatName.toLowerCase().includes('തൊഴിൽ');
              const priceLabel = isJob ? 'Salary' : 'Price';
              
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">{priceLabel} (max 20 chars)</label>
                    <input
                      value={price}
                      onChange={(e) => setPrice(e.target.value.slice(0, 20))}
                      placeholder={isJob ? "e.g. ₹ 25,000/month" : "e.g. ₹ 45 Lakhs"}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">Phone Number (max 15 chars)</label>
                    <input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value.slice(0, 15))}
                      placeholder="e.g. +91 9876543210"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
                    />
                  </div>
                </div>
              );
            })()}

            <div className={((type === 'ad' || type === 'classified') && (!selectedCategory || !selectedSubcategory || !price || !contactPhone)) ? 'opacity-30 pointer-events-none' : ''}>
              <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">
                Title (English or Malayalam - max 80 chars)
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
              />
            </div>

            <div className={((type === 'ad' || type === 'classified') && (!selectedCategory || !selectedSubcategory || !price || !contactPhone)) ? 'opacity-30 pointer-events-none' : ''}>
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
                {externalUrl.trim() && (
                  <div>
                    <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">Link Text</label>
                    <input
                      value={hyperlinkText}
                      onChange={(e) => setHyperlinkText(e.target.value)}
                      placeholder="Visit us"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-white focus:border-[#00cfff] focus:outline-none focus:ring-1 focus:ring-[#00cfff]"
                    />
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">
                Photos (Up to {maxImages})
              </label>
              <div className="flex flex-wrap gap-3">
                {imagePreviews.map((preview, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-[var(--border)] group">
                    <img
                      src={preview}
                      alt={`Upload ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 bg-red-500/90 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm shadow-md z-10"
                      title="Remove image"
                    >
                      <X size={14} strokeWidth={3} />
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
                        if (picked.length > remaining) {
                          alert(`Only ${maxImages} images allowed. Slicing selection to fit.`);
                        }
                        const toProcess = picked.slice(0, remaining);
                        
                        try {
                          const compressed = await Promise.all(toProcess.map(f => compressImageFile(f)));
                          setImageFiles(prev => [...prev, ...compressed]);
                          setImagePreviews(prev => [...prev, ...compressed.map(f => URL.createObjectURL(f))]);
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
              className="w-full rounded-xl bg-[#00ffff] px-4 py-3 font-extrabold text-[#0d1117] shadow-md hover:brightness-110 disabled:opacity-60"
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
