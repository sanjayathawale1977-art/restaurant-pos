"use client";

import React, { useEffect, useState } from "react";
import { ChefHat, RefreshCw, Layers } from "lucide-react";
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
            <p className="text-xs text-slate-400">Live Kitchen Display System (Round-wise KOT)</p>
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
          <p className="text-xs text-slate-600 mt-1">No pending orders to cook.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {orders.map((ord) => {
            const roundGroups: Record<number, OrderItem[]> = {};
            if (Array.isArray(ord.items)) {
              ord.items.forEach((item) => {
                const r = item.round || 1;
                if (!roundGroups[r]) roundGroups[r] = [];
                roundGroups[r].push(item);
              });
            }

            const availableRounds = Object.keys(roundGroups)
              .map(Number)
              .sort((a, b) => a - b);

            const hasMultipleRounds = availableRounds.length > 1;

            return (
              <div
                key={ord.id}
                className="bg-slate-800/90 border border-slate-700 rounded-3xl p-5 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-700/80">
                    <div>
                      <span className="text-2xl font-black text-orange-400">{ord.table_number}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Order #{ord.id}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
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
                        <span className="text-[10px] font-extrabold bg-orange-500 text-slate-900 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                          <Layers className="w-3 h-3" />
                          <span>{availableRounds.length} Rounds</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Round-wise Section Display */}
                  <div className="space-y-4">
                    {availableRounds.map((rnd) => (
                      <div
                        key={rnd}
                        className={`rounded-2xl p-3 border ${
                          rnd > 1
                            ? "bg-amber-950/40 border-amber-500/50 shadow-inner"
                            : "bg-slate-900/50 border-slate-700/60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              rnd > 1
                                ? "bg-amber-500 text-slate-950 font-black animate-pulse"
                                : "bg-slate-700 text-slate-300"
                            }`}
                          >
                            Round {rnd} {rnd > 1 ? "★ NEW" : ""}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {roundGroups[rnd].map((it, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center text-xs py-1 border-b border-slate-700/30 last:border-b-0"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-black text-sm ${
                                    rnd > 1 ? "text-amber-300" : "text-orange-400"
                                  }`}
                                >
                                  {it.quantity}×
                                </span>
                                <span
                                  className={`font-bold ${
                                    rnd > 1 ? "text-amber-100 font-extrabold" : "text-slate-200"
                                  }`}
                                >
                                  {it.name}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700 flex gap-2 mt-4">
                  {ord.status === "Pending" ? (
                    <button
                      onClick={() => updateOrderStatus(ord.id, "Preparing")}
                      className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      Start Cooking
                    </button>
                  ) : ord.status === "Preparing" ? (
                    <button
                      onClick={() => updateOrderStatus(ord.id, "Ready")}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
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