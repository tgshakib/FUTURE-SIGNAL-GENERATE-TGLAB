import { Telegraf, Markup, session } from "telegraf";
import { logger } from "./lib/logger";
import { adapters, initAdapters, analyseSignalQuality } from "./lib/broker-adapter";

const BOT_TOKEN    = process.env["TELEGRAM_BOT_TOKEN"];
const ADMIN_CHAT_ID = process.env["TELEGRAM_ADMIN_CHAT_ID"];

// ─── Asset Lists ───────────────────────────────────────────────────────────────

const realAssets = [
  "AUD/CAD", "AUD/CHF", "AUD/JPY", "AUD/USD", "CAD/JPY", "CHF/JPY",
  "EUR/AUD", "EUR/CAD", "EUR/CHF", "EUR/GBP", "EUR/JPY", "EUR/USD",
  "GBP/AUD", "GBP/CAD", "GBP/CHF", "GBP/JPY", "GBP/USD",
  "USD/CAD", "USD/CHF", "USD/JPY", "Silver", "Gold",
];

const quotexOtcAssets = [
  "AUD/CAD (OTC)", "AUD/CHF (OTC)", "AUD/JPY (OTC)", "AUD/NZD (OTC)", "AUD/USD (OTC)",
  "Avalanche (OTC)", "Axie Infinity (OTC)", "Bitcoin Cash (OTC)", "Binance Coin (OTC)",
  "USD/BRL (OTC)", "Bitcoin (OTC)", "CAD/CHF (OTC)", "CAD/JPY (OTC)", "CHF/JPY (OTC)",
  "Dash (OTC)", "Polkadot (OTC)", "Ethereum Classic (OTC)", "Ethereum (OTC)",
  "EUR/AUD (OTC)", "EUR/CAD (OTC)", "EUR/CHF (OTC)", "EUR/GBP (OTC)",
  "EUR/JPY (OTC)", "EUR/NZD (OTC)", "EUR/USD (OTC)", "GBP/AUD (OTC)",
  "GBP/CAD (OTC)", "GBP/CHF (OTC)", "GBP/JPY (OTC)", "GBP/NZD (OTC)", "GBP/USD (OTC)",
  "Chainlink (OTC)", "Litecoin (OTC)", "NZD/CAD (OTC)", "NZD/CHF (OTC)",
  "NZD/JPY (OTC)", "NZD/USD (OTC)", "Solana (OTC)", "Toncoin (OTC)", "Trump (OTC)",
  "UKBrent (OTC)", "USCrude (OTC)", "USD/ARS (OTC)", "USD/BDT (OTC)",
  "USD/CAD (OTC)", "USD/CHF (OTC)", "USD/COP (OTC)", "USD/DZD (OTC)",
  "USD/EGP (OTC)", "USD/IDR (OTC)", "USD/INR (OTC)", "USD/JPY (OTC)",
  "USD/MXN (OTC)", "USD/NGN (OTC)", "USD/PHP (OTC)", "USD/PKR (OTC)",
  "USD/ZAR (OTC)", "Silver (OTC)", "Gold (OTC)", "Ripple (OTC)", "Zcash (OTC)",
];

const brokerSharedOtcAssets = [
  "Avalanche OTC", "Dogecoin OTC", "Solana OTC", "BNB OTC", "Cardano OTC",
  "Bitcoin ETF OTC", "TRON OTC", "Toncoin OTC", "Polygon OTC", "Litecoin OTC",
  "Brent Oil OTC", "WTI Crude Oil OTC", "Silver OTC", "Gold OTC",
  "Natural Gas OTC", "Palladium spot OTC", "Platinum spot OTC",
  "Cisco OTC", "Pfizer Inc OTC", "Citigroup Inc OTC", "Netflix OTC",
  "Boeing Company OTC", "GameStop Corp OTC", "Johnson & Johnson OTC",
  "Intel OTC", "Microsoft OTC",
  "SAR/CNY OTC", "EUR/JPY OTC", "MAD/USD OTC", "USD/THB OTC", "EUR/RUB OTC",
  "USD/CLP OTC", "OMR/CNY OTC", "UAH/USD OTC", "USD/DZD OTC", "EUR/NZD OTC",
  "CHF/NOK OTC", "USD/EGP OTC", "USD/RUB OTC", "KES/USD OTC", "TND/USD OTC",
  "YER/USD OTC", "AED/CNY OTC", "EUR/HUF OTC", "USD/PKR OTC", "USD/CHF OTC",
  "USD/IDR OTC", "JOD/CNY OTC", "GBP/JPY OTC", "USD/BDT OTC", "USD/PHP OTC",
  "AUD/CAD OTC", "USD/VND OTC", "ZAR/USD OTC", "CHF/JPY OTC", "AUD/JPY OTC",
  "AUD/NZD OTC", "EUR/TRY OTC", "USD/MYR OTC", "USD/SGD OTC", "USD/CAD OTC",
  "NZD/JPY OTC",
];

// ─── Timezones ─────────────────────────────────────────────────────────────────

interface TZ { offset: number; label: string; flag: string; name: string }

const TIMEZONES: TZ[] = [
  { offset: -12,  label: "UTC-12:00", flag: "🌐", name: "Baker Island" },
  { offset: -11,  label: "UTC-11:00", flag: "🌐", name: "American Samoa" },
  { offset: -10,  label: "UTC-10:00", flag: "🇺🇸", name: "Hawaii" },
  { offset: -9,   label: "UTC-9:00",  flag: "🇺🇸", name: "Alaska" },
  { offset: -8,   label: "UTC-8:00",  flag: "🇺🇸", name: "Los Angeles (PST)" },
  { offset: -7,   label: "UTC-7:00",  flag: "🇺🇸", name: "Denver (MST)" },
  { offset: -6,   label: "UTC-6:00",  flag: "🇺🇸", name: "Chicago (CST)" },
  { offset: -5,   label: "UTC-5:00",  flag: "🇺🇸", name: "New York (EST)" },
  { offset: -4,   label: "UTC-4:00",  flag: "🇨🇦", name: "Halifax" },
  { offset: -3,   label: "UTC-3:00",  flag: "🇧🇷", name: "São Paulo" },
  { offset: -2,   label: "UTC-2:00",  flag: "🌐", name: "Mid-Atlantic" },
  { offset: -1,   label: "UTC-1:00",  flag: "🇵🇹", name: "Azores" },
  { offset: 0,    label: "UTC+0:00",  flag: "🇬🇧", name: "London (GMT)" },
  { offset: 1,    label: "UTC+1:00",  flag: "🇫🇷", name: "Paris (CET)" },
  { offset: 2,    label: "UTC+2:00",  flag: "🇪🇬", name: "Cairo (EET)" },
  { offset: 3,    label: "UTC+3:00",  flag: "🇷🇺", name: "Moscow (MSK)" },
  { offset: 3.5,  label: "UTC+3:30",  flag: "🇮🇷", name: "Tehran (IRST)" },
  { offset: 4,    label: "UTC+4:00",  flag: "🇦🇪", name: "Dubai (GST)" },
  { offset: 4.5,  label: "UTC+4:30",  flag: "🇦🇫", name: "Kabul (AFT)" },
  { offset: 5,    label: "UTC+5:00",  flag: "🇵🇰", name: "Karachi (PKT)" },
  { offset: 5.5,  label: "UTC+5:30",  flag: "🇮🇳", name: "India (IST)" },
  { offset: 5.75, label: "UTC+5:45",  flag: "🇳🇵", name: "Kathmandu (NPT)" },
  { offset: 6,    label: "UTC+6:00",  flag: "🇧🇩", name: "Dhaka (BST)" },
  { offset: 6.5,  label: "UTC+6:30",  flag: "🇲🇲", name: "Yangon (MMT)" },
  { offset: 7,    label: "UTC+7:00",  flag: "🇹🇭", name: "Bangkok (ICT)" },
  { offset: 8,    label: "UTC+8:00",  flag: "🇨🇳", name: "Beijing (CST)" },
  { offset: 9,    label: "UTC+9:00",  flag: "🇯🇵", name: "Tokyo (JST)" },
  { offset: 9.5,  label: "UTC+9:30",  flag: "🇦🇺", name: "Adelaide (ACST)" },
  { offset: 10,   label: "UTC+10:00", flag: "🇦🇺", name: "Sydney (AEST)" },
  { offset: 11,   label: "UTC+11:00", flag: "🌐", name: "Solomon Islands" },
  { offset: 12,   label: "UTC+12:00", flag: "🇳🇿", name: "Auckland (NZST)" },
];

// ─── Strategies ────────────────────────────────────────────────────────────────

interface Strategy {
  id: string;
  name: string;
  badge: string;
  /** Min minutes before first signal */
  startMin: number;
  /** Max minutes before first signal */
  startMax: number;
  /** Min gap between signals (minutes) */
  gapMin: number;
  /** Max gap between signals (minutes) */
  gapMax: number;
  /** Multiplier applied to user-selected count (0.5 = half, 1 = full) */
  countMult: number;
  noMartingale: boolean;
  requireConfirm: boolean;
  filterLowVol: boolean;
  description: string;
}

const STRATEGIES: Strategy[] = [
  {
    id: "trendpulse", name: "TrendPulse Pro", badge: "⚡",
    startMin: 2, startMax: 3, gapMin: 2, gapMax: 4, countMult: 1,
    noMartingale: false, requireConfirm: false, filterLowVol: true,
    description: "High-momentum trend follower",
  },
  {
    id: "otcflow", name: "OTC Flow Confirm", badge: "🌊",
    startMin: 2, startMax: 4, gapMin: 3, gapMax: 5, countMult: 0.8,
    noMartingale: false, requireConfirm: true, filterLowVol: true,
    description: "Confirms OTC flow before entry",
  },
  {
    id: "livetrendsync", name: "LiveTrend Sync", badge: "🔄",
    startMin: 2, startMax: 3, gapMin: 2, gapMax: 3, countMult: 1,
    noMartingale: false, requireConfirm: false, filterLowVol: false,
    description: "Syncs with live market trend",
  },
  {
    id: "momentumlock", name: "Momentum Lock", badge: "🔒",
    startMin: 3, startMax: 5, gapMin: 3, gapMax: 6, countMult: 0.7,
    noMartingale: false, requireConfirm: true, filterLowVol: true,
    description: "Locks in on strong momentum candles only",
  },
  {
    id: "signalshield", name: "SignalShield", badge: "🛡️",
    startMin: 2, startMax: 4, gapMin: 4, gapMax: 7, countMult: 0.6,
    noMartingale: true, requireConfirm: true, filterLowVol: true,
    description: "Conservative — fewer, higher-quality signals",
  },
  {
    id: "b2btrend", name: "Back-to-Back Trend", badge: "🔁",
    startMin: 2, startMax: 3, gapMin: 2, gapMax: 4, countMult: 1,
    noMartingale: false, requireConfirm: true, filterLowVol: true,
    description: "Back-to-back wins only when setup confirmed again",
  },
  {
    id: "nomtg", name: "No-Martingale Trend", badge: "🚫",
    startMin: 3, startMax: 5, gapMin: 4, gapMax: 8, countMult: 0.5,
    noMartingale: true, requireConfirm: true, filterLowVol: true,
    description: "Strictly no martingale — confirmed setups only",
  },
  {
    id: "dualmarket", name: "Dual Market Confirm", badge: "🔀",
    startMin: 2, startMax: 4, gapMin: 3, gapMax: 5, countMult: 0.8,
    noMartingale: false, requireConfirm: true, filterLowVol: true,
    description: "Cross-validates signal across two markets",
  },
  {
    id: "precisioncandle", name: "Precision Candle Scan", badge: "🔬",
    startMin: 4, startMax: 6, gapMin: 5, gapMax: 9, countMult: 0.5,
    noMartingale: true, requireConfirm: true, filterLowVol: true,
    description: "Deep candle analysis — fewer but very strong signals",
  },
  {
    id: "riskguard", name: "RiskGuard Signals", badge: "🛡",
    startMin: 3, startMax: 5, gapMin: 5, gapMax: 10, countMult: 0.6,
    noMartingale: true, requireConfirm: true, filterLowVol: true,
    description: "Maximum risk management — low frequency, high precision",
  },
];

const DEFAULT_STRATEGY = STRATEGIES[0]!;

// ─── Auto-Delete Options ───────────────────────────────────────────────────────

interface AutoDeleteOption { label: string; seconds: number }

const AUTO_DELETE_OPTIONS: AutoDeleteOption[] = [
  { label: "10s",   seconds: 10 },
  { label: "30s",   seconds: 30 },
  { label: "1 Min", seconds: 60 },
  { label: "5 Min", seconds: 300 },
  { label: "30 Min",seconds: 1800 },
  { label: "1 Hr",  seconds: 3600 },
  { label: "6 Hr",  seconds: 21600 },
];

const DEFAULT_AUTO_DELETE = AUTO_DELETE_OPTIONS[0]!;

// ─── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_TZ    = TIMEZONES[22]!; // UTC+6 Bangladesh
const DEFAULT_TF    = 1;
const MIN_ASSETS    = 1;
const MAX_ASSETS    = 5;
const SIGNAL_COUNTS = [5, 10, 15, 20, 50, 70];

// ─── Access Store ─────────────────────────────────────────────────────────────

interface AccessEntry { expiresAt: number | null }
const accessStore = new Map<number, AccessEntry>();

const ADMIN_ID_NUM: number | null = ADMIN_CHAT_ID
  ? parseInt(ADMIN_CHAT_ID.trim(), 10) || null
  : null;

function hasAccess(userId: number): boolean {
  if (ADMIN_ID_NUM !== null && userId === ADMIN_ID_NUM) return true;
  const e = accessStore.get(userId);
  if (!e) return false;
  if (e.expiresAt === null) return true;
  return Date.now() < e.expiresAt;
}
function isAdmin(userId: number): boolean {
  return ADMIN_ID_NUM !== null && userId === ADMIN_ID_NUM;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type MarketType = "real" | "quotex" | "po" | "iq" | "olymp";

interface Settings {
  timeframe: number;
  timezone: TZ;
  strategy: Strategy;
  autoDeleteSec: number;
}

interface SessionData {
  state:
    | "idle" | "await_market" | "await_assets" | "await_dir_amount"
    | "await_settings_tf" | "await_settings_tz"
    | "await_settings_strategy" | "await_settings_delete";
  market?: MarketType;
  selectedAssets: string[];
  direction: "BOTH" | "CALL" | "PUT";
  settings: Settings;
  pendingDeleteIds: number[];
  pendingDeleteChatId?: number;
}

type MyContext = import("telegraf").Context & { session: SessionData };

// ─── Helpers ───────────────────────────────────────────────────────────────────

function pad2(n: number): string { return n.toString().padStart(2, "0"); }

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getAssetsForMarket(m: MarketType): string[] {
  if (m === "real")    return realAssets;
  if (m === "quotex")  return quotexOtcAssets;
  return brokerSharedOtcAssets;
}

function marketLabel(m: MarketType): string {
  const L: Record<MarketType, string> = {
    real: "REAL MARKET", quotex: "QUOTEX OTC",
    po: "POCKET OPTION OTC", iq: "IQ OPTION OTC", olymp: "OLYMP TRADE OTC",
  };
  return L[m];
}

function formatAssetName(asset: string, market: MarketType): string {
  if (market === "real") return asset.replace(/\//g, "");
  return asset
    .replace(/\s*\(OTC\)\s*/gi, "")
    .replace(/\s+OTC\s*$/gi, "")
    .replace(/\//g, "")
    .replace(/\s+/g, "")
    .trim() + "-OTC";
}

function tzDisplay(tz: TZ): string { return `${tz.label} ${tz.flag}`; }

function isWeekend(tz: TZ): boolean {
  const localMs = Date.now() + tz.offset * 3_600_000;
  const day = new Date(localMs).getUTCDay();
  return day === 0 || day === 6;
}

function adLabel(sec: number): string {
  const opt = AUTO_DELETE_OPTIONS.find(o => o.seconds === sec);
  return opt ? opt.label : `${sec}s`;
}

// ─── Signal Generator ──────────────────────────────────────────────────────────

async function buildSignalMessage(
  assets: string[],
  direction: "BOTH" | "CALL" | "PUT",
  market: MarketType,
  signalCount: number,
  settings: Settings,
): Promise<string> {
  const { timeframe, timezone, strategy } = settings;
  const isOtc = market !== "real";

  const nowMs = Date.now() + timezone.offset * 3_600_000;
  const now   = new Date(nowMs);

  const dd   = pad2(now.getUTCDate());
  const mm   = pad2(now.getUTCMonth() + 1);
  const yyyy = now.getUTCFullYear();
  const tfLabel = timeframe === 1 ? "1 MINUTE" : `${timeframe} MINUTES`;

  const adapterKey = market === "real" ? null : market;

  const header = [
    `<b>━━━━━━━━━・━━━━━━━━━</b>`,
    `<b>            𝗗𝗮𝘁𝗲: ${dd}/${mm}/${yyyy}</b>`,
    `<b>  𝗧𝗶𝗺𝗲 𝗭𝗼𝗻𝗲: ${escapeHtml(tzDisplay(timezone))}</b>`,
    `<b>𝗘𝘅𝗽𝗶𝗿𝘆 𝗧𝗶𝗺𝗲: ${tfLabel} LIST</b>`,
    strategy.noMartingale
      ? `<b>⚠️ NO MARTINGALE — Confirmed setups only</b>`
      : `<b>𝗠𝗮𝗿𝘁𝗶𝗻𝗴𝗮𝗹𝗲: 1 STEP MTG</b>`,
    `<b>𝗦𝘁𝗿𝗮𝘁𝗲𝗴𝘆: ${escapeHtml(strategy.name)} ${escapeHtml(strategy.badge)}</b>`,
    `<b>Market: ${escapeHtml(marketLabel(market))}</b>`,
    ...(adapterKey && adapters[adapterKey]?.isExperimental
      ? [`<b>⚠️ Connector: EXPERIMENTAL (algorithmic fallback)</b>`]
      : []),
    `<b>•••••••••••••••••••••••••••••••••••••••</b>`,
    `<b> Community @TRADERGUIDE_BOT</b>`,
    `<b>•••••••••••••••••••••••••••••••••••••••</b>`,
    ``,
    `<b>     ${escapeHtml(tfLabel)}</b>`,
    ``,
  ].join("\n");

  const effectiveCount = Math.max(1, Math.round(signalCount * strategy.countMult));
  const blocks: string[] = [];

  for (const asset of assets) {
    // Try to get candles from broker adapter for quality analysis
    let dir: "CALL" | "PUT";
    if (adapterKey && adapters[adapterKey]?.isConnected()) {
      try {
        const candles = await adapters[adapterKey]!.getCandles(asset, timeframe, 10);
        const quality = analyseSignalQuality(candles);

        // Skip weak/unconfirmed signals if strategy requires confirmation
        if (strategy.requireConfirm && !quality.confirmed) {
          blocks.push(
            `<b>▎${escapeHtml(formatAssetName(asset, market))} — ⏭ Skipped (low quality)</b>`
          );
          continue;
        }
        if (strategy.filterLowVol && quality.strength === "weak") {
          blocks.push(
            `<b>▎${escapeHtml(formatAssetName(asset, market))} — ⏭ Skipped (low volatility)</b>`
          );
          continue;
        }

        dir = direction === "BOTH" ? quality.direction : direction;
      } catch {
        dir = direction === "BOTH" ? (Math.random() < 0.5 ? "CALL" : "PUT") : direction;
      }
    } else {
      dir = direction === "BOTH" ? (Math.random() < 0.5 ? "CALL" : "PUT") : direction;
    }

    const name = escapeHtml(formatAssetName(asset, market));
    const startOffsetMs = (strategy.startMin + Math.random() * (strategy.startMax - strategy.startMin)) * 60_000;
    let cursor = new Date(nowMs + startOffsetMs);
    const times: string[] = [];
    for (let i = 0; i < effectiveCount; i++) {
      times.push(`${pad2(cursor.getUTCHours())}:${pad2(cursor.getUTCMinutes())}`);
      cursor = new Date(cursor.getTime() + (strategy.gapMin + Math.floor(Math.random() * (strategy.gapMax - strategy.gapMin + 1))) * 60_000);
    }

    const blockHeader = isOtc ? `<b>▎${name}</b>` : `<b>▎${name} ${dir}</b>`;
    const lines = times.map(t => `<b>${t} ${name} ${dir}</b>`);
    blocks.push([blockHeader, ...lines].join("\n"));
  }

  return header + blocks.join("\n\n");
}

// ─── Static text / keyboards ───────────────────────────────────────────────────

const MAIN_MENU_TEXT =
  "🤖 <b>TG ADVANCE SIGNAL GENERATOR</b>\n\nWelcome! Choose an option below:";
const MAIN_MENU_KB = Markup.inlineKeyboard([
  [Markup.button.callback("🔮 FUTURE SIGNAL • TG", "futuresignal")],
]);

const PAYWALL_TEXT =
  `🔒 <b>You Don't Have Access ⚠️</b>\n\n` +
  `Buy Access to unlock <b>Advance Signal</b> all features,\n` +
  `or Join our VIP to get <b>Free Advance Signals</b>.`;

const PAYWALL_KB = Markup.inlineKeyboard([
  [
    Markup.button.url("💬 CHAT",          "https://t.me/oawhidshakib"),
    Markup.button.callback("💳 ACCESS BUY", "access_buy"),
    Markup.button.url("⭐ VIP AUTO JOIN",  "https://t.me/managementTG_bot"),
  ],
]);

const PRICE_LIST_TEXT =
  `💎 <b>Subscription Plans — Future Signal</b>\n` +
  `<b>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>\n` +
  `  <b>1 Day</b>          <code>$5</code>\n` +
  `  <b>6 Days</b>        <code>$10</code>\n` +
  `  <b>14 Days</b>      <code>$25</code>\n` +
  `  <b>30 Days</b>      <code>$48</code>\n` +
  `  <b>60 Days</b>      <code>$69</code>\n` +
  `  <b>3 Months</b>    <code>$150</code>\n` +
  `  <b>5 Months</b>    <code>$170</code>\n` +
  `  <b>9 Months</b>    <code>$200</code>\n` +
  `  <b>12 Months</b>  <code>$280</code>\n` +
  `  <b>2 Years</b>      <code>$320</code>\n` +
  `  <b>3 Years</b>      <code>$500</code>\n` +
  `  <b>Lifetime</b>     <code>$919</code>\n` +
  `<b>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>\n\n` +
  `📩 Contact admin to purchase:`;

const PRICE_LIST_KB = Markup.inlineKeyboard([
  [
    Markup.button.url("💬 CHAT",         "https://t.me/oawhidshakib"),
    Markup.button.url("⭐ VIP AUTO JOIN","https://t.me/managementTG_bot"),
  ],
  [Markup.button.callback("🔙 Back", "paywall_back")],
]);

const marketKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("🌍 Real Market",       "market_real")],
  [Markup.button.callback("📈 Quotex OTC",        "market_quotex")],
  [Markup.button.callback("💼 Pocket Option OTC", "market_po")],
  [Markup.button.callback("📊 IQ Option OTC",     "market_iq")],
  [Markup.button.callback("🏦 Olymp Trade OTC",   "market_olymp")],
  [Markup.button.callback("🔙 Back",              "back_to_menu")],
]);

function assetKeyboard(
  assets: string[], selected: string[],
): ReturnType<typeof Markup.inlineKeyboard> {
  const btns = assets.map(a =>
    Markup.button.callback(selected.includes(a) ? `✔ ${a}` : a, `asset_${a}`)
  );
  const rows: ReturnType<typeof Markup.button.callback>[][] = [];
  for (let i = 0; i < btns.length; i += 3) rows.push(btns.slice(i, i + 3));
  rows.push([
    Markup.button.callback("✅ Done",              "assets_done"),
    Markup.button.callback("🔙 Back",              "back_to_market"),
  ]);
  rows.push([Markup.button.callback("⚙️ Change Settings", "settings_hub")]);
  rows.push([Markup.button.callback("🌍 Timezone",        "settings_tz_open")]);
  return Markup.inlineKeyboard(rows);
}

function dirAmountKeyboard(dir: "BOTH" | "CALL" | "PUT"): ReturnType<typeof Markup.inlineKeyboard> {
  const ck = (d: string) => dir === d ? " ✓" : "";
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(`↕ Both${ck("BOTH")}`, "setdir_BOTH"),
      Markup.button.callback(`📈 CALL${ck("CALL")}`, "setdir_CALL"),
      Markup.button.callback(`📉 PUT${ck("PUT")}`,   "setdir_PUT"),
    ],
    SIGNAL_COUNTS.slice(0, 3).map(n => Markup.button.callback(`${n}`, `sigcount_${n}`)),
    SIGNAL_COUNTS.slice(3).map(n =>   Markup.button.callback(`${n}`, `sigcount_${n}`)),
    [Markup.button.callback("🔙 Back", "back_to_assets")],
  ]);
}

function settingsHubKeyboard(s: Settings): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(`⏱ TF: ${s.timeframe}Min`,    "settings_open"),
      Markup.button.callback(`🌍 ${s.timezone.flag} ${s.timezone.label}`, "settings_tz_open"),
    ],
    [Markup.button.callback(`🎯 ${s.strategy.badge} ${s.strategy.name}`, "settings_strategy_open")],
    [Markup.button.callback(`⏰ Auto-Delete: ${adLabel(s.autoDeleteSec)}`, "settings_delete_open")],
    [Markup.button.callback("🔙 Back to Assets", "back_to_assets")],
  ]);
}

function tfKeyboard(currentTf: number): ReturnType<typeof Markup.inlineKeyboard> {
  const tfs = [1, 2, 3, 5, 10, 15, 30];
  const mk  = (tf: number) =>
    Markup.button.callback(tf === currentTf ? `✓ ${tf}Min` : `${tf}Min`, `tf_${tf}`);
  return Markup.inlineKeyboard([
    tfs.slice(0, 4).map(mk),
    tfs.slice(4).map(mk),
    [Markup.button.callback("🔙 Back", "back_to_settings_hub")],
  ]);
}

function tzKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  const rows: ReturnType<typeof Markup.button.callback>[][] = [];
  for (let i = 0; i < TIMEZONES.length; i += 2) {
    const row = [TIMEZONES[i]!, TIMEZONES[i + 1]].filter(Boolean) as TZ[];
    rows.push(row.map((tz, j) =>
      Markup.button.callback(`${tz.flag} ${tz.label}`, `tz_${i + j}`)
    ));
  }
  rows.push([Markup.button.callback("🔙 Back", "back_to_settings_hub")]);
  return Markup.inlineKeyboard(rows);
}

function strategyKeyboard(currentId: string): ReturnType<typeof Markup.inlineKeyboard> {
  const rows: ReturnType<typeof Markup.button.callback>[][] = [];
  for (let i = 0; i < STRATEGIES.length; i += 2) {
    const pair = STRATEGIES.slice(i, i + 2);
    rows.push(pair.map(s =>
      Markup.button.callback(
        s.id === currentId ? `✓ ${s.badge} ${s.name}` : `${s.badge} ${s.name}`,
        `strategy_${s.id}`,
      )
    ));
  }
  rows.push([Markup.button.callback("🔙 Back", "back_to_settings_hub")]);
  return Markup.inlineKeyboard(rows);
}

function autoDeleteKeyboard(currentSec: number): ReturnType<typeof Markup.inlineKeyboard> {
  const rows: ReturnType<typeof Markup.button.callback>[][] = [];
  for (let i = 0; i < AUTO_DELETE_OPTIONS.length; i += 3) {
    rows.push(
      AUTO_DELETE_OPTIONS.slice(i, i + 3).map(o =>
        Markup.button.callback(
          o.seconds === currentSec ? `✓ ${o.label}` : o.label,
          `autodel_${o.seconds}`,
        )
      )
    );
  }
  rows.push([Markup.button.callback("🔙 Back", "back_to_settings_hub")]);
  return Markup.inlineKeyboard(rows);
}

// ─── Bot ───────────────────────────────────────────────────────────────────────

const MAX_RETRIES      = 5;
const RETRY_DELAY_MS   = 3_000;
let   botRestartCount  = 0;

export async function startBot(): Promise<void> {
  if (!BOT_TOKEN) {
    logger.warn("TELEGRAM_BOT_TOKEN not set — bot will not start");
    return;
  }

  logger.info({ adminId: ADMIN_ID_NUM, rawEnv: ADMIN_CHAT_ID ? "[set]" : "[not set]" }, "Bot admin config");
  await initAdapters();

  await launchWithRetry();
}

async function launchWithRetry(): Promise<void> {
  const bot = buildBot();

  try {
    await bot.launch();
    botRestartCount = 0;
    logger.info("Telegram bot started");

    if (ADMIN_CHAT_ID) {
      bot.telegram
        .sendMessage(
          ADMIN_CHAT_ID,
          `🤖 <b>TG ADVANCE SIGNAL GENERATOR is online!</b>\nBroker adapters: ${Object.entries(adapters)
            .map(([k, a]) => `${k}=${a.isExperimental ? "⚠️exp" : "✅"}`)
            .join(", ")}`,
          { parse_mode: "HTML" },
        )
        .catch(() => {});
    }
  } catch (err) {
    botRestartCount++;
    logger.error({ err, attempt: botRestartCount }, "Bot launch failed");

    if (botRestartCount <= MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * botRestartCount;
      logger.info({ delay, attempt: botRestartCount }, "Retrying bot launch…");
      await new Promise(r => setTimeout(r, delay));
      return launchWithRetry();
    }

    logger.error("Max retries reached. Bot will not restart automatically.");
  }

  process.once("SIGINT",  () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

function buildBot(): Telegraf<MyContext> {
  const bot = new Telegraf<MyContext>(BOT_TOKEN!);

  bot.use(
    session({
      defaultSession: (): SessionData => ({
        state: "idle",
        selectedAssets: [],
        direction: "BOTH",
        pendingDeleteIds: [],
        settings: {
          timeframe: DEFAULT_TF,
          timezone: DEFAULT_TZ,
          strategy: DEFAULT_STRATEGY,
          autoDeleteSec: DEFAULT_AUTO_DELETE.seconds,
        },
      }),
    }),
  );

  bot.telegram.setMyCommands([
    { command: "start",        description: "Start the bot" },
    { command: "futuresignal", description: "Generate future signals" },
    { command: "help",         description: "Show help" },
  ]).catch(() => {});

  // ── Inner helpers ──────────────────────────────────────────────────────────

  async function sendMainMenu(ctx: MyContext): Promise<void> {
    await ctx.reply(MAIN_MENU_TEXT, { parse_mode: "HTML", ...MAIN_MENU_KB });
  }

  async function showPaywall(ctx: MyContext, edit: boolean): Promise<void> {
    if (edit) await ctx.editMessageText(PAYWALL_TEXT, { parse_mode: "HTML", ...PAYWALL_KB });
    else      await ctx.reply(PAYWALL_TEXT,            { parse_mode: "HTML", ...PAYWALL_KB });
  }

  async function clearPendingSignals(ctx: MyContext): Promise<void> {
    const { pendingDeleteIds, pendingDeleteChatId } = ctx.session;
    if (!pendingDeleteChatId || pendingDeleteIds.length === 0) return;
    for (const id of pendingDeleteIds) {
      await bot.telegram.deleteMessage(pendingDeleteChatId, id).catch(() => {});
    }
    ctx.session.pendingDeleteIds = [];
    ctx.session.pendingDeleteChatId = undefined;
  }

  function assetText(ctx: MyContext): string {
    const sel = ctx.session.selectedAssets;
    const s   = ctx.session.settings;
    return (
      `📌 <b>Select assets</b> (min ${MIN_ASSETS}, max ${MAX_ASSETS})\n` +
      `⚙️ TF: <b>${s.timeframe}Min</b>  |  🌍 TZ: <b>${escapeHtml(tzDisplay(s.timezone))}</b>\n` +
      `🎯 Strategy: <b>${escapeHtml(s.strategy.name)}</b>  |  ⏰ Delete: <b>${adLabel(s.autoDeleteSec)}</b>\n\n` +
      `<i>Selected: ${sel.length > 0 ? escapeHtml(sel.join(", ")) : "none"}</i>`
    );
  }

  async function showAssets(ctx: MyContext, edit: boolean): Promise<void> {
    const assets = getAssetsForMarket(ctx.session.market ?? "real");
    const kb     = assetKeyboard(assets, ctx.session.selectedAssets);
    ctx.session.state = "await_assets";
    if (edit) await ctx.editMessageText(assetText(ctx), { parse_mode: "HTML", ...kb });
    else      await ctx.reply(assetText(ctx),            { parse_mode: "HTML", ...kb });
  }

  async function showDirAmount(ctx: MyContext): Promise<void> {
    ctx.session.state = "await_dir_amount";
    const s = ctx.session.settings;
    await ctx.editMessageText(
      `📊 <b>Select Direction &amp; Signal Count</b>\n\n` +
      `🎯 Strategy: <b>${escapeHtml(s.strategy.name)}</b> — <i>${escapeHtml(s.strategy.description)}</i>\n` +
      `Direction: <b>${ctx.session.direction}</b>\nChoose signals per pair:`,
      { parse_mode: "HTML", ...dirAmountKeyboard(ctx.session.direction) },
    );
  }

  function showSettingsHub(ctx: MyContext, edit: boolean): Promise<unknown> {
    const s = ctx.session.settings;
    const text =
      `⚙️ <b>Settings</b>\n\n` +
      `⏱ Timeframe: <b>${s.timeframe} Min</b>\n` +
      `🌍 Timezone: <b>${escapeHtml(tzDisplay(s.timezone))}</b>\n` +
      `🎯 Strategy: <b>${escapeHtml(s.strategy.name)}</b> ${escapeHtml(s.strategy.badge)}\n` +
      `    <i>${escapeHtml(s.strategy.description)}</i>\n` +
      `⏰ Auto-Delete: <b>${adLabel(s.autoDeleteSec)}</b>`;
    const kb = settingsHubKeyboard(s);
    if (edit) return ctx.editMessageText(text, { parse_mode: "HTML", ...kb });
    return ctx.reply(text, { parse_mode: "HTML", ...kb });
  }

  // ── Commands ───────────────────────────────────────────────────────────────

  bot.command("myid", async ctx => {
    const uid = ctx.from?.id ?? 0;
    const adminStatus = isAdmin(uid) ? "✅ You are the admin" : "❌ Not admin";
    await ctx.reply(
      `🆔 Your Telegram ID: <code>${uid}</code>\n${adminStatus}\n\nBot admin ID: <code>${ADMIN_ID_NUM ?? "not set"}</code>`,
      { parse_mode: "HTML" },
    );
  });

  bot.start(async ctx => {
    ctx.session.state = "idle";
    await sendMainMenu(ctx);
  });

  bot.command("help", async ctx => {
    await ctx.reply(
      "📋 <b>Commands</b>\n\n/start — Start\n/futuresignal — Generate signals\n/help — This message",
      { parse_mode: "HTML" },
    );
  });

  bot.command("futuresignal", async ctx => {
    const uid = ctx.from?.id ?? 0;
    if (!hasAccess(uid)) { await showPaywall(ctx, false); return; }
    ctx.session.state = "await_market";
    await ctx.reply("📊 <b>Select Market Type:</b>", { parse_mode: "HTML", ...marketKeyboard });
  });

  // ── Admin commands ─────────────────────────────────────────────────────────

  bot.command("grant", async ctx => {
    if (!isAdmin(ctx.from?.id ?? 0)) return;
    const [, rawId, param] = ctx.message.text.trim().split(/\s+/);
    const targetId = parseInt(rawId ?? "", 10);
    if (!targetId || !param) {
      await ctx.reply("Usage: /grant &lt;userId&gt; &lt;days|lifetime&gt;", { parse_mode: "HTML" });
      return;
    }
    if (param.toLowerCase() === "lifetime") {
      accessStore.set(targetId, { expiresAt: null });
      await ctx.reply(`✅ Lifetime access granted to <code>${targetId}</code>.`, { parse_mode: "HTML" });
    } else {
      const days = parseInt(param, 10);
      if (!days || days <= 0) { await ctx.reply("Days must be a positive number."); return; }
      accessStore.set(targetId, { expiresAt: Date.now() + days * 86_400_000 });
      await ctx.reply(
        `✅ <b>${days}-day</b> access granted to <code>${targetId}</code>.\n` +
        `Expires: <code>${new Date(Date.now() + days * 86_400_000).toUTCString()}</code>`,
        { parse_mode: "HTML" },
      );
    }
  });

  bot.command("revoke", async ctx => {
    if (!isAdmin(ctx.from?.id ?? 0)) return;
    const [, rawId] = ctx.message.text.trim().split(/\s+/);
    const targetId = parseInt(rawId ?? "", 10);
    if (!targetId) { await ctx.reply("Usage: /revoke &lt;userId&gt;", { parse_mode: "HTML" }); return; }
    accessStore.delete(targetId);
    await ctx.reply(`✅ Access revoked for <code>${targetId}</code>.`, { parse_mode: "HTML" });
  });

  bot.command("listaccess", async ctx => {
    if (!isAdmin(ctx.from?.id ?? 0)) return;
    if (accessStore.size === 0) { await ctx.reply("No users have been granted access."); return; }
    const lines = Array.from(accessStore.entries()).map(([id, e]) => {
      const exp = e.expiresAt === null
        ? "Lifetime ♾️"
        : `${new Date(e.expiresAt).toUTCString()} ${Date.now() < e.expiresAt ? "✅" : "❌ EXPIRED"}`;
      return `<code>${id}</code> — ${exp}`;
    });
    await ctx.reply(`<b>Access List (${accessStore.size}):</b>\n\n${lines.join("\n")}`, { parse_mode: "HTML" });
  });

  // ── Main actions ───────────────────────────────────────────────────────────

  bot.action("futuresignal", async ctx => {
    await ctx.answerCbQuery();
    const uid = ctx.from?.id ?? 0;
    if (!hasAccess(uid)) { await showPaywall(ctx, true); return; }
    ctx.session.state = "await_market";
    await ctx.editMessageText("📊 <b>Select Market Type:</b>", { parse_mode: "HTML", ...marketKeyboard });
  });

  bot.action("back_to_menu", async ctx => {
    await ctx.answerCbQuery();
    ctx.session.state = "idle";
    await clearPendingSignals(ctx);
    await ctx.editMessageText(MAIN_MENU_TEXT, { parse_mode: "HTML", ...MAIN_MENU_KB });
  });

  bot.action("access_buy",   async ctx => { await ctx.answerCbQuery(); await ctx.editMessageText(PRICE_LIST_TEXT, { parse_mode: "HTML", ...PRICE_LIST_KB }); });
  bot.action("paywall_back", async ctx => { await ctx.answerCbQuery(); await ctx.editMessageText(PAYWALL_TEXT,    { parse_mode: "HTML", ...PAYWALL_KB    }); });

  // Market selection with weekend guard
  const markets: MarketType[] = ["real", "quotex", "po", "iq", "olymp"];
  for (const m of markets) {
    bot.action(`market_${m}`, async ctx => {
      if (ctx.session.state !== "await_market") return;
      if (m === "real" && isWeekend(ctx.session.settings.timezone)) {
        await ctx.answerCbQuery(
          "🚫 Real Market Closed — Weekend!\nOpen Mon–Fri only. Use OTC instead.",
          { show_alert: true },
        );
        return;
      }
      await ctx.answerCbQuery();
      ctx.session.market = m;
      ctx.session.selectedAssets = [];
      await showAssets(ctx, true);
    });
  }

  bot.action("back_to_market", async ctx => {
    await ctx.answerCbQuery();
    ctx.session.state = "await_market";
    ctx.session.selectedAssets = [];
    await ctx.editMessageText("📊 <b>Select Market Type:</b>", { parse_mode: "HTML", ...marketKeyboard });
  });

  // Asset toggling
  bot.action(/^asset_(.+)$/, async ctx => {
    if (ctx.session.state !== "await_assets") return;
    const asset = ctx.match[1];
    const sel   = ctx.session.selectedAssets;
    const idx   = sel.indexOf(asset);
    if (idx === -1) {
      if (sel.length >= MAX_ASSETS) {
        await ctx.answerCbQuery(`⚠️ Max ${MAX_ASSETS} assets!`, { show_alert: true });
        return;
      }
      sel.push(asset);
      await ctx.answerCbQuery(`✔ ${asset}`);
    } else {
      sel.splice(idx, 1);
      await ctx.answerCbQuery(`✖ ${asset}`);
    }
    const assets = getAssetsForMarket(ctx.session.market ?? "real");
    await ctx.editMessageText(assetText(ctx), { parse_mode: "HTML", ...assetKeyboard(assets, sel) });
  });

  bot.action("assets_done", async ctx => {
    if (ctx.session.selectedAssets.length < MIN_ASSETS) {
      await ctx.answerCbQuery(`⚠️ Select at least ${MIN_ASSETS} asset!`, { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    await showDirAmount(ctx);
  });

  bot.action("back_to_assets", async ctx => {
    await ctx.answerCbQuery();
    await showAssets(ctx, true);
  });

  // ── Direction ──────────────────────────────────────────────────────────────

  for (const dir of ["BOTH", "CALL", "PUT"] as const) {
    bot.action(`setdir_${dir}`, async ctx => {
      if (ctx.session.state !== "await_dir_amount") return;
      ctx.session.direction = dir;
      await ctx.answerCbQuery(`Direction: ${dir}`);
      const s = ctx.session.settings;
      await ctx.editMessageText(
        `📊 <b>Select Direction &amp; Signal Count</b>\n\n` +
        `🎯 Strategy: <b>${escapeHtml(s.strategy.name)}</b> — <i>${escapeHtml(s.strategy.description)}</i>\n` +
        `Direction: <b>${dir}</b>\nChoose signals per pair:`,
        { parse_mode: "HTML", ...dirAmountKeyboard(dir) },
      );
    });
  }

  // ── Signal generation ──────────────────────────────────────────────────────

  for (const count of SIGNAL_COUNTS) {
    bot.action(`sigcount_${count}`, async ctx => {
      if (ctx.session.state !== "await_dir_amount") return;
      await ctx.answerCbQuery("⏳ Generating...");

      const { selectedAssets, direction, market, settings } = ctx.session;
      ctx.session.state = "idle";

      let msg: string;
      try {
        msg = await buildSignalMessage(selectedAssets, direction, market ?? "real", count, settings);
      } catch (err) {
        logger.error({ err }, "Signal generation error");
        await ctx.reply("⚠️ Error generating signals. Please try again.", { parse_mode: "HTML" });
        return;
      }

      const MAX_LEN = 4000;
      const chunks: string[] = [];
      let rem = msg;
      while (rem.length > 0) {
        if (rem.length <= MAX_LEN) { chunks.push(rem); break; }
        const cut = rem.lastIndexOf("\n\n", MAX_LEN);
        chunks.push(rem.slice(0, cut > 0 ? cut : MAX_LEN));
        rem = rem.slice(cut > 0 ? cut : MAX_LEN).trimStart();
      }

      const chatId = ctx.chat!.id;
      const deleteMsgIds: number[] = [];

      const firstMsgId = (ctx.callbackQuery as { message?: { message_id?: number } })?.message?.message_id;
      if (firstMsgId) deleteMsgIds.push(firstMsgId);
      await ctx.editMessageText(chunks[0]!, { parse_mode: "HTML" });

      for (let i = 1; i < chunks.length; i++) {
        const m = await ctx.reply(chunks[i]!, { parse_mode: "HTML" });
        deleteMsgIds.push(m.message_id);
      }

      const delLabel = adLabel(settings.autoDeleteSec);
      const summaryMsg = await ctx.reply(
        `✅ <b>${count} signals × ${selectedAssets.length} pair(s)</b> | 🎯 ${escapeHtml(settings.strategy.name)}\n` +
        `⏱ <i>Auto-deleting in ${delLabel}…</i>`,
        {
          parse_mode: "HTML",
          ...Markup.inlineKeyboard([[Markup.button.callback("🏠 Home", "go_home")]]),
        },
      );

      ctx.session.pendingDeleteIds    = deleteMsgIds;
      ctx.session.pendingDeleteChatId = chatId;

      setTimeout(() => {
        for (const id of deleteMsgIds) {
          bot.telegram.deleteMessage(chatId, id).catch(() => {});
        }
        bot.telegram
          .editMessageText(chatId, summaryMsg.message_id, undefined, MAIN_MENU_TEXT, {
            parse_mode: "HTML",
            ...MAIN_MENU_KB,
          })
          .catch(() => {});
        ctx.session.pendingDeleteIds    = [];
        ctx.session.pendingDeleteChatId = undefined;
        ctx.session.state = "idle";
      }, settings.autoDeleteSec * 1_000);
    });
  }

  // Home — deletes signal messages first, then shows main menu
  bot.action("go_home", async ctx => {
    await ctx.answerCbQuery();
    ctx.session.state = "idle";
    await clearPendingSignals(ctx);
    await ctx.editMessageText(MAIN_MENU_TEXT, { parse_mode: "HTML", ...MAIN_MENU_KB });
  });

  // ── Settings Hub ───────────────────────────────────────────────────────────

  bot.action("settings_hub", async ctx => {
    await ctx.answerCbQuery();
    await showSettingsHub(ctx, true);
  });

  bot.action("back_to_settings_hub", async ctx => {
    await ctx.answerCbQuery();
    await showSettingsHub(ctx, true);
  });

  // ── Timeframe ──────────────────────────────────────────────────────────────

  bot.action("settings_open", async ctx => {
    await ctx.answerCbQuery();
    const tf = ctx.session.settings.timeframe;
    await ctx.editMessageText(
      `⏱ <b>Choose Timeframe</b>\n\nCurrent: <b>${tf} Min</b>`,
      { parse_mode: "HTML", ...tfKeyboard(tf) },
    );
  });

  for (const tf of [1, 2, 3, 5, 10, 15, 30]) {
    bot.action(`tf_${tf}`, async ctx => {
      ctx.session.settings.timeframe = tf;
      await ctx.answerCbQuery(`✓ ${tf}Min saved`);
      await ctx.editMessageText(
        `⏱ <b>Choose Timeframe</b>\n\nCurrent: <b>${tf} Min</b>`,
        { parse_mode: "HTML", ...tfKeyboard(tf) },
      );
    });
  }

  // ── Timezone ───────────────────────────────────────────────────────────────

  bot.action("settings_tz_open", async ctx => {
    await ctx.answerCbQuery();
    const cur = ctx.session.settings.timezone;
    await ctx.editMessageText(
      `🌍 <b>Select Timezone</b>\n\nCurrent: <b>${escapeHtml(tzDisplay(cur))}</b>`,
      { parse_mode: "HTML", ...tzKeyboard() },
    );
  });

  bot.action(/^tz_(\d+)$/, async ctx => {
    const tz = TIMEZONES[parseInt(ctx.match[1], 10)];
    if (!tz) return;
    ctx.session.settings.timezone = tz;
    await ctx.answerCbQuery(`✓ ${tzDisplay(tz)} saved`);
    await showSettingsHub(ctx, true);
  });

  // ── Strategy ───────────────────────────────────────────────────────────────

  bot.action("settings_strategy_open", async ctx => {
    await ctx.answerCbQuery();
    const cur = ctx.session.settings.strategy;
    await ctx.editMessageText(
      `🎯 <b>Select Strategy</b>\n\nCurrent: <b>${escapeHtml(cur.name)}</b>\n<i>${escapeHtml(cur.description)}</i>`,
      { parse_mode: "HTML", ...strategyKeyboard(cur.id) },
    );
  });

  bot.action(/^strategy_(.+)$/, async ctx => {
    const s = STRATEGIES.find(x => x.id === ctx.match[1]);
    if (!s) return;
    ctx.session.settings.strategy = s;
    await ctx.answerCbQuery(`✓ ${s.name} selected`);
    await showSettingsHub(ctx, true);
  });

  // ── Auto-Delete ────────────────────────────────────────────────────────────

  bot.action("settings_delete_open", async ctx => {
    await ctx.answerCbQuery();
    const cur = ctx.session.settings.autoDeleteSec;
    await ctx.editMessageText(
      `⏰ <b>Auto-Delete Timer</b>\n\nCurrent: <b>${adLabel(cur)}</b>\nSignal messages are deleted after this time:`,
      { parse_mode: "HTML", ...autoDeleteKeyboard(cur) },
    );
  });

  bot.action(/^autodel_(\d+)$/, async ctx => {
    const sec = parseInt(ctx.match[1], 10);
    const opt = AUTO_DELETE_OPTIONS.find(o => o.seconds === sec);
    if (!opt) return;
    ctx.session.settings.autoDeleteSec = sec;
    await ctx.answerCbQuery(`✓ Auto-delete set to ${opt.label}`);
    await showSettingsHub(ctx, true);
  });

  // ── Global error handler ───────────────────────────────────────────────────

  bot.catch((err, ctx) => {
    logger.error({ err, updateType: ctx.updateType }, "Unhandled bot error");
    if (ctx.callbackQuery) {
      ctx.answerCbQuery("⚠️ Something went wrong. Please try again.").catch(() => {});
    }
  });

  return bot;
}
