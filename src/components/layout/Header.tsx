
"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "@/components/layout/UserNav";
import { AppLogo } from "./AppLogo";
import { useSidebar } from "@/components/ui/sidebar";


export function Header() {
  const { isMobile, open: sidebarOpen } = useSidebar();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-2">
         {/* SidebarTrigger is now only shown on desktop/tablet (md:flex), hidden on mobile */}
         <SidebarTrigger className="hidden md:flex" />
         {/* Show AppLogo with text if sidebar is open AND not mobile, or collapsed if sidebar is closed and not mobile */}
         {!isMobile && <AppLogo collapsed={!sidebarOpen} iconClassName="h-6 w-6 text-primary" />}
         {/* On mobile, always show AppLogo with text, as there's no persistent sidebar */}
         {isMobile && <AppLogo collapsed={false} iconClassName="h-6 w-6 text-primary" />}
      </div>
      
      <div className="flex flex-1 items-center justify-end space-x-2 md:space-x-4">
        <UserNav />
      </div>
    </header>
  );
}
