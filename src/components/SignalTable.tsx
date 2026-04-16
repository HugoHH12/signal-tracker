"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase, type Signal } from "@/lib/supabase";
import { formatPrice, timeAgo, COIN_COLORS, STATUS_CONFIG } from "@/lib/utils";

type FilterState = {
  coin: string;
  type: string;
  status: string;
};

export default function SignalTable({ initialSignals }: { initialSignals: Signal[] }) {
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [filter, setFilter] = useState<FilterState>({ coin: "ALL", type: "ALL", status: "ALL" });
  const [now, setNow] = useState(Date.now());

  // Update time every 30s
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("signal-tracker-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "signal_tracker" },
        (payload) => {
          setSignals((prev) => [payload.new as Signal, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "signal_tracker" },
        (payload) => {
          setSignals((prev) =>
            prev.map((s) => (s.id === (payload.new as Signal).id ? (payload.new as Signal) : s))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    return signals.filter((s) => {
      if (filter.coin !== "ALL" && s.coin !== filter.coin) return false;
      if (filter.type !== "ALL" && s.signal_type !== filter.type) return false;
      if (filter.status === "ACTIVE" && s.status !== "ACTIVE") return false;
      if (filter.status === "RESOLVED" && s.status === "ACTIVE") return false;
      return true;
    });
  }, [signals, filter]);

  const active = filtered.filter((s) => s.status === "ACTIVE");
  const resolved = filtered.filter((s) => s.status !== "ACTIVE");

  // Stats
  const stats = useMemo(() => {
    const allResolved = signals.filter((s) => s.status !== "ACTIVE");
    const wins = allResolved.filter((s) => s.status === "TP1_HIT" || s.status === "TP2_HIT");
    const winRate = allResolved.length > 0 ? (wins.length / allResolved.length) * 100 : 0;
    const avgPnl =
      allResolved.length > 0
        ? allResolved.reduce((sum, s) => sum + (s.pnl_pct || 0), 0) / allResolved.length
        : 0;
    const activeCount = signals.filter((s) => s.status === "ACTIVE").length;
    return { total: signals.length, activeCount, winRate, avgPnl, resolved: allResolved.length };
  }, [signals]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatBox label="Active" value={stats.activeCount.toString()} color="#22c55e" />
        <StatBox label="Total" value={stats.total.toString()} color="#6b7280" />
        <StatBox
          label="Win Rate"
          value={stats.resolved > 0 ? stats.winRate.toFixed(1) + "%" : "-"}
          color="#3b82f6"
        />
        <StatBox
          label="Avg PnL"
          value={stats.resolved > 0 ? (stats.avgPnl >= 0 ? "+" : "") + stats.avgPnl.toFixed(2) + "%" : "-"}
          color={stats.avgPnl >= 0 ? "#22c55e" : "#ef4444"}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <FilterGroup
          label="Coin"
          options={["ALL", ...Array.from(new Set(signals.map((s) => s.coin))).sort()]}
          value={filter.coin}
          onChange={(v) => setFilter((f) => ({ ...f, coin: v }))}
        />
        <div className="w-px bg-zinc-800 mx-1 hidden sm:block" />
        <FilterGroup
          label="Type"
          options={["ALL", "SWING", "SCALP"]}
          value={filter.type}
          onChange={(v) => setFilter((f) => ({ ...f, type: v }))}
        />
        <div className="w-px bg-zinc-800 mx-1 hidden sm:block" />
        <FilterGroup
          label="Status"
          options={["ALL", "ACTIVE", "RESOLVED"]}
          value={filter.status}
          onChange={(v) => setFilter((f) => ({ ...f, status: v }))}
        />
      </div>

      {/* Active Signals */}
      {active.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">
            Active Signals ({active.length})
          </h2>
          <div className="space-y-2">
            {active.map((s) => (
              <SignalRow key={s.id} signal={s} />
            ))}
          </div>
        </div>
      )}

      {/* Resolved Signals */}
      <div>
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">
          History ({resolved.length})
        </h2>
        {resolved.length === 0 ? (
          <p className="text-zinc-600 text-sm">Noch keine resolved Signale.</p>
        ) : (
          <div className="space-y-2">
            {resolved
              .sort((a, b) => new Date(b.resolved_at || b.created_at).getTime() - new Date(a.resolved_at || a.created_at).getTime())
              .map((s) => (
                <SignalRow key={s.id} signal={s} />
              ))}
          </div>
        )}
      </div>

      {signals.length === 0 && (
        <div className="text-center py-20 text-zinc-600">
          <p className="text-lg">Keine Signale vorhanden.</p>
          <p className="text-sm mt-2">SWING checkt alle 4h, SCALP jede Stunde — 25 Coins</p>
        </div>
      )}
    </div>
  );
}

function calcLivePnl(s: Signal): number | null {
  if (s.status === "ACTIVE" && s.current_price != null) {
    const lev = s.leverage || 2;
    if (s.direction === "LONG") {
      return ((s.current_price - s.entry_price) / s.entry_price) * 100 * lev;
    }
    return ((s.entry_price - s.current_price) / s.entry_price) * 100 * lev;
  }
  return null;
}

function SignalRow({ signal: s }: { signal: Signal }) {
  const [expanded, setExpanded] = useState(false);
  const coinColor = COIN_COLORS[s.coin] || "#888";
  const statusCfg = STATUS_CONFIG[s.status];
  const isLong = s.direction === "LONG";
  const isSwing = s.signal_type === "SWING";
  const isResolved = s.status !== "ACTIVE";

  // Live PNL for ACTIVE, frozen pnl_pct for resolved
  const livePnl = calcLivePnl(s);
  const displayPnl = isResolved ? s.pnl_pct : livePnl;

  return (
    <div
      className={`rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer`}
      style={{ borderLeftWidth: 3, borderLeftColor: isSwing ? "#3b82f6" : "#f97316" }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 p-3">
        {/* Coin + Direction */}
        <div className="flex items-center gap-2 min-w-[120px]">
          <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: coinColor + "22", color: coinColor }}>
            {s.coin}
          </span>
          <span
            className="text-xs font-bold px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: isLong ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
              color: isLong ? "#22c55e" : "#ef4444",
            }}
          >
            {s.direction}
          </span>
          <span
            className="text-[10px] font-bold px-1 py-0.5 rounded uppercase"
            style={{
              backgroundColor: isSwing ? "rgba(59,130,246,0.15)" : "rgba(249,115,22,0.15)",
              color: isSwing ? "#3b82f6" : "#f97316",
            }}
          >
            {s.signal_type}
          </span>
        </div>

        {/* Prices */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs flex-1">
          <PriceLabel label="Entry" value={formatPrice(s.entry_price)} />
          <PriceLabel label="TP1" value={formatPrice(s.tp1_price)} color="#3b82f6" />
          <PriceLabel label="TP2" value={formatPrice(s.tp2_price)} color="#8b5cf6" />
          <PriceLabel label="SL" value={formatPrice(s.sl_price)} color="#ef4444" />
          <span className="text-zinc-500">{s.leverage}x</span>
        </div>

        {/* Status + PnL + Time */}
        <div className="flex items-center gap-3 text-xs">
          {displayPnl != null && (
            <span
              className="font-bold"
              style={{ color: displayPnl >= 0 ? "#22c55e" : "#ef4444" }}
            >
              {displayPnl >= 0 ? "+" : ""}
              {displayPnl.toFixed(2)}%
              {!isResolved && <span className="text-zinc-500 font-normal ml-1 text-[9px]">live</span>}
            </span>
          )}
          <span
            className="px-2 py-0.5 rounded font-bold text-[10px]"
            style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
          >
            {statusCfg.label}
          </span>
          <span className="text-zinc-500 min-w-[50px] text-right">{timeAgo(s.created_at)}</span>
          <svg
            className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {s.current_price != null && (
            <div>
              <span className="text-zinc-500">Aktuell: </span>
              <span className="text-white font-medium">{formatPrice(s.current_price)}</span>
            </div>
          )}
          {s.atr_used != null && (
            <div>
              <span className="text-zinc-500">ATR: </span>
              <span className="text-white font-medium">{formatPrice(s.atr_used)}</span>
            </div>
          )}
          {s.resolved_at && (
            <div>
              <span className="text-zinc-500">Resolved: </span>
              <span className="text-white font-medium">{new Date(s.resolved_at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          )}
          {s.expires_at && (
            <div>
              <span className="text-zinc-500">Expires: </span>
              <span className="text-white font-medium">{new Date(s.expires_at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          )}
          {s.tp1_hit_at && (
            <div>
              <span className="text-zinc-500">TP1 Hit: </span>
              <span className="text-white font-medium">{new Date(s.tp1_hit_at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          )}
          {s.tp2_hit_at && (
            <div>
              <span className="text-zinc-500">TP2 Hit: </span>
              <span className="text-white font-medium">{new Date(s.tp2_hit_at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          )}
          {s.signal_reason && (
            <div className="col-span-2 sm:col-span-4">
              <span className="text-zinc-500">Reason: </span>
              <span className="text-zinc-300">{s.signal_reason}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PriceLabel({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <span className="text-zinc-500">
      {label}: <span style={{ color: color || "#ededed" }} className="font-medium">{value}</span>
    </span>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-zinc-900/50 border border-zinc-800 p-3">
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</div>
      <div className="text-xl font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-zinc-500 uppercase mr-1">{label}:</span>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            value === opt
              ? "bg-zinc-700 text-white"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
