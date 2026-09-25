"use client";

import React from "react";
import { QrCode, Printer } from "lucide-react";

const TABLES = ["T-1", "T-2", "T-3", "T-4", "T-5", "T-6"];

export default function TableQRCodesScreen() {
  const getQRUrl = (table: string) => {
    // Dynamic URL for local testing or live domain
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const targetUrl = `${origin}/menu?table=${table}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(targetUrl)}`;
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans text-slate-800">
      <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-orange-500 rounded-xl text-white shadow">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Table QR Codes</h1>
            <p className="text-xs text-slate-500">Print & place these QR stickers on tables</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print All QR Cards</span>
          </button>
          <a
            href="/"
            className="text-xs text-orange-600 hover:text-orange-700 font-semibold underline underline-offset-4"
          >
            ← POS Billing
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {TABLES.map((table) => (
          <div
            key={table}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-4"
          >
            <div className="space-y-1">
              <span className="text-2xl font-black text-slate-900">{table}</span>
              <p className="text-xs text-slate-500">Scan to Order Food</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <img
                src={getQRUrl(table)}
                alt={`QR code for ${table}`}
                className="w-44 h-44 rounded-lg"
              />
            </div>

            <a
              href={`/menu?table=${table}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-orange-600 hover:text-orange-700 font-bold underline"
            >
              Open Menu Link ↗
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}