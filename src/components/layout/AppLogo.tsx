
import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image'; 

interface AppLogoProps {
  className?: string;
  iconClassName?: string; 
  textClassName?: string;
  collapsed?: boolean;
  showText?: boolean; 
  variant?: 'logo' | 'icon';
  companyLogoUrl?: string; // New prop for company-specific logo
}

export function AppLogo({ 
  className, 
  iconClassName, 
  textClassName, 
  collapsed = false, 
  showText = true, 
  variant,
  companyLogoUrl 
}: AppLogoProps) {

  const displayVariant = variant || (collapsed ? 'icon' : 'logo');
  const effectiveShowText = (displayVariant === 'logo' && showText);

  // If a company logo URL is provided, prioritize displaying it.
  if (companyLogoUrl) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Image
          src={companyLogoUrl}
          alt="Company Logo" // Generic alt text, or could pass company name
          width={36} 
          height={36}
          className={cn(
            "h-7 w-7 sm:h-9 sm:w-9 object-contain", // Ensure object-contain
            iconClassName 
          )}
          data-ai-hint="company brandmark"
        />
        {effectiveShowText && (
          <span className={cn("text-xl font-semibold text-foreground", textClassName)}>
            FinanceFlow AI 
          </span>
        )}
      </div>
    );
  }

  // Fallback to default FinanceFlow logo/icon if no companyLogoUrl
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {displayVariant === 'icon' ? (
        <Image
          src="/assets/images/financeflow_icon.png" 
          alt="FinanceFlow Icon" 
          width={36} 
          height={36}
          className={cn(
            "h-7 w-7 sm:h-9 sm:w-9", 
            iconClassName 
          )}
          data-ai-hint="application icon"
        />
      ) : (
        <>
          <Image
            src="/assets/images/financeflow_logo.png" 
            alt="FinanceFlow Logo" 
            width={36} 
            height={36}
            className={cn(
              "h-7 w-7 sm:h-9 sm:w-9", 
              iconClassName 
            )}
            data-ai-hint="application logo"
          />
          {effectiveShowText && (
            <span className={cn("text-xl font-semibold text-foreground", textClassName)}>
              FinanceFlow AI
            </span>
          )}
        </>
      )}
    </div>
  );
}
