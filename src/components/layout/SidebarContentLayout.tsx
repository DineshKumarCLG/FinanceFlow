
"use client";

import { AppLogo } from "./AppLogo";
import { SidebarNav } from "./SidebarNav";
import { NAV_ITEMS_MAIN, NAV_ITEMS_BOTTOM } from "@/lib/constants";
import {
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

export function SidebarContentLayout() {
  const { open } = useSidebar();

  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border">
        {open ? (
          <AppLogo 
            variant="horizontal" 
            className="px-2 py-1"
            textClassName="text-lg font-bold text-primary"
          />
        ) : (
          <AppLogo 
            variant="icon" 
            className="justify-center"
            iconClassName="h-8 w-8"
          />
        )}
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarNav items={NAV_ITEMS_MAIN} className="px-2 py-4" />
      </SidebarContent>
      
      <SidebarFooter>
        {/* Footer content if needed */}
      </SidebarFooter>
    </>
  );
}
