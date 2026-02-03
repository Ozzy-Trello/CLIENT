import React, { useCallback, useContext, useMemo, useState } from "react";

interface ManualOverrideContextValue {
  setManualOverrideFlag: (fieldName: string) => void;
  clearManualOverrideFlags: () => void;
  isManualOverrideActive: (fieldName: string) => boolean;
}

const ManualOverrideContext = React.createContext<ManualOverrideContextValue | null>(null);

const normalizeFieldName = (fieldName?: string): string => {
  const candidate = fieldName ? String(fieldName) : "";
  return candidate.trim().toLowerCase();
};

export const ManualOverrideProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [manualOverrides, setManualOverrides] = useState<Set<string>>(new Set());

  const setManualOverrideFlag = useCallback((fieldName: string) => {
    const normalized = normalizeFieldName(fieldName);
    if (!normalized) return;
    setManualOverrides((prev) => {
      const next = new Set(prev);
      next.add(normalized);
      return next;
    });
  }, []);

  const clearManualOverrideFlags = useCallback(() => {
    setManualOverrides(new Set());
  }, []);

  const isManualOverrideActive = useCallback(
    (fieldName: string) => manualOverrides.has(normalizeFieldName(fieldName)),
    [manualOverrides]
  );

  const value = useMemo(
    () => ({
      setManualOverrideFlag,
      clearManualOverrideFlags,
      isManualOverrideActive,
    }),
    [setManualOverrideFlag, clearManualOverrideFlags, isManualOverrideActive]
  );

  return (
    <ManualOverrideContext.Provider value={value}>
      {children}
    </ManualOverrideContext.Provider>
  );
};

export const useManualOverrideContext = (): ManualOverrideContextValue => {
  const context = useContext(ManualOverrideContext);
  if (!context) {
    throw new Error(
      "useManualOverrideContext must be used within a ManualOverrideProvider"
    );
  }
  return context;
};
