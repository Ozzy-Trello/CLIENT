"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
type SidebarContextType = {
  collapsed: boolean;
  toggleSidebar: () => void;
  siderWide: number;
  siderSmall: number;
  isCompact: boolean;
};
const SidebarContext = createContext<SidebarContextType | undefined>(undefined);
export const WorkspaceSidebarProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const siderWide = 280;
  const siderSmall = 10;

  const toggleSidebar = () => {
    setCollapsed((prev) => !prev);
  };

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === "undefined") return;
      setIsCompact(window.innerWidth <= 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (isCompact) {
      setCollapsed(true);
    }
  }, [isCompact]);

  return (
    <SidebarContext.Provider
      value={{ collapsed, toggleSidebar, siderWide, siderSmall, isCompact }}
    >
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
