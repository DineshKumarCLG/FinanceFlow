
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, role, companyName, inviterName, companyId } = await request.json();

    // For now, using a simple email service approach
    // In production, you'd integrate with SendGrid, Resend, or similar
    
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/?companyId=${companyId}&invite=true`;
    
    const emailBody = `
      Hello!
      
      ${inviterName} has invited you to join ${companyName} as a ${role}.
      
      To accept this invitation and join the team, please click the link below:
      ${invitationLink}
      
      If you don't have an account yet, you'll be prompted to create one.
      
      Best regards,
      The Kenesis Team
    `;

    // Send actual email using Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const { data, error } = await resend.emails.send({
          from: 'noreply@kenesis.app', // Replace with your verified domain
          to: email,
          subject: `Invitation to join ${companyName}`,
          text: emailBody,
        });

        if (error) {
          console.error('Resend error:', error);
          return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Invitation email sent successfully' });
      } catch (error) {
        console.error('Email sending error:', error);
        return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
      }
    } else {
      // Fallback for development - log the email
      console.log('=== INVITATION EMAIL (No RESEND_API_KEY) ===');
      console.log(`To: ${email}`);
      console.log(`Subject: Invitation to join ${companyName}`);
      console.log(`Body:\n${emailBody}`);
      console.log('==========================================');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Invitation email logged (set RESEND_API_KEY for actual sending)' 
      });
    }

  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}
