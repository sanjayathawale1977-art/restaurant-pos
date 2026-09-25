"use client";

import React, { useEffect, useState } from "react";
import { Package, AlertTriangle, Plus, RefreshCw } from "lucide-react";
import { supabase } from "../supabaseClient";

interface InventoryItem {
  id: number;
  name: string;
  current_stock: number;
  unit: string;
  min_threshold: number;
}

export default function InventoryScreen() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .order("name", { ascending: true });

    if (!error && data) {
      setItems(data as InventoryItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInventory();

    const channel = supabase
      .channel("inventory-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_items" },
        () => {
          fetchInventory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addStock = async (id: number, current: number) => {
    const addAmount = prompt("Kitna stock add karna hai? (e.g. 5):");
    if (!addAmount || isNaN(Number(addAmount))) return;

    const newStock = Number(current) + Number(addAmount);
    await supabase
      .from("inventory_items")
      .update({ current_stock: newStock })
      .eq("id", id);
    fetchInventory();
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-6 font-sans">
      <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-orange-500 rounded-xl text-white shadow">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inventory & Stock Tracking</h1>
            <p className="text-xs text-slate-500">Live ingredient consumption & re-ordering</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={fetchInventory}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <a
            href="/"
            className="text-xs text-orange-600 hover:text-orange-700 font-semibold underline underline-offset-4"
          >
            ← POS Billing
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((item) => {
          const isLow = Number(item.current_stock) <= Number(item.min_threshold);

          return (
            <div
              key={item.id}
              className={`p-5 rounded-2xl bg-white border shadow-sm flex flex-col justify-between ${
                isLow ? "border-red-300 bg-red-50/20" : "border-slate-200"
              }`}
            >
              <div>
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-base text-slate-900">{item.name}</h3>
                  {isLow && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                      Low Stock
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-baseline space-x-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {item.current_stock}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">{item.unit}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Threshold: {item.min_threshold} {item.unit}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => addStock(item.id, item.current_stock)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Stock</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}