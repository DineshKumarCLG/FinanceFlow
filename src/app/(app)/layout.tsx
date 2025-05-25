
"use client";

import type { ReactNode } from "react";
import { NAV_ITEMS_MAIN, NAV_ITEMS_BOTTOM } from "@/lib/constants";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { Header } from "@/components/layout/Header";
import { AppLogo } from "@/components/layout/AppLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { BottomNavBar } from "@/components/layout/BottomNavBar";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  // SidebarSeparator, // No longer explicitly used here
  // SidebarTrigger, // Now part of Header
  useSidebar
} from "@/components/ui/sidebar";


function SidebarContentLayout() {
  const { open } = useSidebar();
  return (
    <>
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <AppLogo collapsed={!open} />
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2 pr-0">
        <SidebarNav items={NAV_ITEMS_MAIN} />
      </SidebarContent>
      {/* <SidebarSeparator /> */} {/* Optional: can be added within SidebarNav or directly if needed */}
      <SidebarFooter className="p-2 mt-auto border-t border-sidebar-border"> {/* Added mt-auto and border */}
        <SidebarNav items={NAV_ITEMS_BOTTOM} />
      </SidebarFooter>
    </>
  );
}


export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: authIsLoading, currentCompanyId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // This useEffect is a safety net; primary redirection should be handled by AuthContext.
  // It ensures that if AppLayout is rendered under incorrect conditions, it attempts a correction.
  useEffect(() => {
    if (!authIsLoading) {
      if (!isAuthenticated) {
        if (pathname !== '/') { // Check to avoid loop if already on company page
            console.log("AppLayout: Not authenticated, attempting redirect to /");
            router.push('/');
        }
      } else if (!currentCompanyId && pathname !== '/') {
         // Authenticated, but no company ID, and not on company page, redirect to company page
        console.log("AppLayout: Authenticated but no company ID, attempting redirect to /");
        router.push('/');
      }
    }
  }, [isAuthenticated, authIsLoading, currentCompanyId, router, pathname]);

  // Determine if we should show the main app loader.
  // Show loader if:
  // 1. Auth context is still loading.
  // 2. User is not authenticated AND they are not on the company selection page (they will be/are being redirected).
  // 3. User is authenticated, but no company ID, AND they are not on the company selection page (they will be/are being redirected).
  const showAppLoader = authIsLoading ||
                       (!isAuthenticated && pathname !== '/') ||
                       (isAuthenticated && !currentCompanyId && pathname !== '/');

  if (showAppLoader) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If we reach here, it means:
  // - authIsLoading is false.
  // - EITHER (isAuthenticated is true AND currentCompanyId is set)
  // - OR (pathname is '/', allowing the company login page to render)
  // This ensures that protected app content is only rendered when all conditions are met.

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon" className="hidden md:flex md:flex-col">
        <SidebarContentLayout />
      </Sidebar>
      <SidebarInset>
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-6 lg:md:pb-8">
          {children}
        </main>
        <BottomNavBar />
      </SidebarInset>
    </SidebarProvider>
  );
}
