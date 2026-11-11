import { NextResponse } from "next/server";
import { z } from "zod";
import { formatSlot } from "@/lib/campusbite";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const kitchenUpdateSchema = z.object({
  order_id: z.number().int().positive(),
  status: z.enum(["placed", "preparing", "ready", "collected", "cancelled"]),
});

const previousStatus: Record<z.infer<typeof kitchenUpdateSchema>["status"], string | null> = {
  placed: null,
  preparing: "placed",
  ready: "preparing",
  collected: "ready",
  cancelled: null,
};

export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from("orders")
      .select("id, status, total, created_at, pickup_slots(slot_time), wallets(name), order_items(quantity, menu_items(name))")
      .in("status", ["placed", "preparing", "ready"])
      .order("created_at", { ascending: true });
    if (error) throw error;

    const orders = data.map((order) => {
      const slot = firstRelation(order.pickup_slots);
      const student = firstRelation(order.wallets);
      return {
        id: order.id,
        status: order.status,
        total: order.total,
        pickup_time: slot ? formatSlot(slot.slot_time) : "Unavailable",
        student_name: student?.name ?? "Student",
        items: order.order_items.map((item) => ({
          name: firstRelation(item.menu_items)?.name ?? "Unknown item",
          quantity: item.quantity,
        })),
      };
    });

    return NextResponse.json({ orders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load kitchen orders";
    console.error("[GET /api/kitchen]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = kitchenUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order update", details: parsed.error.issues }, { status: 400 });
  }

  const { order_id, status } = parsed.data;
  try {
    const supabase = getSupabase();
    const { data: order, error: readError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", order_id)
      .maybeSingle();
    if (readError) throw readError;
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const expectedPreviousStatus = previousStatus[status];
    if (!expectedPreviousStatus || order.status !== expectedPreviousStatus) {
      return NextResponse.json({ error: `Cannot change ${order.status} to ${status}` }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", order_id)
      .eq("status", expectedPreviousStatus)
      .select("id, status")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Order status changed; refresh and try again" }, { status: 409 });
    return NextResponse.json({ order: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update order";
    console.error("[POST /api/kitchen]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function firstRelation<T>(value: T | T[] | null): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}
