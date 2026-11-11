import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from("menu_items")
      .select("id, name, category, price, is_veg, stock, description")
      .order("category")
      .order("price");
    if (error) {
      console.error("[GET /api/menu]", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ items: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load menu";
    console.error("[GET /api/menu]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
