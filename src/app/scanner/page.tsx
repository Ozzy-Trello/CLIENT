"use client";

import { useEffect, useState, useRef } from "react";
import { scanQRCode } from "@api/additional-field";
import { message } from "antd";
import { CheckCircle, XCircle, Loader2, Scan } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function ScannerPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [lastScan, setLastScan] = useState("");
  const [scanHistory, setScanHistory] = useState<
    Array<{
      data: string;
      status: "success" | "error";
      timestamp: Date;
      message: string;
    }>
  >([]);
  const [buffer, setBuffer] = useState("");
  const bufferTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Clear any existing timeout
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
      }

      if (e.key === "Enter") {
        e.preventDefault();
        processScannedData(buffer);
        setBuffer("");
      } else if (e.key.length === 1) {
        // Add character to buffer
        setBuffer((prev) => prev + e.key);

        // Clear buffer after 100ms of no input (typical for external scanners)
        bufferTimeoutRef.current = setTimeout(() => {
          setBuffer("");
        }, 100);
      }
    };

    // Focus the window and add event listener
    window.focus();
    document.addEventListener("keydown", handleKeyPress);

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
      }
    };
  }, [buffer]);

  const processScannedData = async (scannedData: string) => {
    if (!scannedData.trim()) return;

    setStatus("loading");
    setLastScan(scannedData);

    try {
      // Parse the scanned data
      // Expected format: cardId-scannedData-action
      const parts = scannedData.split("|");
      let cardId, data, action;

      if (parts.length >= 2) {
        cardId = parts[0];
        data = parts[1];
        action = parts[2] || "mark_complete";
      } else {
        // Fallback: try to parse as URL
        try {
          const url = new URL(scannedData);
          cardId = url.searchParams.get("cardId");
          data = url.searchParams.get("scannedData");
          action = url.searchParams.get("action") || "mark_complete";
        } catch {
          throw new Error("Invalid scan format");
        }
      }

      if (!cardId || !data) {
        throw new Error("Missing cardId or scannedData");
      }

      const response = await scanQRCode(cardId, data, action as any);

      if (response.status_code === 200 || response.data?.success) {
        setStatus("success");
        const scanResult = {
          data: scannedData,
          status: "success" as const,
          timestamp: new Date(),
          message: response.message || "Item scanned successfully!",
        };
        setScanHistory((prev) => [scanResult, ...prev.slice(0, 9)]); // Keep last 10
        message.success("Item scanned successfully!");
      } else {
        setStatus("error");
        const scanResult = {
          data: scannedData,
          status: "error" as const,
          timestamp: new Date(),
          message: response.message || "Failed to process scan",
        };
        setScanHistory((prev) => [scanResult, ...prev.slice(0, 9)]);
        message.error("Failed to process scan");
      }
    } catch (error) {
      console.error("Scan error:", error);
      setStatus("error");
      const scanResult = {
        data: scannedData,
        status: "error" as const,
        timestamp: new Date(),
        message: "Failed to process scan. Please try again.",
      };
      setScanHistory((prev) => [scanResult, ...prev.slice(0, 9)]);
      message.error("Failed to process scan");
    }

    // Reset status after 3 seconds
    setTimeout(() => setStatus("idle"), 3000);
  };

  const getStatusIcon = () => {
    switch (status) {
      case "loading":
        return <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />;
      case "success":
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case "error":
        return <XCircle className="w-8 h-8 text-red-500" />;
      default:
        return <Scan className="w-8 h-8 text-gray-400" />;
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
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">QR Code Scanner</h1>
          <p className="text-gray-400">
            Keep this window open and focused for scanning
          </p>
        </div>

        {/* Status Display */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-center mb-4">
            {getStatusIcon()}
          </div>
          <div className="text-center">
            <p className={`text-xl font-medium ${getStatusColor()}`}>
              {status === "idle" && "Ready to scan"}
              {status === "loading" && "Processing scan..."}
              {status === "success" && "Scan successful!"}
              {status === "error" && "Scan failed"}
            </p>
            {lastScan && (
              <p className="text-sm text-gray-400 mt-2">
                Last scan: {lastScan.substring(0, 50)}...
              </p>
            )}
          </div>
        </div>

        {/* Scan History */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Scans</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {scanHistory.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No scans yet</p>
            ) : (
              scanHistory.map((scan, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    scan.status === "success"
                      ? "border-green-500 bg-green-900/20"
                      : "border-red-500 bg-red-900/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {scan.data.substring(0, 40)}...
                      </p>
                      <p className="text-xs text-gray-400">
                        {scan.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="ml-4">
                      {scan.status === "success" ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>
                  <p
                    className={`text-xs mt-1 ${
                      scan.status === "success"
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {scan.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center text-gray-400 text-sm">
          <p>• Keep this window focused and open</p>
          <p>• Point your scanner at QR codes</p>
          <p>• Scans will be processed automatically</p>
        </div>
      </div>
    </div>
  );
}
