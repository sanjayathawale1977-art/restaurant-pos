"use client";

import React, { useEffect, useState } from "react";
import { ChefHat, CheckCircle2, Clock, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  round?: number;
}

interface OrderRecord {
  id: number;
  table_number: string;
  items: OrderItem[];
  status: string;
  total_amount: number;
  created_at: string;
}

export default function KitchenScreen() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchKitchenOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .neq("status", "Completed")
      .order("created_at", { ascending: true });

    if (!error && data) {
      setOrders(data as OrderRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  const updateOrderStatus = async (id: number, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    fetchKitchenOrders();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-orange-500 rounded-2xl shadow-lg">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Kitchen Order Tickets (KOT)</h1>
            <p className="text-xs text-slate-400">Live Kitchen Display System</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchKitchenOrders}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            <RefreshCw className={`w-4 h-4 text-slate-300 ${loading ? "animate-spin" : ""}`} />
          </button>
          <a
            href="/"
            className="text-xs font-bold text-orange-400 hover:text-orange-300 px-3 py-1.5 bg-slate-800 rounded-xl transition"
          >
            ← POS Billing
          </a>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <ChefHat className="w-14 h-14 mb-3 opacity-30" />
          <p className="text-base font-bold">Kitchen is clear!</p>
          <p className="text-xs text-slate-600 mt-1">No pending food orders.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {orders.map((ord) => {
            const hasMultipleRounds = ord.items.some((it) => (it.round || 1) > 1);

            return (
              <div
                key={ord.id}
                className="bg-slate-800/90 border border-slate-700 rounded-3xl p-5 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-700/80">
                    <div>
                      <span className="text-2xl font-black text-orange-400">{ord.table_number}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Order #{ord.id}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                          ord.status === "Ready"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : ord.status === "Preparing"
                            ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
                        }`}
                      >
                        {ord.status}
                      </span>
                      {hasMultipleRounds && (
                        <span className="text-[10px] font-extrabold bg-orange-500/20 text-orange-300 border border-orange-500/40 px-2 py-0.5 rounded-md">
                          Round 2 Added
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5 my-3">
                    {ord.items.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex justify-between items-center p-2.5 rounded-xl border ${
                          (item.round || 1) > 1
                            ? "bg-amber-950/30 border-amber-500/40 text-amber-200"
                            : "bg-slate-900/60 border-slate-700/60 text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-orange-400">
                            {item.quantity}×
                          </span>
                          <span className="font-bold text-xs">{item.name}</span>
                        </div>
                        {(item.round || 1) > 1 && (
                          <span className="text-[10px] font-extrabold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-md">
                            R-{item.round}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-700 flex gap-2 mt-2">
                  {ord.status === "Pending" ? (
                    <button
                      onClick={() => updateOrderStatus(ord.id, "Preparing")}
                      className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition"
                    >
                      Start Cooking
                    </button>
                  ) : ord.status === "Preparing" ? (
                    <button
                      onClick={() => updateOrderStatus(ord.id, "Ready")}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
                    >
                      Mark Ready
                    </button>
                  ) : (
                    <button
                      onClick={() => updateOrderStatus(ord.id, "Preparing")}
                      className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-600 transition"
                    >
                      Re-open
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}