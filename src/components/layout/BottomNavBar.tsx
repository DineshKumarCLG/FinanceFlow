
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/constants";
import { NAV_ITEMS_MAIN, NAV_ITEMS_BOTTOM } from "@/lib/constants";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Ellipsis } from "lucide-react"; // Using Ellipsis for "More"
import React from "react";

// Combine main and bottom navigation items
const allNavItems = [...NAV_ITEMS_MAIN, ...NAV_ITEMS_BOTTOM];
// Exclude "Add Entry" as it's a FAB
const navItemsForBottomBar = allNavItems.filter(item => item.href !== '/add-entry');

const ITEMS_DIRECT_DISPLAY_COUNT = 4; // Number of items to display directly (4 primary + 1 More button = 5 total)

export function BottomNavBar() {
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  const primaryItems = navItemsForBottomBar.slice(0, ITEMS_DIRECT_DISPLAY_COUNT);
  const moreItems = navItemsForBottomBar.slice(ITEMS_DIRECT_DISPLAY_COUNT);

  const NavLink = ({ item, inSheet = false }: { item: NavItem, inSheet?: boolean }) => {
    const Icon = item.icon;
    const isActive = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-2 rounded-md text-sm font-medium transition-colors",
          inSheet
            ? "w-full p-3 hover:bg-muted data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
            : "flex-col justify-center p-2 text-xs min-w-[70px] max-w-[90px] h-full shrink-0 hover:bg-muted", // Adjusted for 5 items
          isActive && !inSheet ? "text-primary" : "text-muted-foreground",
          isActive && inSheet ? "bg-primary text-primary-foreground" : "hover:text-foreground"
        )}
        onClick={() => {
          if (inSheet) setIsSheetOpen(false);
        }}
        data-active={isActive}
        title={item.title}
      >
        <Icon className={cn("mb-0.5", inSheet ? "h-5 w-5" : "h-5 w-5")} />
        <span className={cn("truncate leading-tight", inSheet ? "" : "w-full text-center")}>{item.title}</span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm md:hidden h-16">
      <div className="flex h-full items-stretch justify-around px-1"> {/* Use justify-around for even spacing */}
        {primaryItems.map((item) => (
          <NavLink key={item.title} item={item} />
        ))}
        {moreItems.length > 0 && (
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 p-2 text-xs font-medium transition-colors",
                  "min-w-[70px] max-w-[90px] h-full shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground" // Adjusted for 5 items
                )}
                title="More options"
              >
                <Ellipsis className="h-5 w-5 mb-0.5" />
                <span className="truncate w-full text-center leading-tight">More</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-lg p-0 h-auto max-h-[70svh] flex flex-col">
              <SheetHeader className="p-4 border-b"> {/* Removed custom close button */}
                <SheetTitle className="text-base text-left">More Options</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {moreItems.map((item) => (
                  <NavLink key={item.title} item={item} inSheet={true} />
                ))}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
}
