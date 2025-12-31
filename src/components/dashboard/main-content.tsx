"use client";

import { ReactNode } from "react";
import { useSidebar } from "./sidebar-context";
import { cn } from "@/lib/utils";

interface MainContentProps {
  children: ReactNode;
  isStaging?: boolean;
}

export function MainContent({ children, isStaging = false }: MainContentProps) {
  const { collapsed } = useSidebar();

  return (
    <main
      className={cn(
        "transition-all duration-200",
        collapsed ? "lg:pl-16" : "lg:pl-64",
        isStaging ? "pt-16" : "pt-14",
        "lg:pt-0"
      )}
    >
      <div className="max-w-content mx-auto px-4 md:px-6 py-6">
        {children}
      </div>
    </main>
  );
}
