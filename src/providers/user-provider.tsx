"use client";

import { useCurrentAccount } from "@hooks/account";
import { createContext, useContext, ReactNode } from "react";
import { Account } from "@dto/account";
import { ApiResponse } from "@myTypes/type";

interface UserContextType {
  user: Account | null;
  isLoading: boolean;
  error: any;
  refetch: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, error, refetch } = useCurrentAccount();

  const value: UserContextType = {
    user: data?.data || null,
    isLoading,
    error,
    refetch,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
