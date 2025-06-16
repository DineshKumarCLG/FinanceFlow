
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
         {/* Always show AppLogo icon in the header */}
         <AppLogo variant="icon" iconClassName="h-7 w-7 text-primary" />
      </div>
      
      <div className="flex flex-1 items-center justify-end space-x-2 md:space-x-4">
        <UserNav />
      </div>
    </header>
  );
}
