import type { SVGProps } from 'react';

// Using an inline SVG for the logo for simplicity and scalability
const LogoIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

interface AppLogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  collapsed?: boolean;
}

export function AppLogo({ className, iconClassName, textClassName, collapsed = false }: AppLogoProps) {
  return (
    <div className={className ? className : "flex items-center gap-2"}>
      <LogoIcon className={iconClassName ? iconClassName : "h-7 w-7 text-primary"} />
      {!collapsed && (
        <span className={textClassName ? textClassName : "text-xl font-semibold text-foreground"}>
          FinanceFlow AI
        </span>
      )}
    </div>
  );
}
