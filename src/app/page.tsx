import { createClient } from "@supabase/supabase-js";
import type { Signal } from "@/lib/supabase";
import SignalTable from "@/components/SignalTable";

async function getSignals(): Promise<Signal[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("signal_tracker")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Failed to fetch signals:", error);
    return [];
  }

  return (data as Signal[]) || [];
}

export const revalidate = 0;

export default async function Home() {
  const signals = await getSignals();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight">Harald Signal Tracker</h1>
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span>V3b SWING + V5 SCALP</span>
            <span>2h Interval</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 py-6">
        <SignalTable initialSignals={signals} />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[10px] text-zinc-600">
          <span>BTC / ETH / SOL / TAO / XRP</span>
          <span>
            <span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ backgroundColor: "#3b82f6" }} />
            SWING
            <span className="inline-block w-2 h-2 rounded-sm ml-3 mr-1" style={{ backgroundColor: "#f97316" }} />
            SCALP
          </span>
        </div>
      </footer>
    </div>
  );
}
