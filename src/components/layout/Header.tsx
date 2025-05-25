"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "@/components/layout/UserNav";
import { AppLogo } from "./AppLogo";
import { useSidebar } from "@/components/ui/sidebar";

export function Header() {
  const { isMobile } = useSidebar();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-2">
         <SidebarTrigger className="md:hidden" /> {/* Only show trigger on mobile */}
         {!isMobile && <AppLogo collapsed={true} iconClassName="h-6 w-6 text-primary" />}
      </div>
      
      <div className="flex flex-1 items-center justify-end space-x-4">
        {/* Add any header actions here, e.g., search, notifications */}
        <UserNav />
      </div>
    </header>
  );
}
