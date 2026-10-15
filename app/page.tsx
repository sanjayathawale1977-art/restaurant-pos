"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  LayoutDashboard,
  ChefHat,
  Package,
  QrCode,
  BarChart3,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  CreditCard,
  Banknote,
  RotateCcw,
  Layers,
  CheckCircle2,
  X,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  Coffee,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import { MENU_DATA, CATEGORIES, type MenuItem } from "./menuData";
import { RESTAURANT, APP_NAME } from "./restaurantConfig";

interface CartItem extends MenuItem {
  quantity: number;
  round?: number;
}

interface OrderItemData {
  name: string;
  quantity: number;
  price: number;
  round?: number;
}

interface DBOrder {
  id: number;
  table_number: string;
  items: OrderItemData[];
  status: string;
  total_amount: number;
  payment_mode?: string;
  created_at: string;
}

interface InventoryItem {
  id: number;
  name: string;
  current_stock: number;
  unit: string;
}

const TABLES = ["T-1", "T-2", "T-3", "T-4", "T-5", "T-6"];

export default function EnterpriseApp() {
  const [currentView, setCurrentView] = useState<string>("pos");

  const [activeOrders, setActiveOrders] = useState<DBOrder[]>([]);
  const [allOrdersHistory, setAllOrdersHistory] = useState<DBOrder[]>([]);

  const [selectedTable, setSelectedTable] = useState<string>("T-1");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [kotSuccess, setKotSuccess] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<boolean>(false);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [ignoredOrderIds, setIgnoredOrderIds] = useState<number[]>([]);
  const [printBillNo, setPrintBillNo] = useState<number | null>(null);
  const isEditingManually = useRef<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [confirmedPaymentMode, setConfirmedPaymentMode] = useState<string>("Cash");

  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [invLoading, setInvLoading] = useState<boolean>(false);
  const [stockInputVal, setStockInputVal] = useState<Record<number, string>>({});

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setAllOrdersHistory(data as DBOrder[]);
        const active = (data as DBOrder[]).filter(
          (o) => o.status !== "Completed" && o.status !== "Cancelled"
        );
        setActiveOrders(active);
      }
    } catch {
      console.error("Order sync error");
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    setInvLoading(true);
    try {
      const { data } = await supabase.from("inventory_items").select("*").order("name");
      if (data) setInventoryList(data as InventoryItem[]);
    } catch {
      console.error("Inventory sync error");
    }
    setInvLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchInventory();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [fetchOrders, fetchInventory]);

  const loadOrderForTable = useCallback(
    (tableNum: string, currentOrders: DBOrder[], ignoredList: number[]) => {
      if (isEditingManually.current) return;

      const cleanNum = tableNum.replace("T-", "");
      const matching = currentOrders.filter(
        (o) =>
          (o.table_number === tableNum || o.table_number === cleanNum) &&
          o.status !== "Completed" &&
          !ignoredList.includes(o.id)
      );

      if (matching.length > 0) {
        setActiveOrderId(matching[0].id);

        const map: Record<string, { qty: number; price: number; round: number }> = {};
        matching.forEach((ord) => {
          if (Array.isArray(ord.items)) {
            ord.items.forEach((it) => {
              if (!map[it.name]) {
                map[it.name] = { qty: 0, price: Number(it.price), round: it.round || 1 };
              }
              map[it.name].qty += Number(it.quantity);
            });
          }
        });

        const mapped: CartItem[] = Object.entries(map).map(([name, val], idx) => {
          const menuItem = MENU_DATA.find((m) => m.name === name);
          return {
            id: menuItem ? menuItem.id : 9000 + idx,
            name,
            category: menuItem ? menuItem.category : "Food",
            price: val.price,
            quantity: val.qty,
            round: val.round,
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
    isEditingManually.current = false;
    setSelectedTable(table);
    loadOrderForTable(table, activeOrders, ignoredOrderIds);
  };

  useEffect(() => {
    loadOrderForTable(selectedTable, activeOrders, ignoredOrderIds);
  }, [activeOrders, selectedTable, ignoredOrderIds, loadOrderForTable]);

  const addToCart = (item: MenuItem) => {
    isEditingManually.current = true;
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1, round: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    isEditingManually.current = true;
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
    isEditingManually.current = true;
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearBlankBill = () => {
    isEditingManually.current = false;
    if (activeOrderId) {
      setIgnoredOrderIds((prev) => [...prev, activeOrderId]);
    }
    setActiveOrderId(null);
    setPrintBillNo(null);
    setCart([]);
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const gst = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + gst;

  // Multi-Round KOT Handler
  const handleSendToKitchenOrAppend = async () => {
    if (cart.length === 0) return;
    setLoading(true);

    try {
      if (activeOrderId) {
        const { data: currentOrderData } = await supabase
          .from("orders")
          .select("items")
          .eq("id", activeOrderId)
          .single();

        const prevItems: OrderItemData[] =
          currentOrderData && Array.isArray(currentOrderData.items) ? currentOrderData.items : [];

        const maxPrevRound = prevItems.reduce((max, it) => Math.max(max, it.round || 1), 1);
        const nextRound = maxPrevRound + 1;

        const updatedList: OrderItemData[] = [];
        const prevCountMap: Record<string, number> = {};

        prevItems.forEach((p) => {
          prevCountMap[p.name] = (prevCountMap[p.name] || 0) + p.quantity;
          updatedList.push({
            name: p.name,
            quantity: p.quantity,
            price: p.price,
            round: p.round || 1,
          });
        });

        cart.forEach((cItem) => {
          const prevQty = prevCountMap[cItem.name] || 0;
          if (cItem.quantity > prevQty) {
            const extraQty = cItem.quantity - prevQty;
            updatedList.push({
              name: cItem.name,
              quantity: extraQty,
              price: cItem.price,
              round: nextRound,
            });
          }
        });

        const { error: updateError } = await supabase
          .from("orders")
          .update({
            items: updatedList,
            total_amount: grandTotal,
            status: "Pending",
          })
          .eq("id", activeOrderId);

        if (updateError) throw updateError;
      } else {
        const formattedItems = cart.map((item) => ({
          name: item.name,
          quantity: Number(item.quantity),
          price: Number(item.price),
          round: 1,
        }));

        const { data: inserted, error: insertError } = await supabase
          .from("orders")
          .insert([
            {
              table_number: selectedTable,
              items: formattedItems,
              status: "Pending",
              total_amount: grandTotal,
              payment_mode: "Pending",
            },
          ])
          .select("id");

        if (insertError) throw insertError;
        if (inserted && inserted.length > 0) {
          setActiveOrderId(inserted[0].id);
        }
      }

      isEditingManually.current = false;
      setKotSuccess(true);
      fetchOrders();
      setTimeout(() => setKotSuccess(false), 2500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
      alert("KOT error: " + message);
    } finally {
      setLoading(false);
    }
  };

  // Final Settlement
  const finalizeOrderWithPayment = async (mode: "Cash" | "Online") => {
    if (cart.length === 0) return;
    setLoading(true);
    setConfirmedPaymentMode(mode);

    try {
      const formattedItems = cart.map((i) => ({
        name: i.name,
        quantity: Number(i.quantity),
        price: Number(i.price),
      }));

      if (activeOrderId) {
        const { error } = await supabase
          .from("orders")
          .update({
            payment_mode: mode,
            status: "Completed",
            total_amount: grandTotal,
            items: formattedItems,
          })
          .eq("id", activeOrderId);

        if (error) throw error;
        setPrintBillNo(activeOrderId);
      } else {
        const { data: newBill, error } = await supabase
          .from("orders")
          .insert([
            {
              table_number: selectedTable,
              items: formattedItems,
              status: "Completed",
              total_amount: grandTotal,
              payment_mode: mode,
            },
          ])
          .select("id");

        if (error) throw error;
        if (newBill && newBill.length > 0) setPrintBillNo(newBill[0].id);
      }

      setShowPaymentModal(false);
      setOrderSuccess(true);
      isEditingManually.current = false;

      setTimeout(() => window.print(), 300);

      setTimeout(() => {
        setOrderSuccess(false);
        handleClearBlankBill();
        fetchOrders();
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Payment failed";
      alert("Payment failed: " + message);
    } finally {
      setLoading(false);
    }
  };

  const updateKitchenStatus = async (id: number, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    fetchOrders();
  };

  // Professional Inventory Stock Update
  const handleStockUpdate = async (id: number, currentStock: number, addVal: number) => {
    const newStock = Math.max(0, currentStock + addVal);
    await supabase.from("inventory_items").update({ current_stock: newStock }).eq("id", id);
    setStockInputVal((prev) => ({ ...prev, [id]: "" }));
    fetchInventory();
  };

  const filteredMenu = MENU_DATA.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900 font-sans text-slate-100 antialiased">
      {/* 80mm Print Receipt */}
      <div id="printable-receipt">
        <div className="text-center pb-2 border-b border-dashed border-black">
          <h2 className="font-bold text-base tracking-wider">{RESTAURANT.name}</h2>
          <p className="text-[11px] text-gray-700">{RESTAURANT.address}</p>
          <p className="text-[11px] text-gray-700">Ph: {RESTAURANT.phone}</p>
          {RESTAURANT.gstin && (
            <p className="text-[11px] text-gray-700">GSTIN: {RESTAURANT.gstin}</p>
          )}
          <h3 className="font-bold text-xs tracking-wider mt-1">
            {RESTAURANT.gstin ? "TAX INVOICE" : "BILL"}
          </h3>
          <p className="text-[11px] text-gray-700">Dine-in Customer Bill</p>
        </div>

        <div className="text-[11px] py-2 border-b border-dashed border-black space-y-0.5">
          <div className="flex justify-between">
            <span>Bill No: <strong>{printBillNo ?? activeOrderId ?? "-"}</strong></span>
            <span>Date: {new Date().toLocaleDateString("en-IN")}</span>
          </div>
          <div className="flex justify-between">
            <span>Table: <strong>{selectedTable}</strong></span>
            <span>Time: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div className="flex justify-between">
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
        </div>

        <div className="text-center text-[10px] mt-4 pt-2 border-t border-dashed border-black">
          <p className="font-semibold">*** {RESTAURANT.footer} ***</p>
        </div>
      </div>

      {/* ================= LEFT SLIM SIDEBAR (APP SWITCHER) ================= */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
        <div>
          <div className="p-5 flex items-center gap-3 border-b border-slate-800/80">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-black text-base tracking-tight text-white leading-tight">{APP_NAME}</h1>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Enterprise POS</p>
            </div>
          </div>

          <nav className="p-3 space-y-1.5">
            <button
              onClick={() => setCurrentView("pos")}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl font-bold text-xs transition ${
                currentView === "pos"
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>POS Billing</span>
            </button>

            <button
              onClick={() => setCurrentView("kitchen")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-xs transition ${
                currentView === "kitchen"
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <ChefHat className="w-4 h-4" />
                <span>Kitchen (KDS)</span>
              </div>
              {activeOrders.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 animate-pulse">
                  {activeOrders.length} KOT
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentView("tables")}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl font-bold text-xs transition ${
                currentView === "tables"
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Table QR Stands</span>
            </button>

            <button
              onClick={() => setCurrentView("inventory")}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl font-bold text-xs transition ${
                currentView === "inventory"
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Raw Inventory</span>
            </button>

            <button
              onClick={() => setCurrentView("reports")}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl font-bold text-xs transition ${
                currentView === "reports"
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Shift Reports</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-slate-300">Station 01</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">Live POS</span>
          </div>
        </div>
      </aside>

      {/* ================= RIGHT VIEW CONTAINER ================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* VIEW 1: POS BILLING & EXPANDED MENU */}
        {currentView === "pos" && (
          <>
            <main className="flex-1 flex flex-col bg-slate-900/90 overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 mr-1">Tables:</span>
                  {TABLES.map((table) => {
                    const clean = table.replace("T-", "");
                    const matching = activeOrders.filter(
                      (o) =>
                        (o.table_number === table || o.table_number === clean) &&
                        o.status !== "Completed" &&
                        !ignoredOrderIds.includes(o.id)
                    );
                    const hasActiveOrder = matching.length > 0;
                    const isSelected = selectedTable === table;

                    return (
                      <button
                        key={table}
                        onClick={() => handleSelectTable(table)}
                        className={`relative px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                          isSelected
                            ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 scale-105"
                            : hasActiveOrder
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25"
                            : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60"
                        }`}
                      >
                        <span>{table}</span>
                        {hasActiveOrder && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-64 shrink-0">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search dishes or snacks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="px-5 py-3 border-b border-slate-800/60 flex gap-2 overflow-x-auto no-scrollbar">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      selectedCategory === cat
                        ? "bg-white text-slate-900 shadow-md"
                        : "bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex-1 p-5 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredMenu.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="bg-slate-950/70 border border-slate-800/80 hover:border-orange-500/50 rounded-2xl p-3 flex flex-col justify-between group hover:-translate-y-0.5 transition duration-150 cursor-pointer shadow-md"
                  >
                    <div className="relative h-32 w-full overflow-hidden rounded-xl bg-slate-900">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                      />
                      <span className="absolute top-2 left-2 text-[10px] font-bold text-slate-200 bg-slate-900/90 backdrop-blur-md px-2 py-0.5 rounded-md border border-slate-700/40">
                        {item.category}
                      </span>
                    </div>

                    <div className="pt-2.5">
                      <h3 className="font-bold text-xs text-slate-200 truncate group-hover:text-orange-400 transition">
                        {item.name}
                      </h3>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60">
                        <span className="font-extrabold text-sm text-white">₹{item.price}</span>
                        <div className="p-1.5 bg-orange-500/20 text-orange-400 group-hover:bg-orange-500 group-hover:text-white rounded-lg transition">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </main>

            {/* Sticky Order Panel */}
            <aside className="w-[380px] bg-slate-950 border-l border-slate-800 flex flex-col justify-between shrink-0 shadow-2xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-orange-500/20 text-orange-400 rounded-xl">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-black text-xs text-white uppercase tracking-wider">
                      {activeOrderId ? `Running Bill #${activeOrderId}` : "Current Bill"}
                    </h2>
                    <p className="text-[11px] text-slate-400">Table: <strong className="text-orange-400 font-black">{selectedTable}</strong></p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {cart.length > 0 && (
                    <button
                      onClick={handleClearBlankBill}
                      className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-red-400 px-2.5 py-1 rounded-lg hover:bg-slate-900 transition"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-bold">
                    {cart.reduce((sum, i) => sum + i.quantity, 0)} Items
                  </span>
                </div>
              </div>

              {kotSuccess && (
                <div className="mx-4 mt-3 p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>KOT Sent to Kitchen!</span>
                </div>
              )}

              <div className="flex-1 p-4 overflow-y-auto space-y-2">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-600">
                    <ShoppingCart className="w-10 h-10 mb-2 stroke-[1.5]" />
                    <p className="text-xs font-bold text-slate-400">Table is Empty</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Click items on the left or scan table QR</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-900/80 border border-slate-800/80 p-2.5 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-bold text-xs text-slate-200 truncate">{item.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          ₹{item.price} × {item.quantity} = <strong className="text-white font-bold">₹{item.price * item.quantity}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-white">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-slate-500 hover:text-red-400 ml-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950/80 space-y-2">
                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="text-slate-200 font-semibold">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (5%):</span>
                    <span className="text-slate-200 font-semibold">₹{gst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                    <span>Grand Total:</span>
                    <span className="text-orange-400">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => window.print()}
                    disabled={cart.length === 0}
                    className="py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Bill</span>
                  </button>

                  <button
                    onClick={() => setShowPaymentModal(true)}
                    disabled={cart.length === 0 || loading}
                    className="py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 transition shadow-lg shadow-orange-500/20"
                  >
                    {loading ? <span>Saving...</span> : orderSuccess ? <><CheckCircle2 className="w-3.5 h-3.5" /><span>Settled!</span></> : <><CreditCard className="w-3.5 h-3.5" /><span>Settle Bill</span></>}
                  </button>
                </div>

                {cart.length > 0 && (
                  <button
                    onClick={handleSendToKitchenOrAppend}
                    disabled={loading}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-orange-400 flex items-center justify-center gap-1.5 transition"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{loading ? "Sending..." : activeOrderId ? "Update & Send to KOT" : "Send to Kitchen (KOT)"}</span>
                  </button>
                )}
              </div>
            </aside>
          </>
        )}

        {/* VIEW 2: KITCHEN DISPLAY SYSTEM */}
        {currentView === "kitchen" && (
          <div className="flex-1 p-6 bg-slate-900/95 overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-500 rounded-2xl shadow-lg">
                  <ChefHat className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Live Kitchen Display System</h2>
                  <p className="text-xs text-slate-400">Multi-round KOT Orders</p>
                </div>
              </div>

              <button
                onClick={fetchOrders}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition text-slate-300"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {activeOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-28 text-slate-500">
                <ChefHat className="w-16 h-16 mb-3 opacity-30" />
                <p className="text-base font-bold text-slate-400">All Kitchen Orders Clear!</p>
                <p className="text-xs text-slate-500 mt-1">No pending orders from dining tables.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {activeOrders.map((ord) => {
                  const roundGroups: Record<number, OrderItemData[]> = {};
                  if (Array.isArray(ord.items)) {
                    ord.items.forEach((item) => {
                      const r = item.round || 1;
                      if (!roundGroups[r]) roundGroups[r] = [];
                      roundGroups[r].push(item);
                    });
                  }

                  const availableRounds = Object.keys(roundGroups).map(Number).sort((a, b) => a - b);

                  return (
                    <div
                      key={ord.id}
                      className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-800">
                          <div>
                            <span className="text-2xl font-black text-orange-400">{ord.table_number}</span>
                            <p className="text-[11px] text-slate-500 mt-0.5">Order #{ord.id}</p>
                          </div>
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
                        </div>

                        <div className="space-y-3">
                          {availableRounds.map((rnd) => (
                            <div
                              key={rnd}
                              className={`rounded-2xl p-3 border ${
                                rnd > 1 ? "bg-amber-950/30 border-amber-500/40" : "bg-slate-900/60 border-slate-800"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span
                                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                    rnd > 1 ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-300"
                                  }`}
                                >
                                  Round {rnd} {rnd > 1 ? "★ NEW" : ""}
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                {roundGroups[rnd].map((it, idx) => (
                                  <div key={idx} className="flex justify-between text-xs py-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-black ${rnd > 1 ? "text-amber-400" : "text-orange-400"}`}>
                                        {it.quantity}×
                                      </span>
                                      <span className={rnd > 1 ? "text-amber-100 font-bold" : "text-slate-200 font-medium"}>
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

                      <div className="pt-4 border-t border-slate-800 flex gap-2 mt-4">
                        {ord.status === "Pending" ? (
                          <button
                            onClick={() => updateKitchenStatus(ord.id, "Preparing")}
                            className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition"
                          >
                            Start Cooking
                          </button>
                        ) : ord.status === "Preparing" ? (
                          <button
                            onClick={() => updateKitchenStatus(ord.id, "Ready")}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
                          >
                            Mark Ready
                          </button>
                        ) : (
                          <button
                            onClick={() => updateKitchenStatus(ord.id, "Preparing")}
                            className="flex-1 py-2 bg-slate-800 text-slate-400 rounded-xl text-xs font-semibold hover:bg-slate-700 transition"
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
        )}

        {/* VIEW 3: TABLE QR STANDS */}
        {currentView === "tables" && (
          <div className="flex-1 p-8 bg-slate-900/95 overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-500 rounded-2xl shadow-lg">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Table QR Codes</h2>
                  <p className="text-xs text-slate-400">Print acrylic table top stands</p>
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition"
              >
                <Printer className="w-4 h-4" /> Print QR Cards
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {TABLES.map((table) => {
                const origin = typeof window !== "undefined" ? window.location.origin : "https://restaurant-pos.vercel.app";
                const orderLink = `${origin}/order?table=${table}`;
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(orderLink)}`;

                return (
                  <div key={table} className="bg-slate-950 border border-slate-800 rounded-3xl p-6 text-center flex flex-col items-center">
                    <h3 className="text-2xl font-black text-white mb-1">{table}</h3>
                    <p className="text-xs text-orange-400 font-bold mb-4 uppercase tracking-wider">Scan for Digital Menu</p>
                    <div className="p-3 bg-white rounded-2xl mb-4 shadow-md">
                      <img src={qrUrl} alt={`QR for ${table}`} className="w-44 h-44 object-contain" />
                    </div>
                    <p className="text-[11px] text-slate-500">Scan & Order directly from table</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 4: PROFESSIONAL RAW INVENTORY  */}
        {currentView === "inventory" && (
          <div className="flex-1 p-8 bg-slate-900/95 overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-500 rounded-2xl shadow-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Inventory Management</h2>
                  <p className="text-xs text-slate-400">Raw material depletion, stock inward & minimum threshold</p>
                </div>
              </div>

              <button
                onClick={fetchInventory}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition text-slate-300"
              >
                <RefreshCw className={`w-4 h-4 ${invLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Inventory Table List */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Raw Stock Inventory</h3>
                <span className="text-[11px] text-slate-500 font-mono">{inventoryList.length} Items Configured</span>
              </div>

              <div className="divide-y divide-slate-800/80">
                {inventoryList.map((item) => {
                  const isLowStock = Number(item.current_stock) < 10;
                  const customVal = stockInputVal[item.id] || "";

                  return (
                    <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-900/40 transition">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div className={`p-2.5 rounded-2xl ${isLowStock ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"}`}>
                          {isLowStock ? <AlertTriangle className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">{item.name}</h4>
                          <span className="text-[11px] text-slate-400 font-medium">Unit: {item.unit}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Current In-Stock</p>
                          <p className={`text-xl font-black ${isLowStock ? "text-red-400" : "text-white"}`}>
                            {item.current_stock} <span className="text-xs text-slate-400 font-normal">{item.unit}</span>
                          </p>
                        </div>
                        {isLowStock && (
                          <span className="text-[10px] font-extrabold px-2.5 py-1 bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg">
                            Low Stock
                          </span>
                        )}
                      </div>

                      {/* Quick Replenish Inward Form */}
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Qty..."
                          value={customVal}
                          onChange={(e) => setStockInputVal({ ...stockInputVal, [item.id]: e.target.value })}
                          className="w-20 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                        <button
                          onClick={() => {
                            if (customVal && Number(customVal) > 0) {
                              handleStockUpdate(item.id, Number(item.current_stock), Number(customVal));
                            }
                          }}
                          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
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
          </div>
        )}

        {/* VIEW 5: SHIFT SALES REPORTS */}
        {currentView === "reports" && (
          <div className="flex-1 p-8 bg-slate-900/95 overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-500 rounded-2xl shadow-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Daily Shift Financials</h2>
                  <p className="text-xs text-slate-400">Cash register reconciliation</p>
                </div>
              </div>
            </div>

            {(() => {
              const completed = allOrdersHistory.filter((o) => o.status === "Completed");
              const totalSales = completed.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
              const cashSales = completed
                .filter((o) => o.payment_mode === "Cash")
                .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
              const onlineSales = completed
                .filter((o) => o.payment_mode === "Online")
                .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5">
                      <p className="text-xs font-bold text-slate-400">Total Net Revenue</p>
                      <h3 className="text-2xl font-black text-white mt-1">₹{totalSales.toFixed(2)}</h3>
                      <p className="text-[11px] text-slate-500 mt-1">{completed.length} settled tickets</p>
                    </div>

                    <div className="bg-slate-950 border border-emerald-500/30 rounded-3xl p-5">
                      <p className="text-xs font-bold text-emerald-400">Cash in Drawer</p>
                      <h3 className="text-2xl font-black text-white mt-1">₹{cashSales.toFixed(2)}</h3>
                      <p className="text-[11px] text-slate-500 mt-1">Physical cash payments</p>
                    </div>

                    <div className="bg-slate-950 border border-sky-500/30 rounded-3xl p-5">
                      <p className="text-xs font-bold text-sky-400">UPI / QR Collections</p>
                      <h3 className="text-2xl font-black text-white mt-1">₹{onlineSales.toFixed(2)}</h3>
                      <p className="text-[11px] text-slate-500 mt-1">Direct bank settlements</p>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5">
                    <h3 className="font-bold text-sm text-white mb-3">Settled Bills Log</h3>
                    <div className="space-y-2">
                      {completed.slice(0, 8).map((ord) => (
                        <div key={ord.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                          <div>
                            <span className="font-black text-xs text-white">{ord.table_number}</span>
                            <span className="text-[11px] text-slate-400 ml-2">Invoice #{ord.id}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-bold text-orange-400">₹{ord.total_amount}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                              {ord.payment_mode || "Paid"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="font-black text-base text-white">Select Payment Mode</h3>
                <p className="text-xs text-slate-400 mt-0.5">Table {selectedTable} • Total: ₹{grandTotal}</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => finalizeOrderWithPayment("Cash")}
                disabled={loading}
                className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-950/20 text-emerald-400 flex flex-col items-center justify-center gap-2 font-bold transition"
              >
                <Banknote className="w-6 h-6" />
                <span className="text-xs">Cash</span>
              </button>

              <button
                onClick={() => finalizeOrderWithPayment("Online")}
                disabled={loading}
                className="p-4 rounded-2xl bg-slate-950 border border-sky-500/30 hover:border-sky-500 hover:bg-sky-950/20 text-sky-400 flex flex-col items-center justify-center gap-2 font-bold transition"
              >
                <CreditCard className="w-6 h-6" />
                <span className="text-xs">UPI / Card</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}