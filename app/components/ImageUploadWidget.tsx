import React from 'react';
import { compressImageFile } from '@/lib/image';

interface ImageUploadWidgetProps {
  existingUrls: string[];
  onExistingUrlsChange: (urls: string[]) => void;
  newFiles: File[];
  onNewFilesChange: (files: File[]) => void;
  maxImages: number;
  onError: (error: string) => void;
}

export function ImageUploadWidget({
  existingUrls,
  onExistingUrlsChange,
  newFiles,
  onNewFilesChange,
  maxImages,
  onError,
}: ImageUploadWidgetProps) {
  const totalImages = existingUrls.length + newFiles.length;

  const handleRemoveExisting = (indexToRemove: number) => {
    onExistingUrlsChange(existingUrls.filter((_, idx) => idx !== indexToRemove));
  };

  const handleRemoveNew = (indexToRemove: number) => {
    onNewFilesChange(newFiles.filter((_, idx) => idx !== indexToRemove));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    if (picked.length === 0) return;
    
    const remaining = maxImages - totalImages;
    const toProcess = picked.slice(0, remaining);
    
    try {
      const compressed = await Promise.all(toProcess.map(f => compressImageFile(f)));
      onNewFilesChange([...newFiles, ...compressed]);
      // clear input
      e.target.value = '';
    } catch (error: unknown) {
      onError(error instanceof Error ? error.message : 'Image processing failed');
    }
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">
        Photos (Up to {maxImages})
      </label>
      <div className="flex flex-wrap gap-3">
        {/* Render Existing URLs */}
        {existingUrls.map((url, i) => (
          <div key={`existing-${i}`} className="relative w-24 h-24 rounded-lg overflow-hidden border border-[var(--border)] group">
            <img
              src={url}
              alt={`Existing ${i + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemoveExisting(i)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        ))}

        {/* Render New Files */}
        {newFiles.map((file, i) => (
          <div key={`new-${i}`} className="relative w-24 h-24 rounded-lg overflow-hidden border border-blue-500 group">
            <img
              src={URL.createObjectURL(file)}
              alt={`Upload ${i + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemoveNew(i)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
            {/* Tiny badge to show it's new */}
            <div className="absolute bottom-0 left-0 right-0 bg-blue-500/80 text-white text-[9px] font-bold text-center uppercase tracking-wider py-0.5 pointer-events-none">
              New
            </div>
          </div>
        ))}
        
        {/* Upload Button */}
        {totalImages < maxImages && (
          <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-[#00cfff] rounded-lg cursor-pointer bg-[var(--bg-primary)] hover:bg-[#00cfff]/10 transition-colors">
            <svg className="w-8 h-8 text-[#00cfff] mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            <span className="text-[10px] font-bold text-[#00cfff] uppercase">Add Photo</span>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </label>
        )}
      </div>
      <p className="mt-2 text-[11px] text-[var(--text-muted)]">
        First photo will be your main featured image. Maximum {maxImages} photos.
      </p>
    </div>
  );
}
