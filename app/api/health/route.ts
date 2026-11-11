import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * GET /api/health
 * Shows which settings are missing (never their values), which Supabase project
 * the app is connected to, and whether the menu_items table can be read.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  // GEMINI_MODEL is optional (it has a default), so it is not checked here.
  const names = ["GEMINI_API_KEY", "SUPABASE_URL", "SUPABASE_SECRET_KEY", "APP_PASSCODE"];
  const settings = Object.fromEntries(names.map((n) => [n, Boolean(process.env[n]?.trim())]));

  // The project id is the first part of the Supabase URL. It is not a secret.
  let supabaseProject: string | null = null;
  try {
    supabaseProject = new URL(process.env.SUPABASE_URL ?? "").hostname.split(".")[0] || null;
  } catch {
    supabaseProject = "SUPABASE_URL is not a valid URL";
  }

  let databaseCheck = "skipped (Supabase settings missing)";
  if (settings.SUPABASE_URL && settings.SUPABASE_SECRET_KEY) {
    const { count, error } = await getSupabase()
      .from("menu_items")
      .select("id", { count: "exact", head: true });
    if (error) {
      console.error("[GET /api/health]", error.message);
      databaseCheck = `failed: ${error.message}`;
    } else if (count === 0) {
      databaseCheck = "failed: menu_items table is empty (run seed/menu-items.sql)";
    } else {
      databaseCheck = `ok (${count} menu items found)`;
    }
  }

  return NextResponse.json({
    ok: Object.values(settings).every(Boolean) && databaseCheck.startsWith("ok"),
    settings,
    supabaseProject,
    databaseCheck,
  });
}
