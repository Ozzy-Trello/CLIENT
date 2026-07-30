"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
type SidebarContextType = {
  collapsed: boolean;
  toggleSidebar: () => void;
  siderWide: number;
  siderSmall: number;
};
const SidebarContext = createContext<SidebarContextType | undefined>(undefined);
export const WorkspaceSidebarProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const siderWide = 280;
  const siderSmall = 10;

  const toggleSidebar = () => {
    setCollapsed((prev) => !prev);
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    let previousMatches: boolean | null = null;

    const applyForBreakpoint = (matches: boolean) => {
      setCollapsed(matches);
      previousMatches = matches;
    };

    applyForBreakpoint(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      if (previousMatches === event.matches) {
        return;
      }

      applyForBreakpoint(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, toggleSidebar, siderWide, siderSmall }}>
      {children}
    </SidebarContext.Provider>
  );
};
export const useWorkspaceSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error(
      "useWorkspaceSidebar must be used within a WorkspaceSidebarProvider"
    );
  }
  return context;
};
