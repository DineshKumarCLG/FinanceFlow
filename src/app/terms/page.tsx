
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLogo } from '@/components/layout/AppLogo';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <AppLogo variant="full" iconClassName="h-8 w-8" textClassName="text-xl font-bold" />
          <Button asChild variant="outline">
            <Link href="/">Back to Login</Link>
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing and using FinanceFlow AI, you accept and agree to be bound by the terms and provision of this agreement.</p>
            
            <h2>2. Description of Service</h2>
            <p>FinanceFlow AI is an AI-powered financial management platform that helps businesses manage their accounting, invoicing, payroll, and tax compliance.</p>
            
            <h2>3. User Responsibilities</h2>
            <p>You are responsible for:</p>
            <ul>
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>Ensuring the accuracy of financial data you input</li>
              <li>Complying with applicable laws and regulations</li>
              <li>Regular backup of your important data</li>
            </ul>
            
            <h2>4. Data Security</h2>
            <p>We implement industry-standard security measures to protect your financial data, including encryption and secure data transmission.</p>
            
            <h2>5. Limitation of Liability</h2>
            <p>FinanceFlow AI provides tools and assistance but is not responsible for business decisions made based on the platform's recommendations.</p>
            
            <h2>6. Contact Information</h2>
            <p>For questions about these Terms of Service, please contact us at legal@financeflow.ai</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
