import { getServiceClient } from "@/lib/supabase-server";
import type { NextRequest } from "next/server";

const WEBHOOK_SECRET = process.env.SIGNALS_WEBHOOK_SECRET || "";

function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

function checkAuth(request: NextRequest): boolean {
  if (!WEBHOOK_SECRET) return true; // no secret configured = open
  const auth = request.headers.get("x-webhook-secret");
  return auth === WEBHOOK_SECRET;
}

// POST — Create new signal
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) return unauthorized();

  try {
    const body = await request.json();
    const { coin, direction, signal_type, entry_price, tp1_price, tp2_price, sl_price, current_price, leverage, atr_used, signal_reason, expires_at } = body;

    if (!coin || !direction || !signal_type || !entry_price || !tp1_price || !tp2_price || !sl_price || !expires_at) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("signal_tracker")
      .insert({
        coin: coin.toUpperCase(),
        direction,
        signal_type,
        entry_price,
        tp1_price,
        tp2_price,
        sl_price,
        current_price: current_price || null,
        leverage: leverage || 2,
        atr_used: atr_used || null,
        signal_reason: signal_reason || null,
        status: "ACTIVE",
        expires_at,
      })
      .select()
      .single();

    if (error) {
      console.error("Signal insert error:", error);
      return Response.json({ error: "Failed to create signal" }, { status: 500 });
    }

    return Response.json({ signal: data });
  } catch (error) {
    console.error("Signals API error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

// PATCH — Update signal status
export async function PATCH(request: NextRequest) {
  if (!checkAuth(request)) return unauthorized();

  try {
    const body = await request.json();
    const { id, status, pnl_pct, tp1_hit_at, tp2_hit_at } = body;

    if (!id || !status) {
      return Response.json({ error: "Missing id or status" }, { status: 400 });
    }

    const supabase = getServiceClient();
    const updateData: Record<string, unknown> = { status };
    if (pnl_pct !== undefined) updateData.pnl_pct = pnl_pct;
    if (status !== "ACTIVE" && status !== "TP1_HIT") updateData.resolved_at = new Date().toISOString();
    if (tp1_hit_at) updateData.tp1_hit_at = tp1_hit_at;
    if (tp2_hit_at) updateData.tp2_hit_at = tp2_hit_at;

    const { data, error } = await supabase
      .from("signal_tracker")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Signal update error:", error);
      return Response.json({ error: "Failed to update signal" }, { status: 500 });
    }

    return Response.json({ signal: data });
  } catch (error) {
    console.error("Signals PATCH error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
