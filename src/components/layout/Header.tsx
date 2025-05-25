
"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "@/components/layout/UserNav";
import { AppLogo } from "./AppLogo";
import { useSidebar } from "@/components/ui/sidebar";
// import { Input } from "@/components/ui/input"; // Removed
// import { Search } from "lucide-react"; // Removed

export function Header() {
  const { isMobile, open: sidebarOpen } = useSidebar();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-2">
         <SidebarTrigger className="md:hidden" /> {/* Only show trigger on mobile */}
         {/* Show collapsed logo if sidebar is open and not mobile, or if always on desktop and sidebar is collapsed */}
         {!isMobile && <AppLogo collapsed={sidebarOpen} iconClassName="h-6 w-6 text-primary" />}
      </div>
      
      {/* Placeholder for center navigation items if needed in future */}
      {/* <nav className="hidden md:flex gap-6 items-center flex-1 justify-center">
        <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground">Overview</Link>
        <Link href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground">Customers</Link>
        <Link href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground">Products</Link>
        <Link href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground">Settings</Link>
      </nav> */}

      <div className="flex flex-1 items-center justify-end space-x-2 md:space-x-4">
        {/* Search input removed from here */}
        <UserNav />
      </div>
    </header>
  );
}
