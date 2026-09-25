"use client";

import React, { useEffect, useState, useRef } from "react";
import { ChefHat, Check, Clock, Volume2, VolumeX } from "lucide-react";
import { supabase } from "../supabaseClient";

interface OrderItem {
  name: string;
  quantity: number;
}

interface OrderRecord {
  id: number;
  table_number: string;
  items: OrderItem[];
  status: "Pending" | "Preparing" | "Ready";
  created_at: string;
}

export default function KitchenScreen() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Synthesize clean restaurant notification chime
  const playAlertSound = () => {
    if (!soundEnabled) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;

      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // First Ding tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, ctx.currentTime); // Note A5
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);

      // Second Dong tone
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.15); // Note D6
      gain2.gain.setValueAtTime(0.35, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.6);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .in("status", ["Pending", "Preparing"])
      .order("created_at", { ascending: true });

    if (!error && data) {
      setOrders(data as OrderRecord[]);
    }
  };

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        () => {
          playAlertSound();
          fetchOrders();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled]);

  const updateStatus = async (id: number, nextStatus: "Preparing" | "Ready") => {
    await supabase.from("orders").update({ status: nextStatus }).eq("id", id);
    fetchOrders();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-orange-600 rounded-xl">
            <ChefHat className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kitchen Display System (KOT)</h1>
            <p className="text-xs text-slate-400">Live incoming food orders with sound alerts</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playAlertSound();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              soundEnabled
                ? "bg-slate-800 border-emerald-500/50 text-emerald-400"
                : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>Sound Alert ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-500" />
                <span>Sound Muted</span>
              </>
            )}
          </button>

          <span className="flex items-center gap-1.5 text-xs bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Real-time Live
          </span>
          <a
            href="/"
            className="text-xs text-orange-400 hover:text-orange-300 font-semibold underline underline-offset-4"
          >
            ← POS Billing
          </a>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="h-96 flex flex-col items-center justify-center text-slate-500">
          <Check className="w-12 h-12 mb-3 text-emerald-500/80" />
          <p className="text-lg font-semibold">Kitchen is clear!</p>
          <p className="text-sm text-slate-500">Waiting for waiter to punch orders from POS...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`rounded-2xl border bg-slate-800/90 shadow-xl overflow-hidden flex flex-col justify-between transition ${
                order.status === "Pending"
                  ? "border-amber-500/60"
                  : "border-sky-500/60"
              }`}
            >
              <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-black text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                    {order.table_number}
                  </span>
                  <span className="text-xs text-slate-400">Order #{order.id}</span>
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {new Date(order.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-3 flex-1">
                {order.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-sm border-b border-slate-700/50 pb-2"
                  >
                    <span className="font-medium text-slate-200">{item.name}</span>
                    <span className="font-extrabold text-orange-400 text-base">
                      × {item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-slate-800/50 border-t border-slate-700">
                {order.status === "Pending" ? (
                  <button
                    onClick={() => updateStatus(order.id, "Preparing")}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm transition"
                  >
                    Start Cooking
                  </button>
                ) : (
                  <button
                    onClick={() => updateStatus(order.id, "Ready")}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Food Ready / Done</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}