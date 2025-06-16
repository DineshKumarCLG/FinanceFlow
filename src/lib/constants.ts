
import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, BookOpenText, BookCopy, MessageCircle, Settings, PlusCircle, UploadCloud, ListChecks, Landmark, BarChart3 } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  label?: string;
  disabled?: boolean;
  external?: boolean;
  collapsible?: boolean;
  items?: NavItem[];
}

export const NAV_ITEMS_MAIN: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Add Entry",
    href: "/add-entry",
    icon: PlusCircle,
  },
  {
    title: "Upload Document",
    href: "/upload-document",
    icon: UploadCloud,
  },
  {
    title: "Journal",
    href: "/journal",
    icon: BookOpenText,
  },
  {
    title: "Ledger",
    href: "/ledger",
    icon: BookCopy,
  },
  {
    title: "Financial Statements", // New Hub Page
    href: "/financial-statements",
    icon: BarChart3,
  },
  {
    title: "AI Assistant",
    href: "/chat",
    icon: MessageCircle,
  },
];

export const NAV_ITEMS_BOTTOM: NavItem[] = [
 {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

// Individual statement links can be kept if direct access is still desired,
// or removed if the hub page is preferred as the sole entry point.
// For now, I'm keeping them and adding the new hub.
// If you want to remove the direct links for Trial Balance and Balance Sheet from NAV_ITEMS_MAIN,
// you can delete these from the array above:
// {
//   title: "Trial Balance",
//   href: "/trial-balance",
//   icon: ListChecks,
// },
// {
//   title: "Balance Sheet",
//   href: "/balance-sheet",
//   icon: Landmark,
// },
