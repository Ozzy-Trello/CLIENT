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
  // const { width, height, isMobile } = useScreenSize();
  const siderWide = 280;
  const siderSmall = 10;

  const toggleSidebar = () => {
    setCollapsed((prev) => !prev);
  };

  // useEffect(() => {
  //   // handle auto collapse when screen width < 768
  //   const handleResize = () => {
  //     const screenWidth = window.innerWidth;
  //     if (isMobile && !collapsed) {
  //       setCollapsed(true);
  //     } else if (!isMobile && collapsed) {
  //       setCollapsed(false);
  //     }
  //   };
  //   handleResize();
 
  // }, [width]);

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
