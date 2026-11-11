"use client";

import { useEffect, useState } from "react";

type WalletOrdersData = {
  wallet: { name: string; balance: number } | null;
  orders: Array<{
    id: number;
    status: string;
    total: number;
    pickup_time: string;
    items: string[];
  }>;
};

const statusStyles: Record<string, string> = {
  placed: "bg-sky-400/15 text-sky-200",
  preparing: "bg-amber-400/15 text-amber-200",
  ready: "bg-emerald-400/15 text-emerald-200",
  collected: "bg-slate-400/15 text-slate-300",
  cancelled: "bg-rose-400/15 text-rose-200",
};

export default function WalletOrders({ refreshKey }: Readonly<{ refreshKey: number }>) {
  const [data, setData] = useState<WalletOrdersData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/me", { signal: controller.signal, cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load wallet and orders");
        setData(result as WalletOrdersData);
        setError("");
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name !== "AbortError") {
          setError(loadError.message);
        }
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 5000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [refreshKey]);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-white shadow-sm">
      <div className="px-4 py-4">
        <p className="text-sm text-slate-400">Wallet balance</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h2 className="text-3xl font-semibold">Rs {data?.wallet?.balance ?? "—"}</h2>
          <p className="pb-1 text-sm text-slate-300">{data?.wallet?.name ?? "Student wallet"}</p>
        </div>
      </div>

      <div className="border-t border-slate-800 px-4 py-3">
        <h3 className="font-semibold">My orders today</h3>
        {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
        {!error && data?.orders.length === 0 && (
          <p className="mt-2 text-sm text-slate-400">No orders yet.</p>
        )}
        <ul className="mt-2 divide-y divide-slate-800">
          {data?.orders.map((order) => (
            <li key={order.id} className="py-3 first:pt-1 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Order #{order.id}</span>
                <span
                  className={`rounded-full px-2 py-1 text-xs capitalize ${
                    statusStyles[order.status] ?? "bg-slate-700 text-slate-200"
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-300">
                {order.pickup_time} · {order.items.join(", ")}
              </p>
              <p className="mt-1 text-xs text-slate-400">Total: Rs {order.total}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
