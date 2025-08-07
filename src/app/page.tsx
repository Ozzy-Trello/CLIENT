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
  const { defaultWorkspace, isLoading } = useDefaultWorkspace();

  useEffect(() => {
    if (!accessToken) {
      router.push("/login");
      return;
    }

    if (!isLoading && defaultWorkspace) {
      router.push(`/workspace/${defaultWorkspace.id}`);
    }
  }, [accessToken, defaultWorkspace, isLoading, router]);

  return null;
}
