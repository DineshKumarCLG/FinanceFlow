"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/constants";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { FileText, BarChart3, PlusCircle, Upload, MessageSquare, Calculator, Cog, Home, FolderOpen, CreditCard, Receipt, Users } from 'lucide-react';

interface SidebarNavProps {
  items: NavItem[];
  className?: string;
}

export function SidebarNav({ items, className }: SidebarNavProps) {
  const pathname = usePathname();
  const { open } = useSidebar();

  if (!items?.length) {
    return null;
  }

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      <SidebarMenu>
        {items.map((item, index) => {
          const Icon = item.icon;
          const isActive = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);

          return (
            <SidebarMenuItem key={index}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "justify-start w-full",
                  isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                tooltip={open ? "" : item.title}
              >
                <Link href={item.href} className="flex items-center w-full">
                  <Icon className="mr-3 h-5 w-5 shrink-0" />
                  {!open && item.label ? (
                     <span className="sr-only">{item.title}</span>
                  ) : (
                    <span className="truncate">{item.title}</span>
                  )}
                  {item.label && !open && (
                    <span className="ml-auto text-xs">{item.label}</span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </nav>
  );
}