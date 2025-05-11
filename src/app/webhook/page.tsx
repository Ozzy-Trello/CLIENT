"use client";
import { useEffect, useState } from "react";

interface WebhookStatus {
  loading: boolean;
  success: boolean;
  error: string | null;
}

function parseFragment(fragment: string): Record<string, string> {
  return fragment
    .replace(/^#/, "")
    .split("&")
    .map((pair) => pair.split("="))
    .reduce((acc, [key, value]) => {
      if (key) acc[key] = decodeURIComponent(value || "");
      return acc;
    }, {} as Record<string, string>);
}

export default function WebhookPage() {
  const [status, setStatus] = useState<WebhookStatus>({
    loading: true,
    success: false,
    error: null,
  });

  useEffect(() => {
    const fragment = window.location.hash;
    if (!fragment) {
      setStatus({
        loading: false,
        success: false,
        error: "No fragment found in URL.",
      });
      return;
    }
    const data = parseFragment(fragment);
    console.log(data);
    console.log(fragment, "<< frag");
    fetch(`http://localhost:8872/v1/accurate/webhook`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to send webhook data");
        setStatus({ loading: false, success: true, error: null });
      })
      .catch((err) => {
        setStatus({ loading: false, success: false, error: err.message });
      });
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Webhook Receiver</h1>
      {status.loading && <p>Sending webhook data...</p>}
      {status.success && (
        <p style={{ color: "green" }}>Webhook data sent successfully!</p>
      )}
      {status.error && <p style={{ color: "red" }}>Error: {status.error}</p>}
    </main>
  );
}
