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
    .map((pair) => {
      const [key, ...valueParts] = pair.split("=");
      const value = valueParts.join("="); // Rejoin in case value contains '='
      return [key, value];
    })
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

    // Extract id from user object if it exists
    let id = null;
    if (data.user) {
      try {
        // The user object might be URL-encoded, so let's try to decode it properly
        let userString = data.user;
        // If it's still URL-encoded, decode it
        if (userString.includes("%")) {
          userString = decodeURIComponent(userString);
        }
        const userObj = JSON.parse(userString);
        id = userObj.id;
      } catch (e) {
        // Failed to parse user object
      }
    }

    // Prepare the payload with id included
    const payload = {
      access_token: data.access_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
      user: data.user,
      id: id, // Add the extracted id
    };


    fetch(`http://localhost:8872/v1/accurate/webhook`, {
      method: "POST",
      body: JSON.stringify(payload),
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
