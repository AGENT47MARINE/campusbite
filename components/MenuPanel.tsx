"use client";

import { useEffect, useState } from "react";

type MenuItem = {
  id: number;
  name: string;
  category: "meal" | "snack" | "drink" | "sweet";
  price: number;
  is_veg: boolean;
  stock: number;
  description: string;
};

const groups: Array<{ category: MenuItem["category"]; title: string }> = [
  { category: "meal", title: "Meals" },
  { category: "snack", title: "Snacks" },
  { category: "sweet", title: "Sweets" },
  { category: "drink", title: "Drinks" },
];

export default function MenuPanel({ refreshKey }: Readonly<{ refreshKey: number }>) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/menu", { signal: controller.signal, cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load today's menu");
        setItems(result.items as MenuItem[]);
        setError("");
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name !== "AbortError") {
          setError(loadError.message);
        }
      } finally {
        setLoading(false);
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
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold">Today&apos;s menu</h2>
        <p className="text-xs text-slate-500">Live availability · Prices in rupees</p>
      </div>
      {error && <p className="p-4 text-sm text-red-600">{error}</p>}
      {!error && loading && <p className="p-4 text-sm text-slate-500">Loading menu…</p>}
      {!error && !loading && items.length === 0 && (
        <p className="p-4 text-sm text-slate-500">No menu items available.</p>
      )}
      {!error &&
        !loading &&
        groups.map(({ category, title }) => {
          const groupItems = items.filter((item) => item.category === category);
          if (groupItems.length === 0) return null;
          return (
            <div key={category}>
              <h3 className="bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {title}
              </h3>
              <ul className="divide-y divide-slate-100">
                {groupItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        aria-label={item.is_veg ? "Vegetarian" : "Non-vegetarian"}
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          item.is_veg ? "bg-emerald-500" : "bg-red-500"
                        }`}
                      />
                      <span className="truncate text-sm font-medium text-slate-800">{item.name}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {item.stock === 0 ? (
                        <span className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">Sold out</span>
                      ) : item.stock <= 3 ? (
                        <span className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                          Only {item.stock} left
                        </span>
                      ) : null}
                      <span className="text-sm font-semibold text-slate-800">Rs {item.price}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
    </section>
  );
}
