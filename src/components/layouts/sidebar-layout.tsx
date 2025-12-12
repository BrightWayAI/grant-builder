"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SidebarLayout Component
 * 
 * Two-column layout with fixed sidebar and scrollable main content.
 * Used for dashboard pages with navigation.
 */

interface SidebarLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  sidebar: React.ReactNode;
  sidebarWidth?: string;
}

const SidebarLayout = React.forwardRef<HTMLDivElement, SidebarLayoutProps>(
  ({ className, sidebar, sidebarWidth = "260px", children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex min-h-screen", className)}
      style={{ "--sidebar-width": sidebarWidth } as React.CSSProperties}
      {...props}
    >
      <aside
        className={cn(
          "fixed left-0 top-0 z-30 h-screen",
          "w-[var(--sidebar-width)]",
          "bg-surface-card border-r border-border",
          "flex flex-col",
          "overflow-y-auto scrollbar-thin"
        )}
      >
        {sidebar}
      </aside>
      <main
        className={cn(
          "ml-[var(--sidebar-width)] flex-1",
          "bg-surface-page min-h-screen"
        )}
      >
        {children}
      </main>
    </div>
  )
);
SidebarLayout.displayName = "SidebarLayout";

/**
 * Sidebar Component Parts
 */

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-6 border-b border-border", className)}
    {...props}
  />
));
SidebarHeader.displayName = "SidebarHeader";

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 p-4", className)}
    {...props}
  />
));
SidebarContent.displayName = "SidebarContent";

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-4 border-t border-border mt-auto", className)}
    {...props}
  />
));
SidebarFooter.displayName = "SidebarFooter";

const SidebarNav = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    className={cn("flex flex-col gap-1", className)}
    {...props}
  />
));
SidebarNav.displayName = "SidebarNav";

interface SidebarNavItemProps extends React.HTMLAttributes<HTMLAnchorElement> {
  href: string;
  active?: boolean;
  icon?: React.ReactNode;
}

const SidebarNavItem = React.forwardRef<HTMLAnchorElement, SidebarNavItemProps>(
  ({ className, href, active, icon, children, ...props }, ref) => (
    <a
      ref={ref}
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md",
        "font-body text-sm font-medium",
        "transition-colors duration-normal",
        active
          ? "bg-brand-light text-brand"
          : "text-text-secondary hover:bg-gray-100 hover:text-text-primary",
        className
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </a>
  )
);
SidebarNavItem.displayName = "SidebarNavItem";

export {
  SidebarLayout,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarNav,
  SidebarNavItem,
};
