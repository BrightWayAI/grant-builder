"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/primitives/button";
import { cn } from "@/lib/utils";
import { FileText, FolderOpen, Home, Settings, LogOut, Plus, ChevronLeft, Menu } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/proposals", label: "Proposals", icon: FileText },
  { href: "/knowledge-base", label: "Knowledge Base", icon: FolderOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  user: {
    name?: string | null;
    email: string;
    organization?: { name: string } | null;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-surface-card border-b border-border z-40 flex items-center px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 rounded-md hover:bg-gray-100"
        >
          <Menu className="h-5 w-5 text-text-secondary" />
        </button>
        <Link href="/dashboard" className="ml-3 text-lg font-display font-semibold text-brand">
          Brightway
        </Link>
        <div className="ml-auto">
          <Link href="/proposals/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-surface-card border-r border-border z-50 flex flex-col transition-all duration-normal",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border">
          {!collapsed && (
            <Link href="/dashboard" className="text-lg font-display font-semibold text-brand">
              Brightway
            </Link>
          )}
          <button
            onClick={() => {
              setCollapsed(!collapsed);
              setMobileOpen(false);
            }}
            className={cn(
              "p-1.5 rounded-md hover:bg-gray-100 text-text-tertiary hidden lg:block",
              collapsed && "mx-auto"
            )}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 text-text-tertiary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* New Proposal button */}
        <div className="p-3">
          <Link href="/proposals/new" onClick={() => setMobileOpen(false)}>
            <Button className={cn("w-full", collapsed && "px-0")}>
              <Plus className="h-4 w-4" />
              {!collapsed && <span className="ml-2">New Proposal</span>}
            </Button>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-normal",
                  isActive
                    ? "bg-brand-light text-brand"
                    : "text-text-secondary hover:bg-gray-100 hover:text-text-primary",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-border">
          {!collapsed ? (
            <div className="space-y-3">
              <div className="px-3">
                <p className="text-sm font-medium text-text-primary truncate">{user.name || user.email}</p>
                {user.organization && (
                  <p className="text-xs text-text-tertiary truncate">{user.organization.name}</p>
                )}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-text-secondary hover:bg-gray-100 hover:text-status-error transition-colors duration-normal"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center justify-center w-full p-2 rounded-md text-text-secondary hover:bg-gray-100 hover:text-status-error transition-colors duration-normal"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
