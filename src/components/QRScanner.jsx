// src/components/QRScanner.jsx
import React, { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

/**
 * Props:
 * - onScan(decodedString)  -- called once when a QR is decoded
 * - onError(err)           -- optional
 * - onClose()              -- optional, user closed scanner
 */
export default function QRScanner({ onScan, onError, onClose }) {
  const regionId = "html5qr-full-region";
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    async function start() {
      try {
        html5QrRef.current = new Html5Qrcode(regionId, /* verbose= */ false);
        const config = {
          fps: 10,
          qrbox: { width: 300, height: 300 },
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        };
        await html5QrRef.current.start(
          { facingMode: "environment" },
          config,
          (decodedText, decodedResult) => {
            // immediately stop to avoid duplicates
            if (!mounted) return;
            html5QrRef.current
              .stop()
              .catch(() => {})
              .finally(() => {
                onScan && onScan(decodedText);
              });
          },
          (errorMessage) => {
            // ignore transient scan failures
          }
        );
      } catch (err) {
        onError && onError(err);
      }
    }
    start();

    return () => {
      mounted = false;
      if (html5QrRef.current) {
        html5QrRef.current.stop().catch(() => {});
        html5QrRef.current.clear().catch(() => {});
      }
    };
  }, [onScan, onError]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Scan QR</h3>
          <button
            className="text-sm px-2 py-1 rounded border"
            onClick={() => {
              if (html5QrRef.current) {
                html5QrRef.current.stop().catch(() => {});
              }
              onClose && onClose();
            }}
          >
            Close
          </button>
        </div>

        <div id={regionId} ref={scannerRef} style={{ width: "100%", height: 360 }} />
        <div className="text-xs text-slate-500 mt-2">
          Tip: point your camera at the QR on the box. Camera requires HTTPS (or localhost).
        </div>
      </div>
    </div>
  );
}
