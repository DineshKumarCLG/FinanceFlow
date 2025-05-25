
import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

// Using an inline SVG for the logo for simplicity and scalability
// This is a generic icon, you might want to replace it with one that matches your new theme.
// The image shows a green circle with a white letter A or a stylized shape.
const LogoIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="currentColor" // Changed to currentColor to inherit from parent
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    {/* Simple A for Alicia Koch example, or your app initial */}
    {/* <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="12" fill={props.fill === 'hsl(var(--accent))' || props.fill === 'currentColor' ? 'hsl(var(--background))' : 'hsl(var(--accent-foreground))'}>A</text> */}
  </svg>
);


interface AppLogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  collapsed?: boolean;
  showText?: boolean; // New prop to explicitly control text visibility
}

export function AppLogo({ className, iconClassName, textClassName, collapsed = false, showText = true }: AppLogoProps) {
  const displayAppName = collapsed ? false : showText;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoIcon className={cn("h-7 w-7 text-accent", iconClassName)} /> {/* Default to accent color (green) */}
      {displayAppName && (
        <span className={cn("text-xl font-semibold text-foreground", textClassName)}>
          FinanceFlow AI {/* Or "Alicia Koch" from example */}
        </span>
      )}
    </div>
  );
}
```