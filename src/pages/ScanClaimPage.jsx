// src/pages/ScanClaimPage.jsx
import React from "react";
import QRScanner from "../components/QRScanner"; // <--- use this name

export default function ScanClaimPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Scan QR to Claim Item</h1>
      <QRScanner />
    </div>
  );
}

