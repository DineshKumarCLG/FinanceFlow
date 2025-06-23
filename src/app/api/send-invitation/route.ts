
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
      console.log('Attempting to send email with Resend...');
      console.log('API Key exists:', !!process.env.RESEND_API_KEY);
      console.log('From:', 'onboarding@resend.dev');
      console.log('To:', email);
      
      try {
        // Try multiple sender addresses to find one that works
        const senderOptions = [
          'onboarding@resend.dev',
          'team@resend.dev',
          'noreply@resend.dev'
        ];

        let lastError = null;
        let emailSent = false;
        let data = null;

        for (const sender of senderOptions) {
          try {
            console.log(`Trying sender: ${sender}`);
            const result = await resend.emails.send({
              from: sender,
              to: email,
              subject: `Invitation to join ${companyName}`,
              text: emailBody,
              html: htmlBody,
            });

            if (result.error) {
              console.log(`Failed with ${sender}:`, result.error);
              lastError = result.error;
              continue;
            }

            console.log(`Success with ${sender}:`, result.data);
            data = result.data;
            emailSent = true;
            break;
          } catch (err) {
            console.log(`Exception with ${sender}:`, err);
            lastError = err;
            continue;
          }
        }

        if (!emailSent) {
          throw lastError || new Error('All sender options failed');
        }

        if (error) {
          console.error('Resend error details:', JSON.stringify(error, null, 2));
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to send email', 
            details: error 
          }, { status: 500 });
        }

        console.log('Email sent successfully:', JSON.stringify(data, null, 2));

        return NextResponse.json({ 
          success: true, 
          message: 'Invitation email sent successfully',
          emailId: data?.id 
        });
      } catch (error) {
        console.error('Email sending error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to send email',
          details: error.message || error 
        }, { status: 500 });
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
