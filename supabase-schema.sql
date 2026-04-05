-- Signal Tracker Tabelle (separate von bestehender signals Tabelle)
-- Bitte im Supabase SQL Editor ausfuehren: https://supabase.com/dashboard/project/ufozbadhugdpaukvvitm/sql

CREATE TABLE public.signal_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coin text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
  signal_type text NOT NULL CHECK (signal_type IN ('SWING', 'SCALP')),
  entry_price numeric NOT NULL,
  tp1_price numeric NOT NULL,
  tp2_price numeric NOT NULL,
  sl_price numeric NOT NULL,
  current_price numeric,
  leverage integer NOT NULL DEFAULT 2,
  atr_used numeric,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (
    status IN ('ACTIVE', 'TP1_HIT', 'TP2_HIT', 'SL_HIT', 'EXPIRED')
  ),
  pnl_pct numeric,
  signal_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  resolved_at timestamptz,
  tp1_hit_at timestamptz,
  tp2_hit_at timestamptz
);

-- Oeffentlicher Lesezugriff (kein Auth noetig)
ALTER TABLE public.signal_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for signal_tracker"
  ON public.signal_tracker FOR SELECT
  USING (true);

-- Realtime aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE public.signal_tracker;

-- Indexes
CREATE INDEX idx_tracker_status ON public.signal_tracker(status);
CREATE INDEX idx_tracker_created_at ON public.signal_tracker(created_at DESC);
CREATE INDEX idx_tracker_coin ON public.signal_tracker(coin);
CREATE INDEX idx_tracker_signal_type ON public.signal_tracker(signal_type);
CREATE INDEX idx_tracker_expires_at ON public.signal_tracker(expires_at);
