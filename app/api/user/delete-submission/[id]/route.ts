import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabase = await createClient();

    // Verify ownership and get image URLs
    const { data: submission } = await supabase
      .from('submissions')
      .select('user_id, image_url')
      .eq('id', parseInt(id))
      .single();

    if (!submission || submission.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized or not found' }, { status: 401 });
    }

    // Delete images from storage if they exist
    if (submission.image_url) {
      try {
        const imageUrls: string[] = submission.image_url.startsWith('[') 
          ? JSON.parse(submission.image_url) 
          : [submission.image_url];
        
        const filePaths = imageUrls.map(url => {
          const parts = url.split('/');
          return parts[parts.length - 1];
        });

        if (filePaths.length > 0) {
          await supabase.storage.from('submissions').remove(filePaths);
        }
      } catch (e) {
        console.error('Error deleting submission images:', e);
      }
    }

    // Hard delete the submission record
    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('id', parseInt(id));

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
