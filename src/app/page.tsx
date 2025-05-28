"use client";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useSelector } from "react-redux";
import TokenStorage from "@utils/token-storage";

export default function Home() {

  const router = useRouter();
  const accessToken = TokenStorage.getAccessToken();

  useEffect(() => {
    if (accessToken) {
      router.push('/workspace');
    } else {
      router.push('/login');
    }
  }, [router]);

  return null;
}
