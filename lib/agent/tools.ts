import "server-only";
import { z } from "zod";
import { defineTool, type AgentTool } from "./defineTool";
import { CURRENT_STUDENT_ID, formatSlot } from "../campusbite";
import { getSupabase } from "../supabase";

const getMenu = defineTool({
  name: "getMenu",
  description:
    "Use this when the student wants to see available food or when checking items, prices, stock, categories, or dietary options before ordering.",
  schema: z.object({
    category: z.enum(["meal", "snack", "drink", "sweet"]).optional(),
    veg_only: z.boolean().optional(),
    max_price: z.number().int().optional(),
  }),
  run: async ({ category, veg_only, max_price }) => {
    let query = getSupabase()
      .from("menu_items")
      .select("id, name, category, price, is_veg, stock, description")
      .gt("stock", 0)
      .order("category")
      .order("price");

    if (category) query = query.eq("category", category);
    if (veg_only) query = query.eq("is_veg", true);
    if (max_price !== undefined) query = query.lte("price", max_price);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  },
});

const getWalletBalance = defineTool({
  name: "getWalletBalance",
  description: "Use this when checking the logged-in student's name or available wallet balance.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("wallets")
      .select("name, balance")
      .eq("student_id", CURRENT_STUDENT_ID)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
});

const getPickupSlots = defineTool({
  name: "getPickupSlots",
  description: "Use this when checking which pickup times still have free capacity.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("pickup_slots")
      .select("id, slot_time, capacity, booked")
      .order("slot_time");
    if (error) throw new Error(error.message);

    return data
      .map((slot) => ({
        slot_id: slot.id,
        time: formatSlot(slot.slot_time),
        free: slot.capacity - slot.booked,
      }))
      .filter((slot) => slot.free > 0);
  },
});

const getMyOrders = defineTool({
  name: "getMyOrders",
  description: "Use this when the student wants to check their recent orders or their order status.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("orders")
      .select("id, status, total, pickup_slots(slot_time), order_items(menu_items(name))")
      .eq("student_id", CURRENT_STUDENT_ID)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);

    return data.map((order) => {
      const pickupSlot = firstRelation(order.pickup_slots);
      return {
        id: order.id,
        status: order.status,
        total: order.total,
        pickup_time: pickupSlot ? formatSlot(pickupSlot.slot_time) : null,
        items: order.order_items
          .map((item) => firstRelation(item.menu_items)?.name)
          .filter((name): name is string => Boolean(name)),
      };
    });
  },
});

const placeOrder = defineTool({
  name: "placeOrder",
  description: "Use this when the student has clearly chosen items and a pickup slot and is ready to place the order.",
  writes: true,
  schema: z.object({
    items: z
      .array(
        z.object({
          menu_item_id: z.number().int().positive(),
          quantity: z.number().int().min(1).max(5),
        })
      )
      .min(1),
    slot_id: z.number().int().positive(),
  }),
  run: async ({ items, slot_id }) => {
    const { data, error } = await getSupabase().rpc("place_order", {
      p_student_id: CURRENT_STUDENT_ID,
      p_slot_id: slot_id,
      p_items: items,
    });
    if (error) throw new Error(error.message);
    return data;
  },
});

const cancelOrder = defineTool({
  name: "cancelOrder",
  description: "Use this when the student clearly asks to cancel one of their orders.",
  writes: true,
  schema: z.object({
    order_id: z.number().int().positive(),
  }),
  run: async ({ order_id }) => {
    const { data, error } = await getSupabase().rpc("cancel_order", {
      p_student_id: CURRENT_STUDENT_ID,
      p_order_id: order_id,
    });
    if (error) throw new Error(error.message);
    return data;
  },
});

export const tools: AgentTool[] = [
  getMenu,
  getWalletBalance,
  getPickupSlots,
  getMyOrders,
  placeOrder,
  cancelOrder,
];

function firstRelation<T>(value: T | T[] | null): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}
