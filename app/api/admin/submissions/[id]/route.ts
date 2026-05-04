import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected error';
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'ID and Status are required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    const { error } = await supabase
      .from('submissions')
      .update({ status })
      .eq('id', parseInt(id));

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const title = String(body?.title ?? '').trim();
    const content = String(body?.content ?? '').trim();
    const tags = Array.isArray(body?.tags) ? body.tags.filter(Boolean) : [];
    const price = body?.price || null;
    const contactPhone = body?.contact_phone || null;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const submissionId = Number(id);
    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError) throw fetchError;
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const { data: user } = await supabase
      .from('wa_users')
      .select('whatsapp_number')
      .eq('id', submission.user_id)
      .single();

    const submissionTags = Array.from(new Set([
      ...(Array.isArray(submission.tags) ? submission.tags.filter(Boolean) : tags),
      ...(submission.type === 'classified' ? ['Classifieds'] : []),
    ]));

    const { data: newPost, error: insertError } = await supabase
      .from('posts')
      .insert({
        title,
        summary: content,
        source_name: 'FRESHNEWS',
        image_url: submission.image_url || null,
        tags: submissionTags,
        published_at: new Date().toISOString(),
        is_deleted: false,
        price: price || submission.price,
        contact_phone: contactPhone || submission.contact_phone,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const { error: statusError } = await supabase
      .from('submissions')
      .update({ status: 'approved', post_id: newPost.id })
      .eq('id', submissionId);

    if (statusError) throw statusError;

    if (user?.whatsapp_number) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://freshnews.top';
      const message = `Your ${submission.type} "${title}" has been approved! View it here: ${baseUrl}/posts/${newPost.id}`;

      await fetch(`${baseUrl}/api/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: user.whatsapp_number, message }),
      }).catch((error) => console.error('Failed to send whatsapp:', error));
    }

    return NextResponse.json({ ok: true, postId: newPost.id });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const supabase = createAdminClient();

    // Get submission to find images
    const { data: submission } = await supabase
      .from('submissions')
      .select('image_url')
      .eq('id', parseInt(id))
      .single();

    if (submission?.image_url) {
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
        console.error('Error deleting images from storage:', e);
      }
    }

    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('id', parseInt(id));

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
