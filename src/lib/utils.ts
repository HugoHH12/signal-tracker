export function formatPrice(price: number): string {
  if (price >= 10000) return "$" + price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (price >= 100) return "$" + price.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (price >= 1) return "$" + price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 0.01) return "$" + price.toFixed(3);
  return "$" + price.toFixed(5);
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export const COIN_COLORS: Record<string, string> = {
  BTC: "#f7931a",
  ETH: "#627eea",
  SOL: "#9945ff",
  XRP: "#23292f",
  DOGE: "#ba9934",
  BNB: "#f3ba2f",
  TAO: "#00d4aa",
  HYPE: "#8247e5",
  AVAX: "#e84142",
  ADA: "#0033ad",
  SUI: "#4ba1f0",
  LINK: "#2a82ec",
  ENA: "#7252df",
  AAVE: "#2b99b6",
  FIL: "#0090e4",
  DOT: "#e6007a",
  NEAR: "#000000",
  FTM: "#13b5ec",
  FET: "#232344",
  WLD: "#333333",
  LTC: "#345d9d",
  ALGO: "#000000",
  UNI: "#ff007a",
  ARB: "#28a0f0",
  RENDER: "#333333",
};

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: "ACTIVE", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  TP1_HIT: { label: "TP1 HIT", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  TP2_HIT: { label: "TP2 HIT", color: "#8b5cf6", bg: "rgba(139,92,246,0.15)" },
  SL_HIT: { label: "SL HIT", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  EXPIRED: { label: "EXPIRED", color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
};
