import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Signal = {
  id: string;
  coin: string;
  direction: "LONG" | "SHORT";
  signal_type: "SWING" | "SCALP";
  entry_price: number;
  tp1_price: number;
  tp2_price: number;
  sl_price: number;
  current_price: number | null;
  leverage: number;
  atr_used: number | null;
  status: "ACTIVE" | "TP1_HIT" | "TP2_HIT" | "SL_HIT" | "EXPIRED";
  pnl_pct: number | null;
  signal_reason: string | null;
  created_at: string;
  expires_at: string;
  resolved_at: string | null;
  tp1_hit_at: string | null;
  tp2_hit_at: string | null;
};
