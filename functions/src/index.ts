
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { defineString } from 'firebase-functions/params';

admin.initializeApp();

// Define environment parameters
const smtpHost = defineString('SMTP_HOST');
const smtpPort = defineString('SMTP_PORT'); 
const smtpUser = defineString('SMTP_USER');
const smtpPass = defineString('SMTP_PASS');

export const sendInvitationEmail = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { email, role, companyName, inviterName, companyId } = data;

  // Validate required fields
  if (!email || !role || !companyName) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  try {
    // Using nodemailer with Gmail SMTP (you can configure other providers)
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransporter({
      host: smtpHost.value(),
      port: parseInt(smtpPort.value()),
      secure: parseInt(smtpPort.value()) === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser.value(),
        pass: smtpPass.value(),
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://financeflow.ai';

    const mailOptions = {
      from: smtpUser.value(),
      to: email,
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
            <a href="${appUrl}" 
               style="background-color: #1a73e8; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
              Accept Invitation & Sign Up
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">
            If the button above doesn't work, copy and paste this link into your browser:
            <br>
            <a href="${appUrl}" style="color: #1a73e8;">
              ${appUrl}
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
    };

    await transporter.sendMail(mailOptions);
    
    // Log the invitation in Firestore
    await admin.firestore().collection('invitations').add({
      email,
      role,
      companyId,
      companyName,
      inviterUid: context.auth.uid,
      inviterName,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'sent'
    });

    return { success: true, message: 'Invitation sent successfully' };
    
  } catch (error) {
    console.error('Error sending invitation:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send invitation email');
  }
});
