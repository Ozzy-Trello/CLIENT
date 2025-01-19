// WorkspaceSidebarContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type SidebarContextType = {
  collapsed: boolean;
  toggleSidebar: () => void;
  siderWidth: number;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const WorkspaceSidebarProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [siderWidth, setSiderWidth] = useState(200);

  const toggleSidebar = () => {
    setCollapsed((prev) => !prev);

    if (collapsed) {
      setSiderWidth(200);
    } else {
      setSiderWidth(80);
    }
  };

  return (
    <SidebarContext.Provider value={{ collapsed, toggleSidebar, siderWidth }}>
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
