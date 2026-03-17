// client/src/hooks/use-push-notifications.tsx
"use client";

import { useEffect } from "react";
import { getVapidPublicKey, subscribePush } from "@api/notifications";
import TokenStorage from "@utils/token-storage";

/**
 * Registers the service worker and subscribes to Web Push.
 * Must be mounted inside a client component after the user is logged in.
 */
export function usePushNotifications() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return;
    }

    const setup = async () => {
      try {
        const token = TokenStorage.getAccessToken();
        if (!token) return; // not logged in

        // Register the service worker
        const registration = await navigator.serviceWorker.register("/sw.js");

        // Get VAPID public key from backend
        const { publicKey } = await getVapidPublicKey();

        // Subscribe to push — browser shows permission dialog if not yet granted
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        const subJson = subscription.toJSON();
        const p256dh = subJson.keys?.p256dh;
        const auth = subJson.keys?.auth;

        if (!p256dh || !auth) return;

        // Send subscription to backend
        await subscribePush({
          endpoint: subscription.endpoint,
          p256dh,
          auth,
        });
      } catch (err) {
        // Permission denied or unsupported browser — silently skip
        console.debug("[PushNotifications] Setup skipped:", err);
      }
    };

    setup();
  }, []);
}

/** Convert a base64 VAPID key to the Uint8Array format required by the Push API. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(Array.from(rawData).map((char) => char.charCodeAt(0)));
}
