
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser, getCurrentUsername } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: submissionId } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
  const user = await getCurrentUser();
  const userName = await getCurrentUsername();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    
    // 1. Verify ownership
    const { data: existing } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Submission not found or unauthorized' }, { status: 404 });
    }

    const type = formData.get('type') as string;
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const tags = (formData.get('tags') as string)
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    const categoryId = formData.get('categoryId') as string;
    const subcategoryId = formData.get('subcategoryId') as string;
    const externalUrl = formData.get('externalUrl') as string;
    const hyperlinkText = formData.get('hyperlinkText') as string;
    const location = formData.get('location') as string;
    const price = formData.get('price') as string || null;
    const contactPhone = formData.get('contactPhone') as string || null;

    const submissionTags = Array.from(new Set([
      ...tags,
      ...(type === 'classified' ? ['Classifieds'] : []),
    ]));

    // --- Image Handling (Keep existing or upload new) ---
    const imageCount = parseInt(formData.get('imageCount') as string || '0');
    let finalImageUrl = existing.image_url;

    if (imageCount > 0) {
      const imageUrls: string[] = [];
      for (let i = 0; i < imageCount; i++) {
        const file = formData.get(`imageFile_${i}`) as File | null;
        if (file && file.size > 0) {
          const fileExtension = file.name.split('.').pop() || 'jpg';
          const fileName = `${user.id}-${Date.now()}-${i}.${fileExtension}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('submissions')
            .upload(fileName, file);

          if (!uploadError && uploadData) {
            const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(uploadData.path);
            imageUrls.push(urlData.publicUrl);
          }
        }
      }
      if (imageUrls.length > 0) {
        finalImageUrl = imageUrls.length > 1 ? JSON.stringify(imageUrls) : imageUrls[0];
      }
    }

    // --- Database Update ---
    const { error: updateError } = await supabase
      .from('submissions')
      .update({
        title,
        content,
        tags: submissionTags,
        category_id: categoryId ? parseInt(categoryId) : null,
        subcategory_id: subcategoryId ? parseInt(subcategoryId) : null,
        image_url: finalImageUrl,
        external_url: externalUrl,
        hyperlink_text: hyperlinkText,
        location: location || null,
        price,
        contact_phone: contactPhone,
        status: 'pending', // Reset to pending for approval
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    if (updateError) throw updateError;

    // --- WhatsApp Notifications ---
    // User Notification
    const userMessage = `You had edited your Ad: "${title}" - It will be Live after Admin Approval.`;
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: user.whatsapp_number, message: userMessage }),
    });

    // Admin Notification
    const { data: adminSettings } = await supabase.from('admin_settings').select('value').eq('key', 'admin_whatsapp_number').single();
    const adminWhatsappNumber = adminSettings?.value;

    if (adminWhatsappNumber) {
        const adminMessage = `EDITED ${type} from user ${userName || 'User'} with whatsapp number ${user.whatsapp_number}`;
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/send-whatsapp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: adminWhatsappNumber, message: adminMessage }),
        });
    }

    return NextResponse.json({ ok: true });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Update failed';
    console.error('Update Submission Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: submissionId } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', submissionId)
    .eq('user_id', user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(data);
}


