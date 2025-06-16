import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image'; // Import the Image component

interface AppLogoProps {
  className?: string;
  iconClassName?: string; // This will now apply to the img tag
  textClassName?: string;
  collapsed?: boolean;
  showText?: boolean; // Prop to explicitly control text visibility (used when showing logo)
  variant?: 'logo' | 'icon'; // New prop to explicitly choose variant
}

export function AppLogo({ className, iconClassName, textClassName, collapsed = false, showText = true, variant }: AppLogoProps) {

  // Determine which variant to show based on variant prop or collapsed prop
  // If variant is provided, use it. Otherwise, use collapsed state (icon when collapsed, logo when not).
  const displayVariant = variant || (collapsed ? 'icon' : 'logo');

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {displayVariant === 'icon' ? (
        // Show icon
        <Image
          src="/assets/images/financeflow_icon.png" // Path to your icon file
          alt="FinanceFlow Icon" // Accessible alt text
          width={36} // Base width, adjusted by CSS
          height={36} // Base height, adjusted by CSS
          className={cn(
            "h-7 w-7 sm:h-9 sm:w-9", // Responsive sizing
            iconClassName // Apply any additional icon class names
          )}
        />
      ) : (
        // Show full logo and optional text
        <>
          <Image
            src="/assets/images/financeflow_logo.png" // Path to your logo file
            alt="FinanceFlow Logo" // Accessible alt text
            width={36} // Base width, adjusted by CSS
            height={36} // Base height, adjusted by CSS
            className={cn(
              "h-7 w-7 sm:h-9 sm:w-9", // Responsive sizing
              iconClassName // Apply any additional icon class names
            )}
          />
          {showText && (
            <span className={cn("text-xl font-semibold text-foreground", textClassName)}>
              FinanceFlow AI
            </span>
          )}
        </>
      )}
    </div>
  );
}
