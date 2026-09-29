"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Utensils,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Printer,
  CheckCircle2,
  ChefHat,
  Package,
  QrCode,
  BarChart3,
  CreditCard,
  Banknote,
  X,
  RotateCcw,
  Layers,
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
  round?: number;
}

interface DBOrder {
  id: number;
  table_number: string;
  items: { name: string; quantity: number; price: number; round?: number }[];
  status: string;
  total_amount: number;
  payment_mode?: string;
  created_at: string;
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

  const [activeOrders, setActiveOrders] = useState<DBOrder[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [ignoredOrderIds, setIgnoredOrderIds] = useState<number[]>([]);

  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [confirmedPaymentMode, setConfirmedPaymentMode] = useState<string>("Cash");

  const fetchLiveOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .neq("status", "Completed")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setActiveOrders(data as DBOrder[]);
      }
    } catch {
      console.error("Live sync failed");
    }
  }, []);

  useEffect(() => {
    fetchLiveOrders();
    const interval = setInterval(fetchLiveOrders, 3000);
    return () => clearInterval(interval);
  }, [fetchLiveOrders]);

  // Load and consolidate all items for the table into 1 single bill
  const loadOrderForTable = useCallback(
    (tableNum: string, currentOrders: DBOrder[], ignoredList: number[]) => {
      const cleanNum = tableNum.replace("T-", "");
      const matching = currentOrders.filter(
        (o) =>
          (o.table_number === tableNum || o.table_number === cleanNum) &&
          o.status !== "Completed" &&
          !ignoredList.includes(o.id)
      );

      if (matching.length > 0) {
        setActiveOrderId(matching[0].id);

        // Group same dishes together across all rounds
        const map: Record<string, { qty: number; price: number }> = {};
        matching.forEach((ord) => {
          if (Array.isArray(ord.items)) {
            ord.items.forEach((it) => {
              if (!map[it.name]) {
                map[it.name] = { qty: 0, price: Number(it.price) };
              }
              map[it.name].qty += Number(it.quantity);
            });
          }
        });

        const mapped: CartItem[] = Object.entries(map).map(([name, val], idx) => {
          const menuItem = MENU_DATA.find((m) => m.name === name);
          return {
            id: menuItem ? menuItem.id : 7000 + idx,
            name,
            category: menuItem ? menuItem.category : "Food",
            price: val.price,
            quantity: val.qty,
            image: menuItem ? menuItem.image : "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80",
          };
        });

        setCart(mapped);
      } else {
        setActiveOrderId(null);
        setCart([]);
      }
    },
    []
  );

  const handleSelectTable = (table: string) => {
    setSelectedTable(table);
    loadOrderForTable(table, activeOrders, ignoredOrderIds);
  };

  useEffect(() => {
    loadOrderForTable(selectedTable, activeOrders, ignoredOrderIds);
  }, [activeOrders, selectedTable, ignoredOrderIds, loadOrderForTable]);

  const handleClearBlankBill = () => {
    if (activeOrderId) {
      setIgnoredOrderIds((prev) => [...prev, activeOrderId]);
    }
    setActiveOrderId(null);
    setCart([]);
  };

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

  const handleSendToKitchenOrAppend = async () => {
    if (cart.length === 0) return;
    setLoading(true);

    try {
      if (activeOrderId) {
        const { error } = await supabase
          .from("orders")
          .update({
            items: cart.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
            total_amount: grandTotal,
            status: "Pending",
          })
          .eq("id", activeOrderId);

        if (error) throw error;
      } else {
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
            payment_mode: "Pending",
          },
        ]);

        if (error) throw error;
      }

      await deductInventoryStock(cart);
      setOrderSuccess(true);
      await fetchLiveOrders();
      setTimeout(() => setOrderSuccess(false), 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
      alert("Error: " + message);
    } finally {
      setLoading(false);
    }
  };

  // Final Payment settlement: Prints 1 single combined invoice
  const finalizeOrderWithPayment = async (mode: "Cash" | "Online") => {
    if (cart.length === 0) return;
    setLoading(true);
    setConfirmedPaymentMode(mode);

    try {
      if (activeOrderId) {
        const { error } = await supabase
          .from("orders")
          .update({
            payment_mode: mode,
            status: "Completed",
            total_amount: grandTotal,
            items: cart.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
          })
          .eq("id", activeOrderId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("orders").insert([
          {
            table_number: selectedTable,
            items: cart.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })),
            status: "Completed",
            total_amount: grandTotal,
            payment_mode: mode,
          },
        ]);

        if (error) throw error;
        await deductInventoryStock(cart);
      }

      setShowPaymentModal(false);
      setOrderSuccess(true);

      // Print Single Final Bill
      setTimeout(() => window.print(), 300);

      setTimeout(() => {
        setOrderSuccess(false);
        handleClearBlankBill();
        fetchLiveOrders();
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Payment failed";
      alert("Payment Error: " + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-800 antialiased overflow-hidden">
      {/* 80mm SINGLE COMBINED Print Receipt */}
      <div id="printable-receipt">
        <div className="text-center pb-2 border-b border-dashed border-black">
          <h2 className="font-bold text-base tracking-wider">TAX INVOICE</h2>
          <p className="text-[11px] text-gray-700">Final Dine-in Bill</p>
        </div>

        <div className="text-[11px] py-2 border-b border-dashed border-black space-y-0.5">
          <div className="flex justify-between">
            <span>Table: <strong>{selectedTable}</strong></span>
            <span>Date: {new Date().toLocaleDateString("en-IN")}</span>
          </div>
          <div className="flex justify-between">
            <span>Time: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            <span>Payment: <strong>{confirmedPaymentMode.toUpperCase()}</strong></span>
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
            <span>GST (5%):</span>
            <span>₹{(gst).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-xs pt-1 border-t border-black">
            <span>Grand Total:</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[10px] text-gray-700 pt-1">
            <span>Status:</span>
            <span className="font-bold text-black">PAID ({confirmedPaymentMode.toUpperCase()})</span>
          </div>
        </div>

        <div className="text-center text-[10px] mt-4 pt-2 border-t border-dashed border-black">
          <p className="font-semibold">*** Thank You! Visit Again ***</p>
        </div>
      </div>

      {/* POS Left Screen */}
      <div className="flex-1 flex flex-col p-8 overflow-hidden">
        <header className="flex justify-between items-center mb-6 bg-white p-4 px-6 rounded-3xl border border-slate-200/60 shadow-xs">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-linear-to-tr from-orange-500 to-amber-500 text-white rounded-2xl shadow-sm">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900">RestoSync POS</h1>
              <p className="text-xs text-slate-400 font-medium">Single Final Bill System</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/inventory"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition"
            >
              <Package className="w-4 h-4 text-orange-500" />
              <span>Inventory</span>
            </a>

            <a
              href="/tables"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition"
            >
              <QrCode className="w-4 h-4 text-orange-500" />
              <span>Table QRs</span>
            </a>

            <a
              href="/reports"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition"
            >
              <BarChart3 className="w-4 h-4 text-orange-500" />
              <span>Reports</span>
            </a>

            <a
              href="/kitchen"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <ChefHat className="w-4 h-4 text-amber-400" />
              <span>Kitchen Screen ↗</span>
            </a>
          </div>
        </header>

        {/* Table Selector */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Tables:</span>
            {TABLES.map((table) => {
              const clean = table.replace("T-", "");
              const matching = activeOrders.filter(
                (o) =>
                  (o.table_number === table || o.table_number === clean) &&
                  o.status !== "Completed" &&
                  !ignoredOrderIds.includes(o.id)
              );
              const hasActiveQR = matching.length > 0;
              const isSelected = selectedTable === table;

              return (
                <button
                  key={table}
                  onClick={() => handleSelectTable(table)}
                  className={`relative px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-200 flex items-center gap-2 shadow-2xs ${
                    isSelected
                      ? "bg-orange-500 text-white shadow-orange-500/25 shadow-md scale-105"
                      : hasActiveQR
                      ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span>{table}</span>
                  {hasActiveQR && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Dishes Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 pr-1.5">
          {filteredMenu.map((item) => (
            <div
              key={item.id}
              onClick={() => addToCart(item)}
              className="bg-white rounded-3xl border border-slate-200/70 p-3 shadow-xs hover:shadow-md hover:border-orange-300 hover:-translate-y-0.5 transition duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div className="relative h-40 w-full overflow-hidden rounded-2xl bg-slate-100">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <span className="absolute top-2.5 left-2.5 text-[10px] font-bold text-slate-700 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-2xs">
                  {item.category}
                </span>
              </div>

              <div className="p-2 pt-3 flex flex-col justify-between flex-1">
                <h3 className="font-bold text-slate-800 text-sm leading-snug">{item.name}</h3>
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100">
                  <span className="font-extrabold text-slate-900 text-base">₹{item.price}</span>
                  <div className="p-2 bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white rounded-xl transition duration-150">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Single Final Bill Sidebar */}
      <div className="w-[400px] bg-white border-l border-slate-200/80 flex flex-col shadow-sm">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-base">Final Combined Bill</h2>
              <p className="text-[11px] text-slate-400 font-medium">Table {selectedTable}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                onClick={handleClearBlankBill}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-50 transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
            <span className="bg-slate-900 text-white text-xs px-3 py-1 rounded-xl font-bold">
              {selectedTable}
            </span>
          </div>
        </div>

        {/* Combined Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                <ShoppingCart className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-700">No active bill for {selectedTable}</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                Scan QR or tap dishes to create order
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-100 transition"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <p className="font-bold text-slate-800 text-xs truncate">{item.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    ₹{item.price} × {item.quantity} = <strong className="text-slate-700">₹{item.price * item.quantity}</strong>
                  </p>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200/80 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-black w-6 text-center text-slate-800">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200/80 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition ml-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Combined Footer */}
        <div className="p-6 bg-slate-50/90 border-t border-slate-200/60 space-y-2.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-700">₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>GST (5%)</span>
            <span className="font-semibold text-slate-700">₹{gst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-black text-slate-900 pt-3 border-t border-slate-200">
            <span>Grand Total</span>
            <span className="text-orange-600">₹{grandTotal.toFixed(2)}</span>
          </div>

          <div className="pt-3 grid grid-cols-2 gap-3">
            <button
              onClick={() => window.print()}
              disabled={cart.length === 0}
              className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-2xl disabled:opacity-40 transition shadow-2xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print 1 Bill</span>
            </button>

            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0 || loading}
              className="flex items-center justify-center gap-2 py-3 bg-linear-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-2xl disabled:opacity-40 shadow-md shadow-orange-500/25 transition"
            >
              {loading ? (
                <span>Saving...</span>
              ) : orderSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Settled!</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Settle Bill</span>
                </>
              )}
            </button>
          </div>

          {cart.length > 0 && (
            <button
              onClick={handleSendToKitchenOrAppend}
              disabled={loading}
              className="w-full mt-1 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-orange-500" />
              <span>Send Round to Kitchen (Unpaid)</span>
            </button>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-7 w-full max-w-sm shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Payment Collection</h3>
                <p className="text-xs text-slate-400 font-medium">Table: {selectedTable} • Total: ₹{grandTotal}</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-2">
              <button
                onClick={() => finalizeOrderWithPayment("Cash")}
                disabled={loading}
                className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 hover:border-emerald-500 text-emerald-900 font-bold transition group"
              >
                <div className="p-3 bg-emerald-500 text-white rounded-2xl mb-2.5 group-hover:scale-105 transition shadow-xs">
                  <Banknote className="w-6 h-6" />
                </div>
                <span className="text-sm">Cash</span>
              </button>

              <button
                onClick={() => finalizeOrderWithPayment("Online")}
                disabled={loading}
                className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-blue-200 bg-blue-50/50 hover:bg-blue-100 hover:border-blue-500 text-blue-900 font-bold transition group"
              >
                <div className="p-3 bg-blue-500 text-white rounded-2xl mb-2.5 group-hover:scale-105 transition shadow-xs">
                  <CreditCard className="w-6 h-6" />
                </div>
                <span className="text-sm">Online / UPI</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}