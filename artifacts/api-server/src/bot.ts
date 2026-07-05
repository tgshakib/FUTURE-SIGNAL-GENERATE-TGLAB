import { Telegraf, Markup, session } from "telegraf";
import { logger } from "./lib/logger";

const BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"];
const ADMIN_CHAT_ID = process.env["TELEGRAM_ADMIN_CHAT_ID"];

const realAssets = [
  "AUD/CAD", "AUD/CHF", "AUD/JPY", "AUD/USD",
  "CAD/JPY", "CHF/JPY",
  "EUR/AUD", "EUR/CAD", "EUR/CHF", "EUR/GBP", "EUR/JPY", "EUR/USD",
  "GBP/AUD", "GBP/CAD", "GBP/CHF", "GBP/JPY", "GBP/USD",
  "USD/CAD", "USD/CHF", "USD/JPY",
  "Silver", "Gold",
];

const quotexOtcAssets = [
  "AUD/CAD (OTC)", "AUD/CHF (OTC)", "AUD/JPY (OTC)", "AUD/NZD (OTC)", "AUD/USD (OTC)",
  "Avalanche (OTC)", "Axie Infinity (OTC)",
  "Bitcoin Cash (OTC)", "Binance Coin (OTC)", "USD/BRL (OTC)", "Bitcoin (OTC)",
  "CAD/CHF (OTC)", "CAD/JPY (OTC)", "CHF/JPY (OTC)",
  "Dash (OTC)", "Polkadot (OTC)", "Ethereum Classic (OTC)", "Ethereum (OTC)",
  "EUR/AUD (OTC)", "EUR/CAD (OTC)", "EUR/CHF (OTC)", "EUR/GBP (OTC)",
  "EUR/JPY (OTC)", "EUR/NZD (OTC)", "EUR/USD (OTC)",
  "GBP/AUD (OTC)", "GBP/CAD (OTC)", "GBP/CHF (OTC)", "GBP/JPY (OTC)",
  "GBP/NZD (OTC)", "GBP/USD (OTC)",
  "Chainlink (OTC)", "Litecoin (OTC)",
  "NZD/CAD (OTC)", "NZD/CHF (OTC)", "NZD/JPY (OTC)", "NZD/USD (OTC)",
  "Solana (OTC)", "Toncoin (OTC)", "Trump (OTC)",
  "UKBrent (OTC)", "USCrude (OTC)",
  "USD/ARS (OTC)", "USD/BDT (OTC)", "USD/CAD (OTC)", "USD/CHF (OTC)",
  "USD/COP (OTC)", "USD/DZD (OTC)", "USD/EGP (OTC)", "USD/IDR (OTC)",
  "USD/INR (OTC)", "USD/JPY (OTC)", "USD/MXN (OTC)", "USD/NGN (OTC)",
  "USD/PHP (OTC)", "USD/PKR (OTC)", "USD/ZAR (OTC)",
  "Silver (OTC)", "Gold (OTC)", "Ripple (OTC)", "Zcash (OTC)",
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

type MarketType = "real" | "quotex" | "po" | "iq" | "olymp";

interface SessionData {
  state: "idle" | "await_market" | "await_assets" | "await_direction";
  market?: MarketType;
  selectedAssets?: string[];
  direction?: "BOTH" | "CALL" | "PUT";
}

type MyContext = import("telegraf").Context & {
  session: SessionData;
};

const MIN_ASSETS = 1;
const MAX_ASSETS = 5;
const SIGNALS_PER_ASSET = 19;

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function getAssetsForMarket(market: MarketType): string[] {
  if (market === "real") return realAssets;
  if (market === "quotex") return quotexOtcAssets;
  return brokerSharedOtcAssets;
}

function marketLabel(market: MarketType): string {
  const labels: Record<MarketType, string> = {
    real: "REAL MARKET",
    quotex: "QUOTEX OTC",
    po: "POCKET OPTION OTC",
    iq: "IQ OPTION OTC",
    olymp: "OLYMP TRADE OTC",
  };
  return labels[market];
}

function formatAssetName(asset: string, market: MarketType): string {
  if (market === "real") {
    return asset.replace(/\//g, "");
  }
  const name = asset
    .replace(/\s*\(OTC\)\s*/gi, "")
    .replace(/\s+OTC\s*$/gi, "")
    .replace(/\//g, "")
    .replace(/\s+/g, "")
    .trim();
  return `${name}-OTC`;
}

function buildSignalMessage(
  assets: string[],
  direction: "BOTH" | "CALL" | "PUT",
  market: MarketType,
): string {
  const isOtc = market !== "real";

  const nowUtc = new Date();
  const utc6Offset = 6 * 60 * 60 * 1000;
  const nowBD = new Date(nowUtc.getTime() + utc6Offset);

  const dd = pad2(nowBD.getUTCDate());
  const mm = pad2(nowBD.getUTCMonth() + 1);
  const yyyy = nowBD.getUTCFullYear();

  const header = [
    `━━━━━━━━━・━━━━━━━━━`,
    `            𝗗𝗮𝘁𝗲: ${dd}/${mm}/${yyyy}`,
    `  𝗧𝗶𝗺𝗲 𝗭𝗼𝗻𝗲: +6:00 🇧🇩`,
    `𝗘𝘅𝗽𝗶𝗿𝘆 𝗧𝗶𝗺𝗲: 1 MINUTES LIST`,
    `𝗠𝗮𝗿𝘁𝗶𝗻𝗴𝗮𝗹𝗲: 1 STEP MTG`,
    `(IF LOSS THEN USE ONE STEP AUTO MTG)`,
    `Market: ${marketLabel(market)}`,
    `•••••••••••••••••••••••••••••••••••••••`,
    ` Community @TRADERGUIDE_BOT`,
    `•••••••••••••••••••••••••••••••••••••••`,
    ``,
    `     1𝗠𝗶𝗻𝘂𝘁𝗲𝘀`,
    ``,
  ].join("\n");

  const assetBlocks: string[] = [];

  for (const asset of assets) {
    const dir: "CALL" | "PUT" =
      direction === "BOTH"
        ? Math.random() < 0.5
          ? "CALL"
          : "PUT"
        : direction;

    const displayName = formatAssetName(asset, market);

    const startMinutesFromNow = 1 + Math.floor(Math.random() * 5);
    let cursor = new Date(
      nowBD.getTime() + startMinutesFromNow * 60000,
    );

    const times: string[] = [];
    for (let i = 0; i < SIGNALS_PER_ASSET; i++) {
      times.push(
        `${pad2(cursor.getUTCHours())}:${pad2(cursor.getUTCMinutes())}`,
      );
      const interval = 7 + Math.floor(Math.random() * 7);
      cursor = new Date(cursor.getTime() + interval * 60000);
    }

    if (isOtc) {
      const blockHeader = `▎${displayName}`;
      const lines = times.map((t) => `${t} ${displayName} ${dir}`);
      assetBlocks.push([blockHeader, ...lines].join("\n"));
    } else {
      const blockHeader = `▎${displayName} ${dir}`;
      const lines = times.map((t) => `${t} ${displayName} ${dir}`);
      assetBlocks.push([blockHeader, ...lines].join("\n"));
    }
  }

  return header + assetBlocks.join("\n\n");
}

const marketKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("🌍 Real Market", "market_real")],
  [Markup.button.callback("📈 Quotex OTC", "market_quotex")],
  [Markup.button.callback("💼 Pocket Option OTC", "market_po")],
  [Markup.button.callback("📊 IQ Option OTC", "market_iq")],
  [Markup.button.callback("🏦 Olymp Trade OTC", "market_olymp")],
  [Markup.button.callback("🔙 Back", "back_to_menu")],
]);

function buildAssetKeyboard(
  assets: string[],
  selected: string[],
): ReturnType<typeof Markup.inlineKeyboard> {
  const buttons = assets.map((a) => {
    const isSelected = selected.includes(a);
    return Markup.button.callback(isSelected ? `✔ ${a}` : a, `asset_${a}`);
  });
  const rows: ReturnType<typeof Markup.button.callback>[][] = [];
  for (let i = 0; i < buttons.length; i += 3) {
    rows.push(buttons.slice(i, i + 3));
  }
  rows.push([
    Markup.button.callback("✅ Done", "assets_done"),
    Markup.button.callback("🔙 Back", "back_to_market"),
  ]);
  return Markup.inlineKeyboard(rows);
}

function directionKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("↕ Both", "dir_BOTH"),
      Markup.button.callback("📈 CALL", "dir_CALL"),
      Markup.button.callback("📉 PUT", "dir_PUT"),
    ],
    [Markup.button.callback("🔙 Back", "back_to_assets")],
  ]);
}

export function startBot(): void {
  if (!BOT_TOKEN) {
    logger.warn("TELEGRAM_BOT_TOKEN not set — bot will not start");
    return;
  }

  const bot = new Telegraf<MyContext>(BOT_TOKEN);

  bot.use(
    session({
      defaultSession: (): SessionData => ({ state: "idle" }),
    }),
  );

  bot.telegram.setMyCommands([
    { command: "start", description: "Start the bot" },
    { command: "futuresignal", description: "Generate future signals" },
    { command: "help", description: "Show help" },
  ]).catch(() => {});

  async function sendMainMenu(ctx: MyContext): Promise<void> {
    await ctx.reply(
      "🤖 *TG ADVANCE SIGNAL GENERATOR*\n\nWelcome! Choose an option below:",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("🔮 FUTURE SIGNAL • TG", "futuresignal")],
        ]),
      },
    );
  }

  bot.start(async (ctx) => {
    ctx.session = { state: "idle" };
    await sendMainMenu(ctx);
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "📋 *Commands*\n\n" +
        "/start — Start the bot\n" +
        "/futuresignal — Generate future signals\n" +
        "/help — Show this message",
      { parse_mode: "Markdown" },
    );
  });

  bot.command("futuresignal", async (ctx) => {
    ctx.session.state = "await_market";
    await ctx.reply("📊 *Select Market Type:*", {
      parse_mode: "Markdown",
      ...marketKeyboard,
    });
  });

  bot.action("futuresignal", async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.state = "await_market";
    await ctx.editMessageText("📊 *Select Market Type:*", {
      parse_mode: "Markdown",
      ...marketKeyboard,
    });
  });

  bot.action("back_to_menu", async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session = { state: "idle" };
    await ctx.editMessageText(
      "🤖 *TG ADVANCE SIGNAL GENERATOR*\n\nWelcome! Choose an option below:",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("🔮 FUTURE SIGNAL • TG", "futuresignal")],
        ]),
      },
    );
  });

  bot.action("back_to_market", async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.state = "await_market";
    ctx.session.selectedAssets = [];
    await ctx.editMessageText("📊 *Select Market Type:*", {
      parse_mode: "Markdown",
      ...marketKeyboard,
    });
  });

  bot.action("back_to_assets", async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.state = "await_assets";
    const assets = getAssetsForMarket(ctx.session.market ?? "real");
    const selected = ctx.session.selectedAssets ?? [];
    await ctx.editMessageText(
      `📌 *Select assets* (min ${MIN_ASSETS}, max ${MAX_ASSETS}):\n\n_Selected: ${selected.length > 0 ? selected.join(", ") : "none"}_`,
      {
        parse_mode: "Markdown",
        ...buildAssetKeyboard(assets, selected),
      },
    );
  });

  async function handleMarketSelect(
    ctx: MyContext,
    market: MarketType,
  ): Promise<void> {
    ctx.session.market = market;
    ctx.session.state = "await_assets";
    ctx.session.selectedAssets = [];
    const assets = getAssetsForMarket(market);
    await ctx.editMessageText(
      `📌 *Select assets* (min ${MIN_ASSETS}, max ${MAX_ASSETS}):\n\n_Selected: none_`,
      {
        parse_mode: "Markdown",
        ...buildAssetKeyboard(assets, []),
      },
    );
  }

  bot.action("market_real", async (ctx) => {
    if (ctx.session.state !== "await_market") return;
    await ctx.answerCbQuery();
    await handleMarketSelect(ctx, "real");
  });
  bot.action("market_quotex", async (ctx) => {
    if (ctx.session.state !== "await_market") return;
    await ctx.answerCbQuery();
    await handleMarketSelect(ctx, "quotex");
  });
  bot.action("market_po", async (ctx) => {
    if (ctx.session.state !== "await_market") return;
    await ctx.answerCbQuery();
    await handleMarketSelect(ctx, "po");
  });
  bot.action("market_iq", async (ctx) => {
    if (ctx.session.state !== "await_market") return;
    await ctx.answerCbQuery();
    await handleMarketSelect(ctx, "iq");
  });
  bot.action("market_olymp", async (ctx) => {
    if (ctx.session.state !== "await_market") return;
    await ctx.answerCbQuery();
    await handleMarketSelect(ctx, "olymp");
  });

  bot.action(/^asset_(.+)$/, async (ctx) => {
    if (ctx.session.state !== "await_assets") return;
    const asset = ctx.match[1];
    if (!ctx.session.selectedAssets) ctx.session.selectedAssets = [];

    const selected = ctx.session.selectedAssets;
    const idx = selected.indexOf(asset);

    if (idx === -1) {
      if (selected.length >= MAX_ASSETS) {
        await ctx.answerCbQuery(`⚠️ Maximum ${MAX_ASSETS} assets allowed!`, {
          show_alert: true,
        });
        return;
      }
      selected.push(asset);
      await ctx.answerCbQuery(`✔ ${asset}`);
    } else {
      selected.splice(idx, 1);
      await ctx.answerCbQuery(`✖ ${asset}`);
    }

    const assets = getAssetsForMarket(ctx.session.market ?? "real");
    await ctx.editMessageText(
      `📌 *Select assets* (min ${MIN_ASSETS}, max ${MAX_ASSETS}):\n\n_Selected: ${selected.length > 0 ? selected.join(", ") : "none"}_`,
      {
        parse_mode: "Markdown",
        ...buildAssetKeyboard(assets, selected),
      },
    );
  });

  bot.action("assets_done", async (ctx) => {
    const selected = ctx.session.selectedAssets ?? [];
    if (selected.length < MIN_ASSETS) {
      await ctx.answerCbQuery(`⚠️ Please select at least ${MIN_ASSETS} asset!`, {
        show_alert: true,
      });
      return;
    }
    await ctx.answerCbQuery();
    ctx.session.state = "await_direction";
    await ctx.editMessageText(
      `✅ *${selected.length} asset(s) selected.*\n\n📊 Filter signal direction:`,
      {
        parse_mode: "Markdown",
        ...directionKeyboard(),
      },
    );
  });

  for (const dir of ["BOTH", "CALL", "PUT"] as const) {
    bot.action(`dir_${dir}`, async (ctx) => {
      if (ctx.session.state !== "await_direction") return;
      await ctx.answerCbQuery("⏳ Generating signals...");

      const assets = ctx.session.selectedAssets ?? [];
      const market = ctx.session.market ?? "real";
      ctx.session.state = "idle";

      const signalText = buildSignalMessage(assets, dir, market);

      const MAX_LEN = 4000;
      if (signalText.length <= MAX_LEN) {
        await ctx.editMessageText(signalText);
      } else {
        const parts: string[] = [];
        let remaining = signalText;
        while (remaining.length > 0) {
          const cut = remaining.lastIndexOf("\n\n", MAX_LEN);
          const splitAt = cut > 0 && remaining.length > MAX_LEN ? cut : Math.min(MAX_LEN, remaining.length);
          parts.push(remaining.slice(0, splitAt));
          remaining = remaining.slice(splitAt).trimStart();
        }
        await ctx.editMessageText(parts[0]!);
        for (let i = 1; i < parts.length; i++) {
          await ctx.reply(parts[i]!);
        }
      }

      await ctx.reply(
        `✅ *${assets.length} pair(s) — ${SIGNALS_PER_ASSET} signals each.*`,
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [Markup.button.callback("🔮 FUTURE SIGNAL • TG", "futuresignal")],
          ]),
        },
      );
    });
  }

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
      .sendMessage(
        ADMIN_CHAT_ID,
        "🤖 *TG ADVANCE SIGNAL GENERATOR is online!*",
        { parse_mode: "Markdown" },
      )
      .catch(() => {});
  }
}
