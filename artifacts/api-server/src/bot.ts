import { Telegraf, Markup, session } from "telegraf";
import { logger } from "./lib/logger";

const BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"];
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
  { offset: -12, label: "UTC-12:00", flag: "🌐", name: "Baker Island" },
  { offset: -11, label: "UTC-11:00", flag: "🌐", name: "American Samoa" },
  { offset: -10, label: "UTC-10:00", flag: "🇺🇸", name: "Hawaii" },
  { offset: -9,  label: "UTC-9:00",  flag: "🇺🇸", name: "Alaska" },
  { offset: -8,  label: "UTC-8:00",  flag: "🇺🇸", name: "Los Angeles (PST)" },
  { offset: -7,  label: "UTC-7:00",  flag: "🇺🇸", name: "Denver (MST)" },
  { offset: -6,  label: "UTC-6:00",  flag: "🇺🇸", name: "Chicago (CST)" },
  { offset: -5,  label: "UTC-5:00",  flag: "🇺🇸", name: "New York (EST)" },
  { offset: -4,  label: "UTC-4:00",  flag: "🇨🇦", name: "Halifax" },
  { offset: -3,  label: "UTC-3:00",  flag: "🇧🇷", name: "São Paulo" },
  { offset: -2,  label: "UTC-2:00",  flag: "🌐", name: "Mid-Atlantic" },
  { offset: -1,  label: "UTC-1:00",  flag: "🇵🇹", name: "Azores" },
  { offset: 0,   label: "UTC+0:00",  flag: "🇬🇧", name: "London (GMT)" },
  { offset: 1,   label: "UTC+1:00",  flag: "🇫🇷", name: "Paris (CET)" },
  { offset: 2,   label: "UTC+2:00",  flag: "🇪🇬", name: "Cairo (EET)" },
  { offset: 3,   label: "UTC+3:00",  flag: "🇷🇺", name: "Moscow (MSK)" },
  { offset: 3.5, label: "UTC+3:30",  flag: "🇮🇷", name: "Tehran (IRST)" },
  { offset: 4,   label: "UTC+4:00",  flag: "🇦🇪", name: "Dubai (GST)" },
  { offset: 4.5, label: "UTC+4:30",  flag: "🇦🇫", name: "Kabul (AFT)" },
  { offset: 5,   label: "UTC+5:00",  flag: "🇵🇰", name: "Karachi (PKT)" },
  { offset: 5.5, label: "UTC+5:30",  flag: "🇮🇳", name: "India (IST)" },
  { offset: 5.75,label: "UTC+5:45",  flag: "🇳🇵", name: "Kathmandu (NPT)" },
  { offset: 6,   label: "UTC+6:00",  flag: "🇧🇩", name: "Dhaka (BST)" },
  { offset: 6.5, label: "UTC+6:30",  flag: "🇲🇲", name: "Yangon (MMT)" },
  { offset: 7,   label: "UTC+7:00",  flag: "🇹🇭", name: "Bangkok (ICT)" },
  { offset: 8,   label: "UTC+8:00",  flag: "🇨🇳", name: "Beijing (CST)" },
  { offset: 9,   label: "UTC+9:00",  flag: "🇯🇵", name: "Tokyo (JST)" },
  { offset: 9.5, label: "UTC+9:30",  flag: "🇦🇺", name: "Adelaide (ACST)" },
  { offset: 10,  label: "UTC+10:00", flag: "🇦🇺", name: "Sydney (AEST)" },
  { offset: 11,  label: "UTC+11:00", flag: "🌐", name: "Solomon Islands" },
  { offset: 12,  label: "UTC+12:00", flag: "🇳🇿", name: "Auckland (NZST)" },
];

const DEFAULT_TZ = TIMEZONES[22]!; // UTC+6 Bangladesh
const DEFAULT_TF = 1;
const MIN_ASSETS = 1;
const MAX_ASSETS = 5;
const SIGNAL_COUNTS = [5, 10, 15, 20, 50, 70];

// ─── Types ─────────────────────────────────────────────────────────────────────

type MarketType = "real" | "quotex" | "po" | "iq" | "olymp";

interface Settings {
  timeframe: number;
  timezone: TZ;
}

interface SessionData {
  state: "idle" | "await_market" | "await_assets" | "await_dir_amount" | "await_settings_tf" | "await_settings_tz";
  market?: MarketType;
  selectedAssets: string[];
  direction: "BOTH" | "CALL" | "PUT";
  settings: Settings;
}

type MyContext = import("telegraf").Context & { session: SessionData };

// ─── Helpers ───────────────────────────────────────────────────────────────────

function pad2(n: number): string { return n.toString().padStart(2, "0"); }

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getAssetsForMarket(m: MarketType): string[] {
  if (m === "real") return realAssets;
  if (m === "quotex") return quotexOtcAssets;
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

function tzDisplay(tz: TZ): string {
  return `${tz.label} ${tz.flag}`;
}

// ─── Signal Generator ──────────────────────────────────────────────────────────

function buildSignalMessage(
  assets: string[],
  direction: "BOTH" | "CALL" | "PUT",
  market: MarketType,
  signalCount: number,
  settings: Settings,
): string {
  const isOtc = market !== "real";
  const { timeframe, timezone } = settings;

  const nowMs = Date.now() + timezone.offset * 3600000;
  const now = new Date(nowMs);

  const dd = pad2(now.getUTCDate());
  const mm = pad2(now.getUTCMonth() + 1);
  const yyyy = now.getUTCFullYear();

  const tfLabel = timeframe === 1 ? "1 MINUTE" : `${timeframe} MINUTES`;

  const header = [
    `<b>━━━━━━━━━・━━━━━━━━━</b>`,
    `<b>            𝗗𝗮𝘁𝗲: ${dd}/${mm}/${yyyy}</b>`,
    `<b>  𝗧𝗶𝗺𝗲 𝗭𝗼𝗻𝗲: ${escapeHtml(tzDisplay(timezone))}</b>`,
    `<b>𝗘𝘅𝗽𝗶𝗿𝘆 𝗧𝗶𝗺𝗲: ${tfLabel} LIST</b>`,
    `<b>𝗠𝗮𝗿𝘁𝗶𝗻𝗴𝗮𝗹𝗲: 1 STEP MTG</b>`,
    `<b>(IF LOSS THEN USE ONE STEP AUTO MTG)</b>`,
    `<b>Market: ${escapeHtml(marketLabel(market))}</b>`,
    `<b>•••••••••••••••••••••••••••••••••••••••</b>`,
    `<b> Community @TRADERGUIDE_BOT</b>`,
    `<b>•••••••••••••••••••••••••••••••••••••••</b>`,
    ``,
    `<b>     ${escapeHtml(tfLabel)}</b>`,
    ``,
  ].join("\n");

  const blocks: string[] = [];

  for (const asset of assets) {
    const dir: "CALL" | "PUT" =
      direction === "BOTH" ? (Math.random() < 0.5 ? "CALL" : "PUT") : direction;
    const name = escapeHtml(formatAssetName(asset, market));

    let cursor = new Date(nowMs + (1 + Math.floor(Math.random() * 5)) * 60000);
    const times: string[] = [];
    for (let i = 0; i < signalCount; i++) {
      times.push(`${pad2(cursor.getUTCHours())}:${pad2(cursor.getUTCMinutes())}`);
      cursor = new Date(cursor.getTime() + (7 + Math.floor(Math.random() * 7)) * 60000);
    }

    const blockHeader = isOtc
      ? `<b>▎${name}</b>`
      : `<b>▎${name} ${dir}</b>`;

    const lines = times.map(t => `<b>${t} ${name} ${dir}</b>`);
    blocks.push([blockHeader, ...lines].join("\n"));
  }

  return header + blocks.join("\n\n");
}

// ─── Keyboards ─────────────────────────────────────────────────────────────────

const marketKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("🌍 Real Market", "market_real")],
  [Markup.button.callback("📈 Quotex OTC", "market_quotex")],
  [Markup.button.callback("💼 Pocket Option OTC", "market_po")],
  [Markup.button.callback("📊 IQ Option OTC", "market_iq")],
  [Markup.button.callback("🏦 Olymp Trade OTC", "market_olymp")],
  [Markup.button.callback("🔙 Back", "back_to_menu")],
]);

function assetKeyboard(
  assets: string[],
  selected: string[],
): ReturnType<typeof Markup.inlineKeyboard> {
  const btns = assets.map(a =>
    Markup.button.callback(selected.includes(a) ? `✔ ${a}` : a, `asset_${a}`)
  );
  const rows: ReturnType<typeof Markup.button.callback>[][] = [];
  for (let i = 0; i < btns.length; i += 3) rows.push(btns.slice(i, i + 3));
  rows.push([
    Markup.button.callback("✅ Done", "assets_done"),
    Markup.button.callback("🔙 Back", "back_to_market"),
  ]);
  rows.push([Markup.button.callback("⚙️ Change Settings", "settings_open")]);
  rows.push([Markup.button.callback("🌍 Timezone", "settings_tz_open")]);
  return Markup.inlineKeyboard(rows);
}

function dirAmountKeyboard(dir: "BOTH" | "CALL" | "PUT"): ReturnType<typeof Markup.inlineKeyboard> {
  const ck = (d: string) => dir === d ? " ✓" : "";
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(`↕ Both${ck("BOTH")}`, "setdir_BOTH"),
      Markup.button.callback(`📈 CALL${ck("CALL")}`, "setdir_CALL"),
      Markup.button.callback(`📉 PUT${ck("PUT")}`, "setdir_PUT"),
    ],
    SIGNAL_COUNTS.slice(0, 3).map(n => Markup.button.callback(`${n}`, `sigcount_${n}`)),
    SIGNAL_COUNTS.slice(3).map(n => Markup.button.callback(`${n}`, `sigcount_${n}`)),
    [Markup.button.callback("🔙 Back", "back_to_assets")],
  ]);
}

function settingsTfKeyboard(currentTf: number): ReturnType<typeof Markup.inlineKeyboard> {
  const tfs = [1, 2, 3, 5, 10, 15, 30];
  const mk = (tf: number) =>
    Markup.button.callback(tf === currentTf ? `✓ ${tf}Min` : `${tf}Min`, `tf_${tf}`);
  return Markup.inlineKeyboard([
    tfs.slice(0, 4).map(mk),
    tfs.slice(4).map(mk),
    [Markup.button.callback("🔙 Back to Assets", "back_to_assets")],
  ]);
}

function tzKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  const rows: ReturnType<typeof Markup.button.callback>[][] = [];
  for (let i = 0; i < TIMEZONES.length; i += 2) {
    const row = [TIMEZONES[i]!, TIMEZONES[i + 1]].filter(Boolean) as TZ[];
    rows.push(
      row.map((tz, j) =>
        Markup.button.callback(`${tz.flag} ${tz.label}`, `tz_${i + j}`)
      )
    );
  }
  rows.push([Markup.button.callback("🔙 Back", "back_to_settings")]);
  return Markup.inlineKeyboard(rows);
}

// ─── Bot ───────────────────────────────────────────────────────────────────────

export function startBot(): void {
  if (!BOT_TOKEN) {
    logger.warn("TELEGRAM_BOT_TOKEN not set — bot will not start");
    return;
  }

  const bot = new Telegraf<MyContext>(BOT_TOKEN);

  bot.use(
    session({
      defaultSession: (): SessionData => ({
        state: "idle",
        selectedAssets: [],
        direction: "BOTH",
        settings: { timeframe: DEFAULT_TF, timezone: DEFAULT_TZ },
      }),
    }),
  );

  bot.telegram.setMyCommands([
    { command: "start", description: "Start the bot" },
    { command: "futuresignal", description: "Generate future signals" },
    { command: "help", description: "Show help" },
  ]).catch(() => {});

  // ── Helpers ────────────────────────────────────────────────────────────────

  async function sendMainMenu(ctx: MyContext): Promise<void> {
    await ctx.reply(
      "🤖 <b>TG ADVANCE SIGNAL GENERATOR</b>\n\nWelcome! Choose an option below:",
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("🔮 FUTURE SIGNAL • TG", "futuresignal")],
        ]),
      },
    );
  }

  function assetText(ctx: MyContext): string {
    const sel = ctx.session.selectedAssets;
    const tf = ctx.session.settings.timeframe;
    const tz = ctx.session.settings.timezone;
    return (
      `📌 <b>Select assets</b> (min ${MIN_ASSETS}, max ${MAX_ASSETS})\n` +
      `⚙️ TF: <b>${tf}Min</b>  |  🌍 TZ: <b>${escapeHtml(tzDisplay(tz))}</b>\n\n` +
      `<i>Selected: ${sel.length > 0 ? escapeHtml(sel.join(", ")) : "none"}</i>`
    );
  }

  async function showAssets(ctx: MyContext, edit: boolean): Promise<void> {
    const assets = getAssetsForMarket(ctx.session.market ?? "real");
    const kb = assetKeyboard(assets, ctx.session.selectedAssets);
    ctx.session.state = "await_assets";
    if (edit) {
      await ctx.editMessageText(assetText(ctx), { parse_mode: "HTML", ...kb });
    } else {
      await ctx.reply(assetText(ctx), { parse_mode: "HTML", ...kb });
    }
  }

  async function showDirAmount(ctx: MyContext): Promise<void> {
    ctx.session.state = "await_dir_amount";
    await ctx.editMessageText(
      `📊 <b>Select Direction &amp; Signal Count</b>\n\n` +
      `Direction: <b>${ctx.session.direction}</b>\n` +
      `Choose how many signals per pair:`,
      { parse_mode: "HTML", ...dirAmountKeyboard(ctx.session.direction) },
    );
  }

  // ── Commands ───────────────────────────────────────────────────────────────

  bot.start(async (ctx) => {
    ctx.session.state = "idle";
    await sendMainMenu(ctx);
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "📋 <b>Commands</b>\n\n/start — Start\n/futuresignal — Generate signals\n/help — This message",
      { parse_mode: "HTML" },
    );
  });

  bot.command("futuresignal", async (ctx) => {
    ctx.session.state = "await_market";
    await ctx.reply("📊 <b>Select Market Type:</b>", {
      parse_mode: "HTML",
      ...marketKeyboard,
    });
  });

  // ── Main actions ───────────────────────────────────────────────────────────

  bot.action("futuresignal", async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.state = "await_market";
    await ctx.editMessageText("📊 <b>Select Market Type:</b>", {
      parse_mode: "HTML",
      ...marketKeyboard,
    });
  });

  bot.action("back_to_menu", async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.state = "idle";
    await ctx.editMessageText(
      "🤖 <b>TG ADVANCE SIGNAL GENERATOR</b>\n\nWelcome! Choose an option below:",
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("🔮 FUTURE SIGNAL • TG", "futuresignal")],
        ]),
      },
    );
  });

  // Market selection
  const markets: MarketType[] = ["real", "quotex", "po", "iq", "olymp"];
  for (const m of markets) {
    bot.action(`market_${m}`, async (ctx) => {
      if (ctx.session.state !== "await_market") return;
      await ctx.answerCbQuery();
      ctx.session.market = m;
      ctx.session.selectedAssets = [];
      await showAssets(ctx, true);
    });
  }

  bot.action("back_to_market", async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.state = "await_market";
    ctx.session.selectedAssets = [];
    await ctx.editMessageText("📊 <b>Select Market Type:</b>", {
      parse_mode: "HTML",
      ...marketKeyboard,
    });
  });

  // Asset toggling
  bot.action(/^asset_(.+)$/, async (ctx) => {
    if (ctx.session.state !== "await_assets") return;
    const asset = ctx.match[1];
    const sel = ctx.session.selectedAssets;
    const idx = sel.indexOf(asset);
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
    await ctx.editMessageText(assetText(ctx), {
      parse_mode: "HTML",
      ...assetKeyboard(assets, sel),
    });
  });

  bot.action("assets_done", async (ctx) => {
    const sel = ctx.session.selectedAssets;
    if (sel.length < MIN_ASSETS) {
      await ctx.answerCbQuery(`⚠️ Select at least ${MIN_ASSETS} asset!`, { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    await showDirAmount(ctx);
  });

  // Back to assets from dir/amount
  bot.action("back_to_assets", async (ctx) => {
    await ctx.answerCbQuery();
    await showAssets(ctx, true);
  });

  // ── Direction selection (refreshes same panel) ─────────────────────────────

  for (const dir of ["BOTH", "CALL", "PUT"] as const) {
    bot.action(`setdir_${dir}`, async (ctx) => {
      if (ctx.session.state !== "await_dir_amount") return;
      ctx.session.direction = dir;
      await ctx.answerCbQuery(`Direction: ${dir}`);
      await ctx.editMessageText(
        `📊 <b>Select Direction &amp; Signal Count</b>\n\nDirection: <b>${dir}</b>\nChoose how many signals per pair:`,
        { parse_mode: "HTML", ...dirAmountKeyboard(dir) },
      );
    });
  }

  // ── Signal count — triggers generation ────────────────────────────────────

  for (const count of SIGNAL_COUNTS) {
    bot.action(`sigcount_${count}`, async (ctx) => {
      if (ctx.session.state !== "await_dir_amount") return;
      await ctx.answerCbQuery("⏳ Generating...");

      const { selectedAssets, direction, market, settings } = ctx.session;
      ctx.session.state = "idle";

      const msg = buildSignalMessage(
        selectedAssets,
        direction,
        market ?? "real",
        count,
        settings,
      );

      const MAX_LEN = 4000;
      const chunks: string[] = [];
      let rem = msg;
      while (rem.length > 0) {
        if (rem.length <= MAX_LEN) { chunks.push(rem); break; }
        const cut = rem.lastIndexOf("\n\n", MAX_LEN);
        const at = cut > 0 ? cut : MAX_LEN;
        chunks.push(rem.slice(0, at));
        rem = rem.slice(at).trimStart();
      }

      await ctx.editMessageText(chunks[0]!, { parse_mode: "HTML" });
      for (let i = 1; i < chunks.length; i++) {
        await ctx.reply(chunks[i]!, { parse_mode: "HTML" });
      }

      await ctx.reply(
        `✅ <b>${count} signals × ${selectedAssets.length} pair(s) generated.</b>`,
        {
          parse_mode: "HTML",
          ...Markup.inlineKeyboard([
            [Markup.button.callback("🏠 Home", "go_home")],
          ]),
        },
      );
    });
  }

  // Home button — replaces the summary message with main menu
  bot.action("go_home", async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.state = "idle";
    await ctx.editMessageText(
      "🤖 <b>TG ADVANCE SIGNAL GENERATOR</b>\n\nWelcome! Choose an option below:",
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("🔮 FUTURE SIGNAL • TG", "futuresignal")],
        ]),
      },
    );
  });

  // ── Settings: Timeframe ────────────────────────────────────────────────────

  bot.action("settings_open", async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.state = "await_settings_tf";
    const tf = ctx.session.settings.timeframe;
    await ctx.editMessageText(
      `⚙️ <b>Change Timeframe</b>\n\nCurrent: <b>${tf} Min</b>\nSelect a new timeframe:`,
      { parse_mode: "HTML", ...settingsTfKeyboard(tf) },
    );
  });

  for (const tf of [1, 2, 3, 5, 10, 15, 30]) {
    bot.action(`tf_${tf}`, async (ctx) => {
      ctx.session.settings.timeframe = tf;
      await ctx.answerCbQuery(`✓ ${tf}Min saved`);
      await ctx.editMessageText(
        `⚙️ <b>Change Timeframe</b>\n\nCurrent: <b>${tf} Min</b>\nSelect a new timeframe:`,
        { parse_mode: "HTML", ...settingsTfKeyboard(tf) },
      );
    });
  }

  // ── Settings: Timezone ─────────────────────────────────────────────────────

  bot.action("settings_tz_open", async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.state = "await_settings_tz";
    const cur = ctx.session.settings.timezone;
    await ctx.editMessageText(
      `🌍 <b>Select Timezone</b>\n\nCurrent: <b>${escapeHtml(tzDisplay(cur))}</b>`,
      { parse_mode: "HTML", ...tzKeyboard() },
    );
  });

  bot.action("back_to_settings", async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.state = "await_settings_tf";
    const tf = ctx.session.settings.timeframe;
    await ctx.editMessageText(
      `⚙️ <b>Change Timeframe</b>\n\nCurrent: <b>${tf} Min</b>\nSelect a new timeframe:`,
      { parse_mode: "HTML", ...settingsTfKeyboard(tf) },
    );
  });

  bot.action(/^tz_(\d+)$/, async (ctx) => {
    const idx = parseInt(ctx.match[1], 10);
    const tz = TIMEZONES[idx];
    if (!tz) return;
    ctx.session.settings.timezone = tz;
    await ctx.answerCbQuery(`✓ ${tzDisplay(tz)} saved`);
    ctx.session.state = "await_settings_tf";
    const tf = ctx.session.settings.timeframe;
    await ctx.editMessageText(
      `⚙️ <b>Change Timeframe</b>\n\nCurrent: <b>${tf} Min</b> | 🌍 <b>${escapeHtml(tzDisplay(tz))}</b>\nTimeframe:`,
      { parse_mode: "HTML", ...settingsTfKeyboard(tf) },
    );
  });

  // ── Launch ─────────────────────────────────────────────────────────────────

  bot.catch((err, ctx) => {
    logger.error({ err, update: ctx.update }, "Bot error");
  });

  bot.launch().then(() => {
    logger.info("Telegram bot started");
  }).catch((err) => {
    logger.error({ err }, "Failed to launch Telegram bot");
  });

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));

  if (ADMIN_CHAT_ID) {
    bot.telegram
      .sendMessage(ADMIN_CHAT_ID, "🤖 <b>TG ADVANCE SIGNAL GENERATOR is online!</b>", { parse_mode: "HTML" })
      .catch(() => {});
  }
}
