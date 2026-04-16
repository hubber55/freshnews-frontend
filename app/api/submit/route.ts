
import { NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const type = formData.get('type') as string;
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const tags = (formData.get('tags') as string).split(',').map(t => t.trim());
    const categoryId = formData.get('categoryId') as string;
    const subcategoryId = formData.get('subcategoryId') as string;
    const imageFile = formData.get('imageFile') as File | null;
    const imageUrl = formData.get('imageUrl') as string;
    const externalUrl = formData.get('externalUrl') as string;
    const hyperlinkText = formData.get('hyperlinkText') as string;
    const isPremium = formData.get('isPremium') === 'true';

    // --- Data Validation ---
    if (!type || !title || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (title.length > 70) {
      return NextResponse.json({ error: 'Title exceeds 70 characters' }, { status: 400 });
    }
    if (content.length > 500) {
      return NextResponse.json({ error: 'Content exceeds 500 characters' }, { status: 400 });
    }

    let finalImageUrl: string | undefined = imageUrl;

    // --- Image Upload ---
    if (imageFile && imageFile.size > 0) {
      const fileExtension = imageFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExtension}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(fileName, imageFile);

      if (uploadError) {
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(uploadData.path);
      finalImageUrl = urlData.publicUrl;
    }

    // --- Database Insertion ---
    const { data: submissionData, error: submissionError } = await supabase
      .from('submissions')
      .insert({
        user_id: user.id,
        type,
        title,
        content,
        tags,
        category_id: categoryId ? parseInt(categoryId) : null,
        subcategory_id: subcategoryId ? parseInt(subcategoryId) : null,
        image_url: finalImageUrl,
        external_url: externalUrl,
        hyperlink_text: hyperlinkText,
        is_premium: isPremium,
        status: 'pending',
      })
      .select()
      .single();

    if (submissionError) {
      throw new Error(`Database insertion failed: ${submissionError.message}`);
    }

    // --- Handle News for Ad ---
    const newsForAd = formData.get('newsForAd') === 'true';
    if (type === 'ad' && newsForAd) {
      const newsTitle = formData.get('newsTitle') as string;
      const newsContent = formData.get('newsContent') as string;
      const newsTags = (formData.get('newsTags') as string).split(',').map(t => t.trim());
      const newsImageFile = formData.get('newsImageFile') as File | null;
      const newsImageUrl = formData.get('newsImageUrl') as string;

      if (!newsTitle || !newsContent) {
        // Not a hard error, just skip if fields are missing
      } else {
        let finalNewsImageUrl: string | undefined = newsImageUrl;
        if (newsImageFile && newsImageFile.size > 0) {
          const fileExtension = newsImageFile.name.split('.').pop();
          const fileName = `${user.id}-news-${Date.now()}.${fileExtension}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('submissions')
            .upload(fileName, newsImageFile);

          if (uploadError) {
            // Log error but don't fail the whole submission
            console.error('News image upload failed:', uploadError.message);
          } else {
            const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(uploadData.path);
            finalNewsImageUrl = urlData.publicUrl;
          }
        }

        const { error: adNewsError } = await supabase.from('ad_news').insert({
          submission_id: submissionData.id,
          title: newsTitle,
          content: newsContent,
          tags: newsTags,
          image_url: finalNewsImageUrl,
        });

        if (adNewsError) {
          // Log error but don't fail the whole submission
          console.error('Failed to insert ad_news:', adNewsError.message);
        }
      }
    }

    // --- WhatsApp Notifications ---
    const userMessage = `Your ${type} submission "${title}" has been received and will be published after admin approval.`;
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: user.whatsapp_number, message: userMessage }),
    });

    const { data: adminSettings } = await supabase.from('admin_settings').select('value').eq('key', 'admin_whatsapp_number').single();
    const adminWhatsappNumber = adminSettings?.value;

    if (adminWhatsappNumber) {
        const adminMessage = `A new ${type} submission titled "${title}" is pending approval.`;
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/send-whatsapp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: adminWhatsappNumber, message: adminMessage }),
        });
    }

    return NextResponse.json({ ok: true, submissionId: submissionData.id });

  } catch (e: any) {
    console.error('Submission API Error:', e);
    return NextResponse.json({ error: e.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
