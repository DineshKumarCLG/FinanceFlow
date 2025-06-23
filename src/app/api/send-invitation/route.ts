import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, role, companyName, inviterName } = await request.json();

    if (!email || !role || !companyName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('Attempting to send email with Resend...');
    console.log('API Key exists:', !!resend);
    console.log('To:', email);

    try {
      // Use the default Resend verified domain
      const fromEmail = 'onboarding@resend.dev';
      console.log('Using sender:', fromEmail);

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [email],
        subject: `Invitation to join ${companyName} on FinanceFlow AI`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1a73e8; margin: 0;">FinanceFlow AI</h1>
            </div>

            <h2 style="color: #333;">You've been invited to join ${companyName}</h2>

            <p>Hello!</p>

            <p>${inviterName || 'A team member'} has invited you to join <strong>${companyName}</strong> as a <strong>${role}</strong> on FinanceFlow AI.</p>

            <p>FinanceFlow AI is a modern accounting platform that helps businesses manage their finances with AI assistance. Here's what you can do:</p>

            <ul style="margin: 20px 0;">
              <li>Manage journal entries and ledger accounts</li>
              <li>Generate invoices and track payments</li>
              <li>Create financial reports and statements</li>
              <li>Get AI-powered insights for your business</li>
            </ul>

            <div style="text-align: center; margin: 40px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://financeflow.ai'}" 
                 style="background-color: #1a73e8; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
                Accept Invitation & Sign Up
              </a>
            </div>

            <p style="color: #666; font-size: 14px;">
              If the button above doesn't work, copy and paste this link into your browser:
              <br>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://financeflow.ai'}" style="color: #1a73e8;">
                ${process.env.NEXT_PUBLIC_APP_URL || 'https://financeflow.ai'}
              </a>
            </p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

            <p style="color: #666; font-size: 14px;">
              If you have any questions, feel free to reach out to your team or contact support.
            </p>

            <p style="color: #666; font-size: 14px;">
              Best regards,<br>
              The FinanceFlow AI Team
            </p>
          </div>
        `,
      });

      if (error) {
        console.log('Resend API error:', error);
        return NextResponse.json(
          { error: 'Failed to send invitation email', details: error },
          { status: 500 }
        );
      }

      console.log('Email sent successfully');
      console.log('Response:', data);

      return NextResponse.json({ 
        success: true, 
        message: 'Invitation sent successfully',
        emailId: data?.id 
      });

    } catch (emailError) {
      console.log('Email sending error:', emailError);
      console.log('Error details:', JSON.stringify(emailError, null, 2));

      return NextResponse.json(
        { error: 'Failed to send invitation email', details: emailError },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}