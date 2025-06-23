import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, BookOpenText, BookCopy, MessageCircle, Settings, PlusCircle, UploadCloud, ListChecks, Landmark, BarChart3, FileText as InvoiceIcon, CreditCard, Receipt, Users } from "lucide-react";

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
    title: "Invoices", // New Invoice Item
    href: "/invoices",
    icon: InvoiceIcon, // Using FileText as a placeholder, consider a more specific invoice icon if available
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
    title: "Bank Reconciliation",
    href: "/bank-reconciliation",
    icon: CreditCard,
  },
  {
    title: "Tax Management",
    href: "/tax-management",
    icon: Receipt,
  },
  {
    title: "Payroll",
    href: "/payroll",
    icon: Users,
  },
  {
    title: "Financial Statements",
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
