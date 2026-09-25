"use client";

import React, { useState } from "react";
import {
  Utensils,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Printer,
  CheckCircle,
  ChefHat,
  Package,
  QrCode,
  BarChart3,
} from "lucide-react";
import { supabase } from "./supabaseClient";

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

const MENU_DATA: MenuItem[] = [
  {
    id: 1,
    name: "Paneer Butter Masala",
    category: "Main Course",
    price: 240,
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 2,
    name: "Dal Makhani",
    category: "Main Course",
    price: 190,
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 3,
    name: "Butter Naan",
    category: "Breads",
    price: 45,
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 4,
    name: "Tandoori Roti",
    category: "Breads",
    price: 25,
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 5,
    name: "Veg Biryani",
    category: "Rice",
    price: 210,
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 6,
    name: "Jeera Rice",
    category: "Rice",
    price: 130,
    image: "https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 7,
    name: "Cold Coffee",
    category: "Beverages",
    price: 90,
    image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 8,
    name: "Masala Chai",
    category: "Beverages",
    price: 30,
    image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80",
  },
];

const RECIPES: Record<string, { ingredient: string; qty: number }[]> = {
  "Paneer Butter Masala": [
    { ingredient: "Paneer", qty: 0.25 },
    { ingredient: "Butter", qty: 0.05 },
  ],
  "Dal Makhani": [{ ingredient: "Butter", qty: 0.05 }],
  "Butter Naan": [
    { ingredient: "Flour / Maida", qty: 0.1 },
    { ingredient: "Butter", qty: 0.02 },
  ],
  "Tandoori Roti": [{ ingredient: "Flour / Maida", qty: 0.1 }],
  "Veg Biryani": [
    { ingredient: "Basmati Rice", qty: 0.2 },
    { ingredient: "Paneer", qty: 0.05 },
  ],
  "Jeera Rice": [
    { ingredient: "Basmati Rice", qty: 0.15 },
    { ingredient: "Butter", qty: 0.02 },
  ],
  "Cold Coffee": [
    { ingredient: "Milk", qty: 0.25 },
    { ingredient: "Coffee Beans", qty: 0.02 },
  ],
  "Masala Chai": [{ ingredient: "Milk", qty: 0.15 }],
};

const TABLES = ["T-1", "T-2", "T-3", "T-4", "T-5", "T-6"];
const CATEGORIES = ["All", "Main Course", "Breads", "Rice", "Beverages"];

export default function RestaurantPOS() {
  const [selectedTable, setSelectedTable] = useState<string>("T-1");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<boolean>(false);

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

  const removeItem = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const gst = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + gst;

  const filteredMenu =
    selectedCategory === "All"
      ? MENU_DATA
      : MENU_DATA.filter((i) => i.category === selectedCategory);

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

  const handleSendToKitchen = async () => {
    if (cart.length === 0) return;
    setLoading(true);

    try {
      const { error } = await supabase.from("orders").insert([
        {
          table_number: selectedTable,
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
        alert("Order error: " + error.message);
      } else {
        await deductInventoryStock(cart);
        setOrderSuccess(true);
        setTimeout(() => {
          setOrderSuccess(false);
          setCart([]);
        }, 2000);
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800">
      {/* 80mm Print Receipt */}
      <div id="printable-receipt">
        <div className="text-center pb-2 border-b border-dashed border-black">
          <h2 className="font-bold text-base tracking-wider">TAX INVOICE</h2>
          <p className="text-[11px] text-gray-700">Dine-in Order Receipt</p>
        </div>

        <div className="text-[11px] py-2 border-b border-dashed border-black space-y-0.5">
          <div className="flex justify-between">
            <span>Table: <strong>{selectedTable}</strong></span>
            <span>Date: {new Date().toLocaleDateString("en-IN")}</span>
          </div>
          <div className="flex justify-between">
            <span>Time: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            <span>Type: Dine-In</span>
          </div>
        </div>

        <table className="w-full text-[11px] my-2">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="py-1">Item</th>
              <th className="text-center py-1">Qty</th>
              <th className="text-right py-1">Price</th>
              <th className="text-right py-1">Amt</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item) => (
              <tr key={item.id} className="border-b border-dotted border-gray-400">
                <td className="py-1 pr-1">{item.name}</td>
                <td className="text-center py-1">{item.quantity}</td>
                <td className="text-right py-1">{item.price}</td>
                <td className="text-right py-1 font-semibold">{item.price * item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-[11px] pt-1 border-t border-dashed border-black space-y-1">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>CGST (2.5%):</span>
            <span>₹{(gst / 2).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>SGST (2.5%):</span>
            <span>₹{(gst / 2).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-xs pt-1 border-t border-black">
            <span>Grand Total:</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="text-center text-[10px] mt-4 pt-2 border-t border-dashed border-black">
          <p className="font-semibold">*** Thank You! Visit Again ***</p>
        </div>
      </div>

      {/* POS Billing Screen */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-500 text-white rounded-lg shadow">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Restaurant POS</h1>
              <p className="text-xs text-slate-500">Quick Order & Billing</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href="/inventory"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <Package className="w-4 h-4 text-orange-500" />
              <span>Inventory ↗</span>
            </a>

            <a
              href="/tables"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <QrCode className="w-4 h-4 text-orange-500" />
              <span>Table QRs ↗</span>
            </a>

            <a
              href="/reports"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <BarChart3 className="w-4 h-4 text-orange-500" />
              <span>Reports ↗</span>
            </a>

            <a
              href="/kitchen"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <ChefHat className="w-4 h-4 text-orange-400" />
              <span>Kitchen Screen ↗</span>
            </a>

            <div className="flex items-center space-x-2 pl-2">
              <span className="text-sm font-semibold text-slate-600">Table:</span>
              <div className="flex gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                {TABLES.map((table) => (
                  <button
                    key={table}
                    onClick={() => setSelectedTable(table)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      selectedTable === table
                        ? "bg-orange-500 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {table}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white shadow"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Food Dishes Grid with Images */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pr-1">
          {filteredMenu.map((item) => (
            <div
              key={item.id}
              onClick={() => addToCart(item)}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-orange-300 transition cursor-pointer flex flex-col justify-between overflow-hidden group"
            >
              <div className="relative h-32 w-full overflow-hidden bg-slate-100">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <span className="absolute top-2 left-2 text-[10px] uppercase font-bold tracking-wider text-orange-700 bg-white/95 px-2 py-0.5 rounded-md shadow-xs">
                  {item.category}
                </span>
              </div>

              <div className="p-3 flex flex-col justify-between flex-1">
                <h3 className="font-semibold text-slate-800 text-sm leading-tight">{item.name}</h3>
                <div className="flex justify-between items-center mt-3">
                  <span className="font-bold text-slate-900 text-base">₹{item.price}</span>
                  <button className="p-1.5 bg-orange-100 text-orange-600 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-lg">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            <h2 className="font-bold text-slate-900">Current Order</h2>
          </div>
          <span className="bg-orange-100 text-orange-700 text-xs px-2.5 py-1 rounded-full font-bold">
            {selectedTable}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
              <ShoppingCart className="w-10 h-10 mb-2 stroke-[1.5]" />
              <p>No items added yet</p>
              <p className="text-xs text-slate-400 mt-1">Tap dishes to add to bill</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-semibold text-slate-800 text-xs truncate">{item.name}</p>
                  <p className="text-xs text-slate-500">₹{item.price} × {item.quantity}</p>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="p-1 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="p-1 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-2 text-xs text-slate-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-800">₹{subtotal}</span>
          </div>
          <div className="flex justify-between">
            <span>GST (5%)</span>
            <span className="font-semibold text-slate-800">₹{gst}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
            <span>Grand Total</span>
            <span className="text-orange-600">₹{grandTotal}</span>
          </div>

          <div className="pt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => window.print()}
              disabled={cart.length === 0}
              className="flex items-center justify-center gap-1.5 py-2.5 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 disabled:opacity-50 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill</span>
            </button>
            <button
              onClick={handleSendToKitchen}
              disabled={cart.length === 0 || loading}
              className="flex items-center justify-center gap-1.5 py-2.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50 shadow-md shadow-orange-500/20 transition"
            >
              {loading ? (
                <span>Sending...</span>
              ) : orderSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Order Sent!</span>
                </>
              ) : (
                <span>Send to KOT</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}