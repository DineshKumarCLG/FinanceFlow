
import type { Metadata } from 'next';
// import { GeistSans } from 'geist/font/sans'; // Removed GeistSans
// import { GeistMono } from 'geist/font/mono'; // Keep commented out or remove if not used elsewhere
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from '@/components/ui/tooltip';

export const metadata: Metadata = {
  title: 'FinanceFlow AI',
  description: 'AI-Powered Accounting Assistant for Small Businesses',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased flex flex-col min-h-screen`}>
        <AuthProvider>
          <TooltipProvider>
            <div className="flex-grow">
              {children}
            </div>
            <Toaster />
            <footer className="py-4 text-center text-sm text-muted-foreground border-t">
              <p>
                Made with ❤️ by <span className="font-semibold">Kenesis</span>
              </p>
            </footer>
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
