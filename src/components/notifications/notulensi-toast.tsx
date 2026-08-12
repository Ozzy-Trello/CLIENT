"use client";

import { message } from "antd";
import { useEffect } from "react";

export default function NotulensiToast() {
  useEffect(() => {
    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<{ title?: string; message?: string }>).detail;
      message.info({
        content: detail.message ? `${detail.title || "Notulensi updated"}: ${detail.message}` : detail.title || "Notulensi updated",
        duration: 4,
      });
    };

    window.addEventListener("notulensi:toast", handleToast);
    return () => window.removeEventListener("notulensi:toast", handleToast);
  }, []);

  return null;
}
