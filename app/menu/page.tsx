"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Utensils, ShoppingBag, Plus, Minus, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "../supabaseClient";

interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
}

interface CartItem extends MenuItem {
  quantity: number;
}

const MENU_DATA: MenuItem[] = [
  { id: 1, name: "Paneer Butter Masala", category: "Main Course", price: 240 },
  { id: 2, name: "Dal Makhani", category: "Main Course", price: 190 },
  { id: 3, name: "Butter Naan", category: "Breads", price: 45 },
  { id: 4, name: "Tandoori Roti", category: "Breads", price: 25 },
  { id: 5, name: "Veg Biryani", category: "Rice", price: 210 },
  { id: 6, name: "Jeera Rice", category: "Rice", price: 130 },
  { id: 7, name: "Cold Coffee", category: "Beverages", price: 90 },
  { id: 8, name: "Masala Chai", category: "Beverages", price: 30 },
];

const RECIPES: Record<string, { ingredient: string; qty: number }[]> = {
  "Paneer Butter Masala": [{ ingredient: "Paneer", qty: 0.25 }, { ingredient: "Butter", qty: 0.05 }],
  "Dal Makhani": [{ ingredient: "Butter", qty: 0.05 }],
  "Butter Naan": [{ ingredient: "Flour / Maida", qty: 0.1 }, { ingredient: "Butter", qty: 0.02 }],
  "Tandoori Roti": [{ ingredient: "Flour / Maida", qty: 0.1 }],
  "Veg Biryani": [{ ingredient: "Basmati Rice", qty: 0.2 }, { ingredient: "Paneer", qty: 0.05 }],
  "Jeera Rice": [{ ingredient: "Basmati Rice", qty: 0.15 }, { ingredient: "Butter", qty: 0.02 }],
  "Cold Coffee": [{ ingredient: "Milk", qty: 0.25 }, { ingredient: "Coffee Beans", qty: 0.02 }],
  "Masala Chai": [{ ingredient: "Milk", qty: 0.15 }],
};

const CATEGORIES = ["All", "Main Course", "Breads", "Rice", "Beverages"];

function MenuContent() {
  const searchParams = useSearchParams();
  const table = searchParams.get("table") || "T-1";

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [orderPlaced, setOrderPlaced] = useState<boolean>(false);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const next = item.quantity + delta;
            return next > 0 ? { ...item, quantity: next } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const subtotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const totalItems = cart.reduce((acc, i) => acc + i.quantity, 0);

  const deductInventoryStock = async (orderedCart: CartItem[]) => {
    const usageMap: Record<string, number> = {};
    orderedCart.forEach((cartItem) => {
      const recipe = RECIPES[cartItem.name];
      if (recipe) {
        recipe.forEach((ing) => {
          usageMap[ing.ingredient] = (usageMap[ing.ingredient] || 0) + ing.qty * cartItem.quantity;
        });
      }
    });

    for (const [ingredientName, usedQty] of Object.entries(usageMap)) {
      const { data } = await supabase
        .from("inventory_items")
        .select("id, current_stock")
        .eq("name", ingredientName)
        .single();

      if (data) {
        const remainingStock = Math.max(0, Number(data.current_stock) - usedQty);
        await supabase
          .from("inventory_items")
          .update({
            current_stock: Number(remainingStock.toFixed(2)),
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);
      }
    }
  };

  const handlePlaceCustomerOrder = async () => {
    if (cart.length === 0) return;
    setLoading(true);

    try {
      const gst = Math.round(subtotal * 0.05);
      const grandTotal = subtotal + gst;

      const { error } = await supabase.from("orders").insert([
        {
          table_number: table,
          items: cart.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          status: "Pending",
          total_amount: grandTotal,
        },
      ]);

      if (error) {
        alert("Error sending order: " + error.message);
      } else {
        await deductInventoryStock(cart);
        setOrderPlaced(true);
        setCart([]);
      }
    } catch {
      alert("Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredMenu =
    selectedCategory === "All"
      ? MENU_DATA
      : MENU_DATA.filter((i) => i.category === selectedCategory);

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-4 animate-bounce" />
        <h2 className="text-2xl font-black">Order Received!</h2>
        <p className="text-slate-400 mt-2 text-sm max-w-xs">
          Your order for <strong className="text-orange-400">{table}</strong> has been sent to the kitchen.
        </p>
        <div className="mt-6 flex items-center gap-2 bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-xs text-slate-300">
          <Clock className="w-4 h-4 text-orange-400" />
          <span>Estimated prep time: ~15 mins</span>
        </div>
        <button
          onClick={() => setOrderPlaced(false)}
          className="mt-8 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl text-sm font-bold shadow-lg transition"
        >
          Order More Items
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28 font-sans">
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-orange-500 text-white rounded-xl shadow-sm">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-tight">Digital Menu</h1>
            <p className="text-[11px] text-slate-500">Contactless Ordering</p>
          </div>
        </div>
        <span className="bg-orange-100 text-orange-700 font-extrabold text-xs px-3 py-1 rounded-full border border-orange-200">
          Table: {table}
        </span>
      </header>

      {/* Categories Bar */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar bg-white border-b border-slate-100">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === cat
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Dishes List */}
      <div className="p-4 space-y-3">
        {filteredMenu.map((item) => {
          const inCart = cart.find((i) => i.id === item.id);
          return (
            <div
              key={item.id}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between"
            >
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wide text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                  {item.category}
                </span>
                <h3 className="font-bold text-slate-800 text-sm">{item.name}</h3>
                <p className="font-extrabold text-slate-900 text-sm">₹{item.price}</p>
              </div>

              {inCart ? (
                <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl p-1">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="p-1 bg-white rounded-lg text-slate-700 hover:bg-slate-100 shadow-xs"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-bold w-4 text-center text-orange-700">
                    {inCart.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="p-1 bg-white rounded-lg text-slate-700 hover:bg-slate-100 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => addToCart(item)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-30">
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between border border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <ShoppingBag className="w-6 h-6 text-orange-400" />
                <span className="absolute -top-1.5 -right-2 bg-orange-500 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {totalItems}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Subtotal</p>
                <p className="text-base font-extrabold text-white">₹{subtotal}</p>
              </div>
            </div>

            <button
              onClick={handlePlaceCustomerOrder}
              disabled={loading}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5"
            >
              {loading ? "Placing..." : `Place Order for ${table}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerMenuPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading digital menu...</div>}>
      <MenuContent />
    </Suspense>
  );
}