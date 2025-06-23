import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

export async function POST(request: Request) {
  try {
    const { email, role, companyName, inviterName, companyId } = await request.json();

    if (!email || !role || !companyName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user is authenticated
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    console.log('Attempting to send email with Firebase Functions...');
    console.log('To:', email);

    try {
      // Get Firebase Functions instance
      const functions = getFunctions();
      const sendInvitationEmail = httpsCallable(functions, 'sendInvitationEmail');

      // Call the Cloud Function
      const result = await sendInvitationEmail({
        email,
        role,
        companyName,
        inviterName: inviterName || currentUser.displayName || 'Team Admin',
        companyId
      });

      console.log('Email sent successfully via Firebase Functions');
      console.log('Response:', result.data);

      return NextResponse.json({ 
        success: true, 
        message: 'Invitation sent successfully',
        data: result.data
      });

    } catch (functionError: any) {
      console.log('Firebase Function error:', functionError);
      console.log('Error details:', JSON.stringify(functionError, null, 2));

      return NextResponse.json(
        { 
          error: 'Failed to send invitation email', 
          details: functionError.message || 'Unknown error'
        },
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