"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type KitchenOrder = {
  id: number;
  status: "placed" | "preparing" | "ready";
  total: number;
  pickup_time: string;
  student_name: string;
  items: Array<{ name: string; quantity: number }>;
};

const columns: Array<{
  status: KitchenOrder["status"];
  title: string;
  action: string;
  next: "preparing" | "ready" | "collected";
}> = [
  { status: "placed", title: "New orders", action: "Start preparing", next: "preparing" },
  { status: "preparing", title: "Preparing", action: "Mark ready", next: "ready" },
  { status: "ready", title: "Ready for pickup", action: "Collected", next: "collected" },
];

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const response = await fetch("/api/kitchen", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load kitchen orders");
      setOrders(result.orders as KitchenOrder[]);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load kitchen orders");
    }
  }, []);

  useEffect(() => {
    void loadOrders();
    const interval = window.setInterval(() => void loadOrders(), 3000);
    return () => window.clearInterval(interval);
  }, [loadOrders]);

  async function advanceOrder(order: KitchenOrder, status: "preparing" | "ready" | "collected") {
    setUpdating(order.id);
    setError("");
    try {
      const response = await fetch("/api/kitchen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update order");
      await loadOrders();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update order");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CampusBite Kitchen</h1>
          <Link href="/" className="mt-1 inline-block text-sm text-slate-400 hover:text-white">
            Back to student view
          </Link>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-sm font-medium text-emerald-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          Live
        </span>
      </header>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-rose-900 bg-rose-950/60 p-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map((column) => {
          const columnOrders = orders.filter((order) => order.status === column.status);
          return (
            <section key={column.status} className="min-h-[65vh] rounded-xl border border-slate-800 bg-slate-900/70">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <h2 className="font-semibold">{column.title}</h2>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  {columnOrders.length}
                </span>
              </div>
              <ul className="space-y-3 p-3">
                {columnOrders.map((order) => (
                  <li key={order.id} className="rounded-lg border border-slate-700 bg-slate-800 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold">Order #{order.id}</h3>
                      <span className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-200">
                        Pickup {order.pickup_time}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{order.student_name}</p>
                    <ul className="mt-3 space-y-1 text-sm text-slate-200">
                      {order.items.map((item, index) => (
                        <li key={`${item.name}-${index}`}>
                          {item.quantity} × {item.name}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-700 pt-3">
                      <span className="text-sm font-semibold">Rs {order.total}</span>
                      <button
                        type="button"
                        disabled={updating === order.id}
                        onClick={() => void advanceOrder(order, column.next)}
                        className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
                      >
                        {updating === order.id ? "Updating…" : column.action}
                      </button>
                    </div>
                  </li>
                ))}
                {columnOrders.length === 0 && (
                  <li className="px-2 py-6 text-center text-sm text-slate-500">No orders</li>
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
