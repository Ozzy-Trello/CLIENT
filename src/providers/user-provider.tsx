"use client";

import { useCurrentAccount } from "@hooks/account";
import { createContext, useContext, ReactNode, useEffect } from "react";
import { Account } from "@dto/account";
import { ApiResponse } from "@myTypes/type";
import { useRouter, usePathname } from "next/navigation";
import TokenStorage from "@utils/token-storage";

interface UserContextType {
  user: Account | null;
  isLoading: boolean;
  error: any;
  refetch: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, error, refetch } = useCurrentAccount();
  const router = useRouter();
  const pathname = usePathname();

  // Fix: Add client-side authentication checking for localStorage fallback
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Check if middleware indicated we should check localStorage
    const shouldCheckLocalStorage = document.querySelector('meta[name="x-check-localstorage"]') || 
                                   window.location.search.includes('check-localstorage');

    // Check if we're on a protected route
    const protectedRoutes = ['/user', '/webhook', '/workspace'];
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

    if (isProtectedRoute) {
      const accessToken = TokenStorage.getAccessToken();
      
      // If no token found and we're on a protected route, redirect to login
      if (!accessToken && !isLoading) {
        // Add a small delay to prevent race conditions with Redux hydration
        setTimeout(() => {
          router.push('/login');
        }, 100);
      }
    }
  }, [pathname, router, isLoading]);

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
