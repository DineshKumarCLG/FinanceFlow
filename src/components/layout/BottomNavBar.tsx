
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/constants";
import { LayoutDashboard, PlusCircle, BookOpenText, MessageCircle, Settings as SettingsIcon } from "lucide-react"; // Renamed Settings to SettingsIcon to avoid conflict

const BOTTOM_NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Add Entry", href: "/add-entry", icon: PlusCircle },
  { title: "Journal", href: "/journal", icon: BookOpenText },
  { title: "AI Chat", href: "/chat", icon: MessageCircle },
  { title: "Settings", href: "/settings", icon: SettingsIcon },
];

export function BottomNavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 p-1 backdrop-blur-sm md:hidden">
      <div className="grid h-14 grid-cols-5 items-center">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.title}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-md p-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
