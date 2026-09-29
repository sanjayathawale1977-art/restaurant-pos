"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  Utensils,
  RefreshCw,
  Calendar,
  ArrowLeft,
  Banknote,
  CreditCard,
  Clock,
} from "lucide-react";
import { supabase } from "../supabaseClient";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderRecord {
  id: number;
  table_number: string;
  items: OrderItem[];
  status: string;
  total_amount: number;
  payment_mode?: string;
  created_at: string;
}

export default function ReportsDashboard() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeFilter, setTimeFilter] = useState<"today" | "all">("today");

  const fetchSalesData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data as OrderRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  // Filter Orders based on Today vs All Time
  const filteredOrders = useMemo(() => {
    if (timeFilter === "all") return orders;

    const todayStr = new Date().toDateString();
    return orders.filter((o) => {
      const orderDate = new Date(o.created_at).toDateString();
      return orderDate === todayStr;
    });
  }, [orders, timeFilter]);

  // Calculations
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const totalOrders = filteredOrders.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const cashTotal = filteredOrders
    .filter((o) => (o.payment_mode || "Cash").toLowerCase() === "cash")
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  const onlineTotal = filteredOrders
    .filter((o) => (o.payment_mode || "").toLowerCase() === "online")
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  // Top Selling items
  const itemSalesMap: Record<string, { qty: number; revenue: number }> = {};
  filteredOrders.forEach((order) => {
    if (Array.isArray(order.items)) {
      order.items.forEach((item) => {
        if (!itemSalesMap[item.name]) {
          itemSalesMap[item.name] = { qty: 0, revenue: 0 };
        }
        itemSalesMap[item.name].qty += Number(item.quantity) || 1;
        itemSalesMap[item.name].revenue += (Number(item.price) || 0) * (Number(item.quantity) || 1);
      });
    }
  });

  const topItems = Object.entries(itemSalesMap)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 p-8 font-sans antialiased">
      {/* Top Spacious Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-white p-6 rounded-3xl border border-slate-200/70 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-linear-to-tr from-orange-500 to-amber-500 rounded-2xl text-white shadow-sm">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Revenue & Sales Insights</h1>
            <p className="text-xs text-slate-400 font-medium">Daily shift performance & cash flow reconciliation</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Today vs All-Time Filter */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setTimeFilter("today")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                timeFilter === "today" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Today's Shift
            </button>
            <button
              onClick={() => setTimeFilter("all")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                timeFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={fetchSalesData}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition shadow-2xs"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <a
            href="/"
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>POS Billing</span>
          </a>
        </div>
      </div>

      {/* 5 Big Clean Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sales</p>
          <h3 className="text-2xl font-black text-slate-900 mt-2">₹{totalRevenue.toLocaleString("en-IN")}</h3>
          <span className="text-[11px] text-slate-400 font-medium">{timeFilter === "today" ? "Today's collection" : "Lifetime collection"}</span>
        </div>

        {/* CASH CARD */}
        <div className="bg-emerald-50/60 border border-emerald-200/80 p-5 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Cash In Counter</p>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-black text-emerald-950 mt-2">₹{cashTotal.toLocaleString("en-IN")}</h3>
          <span className="text-[11px] text-emerald-700 font-medium">Physical cash in drawer</span>
        </div>

        {/* ONLINE CARD */}
        <div className="bg-blue-50/60 border border-blue-200/80 p-5 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Bank / UPI</p>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-2xl font-black text-blue-950 mt-2">₹{onlineTotal.toLocaleString("en-IN")}</h3>
          <span className="text-[11px] text-blue-700 font-medium">Transferred to bank</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Orders</p>
          <h3 className="text-2xl font-black text-slate-900 mt-2">{totalOrders}</h3>
          <span className="text-[11px] text-slate-400 font-medium">Completed KOTs</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Order Value</p>
          <h3 className="text-2xl font-black text-slate-900 mt-2">₹{avgOrderValue}</h3>
          <span className="text-[11px] text-orange-600 font-medium">Per table average</span>
        </div>
      </div>

      {/* Grid: Top Dishes & Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Selling Dishes */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/70 shadow-xs">
          <div className="flex items-center space-x-2.5 mb-5 pb-3 border-b border-slate-100">
            <Utensils className="w-4 h-4 text-orange-500" />
            <h2 className="font-extrabold text-slate-900 text-sm">Top Selling Dishes</h2>
          </div>

          {topItems.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No orders recorded in this period.</p>
          ) : (
            <div className="space-y-3">
              {topItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="font-bold text-xs text-slate-800">{item.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.qty} portions sold</p>
                  </div>
                  <span className="font-extrabold text-xs text-slate-900">₹{item.revenue}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transactions Table */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/70 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <Calendar className="w-4 h-4 text-orange-500" />
              <h2 className="font-extrabold text-slate-900 text-sm">Recent Transactions Log</h2>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Showing {filteredOrders.length} orders
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-slate-700 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200/60">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Table</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.slice(0, 10).map((order) => {
                  const isOnline = (order.payment_mode || "").toLowerCase() === "online";
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">#{order.id}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700">
                          {order.table_number}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold ${
                            isOnline
                              ? "bg-blue-100 text-blue-700 border border-blue-200"
                              : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {isOnline ? "📱 ONLINE" : "💵 CASH"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                            order.status === "Ready"
                              ? "bg-emerald-100 text-emerald-700"
                              : order.status === "Preparing"
                              ? "bg-sky-100 text-sky-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        ₹{order.total_amount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}