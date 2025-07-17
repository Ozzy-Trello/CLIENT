"use client";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import TokenStorage from "@utils/token-storage";
import { useDefaultWorkspace } from "@hooks/workspace";

export default function Home() {
  const router = useRouter();
  const isClient = typeof window !== "undefined";
  const accessToken = isClient ? TokenStorage.getAccessToken() : null;
  const { defaultWorkspace, isLoading, isError, error } = useDefaultWorkspace();

  useEffect(() => {
    if (!isClient) return; // Don't run on server side

    console.log("Home page redirection debug:", {
      accessToken: !!accessToken,
      defaultWorkspace: defaultWorkspace?.id,
      isLoading,
      isError,
      error,
    });

    if (accessToken) {
      if (defaultWorkspace && !isLoading) {
        console.log("Redirecting to default workspace:", defaultWorkspace.id);
        router.push(`/workspace/${defaultWorkspace.id}/board`);
      } else if (!isLoading) {
        console.log("No default workspace found, redirecting to /workspace");
        router.push("/workspace");
      } else {
        console.log("Still loading default workspace...");
      }
    } else {
      console.log("No access token, redirecting to login");
      router.push("/login");
    }
  }, [
    router,
    defaultWorkspace,
    isLoading,
    accessToken,
    isClient,
    isError,
    error,
  ]);

  return null;
}
