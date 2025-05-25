import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, BookOpenText, BookCopy, MessageCircle, Settings, PlusCircle, UploadCloud } from "lucide-react";

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
