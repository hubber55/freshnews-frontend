import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

// PATCH - Edit a user's submission
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const submissionId = parseInt(id);
    
    // Get authenticated user using same auth as profile
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get full user data from wa_users
    const { data: userData, error: userError } = await supabase
      .from('wa_users')
      .select('id, whatsapp_number')
      .eq('id', user.id)
      .single();
    
    if (userError || !userData) {
      console.error('User lookup error:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const waUserId = userData.id;
    
    // Fetch the submission to verify ownership
    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .eq('user_id', waUserId)
      .single();
    
    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Submission not found or access denied' }, { status: 404 });
    }
    
    // Parse the update data
    const body = await request.json();
    const { 
      title, 
      content, 
      description,
      external_url, 
      hyperlink_text, 
      location, 
      status 
    } = body;
    
    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      status: status || 'pending',
      updated_at: new Date().toISOString()
    };
    
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    // Map description to content if it was passed from older frontend
    if (description !== undefined && content === undefined) updateData.content = description;
    
    if (external_url !== undefined) updateData.external_url = external_url;
    if (hyperlink_text !== undefined) updateData.hyperlink_text = hyperlink_text;
    if (location !== undefined) updateData.location = location;
    
    // Update the submission
    const { data: updatedSubmission, error: updateError } = await supabase
      .from('submissions')
      .update(updateData)
      .eq('id', submissionId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating submission:', updateError);
      return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 });
    }
    
    // Send WhatsApp notification to user
    try {
      const adminSettings = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'admin_whatsapp_number')
        .single();
      
      const adminWhatsappNumber = adminSettings.data?.value || process.env.ADMIN_WHATSAPP_NUMBER;
      const userWhatsappNumber = userData.whatsapp_number || submission.whatsapp_number;
      
      // Send notification to user
      if (userWhatsappNumber) {
        const userMessage = `Your *${submission.type}* listing "*${title || submission.title}*" has been updated and is now in *pending* mode.\n\nIt will be live after admin approval.\n\n_FreshNews Team_`;
        
        await fetch(`${process.env.NEXT_PUBLIC_WHATSAPP_API_URL}/send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: userWhatsappNumber,
            message: userMessage
          })
        });
      }
      
      // Send notification to admin
      if (adminWhatsappNumber) {
        const adminMessage = `*EDITED SUBMISSION*\n\nType: ${submission.type}\nTitle: ${title || submission.title}\nUser: ${userData.whatsapp_number || 'N/A'}\n\nPlease review and approve.`;
        
        await fetch(`${process.env.NEXT_PUBLIC_WHATSAPP_API_URL}/send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: adminWhatsappNumber,
            message: adminMessage
          })
        });
      }
    } catch (whatsappError) {
      console.error('WhatsApp notification error:', whatsappError);
      // Don't fail the request if WhatsApp fails
    }
    
    return NextResponse.json({ 
      submission: updatedSubmission,
      message: 'Submission updated and pending approval' 
    });
    
  } catch (error) {
    console.error('Error in edit submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
