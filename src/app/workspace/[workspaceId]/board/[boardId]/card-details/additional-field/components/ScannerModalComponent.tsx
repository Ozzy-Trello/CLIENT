"use client";

import React, { useEffect, useRef, useState } from "react";
import { Modal, message } from "antd";
import { Scanner } from "@yudiel/react-qr-scanner";

interface ScannerModalComponentProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedData: string) => void;
  poIdentifier?: number;
}

const ScannerModalComponent: React.FC<ScannerModalComponentProps> = ({
  isOpen,
  onClose,
  onScan,
  poIdentifier,
}) => {
  const [scannedBuffer, setScannedBuffer] = React.useState("");
  const [useCamera, setUseCamera] = useState(false);
  const bufferTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle external scanner input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Clear any existing timeout
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (scannedBuffer.trim()) {
          onScan(scannedBuffer.trim());
          setScannedBuffer("");
        }
      } else if (e.key.length === 1) {
        // Add character to buffer
        setScannedBuffer((prev) => prev + e.key);

        // Clear buffer after 100ms of no input (typical for external scanners)
        bufferTimeoutRef.current = setTimeout(() => {
          setScannedBuffer("");
        }, 100);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyPress);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
      if (bufferTimeoutRef.current) {
        clearTimeout(bufferTimeoutRef.current);
      }
    };
  }, [isOpen, scannedBuffer, onScan]);

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title={`Scan Bahan Anda - PO #${poIdentifier || 1}`}
      width={useCamera ? 600 : 500}
      footer={[
        <button
          key="close"
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Close
        </button>,
      ]}
      destroyOnClose={false}
      maskClosable={false}
    >
      {useCamera ? (
        <div className="space-y-4 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Scan dengan Kamera
            </h3>
            <button
              onClick={() => setUseCamera(false)}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Kembali ke Scanner
            </button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Scanner
              onScan={(codes) => {
                if (codes.length > 0) {
                  const scannedValue = codes[0].rawValue;

                  // Check if scannedValue exists and is a string
                  if (!scannedValue || typeof scannedValue !== "string") {
                    console.error("Invalid scanned value:", scannedValue);
                    return;
                  }

                  // Check if the scanned value is a URL
                  if (
                    scannedValue.startsWith("http://") ||
                    scannedValue.startsWith("https://")
                  ) {
                    // It's a URL - open it in a new tab
                    window.open(scannedValue, "_blank");
                    setUseCamera(false);
                    onClose();
                    return;
                  }

                  // If it's not a URL, treat it as an item ID
                  onScan(scannedValue);
                  setUseCamera(false);
                }
              }}
              onError={(error) => {
                console.error("Camera error:", error);
                message.error(
                  "Gagal mengakses kamera. Pastikan izin kamera diberikan."
                );
              }}
            />
          </div>
          <div className="text-xs text-gray-500 text-center">
            <p>• Arahkan kamera ke barcode bahan</p>
            <p>• Pastikan barcode terlihat jelas</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 p-8 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Scan Bahan Anda
          </h3>
          <p className="text-gray-600 mb-4">
            Silakan scan barcode bahan menggunakan scanner eksternal
          </p>

          {/* Camera Button */}
          <button
            onClick={() => setUseCamera(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mb-4"
          >
            📷 Gunakan Kamera
          </button>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500 mb-2">Scanner Status:</p>
            <p className="text-green-600 font-medium">
              {scannedBuffer ? "Menerima input..." : "Siap menerima scan"}
            </p>
            {scannedBuffer && (
              <p className="text-xs text-gray-400 mt-1">
                Buffer: {scannedBuffer}
              </p>
            )}
          </div>
          <div className="text-xs text-gray-400">
            <p>• Pastikan scanner eksternal terhubung</p>
            <p>• Scan barcode bahan untuk melanjutkan</p>
            <p>• Atau gunakan kamera untuk scan QR/barcode</p>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ScannerModalComponent;
