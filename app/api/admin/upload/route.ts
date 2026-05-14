import { NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    // 1. Verify session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get the file from request
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 3. Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    // 4. Upload to Supabase Storage
    const adminSupabase = createAdminClient();
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `placeholder-ads/${fileName}`;

    // Note: Ensure the 'submissions' bucket exists and has public access or appropriate policies.
    // If you have a 'placeholder_ads' bucket, change the name here.
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from('submissions')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload to storage' }, { status: 500 });
    }

    // 5. Get public URL
    const { data: { publicUrl } } = adminSupabase.storage
      .from('submissions')
      .getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrl });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
