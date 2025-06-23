
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLogo } from '@/components/layout/AppLogo';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
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
            <CardTitle className="text-2xl">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            
            <h2>1. Information We Collect</h2>
            <p>We collect information you provide directly to us, such as:</p>
            <ul>
              <li>Account information (name, email, business details)</li>
              <li>Financial data you input into the platform</li>
              <li>Usage data and analytics</li>
              <li>Communication preferences</li>
            </ul>
            
            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide and improve our services</li>
              <li>Process your financial data and generate reports</li>
              <li>Communicate with you about your account</li>
              <li>Ensure platform security and prevent fraud</li>
            </ul>
            
            <h2>3. Information Sharing</h2>
            <p>We do not sell, trade, or otherwise transfer your personal information to third parties except:</p>
            <ul>
              <li>With your explicit consent</li>
              <li>To trusted service providers who assist in operating our platform</li>
              <li>When required by law or to protect our rights</li>
            </ul>
            
            <h2>4. Data Security</h2>
            <p>We implement robust security measures including:</p>
            <ul>
              <li>End-to-end encryption for sensitive data</li>
              <li>Regular security audits and updates</li>
              <li>Secure data centers with 24/7 monitoring</li>
              <li>Multi-factor authentication options</li>
            </ul>
            
            <h2>5. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access and update your personal information</li>
              <li>Delete your account and associated data</li>
              <li>Export your data in standard formats</li>
              <li>Opt out of non-essential communications</li>
            </ul>
            
            <h2>6. Contact Us</h2>
            <p>For questions about this Privacy Policy, please contact us at privacy@financeflow.ai</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
