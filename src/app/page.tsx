"use client";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import TokenStorage from "@utils/token-storage";
import { useDefaultWorkspace } from "@hooks/workspace";

export default function Home() {
  const router = useRouter();
  const isClient = typeof window !== "undefined";
  const accessToken = isClient ? TokenStorage.getAccessToken() : null;
  const { defaultWorkspace, isLoading } = useDefaultWorkspace();
  const defaultWorkspaceId = 'eb65c15c-12cc-49e4-9827-16ef1c838c4d';

  useEffect(() => {
    if (!accessToken) {
      router.push("/login");
      TokenStorage.clearTokens();
      return;
    }

    if (!isLoading && defaultWorkspace) {
      router.push(`/workspace/${defaultWorkspaceId}/board`);
    }
  }, [accessToken, defaultWorkspace, isLoading, router]);

  return null;
}
