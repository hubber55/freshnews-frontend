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
    const body = await req.json();
    const { status, title, content, tags, price, contact_phone } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const numericId = parseInt(id);

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (tags !== undefined) updateData.tags = tags;
    if (price !== undefined) updateData.price = price;
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone;
    
    const { error } = await supabase
      .from('submissions')
      .update(updateData)
      .eq('id', numericId);

    if (error) throw error;

    // If approving, promote to posts table and send WhatsApp to user
    if (status === 'approved') {
      const { data: submission } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', numericId)
        .single();

      if (submission) {
        // 1. Create entry in posts table so it shows on homepage
        const submissionTags = Array.from(new Set([
          ...(Array.isArray(submission.tags) ? submission.tags.filter(Boolean) : []),
          ...(submission.type === 'classified' ? ['Classifieds'] : []),
        ]));

        // Include price/phone in summary for homepage view if it's a classified
        let displaySummary = submission.content;
        if (submission.type === 'classified') {
          const pricePart = submission.price ? `Price: ${submission.price}` : '';
          const phonePart = submission.contact_phone ? `Phone: ${submission.contact_phone}` : '';
          if (pricePart || phonePart) {
            displaySummary = `${displaySummary}\n\n${[pricePart, phonePart].filter(Boolean).join(' | ')}`;
          }
        }

        await supabase
          .from('posts')
          .insert({
            title: submission.title,
            summary: displaySummary,
            source_name: 'FRESHNEWS',
            image_url: submission.image_url || null,
            tags: submissionTags,
            published_at: new Date().toISOString(),
            is_deleted: false,
            // Store submission_id so we can link back or avoid duplicates if needed
            submission_id: numericId 
          });

        // 2. Send WhatsApp notification
        const { data: waUser } = await supabase
          .from('wa_users')
          .select('whatsapp_number')
          .eq('id', submission.user_id)
          .single();

        if (waUser?.whatsapp_number) {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://freshnews.top';
          const type = submission.type;
          let liveMsg = '';
          if (type === 'classified' || type === 'ad') liveMsg = `✅ Your Classified/Ad is Live Now!\n"${submission.title}"\nView: ${baseUrl}/classifieds/${numericId}`;
          else if (type === 'news') liveMsg = `✅ Your News is Live Now!\n"${submission.title}"\nView: ${baseUrl}`;
          else if (type === 'event') liveMsg = `✅ Your Event is Live Now!\n"${submission.title}"\nView: ${baseUrl}`;

          await fetch(`${baseUrl}/api/send-whatsapp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: waUser.whatsapp_number, message: liveMsg }),
          }).catch(() => {});
        }
      }
    }

    return NextResponse.json({ ok: true });
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
    const supabase = createAdminClient();
    
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
    const contact_phone = body?.contact_phone || null;

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
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const { error: statusError } = await supabase
      .from('submissions')
      .update({ 
        status: 'approved',
        price,
        contact_phone
      })
      .eq('id', submissionId);

    if (statusError) throw statusError;

    if (user?.whatsapp_number) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://freshnews.top';
      const postUrl = submission.type === 'classified' || submission.type === 'ad' 
        ? `${baseUrl}/classifieds/${submissionId}`
        : `${baseUrl}/posts/${newPost.id}`;
      const message = `✅ Your ${submission.type} "${title}" has been approved!\nView it here: ${postUrl}`;

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
