
import { NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { getCurrentUser } from '@/lib/auth';

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024; // 3MB

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
    // 800 words max for content
    const contentWordCount = content.trim().split(/\s+/).length;
    if (contentWordCount > 800) {
      return NextResponse.json({ error: 'Content exceeds 800 words' }, { status: 400 });
    }
    if (!imageFile || imageFile.size <= 0) {
      return NextResponse.json({ error: 'Image upload is required' }, { status: 400 });
    }
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid image file type' }, { status: 400 });
    }
    if (imageFile.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'Image exceeds 3MB limit' }, { status: 400 });
    }

    let finalImageUrl: string | undefined;

    // --- Image Upload ---
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

    // --- Expiry and Limits for Classifieds ---
    let expiresAt: string | null = null;
    if (type === 'classified') {
      // 1. Fetch parameters from admin_settings
      const { data: settings } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', ['classified_expiry_days', 'classified_limit_per_month']);
      
      const expiryDays = parseInt(settings?.find(s => s.key === 'classified_expiry_days')?.value || '30');
      const monthlyLimit = parseInt(settings?.find(s => s.key === 'classified_limit_per_month')?.value || '2');

      // 2. Check monthly limit for this category
      if (categoryId) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count: existingAds } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('type', 'classified')
          .eq('category_id', parseInt(categoryId))
          .gte('created_at', startOfMonth.toISOString());

        if ((existingAds || 0) >= monthlyLimit) {
          return NextResponse.json({ 
            error: `You have reached the monthly limit of ${monthlyLimit} ads for this category.` 
          }, { status: 429 });
        }
      }

      // 3. Set expiry date
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);
      expiresAt = expiryDate.toISOString();
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
        expires_at: expiresAt,
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

      if (!newsTitle || !newsContent) {
        // Not a hard error, just skip if fields are missing
      } else {
        let finalNewsImageUrl: string | undefined;
        if (newsImageFile && newsImageFile.size > 0) {
          if (!newsImageFile.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Invalid news image file type' }, { status: 400 });
          }
          if (newsImageFile.size > MAX_UPLOAD_BYTES) {
            return NextResponse.json({ error: 'News image exceeds 3MB limit' }, { status: 400 });
          }

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
    const userMessage = `Your ${type} submission "${title}" has been received and will be published after Admin Approval.`;
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
