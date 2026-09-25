"use client";

import React, { useEffect, useState } from "react";
import { DollarSign, ShoppingBag, TrendingUp, Utensils, RefreshCw, Calendar, ArrowLeft } from "lucide-react";
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
  created_at: string;
}

export default function ReportsDashboard() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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

  // 1. Key Metrics Calculations
  const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // 2. Dish Popularity (Top Selling Items)
  const itemSalesMap: Record<string, { qty: number; revenue: number }> = {};
  orders.forEach((order) => {
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
    <div className="min-h-screen bg-slate-100 text-slate-800 p-6 font-sans">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-orange-500 rounded-xl text-white shadow">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sales & Revenue Reports</h1>
            <p className="text-xs text-slate-500">Live sales performance and dish analytics</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchSalesData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <a
            href="/"
            className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-semibold underline underline-offset-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>POS Billing</span>
          </a>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">₹{totalRevenue.toLocaleString("en-IN")}</h3>
            <span className="text-[11px] text-emerald-600 font-medium">From all completed & live orders</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Orders</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{totalOrders}</h3>
            <span className="text-[11px] text-slate-400">Total KOTs punched</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Order Value</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">₹{avgOrderValue}</h3>
            <span className="text-[11px] text-orange-600 font-medium">Avg ticket size per table</span>
          </div>
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Selling Dishes Table */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-1">
          <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-slate-100">
            <Utensils className="w-4 h-4 text-orange-500" />
            <h2 className="font-bold text-slate-900 text-sm">Top Selling Dishes</h2>
          </div>

          {topItems.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No orders recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {topItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="font-semibold text-xs text-slate-800">{item.name}</p>
                    <p className="text-[11px] text-slate-400">Sold: {item.qty} units</p>
                  </div>
                  <span className="font-bold text-xs text-slate-900">₹{item.revenue}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders Log */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-orange-500" />
            <h2 className="font-bold text-slate-900 text-sm">Recent Order Transactions</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-800 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Table</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.slice(0, 8).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-semibold text-slate-900">#{order.id}</td>
                    <td className="py-3 px-3">
                      <span className="font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        {order.table_number}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
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
                    <td className="py-3 px-3 text-slate-400">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      ₹{order.total_amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}