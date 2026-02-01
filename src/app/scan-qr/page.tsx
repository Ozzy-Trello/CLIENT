"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { scanQRCode } from "@api/additional-field";
import { message } from "antd";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function ScanQRPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "idle"
  >("idle");
  const [message, setMessage] = useState("");

useEffect(() => {
  const handleScan = async () => {
    const cardId = searchParams.get("cardId");
    const scannedData = searchParams.get("scannedData");
    const action = searchParams.get("action") || "mark_complete";

    if (!cardId || !scannedData) {
      setStatus("error");
      setMessage("Invalid QR code data");
      return;
    }

    setStatus("loading");
    setMessage("Processing scan...");

    try {
      const response = await scanQRCode(cardId, scannedData, action as any);

      if (response.status_code === 200 || response.data?.success) {
        setStatus("success");
        setMessage(response.message || "Item scanned successfully!");
      } else {
        setStatus("error");
        setMessage(response.message || "Failed to process scan");
      }
    } catch (error) {
      console.error("Scan error:", error);
      setStatus("error");
      setMessage("Failed to process scan. Please try again.");
    }
  };

  handleScan();
  // run only once
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  const getStatusIcon = () => {
    switch (status) {
      case "loading":
        return <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />;
      case "success":
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case "error":
        return <XCircle className="w-16 h-16 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "loading":
        return "text-blue-600";
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">{getStatusIcon()}</div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">QR Code Scan</h1>

        <p className={`text-lg font-medium mb-4 ${getStatusColor()}`}>
          {message}
        </p>

        {status === "success" && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <p className="text-green-800 text-sm">
              Item has been marked as completed successfully!
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="mt-6 p-4 bg-red-50 rounded-lg">
            <p className="text-red-800 text-sm">
              There was an error processing your scan. Please try again or
              contact support.
            </p>
          </div>
        )}

        <div className="mt-8 text-sm text-gray-500">
          <p>This page will automatically close in 5 seconds...</p>
        </div>
      </div>
    </div>
  );
}
