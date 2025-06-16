
"use client";

import type { ReactNode } from "react";
import { NAV_ITEMS_MAIN, NAV_ITEMS_BOTTOM } from "@/lib/constants";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { Header } from "@/components/layout/Header";
import { AppLogo } from "@/components/layout/AppLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, PlusCircle } from "lucide-react"; // Added PlusCircle for FAB
import { BottomNavBar } from "@/components/layout/BottomNavBar";
import Link from "next/link"; // Added Link for FAB
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
        <AppLogo 
          showText={false} 
          className="w-full" 
          iconClassName="w-full h-auto object-contain" 
        />
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
      <Sidebar collapsible="icon" className="hidden md:flex md:flex-col">
        <SidebarContentLayout />
      </Sidebar>
      <SidebarInset>
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-6 lg:md:pb-8">
          {children}
        </main>
        <BottomNavBar />
        {/* Floating Action Button for Add Entry - Mobile Only */}
        <Link
          href="/add-entry"
          className="fixed bottom-20 right-6 z-50 md:hidden flex items-center justify-center bg-primary text-primary-foreground h-14 w-14 rounded-full shadow-lg hover:bg-primary/90 active:bg-primary/80 transition-colors"
          aria-label="Add New Entry"
        >
          <PlusCircle className="h-7 w-7" />
        </Link>
      </SidebarInset>
    </SidebarProvider>
  );
}

