// ScreenSizeContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";

type ScreenSizeContextType = {
  width: number;
  height: number;
  isMobile: boolean; // True if width <= 768px
};

const ScreenSizeContext = createContext<ScreenSizeContextType | undefined>(
  undefined
);

export const ScreenSizeProvider = ({ children }: { children: React.ReactNode }) => {
  const [screenSize, setScreenSize] = useState<ScreenSizeContextType>({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
    isMobile: typeof window !== "undefined" ? window.innerWidth <= 768 : false,
  });

  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: window.innerWidth <= 768,
      });
    };

    // Set initial size and listen for window resize
    handleResize();
    window.addEventListener("resize", handleResize);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <ScreenSizeContext.Provider value={screenSize}>
      {children}
    </ScreenSizeContext.Provider>
  );
};

export const useScreenSize = () => {
  const context = useContext(ScreenSizeContext);
  if (!context) {
    throw new Error(
      "useScreenSize must be used within a ScreenSizeProvider"
    );
  }
  return context;
};
