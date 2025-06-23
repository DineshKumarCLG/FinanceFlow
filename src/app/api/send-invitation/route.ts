
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

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Team Invitation</h2>
        <p>Hello!</p>
        <p><strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> as a <strong>${role}</strong>.</p>
        <p>To accept this invitation and join the team, please click the button below:</p>
        <a href="${invitationLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Accept Invitation</a>
        <p>If you don't have an account yet, you'll be prompted to create one.</p>
        <p>Best regards,<br>The Kenesis Team</p>
        <hr>
        <p style="font-size: 12px; color: #666;">If the button doesn't work, copy and paste this link: ${invitationLink}</p>
      </div>
    `;

    // Send actual email using Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const { data, error } = await resend.emails.send({
          from: 'onboarding@resend.dev', // Using Resend's default verified domain
          to: email,
          subject: `Invitation to join ${companyName}`,
          text: emailBody,
          html: htmlBody,
        });

        if (error) {
          console.error('Resend error details:', error);
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to send email', 
            details: error 
          }, { status: 500 });
        }

        console.log('Email sent successfully:', data);

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
