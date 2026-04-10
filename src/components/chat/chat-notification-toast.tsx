"use client";

import { useEffect, useRef, useState } from "react";

type Toast = {
  id: string;
  peerUserId: string;
  senderName: string;
  content: string;
  visible: boolean;
};

const MAX_TOASTS = 5;
const TOAST_VISIBLE_MS = 3000;
const TOAST_FADE_MS = 300;

export default function ChatNotificationToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismissTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = (id: string) => {
    const t = dismissTimersRef.current.get(id);
    if (t !== undefined) {
      clearTimeout(t);
      dismissTimersRef.current.delete(id);
    }
  };

  const removeToast = (id: string) => {
    clearTimer(id);
    setToasts((current) => current.filter((t) => t.id !== id));
  };

  const startDismiss = (id: string) => {
    clearTimer(id);
    setToasts((current) =>
      current.map((t) => (t.id === id ? { ...t, visible: false } : t)),
    );
    const timer = setTimeout(() => removeToast(id), TOAST_FADE_MS);
    dismissTimersRef.current.set(id, timer);
  };

  useEffect(() => {
    const handleToast = (e: Event) => {
      const { peerUserId, senderName, content } = (e as CustomEvent<{
        peerUserId: string;
        senderName: string;
        content: string;
      }>).detail;

      const id = `toast-${peerUserId}-${Date.now()}`;

      setToasts((current) => {
        const next: Toast[] = [
          ...current,
          { id, peerUserId, senderName, content, visible: false },
        ];
        // Keep newest MAX_TOASTS
        return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
      });

      // Fade in on next paint
      const fadeInTimer = setTimeout(() => {
        setToasts((current) =>
          current.map((t) => (t.id === id ? { ...t, visible: true } : t)),
        );
      }, 10);

      // Auto-dismiss
      const dismissTimer = setTimeout(() => startDismiss(id), TOAST_VISIBLE_MS);
      dismissTimersRef.current.set(id, dismissTimer);

      return () => clearTimeout(fadeInTimer);
    };

    const handleWindowOpened = (e: Event) => {
      const { peerUserId } = (e as CustomEvent<{ peerUserId: string }>).detail;
      setToasts((current) => {
        current
          .filter((t) => t.peerUserId === peerUserId)
          .forEach((t) => clearTimer(t.id));
        return current.filter((t) => t.peerUserId !== peerUserId);
      });
    };

    window.addEventListener("chat:toast", handleToast);
    window.addEventListener("chat:window-opened", handleWindowOpened);

    return () => {
      window.removeEventListener("chat:toast", handleToast);
      window.removeEventListener("chat:window-opened", handleWindowOpened);
      for (const timer of Array.from(dismissTimersRef.current.values())) {
        clearTimeout(timer);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = (peerUserId: string) => {
    window.dispatchEvent(
      new CustomEvent("chat:open-window", { detail: { peerUserId } }),
    );
  };

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "80px",
        right: "16px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => handleClick(toast.peerUserId)}
          style={{
            background: "#1f1f1f",
            color: "#fff",
            borderRadius: "8px",
            padding: "10px 14px",
            maxWidth: "280px",
            cursor: "pointer",
            pointerEvents: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            opacity: toast.visible ? 1 : 0,
            transform: toast.visible ? "translateY(0)" : "translateY(8px)",
            transition: `opacity ${TOAST_FADE_MS}ms ease, transform ${TOAST_FADE_MS}ms ease`,
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: "13px",
              marginBottom: "2px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {toast.senderName}
          </div>
          <div
            style={{
              fontSize: "12px",
              opacity: 0.85,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {toast.content}
          </div>
        </div>
      ))}
    </div>
  );
}
