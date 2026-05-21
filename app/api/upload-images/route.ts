import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/auth';

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024; // 3MB

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
  
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const imageCount = parseInt(formData.get('imageCount') as string || '0');
    
    if (imageCount === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    const imageUrls: string[] = [];

    for (let i = 0; i < imageCount; i++) {
      const file = formData.get(`imageFile_${i}`) as File | null;
      if (file && file.size > 0) {
        if (!file.type.startsWith('image/')) {
          return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          return NextResponse.json({ error: `Image exceeds 3MB limit` }, { status: 400 });
        }

        const fileExtension = file.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}-edit-${Date.now()}-${i}.${fileExtension}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('submissions')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Image upload failed:', uploadError.message);
          return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
        }

        if (uploadData) {
          const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(uploadData.path);
          imageUrls.push(urlData.publicUrl);
        }
      }
    }

    return NextResponse.json({ urls: imageUrls });
  } catch (error: unknown) {
    console.error('Upload API Error:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
