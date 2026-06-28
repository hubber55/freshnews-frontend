export const MAX_UPLOAD_BYTES = 950 * 1024; // 950KB (to fit under Nginx 1MB request limit)

export async function compressImageFile(file: File, maxBytes = MAX_UPLOAD_BYTES): Promise<File> {
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
    throw new Error('Image is too large. Please choose a smaller image (under 1MB).');
  }

  const baseName = file.name.replace(/\.[^.]+$/, '');
  return new File([compressedBlob], `${baseName}.jpg`, { type: 'image/jpeg' });
}
