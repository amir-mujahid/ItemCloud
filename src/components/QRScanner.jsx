// src/components/QRScanner.jsx
import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

/**
 * Props:
 * - onScan(decodedString)  -- called once when a QR is decoded
 * - onError(err)           -- optional
 * - onClose()              -- optional, user closed scanner
 */
export default function QRScanner({ onScan, onError, onClose }) {
  const regionId = "html5qr-full-region";
  const html5QrRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    
    async function start() {
      try {
        html5QrRef.current = new Html5Qrcode(regionId, false);
        const config = {
          fps: 10,
          qrbox: { width: 300, height: 300 },
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        };
        
        await html5QrRef.current.start(
          { facingMode: "environment" },
          config,
          (decodedText, decodedResult) => {
            // Prevent multiple scans
            if (hasScannedRef.current || !mounted) return;
            hasScannedRef.current = true;
            
            console.log('✅ QR Scanned successfully:', decodedText);
            
            // Stop scanner before calling onScan
            if (html5QrRef.current && isScanning) {
              html5QrRef.current
                .stop()
                .then(() => {
                  console.log('🛑 Scanner stopped');
                  setIsScanning(false);
                  if (mounted && onScan) {
                    onScan(decodedText);
                  }
                })
                .catch((err) => {
                  console.warn('⚠️ Error stopping scanner:', err);
                  setIsScanning(false);
                  if (mounted && onScan) {
                    onScan(decodedText);
                  }
                });
            } else {
              // Scanner already stopped, just call onScan
              if (mounted && onScan) {
                onScan(decodedText);
              }
            }
          },
          (errorMessage) => {
            // Ignore transient scan failures (these are normal)
          }
        );
        
        setIsScanning(true);
        console.log('📷 Scanner started');
        
      } catch (err) {
        console.error('❌ Scanner start error:', err);
        if (mounted && onError) {
          onError(err);
        }
      }
    }
    
    start();

    return () => {
      mounted = false;
      hasScannedRef.current = true; // Prevent any pending callbacks
      
      // Cleanup scanner
      if (html5QrRef.current && isScanning) {
        html5QrRef.current
          .stop()
          .then(() => {
            console.log('🛑 Scanner stopped (cleanup)');
            return html5QrRef.current.clear();
          })
          .catch((err) => {
            console.warn('⚠️ Cleanup error:', err);
          });
      }
    };
  }, []); // Empty deps - only run once

  const handleClose = () => {
    console.log('🔴 Close button clicked');
    hasScannedRef.current = true; // Prevent any pending scans
    
    if (html5QrRef.current && isScanning) {
      html5QrRef.current
        .stop()
        .then(() => {
          console.log('🛑 Scanner stopped (manual close)');
          setIsScanning(false);
          if (onClose) onClose();
        })
        .catch((err) => {
          console.warn('⚠️ Error stopping scanner:', err);
          setIsScanning(false);
          if (onClose) onClose();
        });
    } else {
      if (onClose) onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Scan QR Code</h3>
          <button
            className="text-sm px-3 py-1 rounded border border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
            onClick={handleClose}
          >
            Close
          </button>
        </div>

        <div 
          id={regionId} 
          style={{ width: "100%", height: 360 }} 
        />
        
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          📷 Point your camera at the QR code on the box
          {!isScanning && <span className="text-amber-600 ml-2">⚠️ Starting camera...</span>}
        </div>
      </div>
    </div>
  );
}