"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  CreditCard,
  Banknote,
  X,
  Sparkles,
  RotateCcw,
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

interface DBOrder {
  id: number;
  table_number: string;
  items: { name: string; quantity: number; price: number }[];
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

  // Active QR Orders tracking
  const [activeOrders, setActiveOrders] = useState<DBOrder[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);

  // Tracks orders deliberately cleared by staff so auto-sync does not reload them
  const [ignoredOrderIds, setIgnoredOrderIds] = useState<number[]>([]);

  // Payment Selection States
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
      console.error("Failed to fetch live orders");
    }
  }, []);

  useEffect(() => {
    fetchLiveOrders();
    const interval = setInterval(fetchLiveOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchLiveOrders]);

  const loadOrderForTable = useCallback(
    (tableNum: string, currentOrders: DBOrder[], ignoredList: number[]) => {
      const tableOrder = currentOrders.find(
        (o) => o.table_number === tableNum && o.status !== "Completed" && !ignoredList.includes(o.id)
      );

      if (tableOrder) {
        setActiveOrderId(tableOrder.id);
        const mappedItems: CartItem[] = tableOrder.items.map((item, index) => {
          const menuItem = MENU_DATA.find((m) => m.name === item.name);
          return {
            id: menuItem ? menuItem.id : 1000 + index,
            name: item.name,
            category: menuItem ? menuItem.category : "Food",
            price: Number(item.price),
            quantity: Number(item.quantity),
            image: menuItem ? menuItem.image : "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80",
          };
        });
        setCart(mappedItems);
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
    if (!activeOrderId && cart.length === 0) {
      loadOrderForTable(selectedTable, activeOrders, ignoredOrderIds);
    }
  }, [activeOrders, selectedTable, activeOrderId, cart.length, ignoredOrderIds, loadOrderForTable]);

  // Instant Blank Bill Reset
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
          payment_mode: "Pending",
        },
      ]);

      if (error) {
        alert("Order error: " + error.message);
      } else {
        await deductInventoryStock(cart);
        setOrderSuccess(true);
        await fetchLiveOrders();
        setTimeout(() => {
          setOrderSuccess(false);
        }, 2000);
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

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

      setTimeout(() => {
        window.print();
      }, 300);

      setTimeout(() => {
        setOrderSuccess(false);
        handleClearBlankBill();
        fetchLiveOrders();
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Payment processing failed";
      alert("Payment error: " + message);
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
            <span>Mode: <strong>{confirmedPaymentMode.toUpperCase()}</strong></span>
          </div>
          {activeOrderId && (
            <div className="text-[10px] text-gray-600">
              <span>Order ID: #{activeOrderId} (QR Customer Order)</span>
            </div>
          )}
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
          <div className="flex justify-between text-[10px] text-gray-700 pt-1">
            <span>Payment Status:</span>
            <span className="font-bold text-black">PAID ({confirmedPaymentMode.toUpperCase()})</span>
          </div>
        </div>

        <div className="text-center text-[10px] mt-4 pt-2 border-t border-dashed border-black">
          <p className="font-semibold">*** Thank You! Visit Again ***</p>
        </div>
      </div>

      {/* POS Screen */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-500 text-white rounded-lg shadow">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Restaurant POS</h1>
              <p className="text-xs text-slate-500">Live Dine-in & QR Billing</p>
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

            {/* Live Table Selector */}
            <div className="flex items-center space-x-2 pl-2">
              <span className="text-sm font-semibold text-slate-600">Table:</span>
              <div className="flex gap-1.5 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                {TABLES.map((table) => {
                  const hasActiveQR = activeOrders.some(
                    (o) => o.table_number === table && o.status !== "Completed" && !ignoredOrderIds.includes(o.id)
                  );
                  const isSelected = selectedTable === table;

                  return (
                    <button
                      key={table}
                      onClick={() => handleSelectTable(table)}
                      className={`relative px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                        isSelected
                          ? "bg-orange-500 text-white shadow-sm"
                          : hasActiveQR
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {table}
                      {hasActiveQR && (
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Live Notification Bar if Table has Active QR Order */}
        {activeOrderId ? (
          <div className="mb-4 bg-orange-50 border border-orange-200 rounded-2xl p-3 px-4 flex items-center justify-between text-xs text-orange-900 shadow-xs">
            <div className="flex items-center gap-2 font-medium">
              <Sparkles className="w-4 h-4 text-orange-500 animate-spin" />
              <span>
                <strong>Customer QR Order Active (#{activeOrderId})</strong> for <strong>{selectedTable}</strong>. Items automatically loaded!
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 bg-white border border-orange-300 text-orange-700 px-3 py-1 rounded-lg font-bold hover:bg-orange-100 transition shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Quick Print</span>
              </button>
              <button
                onClick={handleClearBlankBill}
                className="flex items-center gap-1 bg-orange-200 hover:bg-orange-300 text-orange-900 px-2.5 py-1 rounded-lg font-semibold transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Blank Bill</span>
              </button>
            </div>
          </div>
        ) : null}

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

        {/* Food Dishes Grid */}
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

      {/* Cart & Billing Sidebar */}
      <div className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-lg">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            <h2 className="font-bold text-slate-900">
              {activeOrderId ? `Order #${activeOrderId}` : "Current Order"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                onClick={handleClearBlankBill}
                className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition border border-red-200"
              >
                Blank Bill
              </button>
            )}
            <span className="bg-orange-100 text-orange-700 text-xs px-2.5 py-1 rounded-full font-bold">
              {selectedTable}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
              <ShoppingCart className="w-10 h-10 mb-2 stroke-[1.5]" />
              <p>No items for {selectedTable}</p>
              <p className="text-xs text-slate-400 mt-1">Tap dishes to add, or wait for customer QR order</p>
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

        {/* Bill Summary & Action Buttons */}
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

          <div className="pt-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => window.print()}
              disabled={cart.length === 0}
              className="flex items-center justify-center gap-1.5 py-2.5 bg-white border-2 border-slate-300 text-slate-800 font-bold rounded-xl hover:bg-slate-100 disabled:opacity-50 transition shadow-xs"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print Bill</span>
            </button>

            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0 || loading}
              className="flex items-center justify-center gap-1.5 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:opacity-50 shadow-md shadow-orange-500/20 transition"
            >
              {loading ? (
                <span>Saving...</span>
              ) : orderSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Paid!</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Settle & Pay</span>
                </>
              )}
            </button>
          </div>

          {!activeOrderId && cart.length > 0 && (
            <button
              onClick={handleSendToKitchen}
              disabled={loading}
              className="w-full mt-1 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition"
            >
              + Send to Kitchen Only (Unpaid)
            </button>
          )}
        </div>
      </div>

      {/* Payment Selection Modal Popup */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Select Payment Mode</h3>
                <p className="text-xs text-slate-500">Table: {selectedTable} | Total: ₹{grandTotal}</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 text-center">
              Customer se poochkar payment select karein (ispe click karte hi bill print ho jayega):
            </p>

            <div className="grid grid-cols-2 gap-3 mb-2">
              <button
                onClick={() => finalizeOrderWithPayment("Cash")}
                disabled={loading}
                className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 hover:border-emerald-500 text-emerald-800 font-bold transition group"
              >
                <div className="p-3 bg-emerald-500 text-white rounded-xl mb-2 group-hover:scale-110 transition">
                  <Banknote className="w-6 h-6" />
                </div>
                <span className="text-sm">Cash</span>
                <span className="text-[10px] text-emerald-600 font-normal">Hath mein cash</span>
              </button>

              <button
                onClick={() => finalizeOrderWithPayment("Online")}
                disabled={loading}
                className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-blue-200 bg-blue-50/50 hover:bg-blue-100 hover:border-blue-500 text-blue-800 font-bold transition group"
              >
                <div className="p-3 bg-blue-500 text-white rounded-xl mb-2 group-hover:scale-110 transition">
                  <CreditCard className="w-6 h-6" />
                </div>
                <span className="text-sm">Online / UPI</span>
                <span className="text-[10px] text-blue-600 font-normal">QR / PhonePe / Card</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}