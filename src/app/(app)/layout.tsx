
"use client";

import type { ReactNode } from "react";
import { NAV_ITEMS_MAIN, NAV_ITEMS_BOTTOM } from "@/lib/constants";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { Header } from "@/components/layout/Header";
import { AppLogo } from "@/components/layout/AppLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { BottomNavBar } from "@/components/layout/BottomNavBar"; // Import BottomNavBar
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";


function SidebarContentLayout() {
  const { open } = useSidebar();
  return (
    <>
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <AppLogo collapsed={!open} />
          {/* SidebarTrigger is now part of the Header, controlled by md:hidden there */}
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2 pr-0"> {/* Adjust padding for scrollbar */}
        <SidebarNav items={NAV_ITEMS_MAIN} />
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-2">
        <SidebarNav items={NAV_ITEMS_BOTTOM} />
      </SidebarFooter>
    </>
  );
}


export default function AppLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      {/* Sidebar is hidden on mobile (md:block or md:flex will make it visible on medium screens and up) */}
      <Sidebar collapsible="icon" className="hidden md:flex md:flex-col">
        <SidebarContentLayout />
      </Sidebar>
      <SidebarInset>
        <Header />
        {/* Add bottom padding for mobile to account for BottomNavBar height, remove on md and up */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-6 lg:md:pb-8">
          {children}
        </main>
        <BottomNavBar /> {/* Add BottomNavBar here */}
      </SidebarInset>
    </SidebarProvider>
  );
}
