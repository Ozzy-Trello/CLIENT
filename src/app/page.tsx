"use client";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

export default function Home() {

  const router = useRouter();

  useEffect(() => {
    const isAuthenticated = false; // Replace with actual auth logic
    if (isAuthenticated) {
      router.push('/workspace/home');
    } else {
      router.push('/login');
    }
  }, [router]);

  return null;
}
