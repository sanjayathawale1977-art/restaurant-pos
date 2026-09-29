"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Utensils,
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { supabase } from "../supabaseClient";

interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

interface OrderItemData {
  name: string;
  quantity: number;
  price: number;
  round?: number;
}

const MENU_DATA: MenuItem[] = [
  {
    id: 1,
    name: "Paneer Butter Masala",
    category: "Main Course",
    price: 240,
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 2,
    name: "Dal Makhani",
    category: "Main Course",
    price: 190,
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 3,
    name: "Butter Naan",
    category: "Breads",
    price: 45,
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 4,
    name: "Tandoori Roti",
    category: "Breads",
    price: 25,
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 5,
    name: "Veg Biryani",
    category: "Rice",
    price: 210,
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 6,
    name: "Jeera Rice",
    category: "Rice",
    price: 130,
    image: "https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 7,
    name: "Cold Coffee",
    category: "Beverages",
    price: 90,
    image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: 8,
    name: "Masala Chai",
    category: "Beverages",
    price: 30,
    image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80",
  },
];

const CATEGORIES = ["All", "Main Course", "Breads", "Rice", "Beverages"];

function OrderContent() {
  const searchParams = useSearchParams();
  const rawTable = searchParams.get("table") || "T-1";
  const tableNumber = rawTable.startsWith("T-") ? rawTable : `T-${rawTable}`;

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [orderNotification, setOrderNotification] = useState<string>("");

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const gst = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + gst;

  const filteredMenu =
    selectedCategory === "All"
      ? MENU_DATA
      : MENU_DATA.filter((i) => i.category === selectedCategory);

  const handleCustomerPlaceOrder = async () => {
    if (cart.length === 0) return;
    setLoading(true);

    try {
      // 1. Check if table has an ongoing active bill
      const { data: existingOrders, error: fetchErr } = await supabase
        .from("orders")
        .select("*")
        .eq("table_number", tableNumber)
        .neq("status", "Completed")
        .neq("status", "Cancelled")
        .order("created_at", { ascending: false })
        .limit(1);

      if (fetchErr) throw fetchErr;

      if (existingOrders && existingOrders.length > 0) {
        // ROUND 2+ : Merge items into ongoing bill with next round tag
        const existingOrder = existingOrders[0];
        const currentItems: OrderItemData[] = Array.isArray(existingOrder.items) ? existingOrder.items : [];

        // Determine current max round
        const currentMaxRound = currentItems.reduce((max, it) => Math.max(max, it.round || 1), 1);
        const nextRound = currentMaxRound + 1;

        const updatedItemsList = [...currentItems];

        cart.forEach((newIt) => {
          updatedItemsList.push({
            name: newIt.name,
            quantity: Number(newIt.quantity),
            price: Number(newIt.price),
            round: nextRound,
          });
        });

        const newSub = updatedItemsList.reduce((sum, it) => sum + it.price * it.quantity, 0);
        const newTotal = Math.round(newSub * 1.05);

        const { error: updateErr } = await supabase
          .from("orders")
          .update({
            items: updatedItemsList,
            total_amount: newTotal,
            status: "Pending", // Triggers kitchen alert for round 2
          })
          .eq("id", existingOrder.id);

        if (updateErr) throw updateErr;
        setOrderNotification(`Round ${nextRound} order kitchen ko bhej diya gaya hai!`);
      } else {
        // ROUND 1: Fresh bill creation
        const freshItems: OrderItemData[] = cart.map((item) => ({
          name: item.name,
          quantity: Number(item.quantity),
          price: Number(item.price),
          round: 1,
        }));

        const { error: insertErr } = await supabase.from("orders").insert([
          {
            table_number: tableNumber,
            items: freshItems,
            status: "Pending",
            total_amount: grandTotal,
            payment_mode: "Pending",
          },
        ]);

        if (insertErr) throw insertErr;
        setOrderNotification("Order kitchen ko bhej diya gaya hai!");
      }

      setCart([]);
      setTimeout(() => setOrderNotification(""), 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
      alert("Order place karne mein issue aaya: " + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-28">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3.5 flex justify-between items-center shadow-xs">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-orange-500 text-white rounded-xl shadow-xs">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base text-slate-900 leading-tight">Digital Menu</h1>
            <p className="text-[11px] text-slate-500">Scan & Dine</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-orange-100 text-orange-900 font-extrabold px-3 py-1 rounded-xl text-xs border border-orange-200">
          <span>Table:</span>
          <span className="font-black">{tableNumber}</span>
        </div>
      </header>

      {orderNotification && (
        <div className="mx-4 mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 shadow-xs animate-in fade-in">
          <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
          <div>
            <p className="text-xs font-bold">{orderNotification}</p>
            <p className="text-[11px] text-emerald-700">Khana khatam hone par aap aur items bhi add kar sakte hain.</p>
          </div>
        </div>
      )}

      <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === cat
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-3 mt-1">
        {filteredMenu.map((item) => {
          const inCart = cart.find((c) => c.id === item.id);

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs flex gap-3 items-center justify-between"
            >
              <div className="flex gap-3 items-center min-w-0">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-100"
                />
                <div className="min-w-0">
                  <h3 className="font-bold text-xs text-slate-800 truncate">{item.name}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">{item.category}</p>
                  <p className="font-extrabold text-sm text-slate-900 mt-1">₹{item.price}</p>
                </div>
              </div>

              <div>
                {inCart ? (
                  <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 p-1 rounded-xl">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-6 h-6 flex items-center justify-center bg-white rounded-lg text-orange-600 shadow-2xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold w-4 text-center text-orange-950">
                      {inCart.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-6 h-6 flex items-center justify-center bg-white rounded-lg text-orange-600 shadow-2xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToCart(item)}
                    className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs transition"
                  >
                    Add +
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg z-40">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] text-slate-500 font-medium">
                {cart.reduce((sum, i) => sum + i.quantity, 0)} Items Selected
              </p>
              <p className="text-base font-black text-slate-900">
                ₹{grandTotal} <span className="text-[10px] font-normal text-slate-400">(incl. GST)</span>
              </p>
            </div>

            <button
              onClick={handleCustomerPlaceOrder}
              disabled={loading}
              className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-2xl shadow-md shadow-orange-500/25 transition disabled:opacity-50 text-xs flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <span>Sending to Kitchen...</span>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>Send to Kitchen / KOT</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerOrderPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-xs text-slate-400">Loading Menu...</div>}>
      <OrderContent />
    </Suspense>
  );
}