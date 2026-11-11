import { NextResponse } from "next/server";
import { CURRENT_STUDENT_ID, formatSlot } from "@/lib/campusbite";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = getSupabase();
    const [walletResult, ordersResult] = await Promise.all([
      supabase
        .from("wallets")
        .select("name, balance")
        .eq("student_id", CURRENT_STUDENT_ID)
        .maybeSingle(),
      supabase
        .from("orders")
        .select("id, status, total, pickup_slots(slot_time), order_items(menu_items(name))")
        .eq("student_id", CURRENT_STUDENT_ID)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (walletResult.error) throw walletResult.error;
    if (ordersResult.error) throw ordersResult.error;

    const orders = ordersResult.data.map((order) => {
      const slot = firstRelation(order.pickup_slots);
      return {
        id: order.id,
        status: order.status,
        total: order.total,
        pickup_time: slot ? formatSlot(slot.slot_time) : "Unavailable",
        items: order.order_items
          .map((item) => firstRelation(item.menu_items)?.name)
          .filter((name): name is string => Boolean(name)),
      };
    });

    return NextResponse.json({ wallet: walletResult.data, orders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load student details";
    console.error("[GET /api/me]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function firstRelation<T>(value: T | T[] | null): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}
