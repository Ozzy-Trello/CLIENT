import { useEffect, useState } from "react";

const DEV_MODE_KEY = "dev";

const isDevModeValue = (value: string | null): boolean => {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1";
};

const readDevMode = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  return isDevModeValue(window.localStorage.getItem(DEV_MODE_KEY));
};

export const useDevMode = (): boolean => {
  const [isDevMode, setIsDevMode] = useState<boolean>(readDevMode);

  useEffect(() => {
    const syncDevMode = () => {
      setIsDevMode(readDevMode());
    };

    syncDevMode();

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === DEV_MODE_KEY) {
        syncDevMode();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", syncDevMode);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", syncDevMode);
    };
  }, []);

  return isDevMode;
};
