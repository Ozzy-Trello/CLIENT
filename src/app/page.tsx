"use client";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectAccessToken } from "./store/slice";

export default function Home() {

  const router = useRouter();
  const accessToken = useSelector(selectAccessToken);

  useEffect(() => {
    if (accessToken) {
      router.push('/workspace');
    } else {
      router.push('/login');
    }
  }, [router]);

  return null;
}
