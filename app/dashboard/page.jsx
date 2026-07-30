"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Zap,
  TrendingUp,
  ShoppingCart,
  ArrowLeft,
  RefreshCw,
  CreditCard,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
} from "lucide-react";

/* ─── Constants ────────────────────────────────────────────────────── */
const TOKENS_PER_PAISA = 50;
const LOW_BALANCE_THRESHOLD = 50_000; // 50,000 tokens = ₹10

/* ─── Auth Guard ────────────────────────────────────────────────────── */
function IsAuthenticated({ children }) {
  const router = useRouter();
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      queueMicrotask(() => setIsAuth(true));
    }
  }, [router]);

  if (!isAuth) return null;
  return <>{children}</>;
}

/* ─── Helpers ───────────────────────────────────────────────────────── */
function tokensToRupees(tokens) {
  return (tokens / TOKENS_PER_PAISA / 100).toFixed(2);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortDate(isoDate) {
  // isoDate is "YYYY-MM-DD"
  const [, m, d] = isoDate.split("-");
  return `${d}/${m}`;
}

/* ─── SVG Bar Chart ─────────────────────────────────────────────────── */
function TokenBarChart({ data }) {
  // Build a full 30-day grid so bars are evenly spaced even with sparse data
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
    const found = data?.find((r) => r.date === key);
    return { date: key, tokensUsed: found?.tokensUsed ?? 0 };
  });

  const hasAnyUsage = days.some((d) => d.tokensUsed > 0);

  if (!hasAnyUsage) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No usage data for the last 30 days.
      </div>
    );
  }

  // Chart dimensions
  const CHART_W = 660;
  const CHART_H = 180;
  const PAD_TOP  = 16;
  const PAD_BOT  = 28;  // space for x-axis date labels
  const PAD_LEFT = 52;  // space for y-axis labels
  const PAD_RIGHT = 8;

  const innerW = CHART_W - PAD_LEFT - PAD_RIGHT;
  const innerH = CHART_H - PAD_TOP - PAD_BOT;

  const maxVal = Math.max(...days.map((d) => d.tokensUsed), 1);

  // Fixed bar width — never exceeds 20px regardless of data length
  const totalBars  = days.length;
  const slotW      = innerW / totalBars;
  const barW       = Math.min(20, Math.max(4, slotW - 4));

  // Y-axis: 4 grid lines at 0%, 33%, 66%, 100%
  const yTicks = [0, 0.33, 0.66, 1];

  const fmtTokens = (n) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`;
    return String(n);
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full"
        style={{ minWidth: "360px" }}
        aria-label="Daily token usage bar chart"
      >
        <defs>
          {/* Gradient for normal bars */}
          <linearGradient id="bar-gradient-indigo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.5" />
          </linearGradient>
          {/* Gradient for high-usage bars */}
          <linearGradient id="bar-gradient-amber" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#f59e0b" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* ── Y-axis grid lines + labels ── */}
        {yTicks.map((f) => {
          const y = PAD_TOP + innerH - f * innerH;
          const label = fmtTokens(Math.round(f * maxVal));
          return (
            <g key={f}>
              <line
                x1={PAD_LEFT}
                y1={y}
                x2={CHART_W - PAD_RIGHT}
                y2={y}
                stroke="rgba(148,163,184,0.12)"
                strokeWidth="1"
                strokeDasharray={f === 0 ? "0" : "4 4"}
              />
              <text
                x={PAD_LEFT - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={9}
                fill="hsla(0, 0%, 100%, 1.00)"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* ── Bars ── */}
        {days.map((d, i) => {
          const pct  = d.tokensUsed / maxVal;
          const barH = Math.max(d.tokensUsed > 0 ? 3 : 0, pct * innerH);
          const barX = PAD_LEFT + i * slotW + (slotW - barW) / 2;
          const barY = PAD_TOP + innerH - barH;
          const isHigh = pct > 0.8;

          // Date labels — show every 5th day
          const showLabel = i % 5 === 0 || i === days.length - 1;
          const labelDate = shortDate(d.date);

          return (
            <g key={d.date}>
              {d.tokensUsed > 0 && (
                <rect
                  x={barX}
                  y={barY}
                  width={barW}
                  height={barH}
                  rx={3}
                  ry={3}
                  fill={`url(#bar-gradient-${isHigh ? "amber" : "indigo"})`}
                >
                  <title>{`${d.date}: ${d.tokensUsed.toLocaleString()} tokens`}</title>
                </rect>
              )}
              {showLabel && (
                <text
                  x={barX + barW / 2}
                  y={CHART_H - 6}
                  textAnchor="middle"
                  fontSize={9}
                  fill="rgba(255, 255, 255, 1)"
                >
                  {labelDate}
                </text>
              )}
            </g>
          );
        })}

        {/* ── Baseline ── */}
        <line
          x1={PAD_LEFT}
          y1={PAD_TOP + innerH}
          x2={CHART_W - PAD_RIGHT}
          y2={PAD_TOP + innerH}
          stroke="rgba(148,163,184,0.2)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

/* ─── Summary Card ──────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, tokens, rupees, color, warn }) {
  // Explicit color maps — avoids Tailwind purging dynamic class strings
  const iconBg = {
    indigo: "bg-indigo-500/20",
    emerald: "bg-emerald-500/20",
    purple: "bg-purple-500/20",
  };
  const iconColor = {
    indigo: "text-indigo-400",
    emerald: "text-emerald-400",
    purple: "text-purple-400",
  };

  return (
    <div
      className={`rounded-2xl border p-5 flex flex-col gap-3 shadow-sm transition-all hover:shadow-md ${
        warn
          ? "bg-amber-950/60 border-amber-700/40"
          : "bg-slate-900/60 border-slate-800/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
          {label}
        </span>
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            warn ? "bg-amber-500/20" : iconBg[color] ?? "bg-slate-700/40"
          }`}
        >
          <Icon
            className={`w-4 h-4 ${
              warn ? "text-amber-400" : iconColor[color] ?? "text-slate-400"
            }`}
          />
        </div>
      </div>
      <div>
        <div
          className={`text-2xl font-black font-mono tracking-tight ${
            warn ? "text-amber-300" : "text-white"
          }`}
        >
          {tokens.toLocaleString()}
        </div>
        <div className="text-xs text-slate-400 mt-0.5">≈ ₹{rupees}</div>
      </div>
    </div>
  );
}


/* ─── Page ──────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/usage-summary", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Error ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <IsAuthenticated>
      <div className="min-h-screen bg-[#090d16] text-slate-100 font-sans">
        {/* ── Top Nav ── */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#090d16]/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Back to chat"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/20">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-extrabold text-white tracking-tight">
                  Usage Dashboard
                </h1>
                <p className="text-[10px] text-slate-400">
                  1 paisa = 50 tokens · ₹1 = 5,000 tokens
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSummary}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              href="/checkout"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/20"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Buy Tokens</span>
            </Link>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {/* ── Loading ── */}
          {isLoading && !data && (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-slate-400">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Loading your usage data…</span>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-950/70 border border-rose-700/40 text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {data && (
            <>
              {/* ── Low balance banner ── */}
              {data.lowBalanceWarning && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-950/70 border border-amber-700/40 text-amber-100 animate-fade-in">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">Low token balance</p>
                    <p className="text-xs text-amber-300 mt-0.5">
                      You have less than ₹10 worth of tokens remaining. Recharge to
                      avoid interruptions.
                    </p>
                  </div>
                  <Link
                    href="/checkout"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all shrink-0"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Recharge
                  </Link>
                </div>
              )}

              {/* ── Stat Cards ── */}
              <section>
                <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-4">
                  Balance Overview
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard
                    icon={Zap}
                    label="Remaining Tokens"
                    tokens={data.remainingTokens}
                    rupees={data.rupees?.remaining ?? tokensToRupees(data.remainingTokens)}
                    color="indigo"
                    warn={data.lowBalanceWarning}
                  />
                  <StatCard
                    icon={ShoppingCart}
                    label="Lifetime Purchased"
                    tokens={data.tokensLifetimePurchased}
                    rupees={data.rupees?.purchased ?? tokensToRupees(data.tokensLifetimePurchased)}
                    color="emerald"
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Lifetime Used"
                    tokens={data.tokensLifetimeUsed}
                    rupees={data.rupees?.used ?? tokensToRupees(data.tokensLifetimeUsed)}
                    color="purple"
                  />
                </div>
              </section>

              {/* ── Usage Chart ── */}
              <section className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-sm font-extrabold text-white">
                      Daily Token Consumption
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Last 30 days — hover bars for exact counts
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>30 days</span>
                  </div>
                </div>
                <TokenBarChart data={data.dailyUsage} />

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-indigo-500/80 inline-block" />
                    Normal usage
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-amber-500/80 inline-block" />
                    High usage day
                  </div>
                </div>
              </section>

              {/* ── Transaction Table ── */}
              <section>
                <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-4">
                  Recent Transactions
                </h2>

                {data.recentTransactions.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-8 text-center text-slate-500 text-sm">
                    No transactions yet.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-4 gap-2 px-5 py-3 border-b border-slate-800/60 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
                      <span>Type</span>
                      <span className="text-right">Tokens</span>
                      <span className="text-right">Balance After</span>
                      <span className="text-right">Date</span>
                    </div>

                    {/* Rows */}
                    {data.recentTransactions.map((tx, i) => {
                      const isPurchase = tx.type === "purchase";
                      return (
                        <div
                          key={tx._id || i}
                          className={`grid grid-cols-4 gap-2 items-center px-5 py-3.5 text-sm transition-colors hover:bg-slate-800/40 ${
                            i < data.recentTransactions.length - 1
                              ? "border-b border-slate-800/40"
                              : ""
                          }`}
                        >
                          {/* Type badge */}
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                isPurchase
                                  ? "bg-emerald-500/15"
                                  : "bg-indigo-500/15"
                              }`}
                            >
                              {isPurchase ? (
                                <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <ArrowDownCircle className="w-4 h-4 text-indigo-400" />
                              )}
                            </div>
                            <span
                              className={`font-semibold text-xs capitalize ${
                                isPurchase
                                  ? "text-emerald-400"
                                  : "text-indigo-400"
                              }`}
                            >
                              {tx.type}
                            </span>
                          </div>

                          {/* Tokens */}
                          <div className="text-right font-mono text-xs font-bold text-slate-200">
                            <span
                              className={
                                isPurchase ? "text-emerald-400" : "text-slate-200"
                              }
                            >
                              {isPurchase ? "+" : "-"}
                              {tx.tokensUsed.toLocaleString()}
                            </span>
                            <span className="text-slate-500 ml-0.5 font-normal">
                              tkn
                            </span>
                          </div>

                          {/* Balance after */}
                          <div className="text-right font-mono text-xs text-slate-400">
                            {tx.balanceAfter.toLocaleString()}
                          </div>

                          {/* Date */}
                          <div className="text-right text-[11px] text-slate-500">
                            {formatDate(tx.createdAt)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* ── Footer note ── */}
              <p className="text-center text-[11px] text-slate-600 pb-4">
                Conversion rate: 1 paisa = 50 tokens · ₹1 = 5,000 tokens ·
                Low-balance threshold: ₹10 = 50,000 tokens
              </p>
            </>
          )}
        </main>
      </div>
    </IsAuthenticated>
  );
}
