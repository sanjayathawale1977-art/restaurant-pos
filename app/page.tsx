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
  Settings,
  Percent,
  Split,
  Edit2,
  Save,
} from "lucide-react";
import { supabase } from "./supabaseClient";

interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
  is_available?: boolean;
}

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

// Recipes Mapping (For Auto Inventory Depletion)
const RECIPES: Record<string, { ingredient: string; qty: number }[]> = {
  "Peri Peri French Fries": [{ ingredient: "Potatoes / Fries", qty: 0.2 }],
  "Veg Cheese Grilled Sandwich": [{ ingredient: "Butter", qty: 0.03 }, { ingredient: "Cheese", qty: 0.05 }],
  "Paneer Tikka (6 Pcs)": [{ ingredient: "Paneer", qty: 0.2 }],
  "Paneer Butter Masala": [{ ingredient: "Paneer", qty: 0.25 }, { ingredient: "Butter", qty: 0.05 }],
  "Dal Makhani Special": [{ ingredient: "Butter", qty: 0.05 }],
  "Kadhai Paneer": [{ ingredient: "Paneer", qty: 0.2 }],
  "Butter Naan": [{ ingredient: "Flour / Maida", qty: 0.1 }, { ingredient: "Butter", qty: 0.02 }],
  "Tandoori Butter Roti": [{ ingredient: "Flour / Maida", qty: 0.08 }, { ingredient: "Butter", qty: 0.01 }],
  "Hyderabadi Veg Biryani": [{ ingredient: "Basmati Rice", qty: 0.2 }, { ingredient: "Paneer", qty: 0.05 }],
  "Jeera Rice with Dal Tadka": [{ ingredient: "Basmati Rice", qty: 0.15 }, { ingredient: "Butter", qty: 0.02 }],
  "Cold Coffee with Ice Cream": [{ ingredient: "Milk", qty: 0.25 }, { ingredient: "Coffee Beans", qty: 0.02 }],
  "Special Kullad Masala Chai": [{ ingredient: "Milk", qty: 0.15 }],
};

export default function EnterpriseApp() {
  const [currentView, setCurrentView] = useState<string>("pos");

  // Dynamic Data States
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tablesList, setTablesList] = useState<string[]>([]);
  const [activeOrders, setActiveOrders] = useState<DBOrder[]>([]);
  const [allOrdersHistory, setAllOrdersHistory] = useState<DBOrder[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);

  // POS State
  const [selectedTable, setSelectedTable] = useState<string>("T-1");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [kotSuccess, setKotSuccess] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<boolean>(false);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [ignoredOrderIds, setIgnoredOrderIds] = useState<number[]>([]);
  const isEditingManually = useRef<boolean>(false);

  // Feature 4 & 5: Discounts, GST, and Split Payment States
  const [isGstEnabled, setIsGstEnabled] = useState<boolean>(true);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentModeType, setPaymentModeType] = useState<"Full" | "Split">("Full");
  const [cashPart, setCashPart] = useState<string>("");
  const [upiPart, setUpiPart] = useState<string>("");
  const [confirmedPaymentMode, setConfirmedPaymentMode] = useState<string>("Cash");

  // Feature 1: Menu Editor State
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [tempPrice, setTempPrice] = useState<string>("");
  const [newDishName, setNewDishName] = useState<string>("");
  const [newDishPrice, setNewDishPrice] = useState<string>("");
  const [newDishCategory, setNewDishCategory] = useState<string>("Cafe & Snacks");

  // Feature 2: Table Manager State
  const [newTableName, setNewTableName] = useState<string>("");

  // Feature 3: Kitchen Print Slip Data
  const [kotPrintItems, setKotPrintItems] = useState<{ round: number; items: OrderItemData[] } | null>(null);

  // Sync Live Data
  const fetchMenuItems = useCallback(async () => {
    const { data } = await supabase.from("menu_items").select("*").order("id");
    if (data && data.length > 0) setMenuItems(data as MenuItem[]);
  }, []);

  const fetchTables = useCallback(async () => {
    const { data } = await supabase.from("restaurant_tables").select("name").order("id");
    if (data && data.length > 0) {
      setTablesList(data.map((t) => t.name));
    } else {
      setTablesList(["T-1", "T-2", "T-3", "T-4", "T-5", "T-6"]);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (data) {
        setAllOrdersHistory(data as DBOrder[]);
        setActiveOrders((data as DBOrder[]).filter((o) => o.status !== "Completed" && o.status !== "Cancelled"));
      }
    } catch {
      console.error("Order sync error");
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    const { data } = await supabase.from("inventory_items").select("*").order("name");
    if (data) setInventoryList(data as InventoryItem[]);
  }, []);

  useEffect(() => {
    fetchMenuItems();
    fetchTables();
    fetchOrders();
    fetchInventory();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [fetchMenuItems, fetchTables, fetchOrders, fetchInventory]);

  // Load Order For Current Selected Table
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
          const menuItem = menuItems.find((m) => m.name === name);
          return {
            id: menuItem ? menuItem.id : 9500 + idx,
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
    [menuItems]
  );

  const handleSelectTable = (table: string) => {
    isEditingManually.current = false;
    setSelectedTable(table);
    loadOrderForTable(table, activeOrders, ignoredOrderIds);
  };

  useEffect(() => {
    loadOrderForTable(selectedTable, activeOrders, ignoredOrderIds);
  }, [activeOrders, selectedTable, ignoredOrderIds, loadOrderForTable]);

  // POS Cart Handlers
  const addToCart = (item: MenuItem) => {
    isEditingManually.current = true;
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
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
    if (activeOrderId) setIgnoredOrderIds((prev) => [...prev, activeOrderId]);
    setActiveOrderId(null);
    setCart([]);
    setDiscountPercent(0);
  };

  // Math Calculations (Subtotal, Discount, Dynamic GST, Grand Total)
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const netAfterDiscount = Math.max(0, subtotal - discountAmount);
  const gst = isGstEnabled ? Math.round(netAfterDiscount * 0.05) : 0;
  const grandTotal = netAfterDiscount + gst;

  // Feature 3: Kitchen Thermal Print KOT & Send Handler
  const handleSendToKitchenOrAppend = async () => {
    if (cart.length === 0) return;
    setLoading(true);

    try {
      let newlyAddedItems: OrderItemData[] = [];
      let roundNum = 1;

      if (activeOrderId) {
        const { data: currentOrderData } = await supabase
          .from("orders")
          .select("items")
          .eq("id", activeOrderId)
          .single();

        const prevItems: OrderItemData[] =
          currentOrderData && Array.isArray(currentOrderData.items) ? currentOrderData.items : [];

        const maxPrevRound = prevItems.reduce((max, it) => Math.max(max, it.round || 1), 1);
        roundNum = maxPrevRound + 1;

        const updatedList: OrderItemData[] = [];
        const prevCountMap: Record<string, number> = {};

        prevItems.forEach((p) => {
          prevCountMap[p.name] = (prevCountMap[p.name] || 0) + p.quantity;
          updatedList.push({ name: p.name, quantity: p.quantity, price: p.price, round: p.round || 1 });
        });

        cart.forEach((cItem) => {
          const prevQty = prevCountMap[cItem.name] || 0;
          if (cItem.quantity > prevQty) {
            const extraQty = cItem.quantity - prevQty;
            const newItemObj = { name: cItem.name, quantity: extraQty, price: cItem.price, round: roundNum };
            updatedList.push(newItemObj);
            newlyAddedItems.push(newItemObj);
          }
        });

        const { error } = await supabase
          .from("orders")
          .update({ items: updatedList, total_amount: grandTotal, status: "Pending" })
          .eq("id", activeOrderId);
        if (error) throw error;
      } else {
        const freshItems = cart.map((item) => ({
          name: item.name,
          quantity: Number(item.quantity),
          price: Number(item.price),
          round: 1,
        }));
        newlyAddedItems = freshItems;

        const { data: inserted, error } = await supabase
          .from("orders")
          .insert([
            {
              table_number: selectedTable,
              items: freshItems,
              status: "Pending",
              total_amount: grandTotal,
              payment_mode: "Pending",
            },
          ])
          .select("id");

        if (error) throw error;
        if (inserted && inserted.length > 0) setActiveOrderId(inserted[0].id);
      }

      // Feature 3: Set items to trigger printable KOT thermal slip
      if (newlyAddedItems.length > 0) {
        setKotPrintItems({ round: roundNum, items: newlyAddedItems });
      }

      isEditingManually.current = false;
      setKotSuccess(true);
      fetchOrders();
      setTimeout(() => setKotSuccess(false), 2500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "KOT Failed";
      alert("Error: " + message);
    } finally {
      setLoading(false);
    }
  };

  // Feature 6: Auto Inventory Depletion on Settle Bill
  const deductInventoryStockOnSettle = async (itemsToDeduct: CartItem[]) => {
    try {
      const usageMap: Record<string, number> = {};
      itemsToDeduct.forEach((item) => {
        const recipe = RECIPES[item.name];
        if (recipe) {
          recipe.forEach((ing) => {
            usageMap[ing.ingredient] = (usageMap[ing.ingredient] || 0) + ing.qty * item.quantity;
          });
        }
      });

      const ingredients = Object.keys(usageMap);
      if (ingredients.length === 0) return;

      const { data: stockItems } = await supabase
        .from("inventory_items")
        .select("id, name, current_stock")
        .in("name", ingredients);

      if (stockItems && stockItems.length > 0) {
        await Promise.all(
          stockItems.map((sItem) => {
            const used = usageMap[sItem.name] || 0;
            const updated = Math.max(0, Number(sItem.current_stock) - used);
            return supabase
              .from("inventory_items")
              .update({ current_stock: Number(updated.toFixed(2)) })
              .eq("id", sItem.id);
          })
        );
      }
    } catch (e) {
      console.warn("Inventory depletion non-fatal notice:", e);
    }
  };

  // Feature 4: Settle Bill (Supports Full & Split Payments)
  const finalizeOrderWithPayment = async (selectedMode: "Cash" | "Online" | "Split") => {
    if (cart.length === 0) return;
    setLoading(true);

    let finalModeLabel = selectedMode;
    if (selectedMode === "Split") {
      const cashVal = Number(cashPart) || 0;
      const upiVal = Number(upiPart) || 0;
      if (cashVal + upiVal !== grandTotal) {
        alert(`Split amount total (₹${cashVal + upiVal}) must equal Grand Total (₹${grandTotal})`);
        setLoading(false);
        return;
      }
      finalModeLabel = `Split (Cash: ₹${cashVal} | UPI: ₹${upiVal})` as any;
    }
    setConfirmedPaymentMode(finalModeLabel);

    try {
      const formattedItems = cart.map((i) => ({
        name: i.name,
        quantity: Number(i.quantity),
        price: Number(i.price),
      }));

      if (activeOrderId) {
        await supabase
          .from("orders")
          .update({
            payment_mode: finalModeLabel,
            status: "Completed",
            total_amount: grandTotal,
            items: formattedItems,
          })
          .eq("id", activeOrderId);
      } else {
        await supabase.from("orders").insert([
          {
            table_number: selectedTable,
            items: formattedItems,
            status: "Completed",
            total_amount: grandTotal,
            payment_mode: finalModeLabel,
          },
        ]);
      }

      // Feature 6: Deplete ingredients automatically
      await deductInventoryStockOnSettle(cart);

      setShowPaymentModal(false);
      setOrderSuccess(true);
      isEditingManually.current = false;

      // Print Final Tax Invoice
      setTimeout(() => window.print(), 300);

      setTimeout(() => {
        setOrderSuccess(false);
        handleClearBlankBill();
        fetchOrders();
        fetchInventory();
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Payment error";
      alert("Error: " + message);
    } finally {
      setLoading(false);
    }
  };

  // Feature 1: Menu Price & Item Management Handlers
  const handleUpdatePrice = async (id: number) => {
    const p = Number(tempPrice);
    if (isNaN(p) || p <= 0) return;
    await supabase.from("menu_items").update({ price: p }).eq("id", id);
    setEditingPriceId(null);
    fetchMenuItems();
  };

  const handleAddNewDish = async () => {
    if (!newDishName || !newDishPrice) return;
    await supabase.from("menu_items").insert([
      {
        name: newDishName,
        price: Number(newDishPrice),
        category: newDishCategory,
        image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80",
        is_available: true,
      },
    ]);
    setNewDishName("");
    setNewDishPrice("");
    fetchMenuItems();
    alert("Naya dish menu mein add ho gaya!");
  };

  // Feature 2: Table Add/Remove Handler
  const handleAddTable = async () => {
    if (!newTableName) return;
    const formatted = newTableName.startsWith("T-") ? newTableName : `T-${newTableName}`;
    await supabase.from("restaurant_tables").insert([{ name: formatted }]);
    setNewTableName("");
    fetchTables();
  };

  // Categories Filtered Menu
  const categoriesList = ["All", ...Array.from(new Set(menuItems.map((m) => m.category)))];
  const filteredMenu = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900 font-sans text-slate-100 antialiased">
      {/* 80mm PRINT TAX INVOICE (CUSTOMER BILL) */}
      <div id="printable-receipt">
        <div className="text-center pb-2 border-b border-dashed border-black">
          <h2 className="font-bold text-base tracking-wider">TAX INVOICE</h2>
          <p className="text-[10px] text-gray-700">Dine-in Customer Bill</p>
        </div>

        <div className="text-[11px] py-1 border-b border-dashed border-black space-y-0.5">
          <div className="flex justify-between">
            <span>Table: <strong>{selectedTable}</strong></span>
            <span>Date: {new Date().toLocaleDateString("en-IN")}</span>
          </div>
          <div className="flex justify-between">
            <span>Time: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            <span>Mode: <strong>{confirmedPaymentMode}</strong></span>
          </div>
        </div>

        <table className="w-full text-[11px] my-2">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="py-0.5">Item</th>
              <th className="text-center py-0.5">Qty</th>
              <th className="text-right py-0.5">Price</th>
              <th className="text-right py-0.5">Amt</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item) => (
              <tr key={item.id} className="border-b border-dotted border-gray-300">
                <td className="py-0.5 pr-1">{item.name}</td>
                <td className="text-center py-0.5">{item.quantity}</td>
                <td className="text-right py-0.5">{item.price}</td>
                <td className="text-right py-0.5 font-semibold">{item.price * item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-[11px] pt-1 border-t border-dashed border-black space-y-0.5">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          {discountPercent > 0 && (
            <div className="flex justify-between text-black font-bold">
              <span>Discount ({discountPercent}%):</span>
              <span>-₹{discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>GST ({isGstEnabled ? "5%" : "0%"}):</span>
            <span>₹{gst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-black text-xs pt-1 border-t border-black">
            <span>Grand Total:</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="text-center text-[10px] mt-3 pt-1 border-t border-dashed border-black">
          <p className="font-semibold">*** Thank You! Visit Again ***</p>
        </div>
      </div>

      {/* ================= LEFT SLIM NAVIGATION SIDEBAR ================= */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
        <div>
          <div className="p-5 flex items-center gap-3 border-b border-slate-800/80">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-black text-base tracking-tight text-white leading-tight">RestoSync</h1>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Enterprise POS</p>
            </div>
          </div>

          <nav className="p-3 space-y-1.5">
            <button
              onClick={() => setCurrentView("pos")}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl font-bold text-xs transition ${
                currentView === "pos" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>POS Billing</span>
            </button>

            <button
              onClick={() => setCurrentView("kitchen")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-xs transition ${
                currentView === "kitchen" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-400 hover:text-white hover:bg-slate-900"
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
              onClick={() => setCurrentView("menu-manager")}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl font-bold text-xs transition ${
                currentView === "menu-manager" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Menu & Prices</span>
            </button>

            <button
              onClick={() => setCurrentView("tables")}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl font-bold text-xs transition ${
                currentView === "tables" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Tables & QRs</span>
            </button>

            <button
              onClick={() => setCurrentView("inventory")}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl font-bold text-xs transition ${
                currentView === "inventory" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Raw Inventory</span>
            </button>

            <button
              onClick={() => setCurrentView("reports")}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl font-bold text-xs transition ${
                currentView === "reports" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-400 hover:text-white hover:bg-slate-900"
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
            <span className="text-[10px] font-mono text-slate-500">Akola Main</span>
          </div>
        </div>
      </aside>

      {/* ================= MAIN VIEW CONTAINER ================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* VIEW 1: POS BILLING & DYNAMIC TABLES */}
        {currentView === "pos" && (
          <>
            <main className="flex-1 flex flex-col bg-slate-900/90 overflow-hidden">
              {/* Dynamic Tables Selector Bar */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 mr-1">Tables:</span>
                  {tablesList.map((table) => {
                    const clean = table.replace("T-", "");
                    const matching = activeOrders.filter(
                      (o) => (o.table_number === table || o.table_number === clean) && o.status !== "Completed" && !ignoredOrderIds.includes(o.id)
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

              {/* Categories */}
              <div className="px-5 py-3 border-b border-slate-800/60 flex gap-2 overflow-x-auto no-scrollbar">
                {categoriesList.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      selectedCategory === cat ? "bg-white text-slate-900 shadow-md" : "bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Food Dishes Grid */}
              <div className="flex-1 p-5 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredMenu.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="bg-slate-950/70 border border-slate-800/80 hover:border-orange-500/50 rounded-2xl p-3 flex flex-col justify-between group hover:-translate-y-0.5 transition duration-150 cursor-pointer shadow-md"
                  >
                    <div className="relative h-32 w-full overflow-hidden rounded-xl bg-slate-900">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                      <span className="absolute top-2 left-2 text-[10px] font-bold text-slate-200 bg-slate-900/90 backdrop-blur-md px-2 py-0.5 rounded-md border border-slate-700/40">
                        {item.category}
                      </span>
                    </div>

                    <div className="pt-2.5">
                      <h3 className="font-bold text-xs text-slate-200 truncate group-hover:text-orange-400 transition">{item.name}</h3>
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

            {/* Sticky Bill Panel with Discounts & Dynamic GST */}
            <aside className="w-[390px] bg-slate-950 border-l border-slate-800 flex flex-col justify-between shrink-0 shadow-2xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-orange-500/20 text-orange-400 rounded-xl">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-black text-xs text-white uppercase tracking-wider">{activeOrderId ? `Bill #${activeOrderId}` : "Current Bill"}</h2>
                    <p className="text-[11px] text-slate-400">Table: <strong className="text-orange-400 font-black">{selectedTable}</strong></p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {cart.length > 0 && (
                    <button onClick={handleClearBlankBill} className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-red-400 px-2.5 py-1 rounded-lg hover:bg-slate-900 transition">
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

              {/* Items List */}
              <div className="flex-1 p-4 overflow-y-auto space-y-2">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-600">
                    <ShoppingCart className="w-10 h-10 mb-2 stroke-[1.5]" />
                    <p className="text-xs font-bold text-slate-400">Table is Empty</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Click items on the left or scan table QR</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="bg-slate-900/80 border border-slate-800/80 p-2.5 rounded-xl flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-bold text-xs text-slate-200 truncate">{item.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          ₹{item.price} × {item.quantity} = <strong className="text-white font-bold">₹{item.price * item.quantity}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-white">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300">
                          <Plus className="w-3 h-3" />
                        </button>
                        <button onClick={() => removeItem(item.id)} className="p-1 text-slate-500 hover:text-red-400 ml-0.5">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bill Configurations (Discount, GST Toggle, Totals) */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/80 space-y-2.5">
                {/* Feature 4 & 5 Controls */}
                <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800/80">
                  {/* Discount Select */}
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1">
                    <Percent className="w-3 h-3 text-orange-400" />
                    <span className="text-[10px] text-slate-400 font-bold">Disc:</span>
                    <select
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value))}
                      className="bg-transparent text-xs text-white font-bold focus:outline-none"
                    >
                      <option value={0} className="bg-slate-900">0%</option>
                      <option value={5} className="bg-slate-900">5%</option>
                      <option value={10} className="bg-slate-900">10%</option>
                      <option value={15} className="bg-slate-900">15%</option>
                    </select>
                  </div>

                  {/* GST Toggle */}
                  <button
                    onClick={() => setIsGstEnabled(!isGstEnabled)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-1 border text-xs font-bold transition ${
                      isGstEnabled
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                        : "bg-slate-900 border-slate-800 text-slate-500"
                    }`}
                  >
                    <span>GST (5%):</span>
                    <span>{isGstEnabled ? "ON" : "OFF"}</span>
                  </button>
                </div>

                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="text-slate-200 font-semibold">₹{subtotal.toFixed(2)}</span>
                  </div>
                  {discountPercent > 0 && (
                    <div className="flex justify-between text-orange-400 font-semibold">
                      <span>Discount ({discountPercent}%):</span>
                      <span>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>GST ({isGstEnabled ? "5%" : "0%"}):</span>
                    <span className="text-slate-200 font-semibold">₹{gst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                    <span>Grand Total:</span>
                    <span className="text-orange-400">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Settle & Actions */}
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
                    onClick={() => {
                      setCashPart(String(grandTotal));
                      setUpiPart("0");
                      setShowPaymentModal(true);
                    }}
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
                  <p className="text-xs text-slate-400">Multi-round KOT Tickets</p>
                </div>
              </div>
              <button onClick={fetchOrders} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition text-slate-300">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {activeOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-28 text-slate-500">
                <ChefHat className="w-16 h-16 mb-3 opacity-30" />
                <p className="text-base font-bold text-slate-400">All Kitchen Orders Clear!</p>
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
                    <div key={ord.id} className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-800">
                          <div>
                            <span className="text-2xl font-black text-orange-400">{ord.table_number}</span>
                            <p className="text-[11px] text-slate-500 mt-0.5">Order #{ord.id}</p>
                          </div>
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${ord.status === "Ready" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400 animate-pulse"}`}>
                            {ord.status}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {availableRounds.map((rnd) => (
                            <div key={rnd} className={`rounded-2xl p-3 border ${rnd > 1 ? "bg-amber-950/30 border-amber-500/40" : "bg-slate-900/60 border-slate-800"}`}>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${rnd > 1 ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-300"}`}>
                                Round {rnd} {rnd > 1 ? "★ NEW" : ""}
                              </span>
                              <div className="space-y-1 mt-2">
                                {roundGroups[rnd].map((it, idx) => (
                                  <div key={idx} className="flex justify-between text-xs py-0.5">
                                    <span className="font-black text-orange-400">{it.quantity}×</span>
                                    <span className="text-slate-200">{it.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-800 flex gap-2 mt-4">
                        <button
                          onClick={() => supabase.from("orders").update({ status: ord.status === "Pending" ? "Preparing" : "Ready" }).eq("id", ord.id).then(fetchOrders)}
                          className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition"
                        >
                          {ord.status === "Pending" ? "Start Cooking" : "Mark Ready"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: FEATURE 1 - DYNAMIC MENU & PRICE EDITOR */}
        {currentView === "menu-manager" && (
          <div className="flex-1 p-8 bg-slate-900/95 overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-black text-white">Menu & Price Management</h2>
                <p className="text-xs text-slate-400">Change prices or add new cafe/restaurant dishes without developer help</p>
              </div>
            </div>

            {/* Quick Add Dish Bar */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-3xl mb-6 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-[11px] font-bold text-slate-400">Dish Name</label>
                <input
                  type="text"
                  placeholder="e.g. Masala Dosa"
                  value={newDishName}
                  onChange={(e) => setNewDishName(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400">Price (₹)</label>
                <input
                  type="number"
                  placeholder="120"
                  value={newDishPrice}
                  onChange={(e) => setNewDishPrice(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400">Category</label>
                <select
                  value={newDishCategory}
                  onChange={(e) => setNewDishCategory(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="Cafe & Snacks">Cafe & Snacks</option>
                  <option value="Starters">Starters</option>
                  <option value="Main Course">Main Course</option>
                  <option value="Breads">Breads</option>
                  <option value="Rice">Rice</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Desserts">Desserts</option>
                </select>
              </div>

              <button
                onClick={handleAddNewDish}
                className="py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20"
              >
                <Plus className="w-4 h-4" /> Add to Live Menu
              </button>
            </div>

            {/* Menu Price Table */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden">
              <div className="divide-y divide-slate-800/80">
                {menuItems.map((dish) => (
                  <div key={dish.id} className="p-4 flex items-center justify-between hover:bg-slate-900/40 transition">
                    <div className="flex items-center gap-3">
                      <img src={dish.image} alt={dish.name} className="w-12 h-12 rounded-xl object-cover" />
                      <div>
                        <h4 className="font-bold text-sm text-white">{dish.name}</h4>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">{dish.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {editingPriceId === dish.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={tempPrice}
                            onChange={(e) => setTempPrice(e.target.value)}
                            className="w-20 bg-slate-900 border border-orange-500 rounded-xl px-2 py-1 text-xs text-white font-bold"
                          />
                          <button onClick={() => handleUpdatePrice(dish.id)} className="p-1.5 bg-emerald-500 rounded-xl text-white">
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingPriceId(null)} className="p-1.5 bg-slate-800 rounded-xl text-slate-400">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-base text-orange-400">₹{dish.price}</span>
                          <button
                            onClick={() => {
                              setEditingPriceId(dish.id);
                              setTempPrice(String(dish.price));
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: FEATURE 2 - DYNAMIC TABLES & QR CARDS */}
        {currentView === "tables" && (
          <div className="flex-1 p-8 bg-slate-900/95 overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-black text-white">Dynamic Tables & QR Management</h2>
                <p className="text-xs text-slate-400">Add or remove restaurant tables and print acrylic QR standees</p>
              </div>

              <button onClick={() => window.print()} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                <Printer className="w-4 h-4" /> Print QR Standees
              </button>
            </div>

            {/* Add Table Bar */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-3xl mb-6 flex gap-3 max-w-md">
              <input
                type="text"
                placeholder="Table Name (e.g. T-7 or Garden-1)"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              />
              <button onClick={handleAddTable} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition">
                + Add Table
              </button>
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tablesList.map((table) => {
                const origin = typeof window !== "undefined" ? window.location.origin : "https://restaurant-pos.vercel.app";
                const orderLink = `${origin}/order?table=${table}`;
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(orderLink)}`;

                return (
                  <div key={table} className="bg-slate-950 border border-slate-800 rounded-3xl p-6 text-center flex flex-col items-center">
                    <h3 className="text-2xl font-black text-white mb-1">{table}</h3>
                    <p className="text-xs text-orange-400 font-bold mb-4 uppercase tracking-wider">Scan to Order</p>
                    <div className="p-3 bg-white rounded-2xl mb-4 shadow-md">
                      <img src={qrUrl} alt={`QR for ${table}`} className="w-40 h-40 object-contain" />
                    </div>
                    <p className="text-[11px] text-slate-500">Live Dine-in QR</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 5: RAW INVENTORY */}
        {currentView === "inventory" && (
          <div className="flex-1 p-8 bg-slate-900/95 overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-black text-white">Live Depleting Inventory</h2>
                <p className="text-xs text-slate-400">Stock automatically depletes whenever bills are settled</p>
              </div>
              <button onClick={fetchInventory} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden">
              <div className="divide-y divide-slate-800/80">
                {inventoryList.map((item) => {
                  const isLow = Number(item.current_stock) < 10;
                  return (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-900/40">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl ${isLow ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                          {isLow ? <AlertTriangle className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">{item.name}</h4>
                          <span className="text-[11px] text-slate-400">Unit: {item.unit}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-xl font-black ${isLow ? "text-red-400" : "text-white"}`}>
                          {item.current_stock} <span className="text-xs text-slate-400 font-normal">{item.unit}</span>
                        </span>
                        {isLow && <span className="text-[10px] font-extrabold px-2 py-0.5 bg-red-500/20 text-red-400 rounded-md">Low Stock</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 6: REPORTS */}
        {currentView === "reports" && (
          <div className="flex-1 p-8 bg-slate-900/95 overflow-y-auto">
            <h2 className="text-lg font-black text-white mb-6">Daily Shift Financials</h2>
            {(() => {
              const completed = allOrdersHistory.filter((o) => o.status === "Completed");
              const totalSales = completed.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
              return (
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6">
                  <p className="text-xs font-bold text-slate-400">Total Revenue Collected</p>
                  <h3 className="text-3xl font-black text-white mt-2">₹{totalSales.toFixed(2)}</h3>
                  <p className="text-xs text-slate-500 mt-1">{completed.length} settled bills</p>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* FEATURE 4: SPLIT / FULL PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="font-black text-base text-white">Settle Payment</h3>
                <p className="text-xs text-slate-400 mt-0.5">Table {selectedTable} • Amount: ₹{grandTotal}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-4">
              <button
                onClick={() => setPaymentModeType("Full")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${paymentModeType === "Full" ? "bg-orange-500 text-white" : "text-slate-400"}`}
              >
                Full Pay
              </button>
              <button
                onClick={() => setPaymentModeType("Split")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${paymentModeType === "Split" ? "bg-orange-500 text-white" : "text-slate-400"}`}
              >
                Split Pay (Cash + UPI)
              </button>
            </div>

            {paymentModeType === "Full" ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => finalizeOrderWithPayment("Cash")}
                  disabled={loading}
                  className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 flex flex-col items-center gap-2 font-bold transition"
                >
                  <Banknote className="w-6 h-6" />
                  <span className="text-xs">Cash</span>
                </button>

                <button
                  onClick={() => finalizeOrderWithPayment("Online")}
                  disabled={loading}
                  className="p-4 rounded-2xl bg-slate-950 border border-sky-500/30 hover:border-sky-500 text-sky-400 flex flex-col items-center gap-2 font-bold transition"
                >
                  <CreditCard className="w-6 h-6" />
                  <span className="text-xs">UPI / Card</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400">Cash Amount (₹)</label>
                  <input
                    type="number"
                    value={cashPart}
                    onChange={(e) => {
                      const c = Number(e.target.value) || 0;
                      setCashPart(e.target.value);
                      setUpiPart(String(Math.max(0, grandTotal - c)));
                    }}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400">UPI / QR Amount (₹)</label>
                  <input
                    type="number"
                    value={upiPart}
                    onChange={(e) => setUpiPart(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
                  />
                </div>

                <button
                  onClick={() => finalizeOrderWithPayment("Split")}
                  disabled={loading}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black transition mt-2 shadow-lg shadow-orange-500/20"
                >
                  Confirm Split Settlement
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FEATURE 3: HIDDEN KITCHEN THERMAL PRINTER SLIP (PRINTS DIRECT TO KITCHEN ROLL) */}
      {kotPrintItems && (
        <div id="kot-thermal-slip" className="hidden">
          <div className="text-center font-mono text-[11px]">
            <h3 className="font-bold text-sm">*** KITCHEN ORDER TICKET ***</h3>
            <p>Table: {selectedTable} | Round: {kotPrintItems.round}</p>
            <p>Time: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            <p>--------------------------------</p>
          </div>
          <table className="w-full font-mono text-[11px]">
            <thead>
              <tr className="border-b border-black">
                <th className="text-left">Qty</th>
                <th className="text-left">Item Name</th>
              </tr>
            </thead>
            <tbody>
              {kotPrintItems.items.map((it, idx) => (
                <tr key={idx}>
                  <td className="font-bold">{it.quantity}x</td>
                  <td>{it.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="font-mono text-[10px] text-center mt-2">--------------------------------</p>
        </div>
      )}
    </div>
  );
}