
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/constants";
import { NAV_ITEMS_MAIN, NAV_ITEMS_BOTTOM } from "@/lib/constants";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; // Import ScrollArea and ScrollBar

// Combine main and bottom navigation items, excluding "Add Entry" as it's now a FAB
const allNavItems = [...NAV_ITEMS_MAIN, ...NAV_ITEMS_BOTTOM];
const navItemsToDisplay = allNavItems.filter(item => item.href !== '/add-entry');

export function BottomNavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm md:hidden h-16">
      <ScrollArea className="h-full w-full" orientation="horizontal">
        <div className="flex h-full items-center px-1 space-x-1"> {/* Using space-x for item separation */}
          {navItemsToDisplay.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.title}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 rounded-md p-2 text-xs font-medium transition-colors shrink-0",
                  "min-w-[70px] max-w-[90px] h-full", // Ensure consistent item width and use full height
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title={item.title} // Add title attribute for better accessibility on hover
              >
                <Icon className="h-5 w-5 mb-0.5" /> {/* Adjusted icon margin */}
                <span className="truncate w-full text-center leading-tight">{item.title}</span>
              </Link>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </nav>
  );
}
