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
          qrbox: { width: 250, height: 250 },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
        
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Scan QR Code</h3>
                <p className="text-xs text-white/80">Point camera at the locker QR</p>
              </div>
            </div>
            <button
              className="w-8 h-8 rounded-full bg-white/20 backdrop-blur hover:bg-white/30 transition-colors flex items-center justify-center"
              onClick={handleClose}
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scanner Area */}
        <div className="p-6">
          <div className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800">
            {/* Camera status indicator */}
            {!isScanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-10">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 mb-3 animate-pulse">
                    <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-white font-medium">Starting camera...</p>
                  <p className="text-slate-400 text-sm mt-1">Please allow camera access</p>
                </div>
              </div>
            )}
            
            {/* Scanner */}
            <div 
              id={regionId} 
              className="qr-scanner-region"
              style={{ 
                width: "100%", 
                minHeight: "320px",
              }} 
            />
            
            {/* Scanning indicator overlay */}
            {isScanning && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <div className="flex items-center justify-center gap-2 text-white">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-sm font-medium">Camera active</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  How to scan:
                </p>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Position QR code within the frame</li>
                  <li>• Keep camera steady and well-lit</li>
                  <li>• Scan will happen automatically</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleClose}
            className="w-full py-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
          >
            Cancel Scanning
          </button>
        </div>
      </div>
    </div>
  );
}