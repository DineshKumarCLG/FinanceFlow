
import type { Metadata } from 'next';
// import { GeistSans } from 'geist/font/sans'; // Removed GeistSans
// import { GeistMono } from 'geist/font/mono'; // Keep commented out or remove if not used elsewhere
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Providers } from '@/components/shared/Providers'; // Import the new Providers component

export const metadata: Metadata = {
  title: 'FinanceFlow AI',
  description: 'AI-Powered Accounting Assistant for Small Businesses',
};

// const geistSans = GeistSans({ // Removed GeistSans
//   variable: '--font-geist-sans',
// });

// const geistMono = GeistMono({ // Keep commented out
//   variable: '--font-geist-mono',
// });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Use .variable directly from the imported GeistSans and GeistMono objects */}
      {/* Removed geistSans.variable and geistMono.variable */}
      <body className={`antialiased`}>
        <Providers> {/* Use the Providers component here */}
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
