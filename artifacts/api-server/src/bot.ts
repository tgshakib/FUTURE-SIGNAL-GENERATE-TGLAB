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

const predefinedSignals: { asset: string; direction: "CALL" | "PUT" }[] = [
  { asset: "EUR/USD", direction: "CALL" },
  { asset: "GBP/USD", direction: "PUT" },
  { asset: "USD/JPY", direction: "CALL" },
  { asset: "AUD/USD", direction: "PUT" },
  { asset: "USD/CAD", direction: "CALL" },
  { asset: "EUR/JPY", direction: "PUT" },
  { asset: "GBP/JPY", direction: "CALL" },
  { asset: "EUR/GBP", direction: "PUT" },
  { asset: "AUD/CAD", direction: "CALL" },
  { asset: "CHF/JPY", direction: "PUT" },
  { asset: "Gold", direction: "CALL" },
  { asset: "Silver", direction: "PUT" },
  { asset: "USD/MXN (OTC)", direction: "PUT" },
  { asset: "USD/COP (OTC)", direction: "CALL" },
  { asset: "USD/IDR (OTC)", direction: "PUT" },
  { asset: "USD/EGP (OTC)", direction: "CALL" },
  { asset: "USD/ARS (OTC)", direction: "CALL" },
  { asset: "USD/PHP (OTC)", direction: "CALL" },
  { asset: "USD/DZD (OTC)", direction: "PUT" },
  { asset: "USD/NGN (OTC)", direction: "PUT" },
  { asset: "USD/INR (OTC)", direction: "CALL" },
  { asset: "USD/BRL (OTC)", direction: "CALL" },
  { asset: "USD/BDT (OTC)", direction: "PUT" },
  { asset: "USD/ZAR (OTC)", direction: "PUT" },
  { asset: "Bitcoin (OTC)", direction: "CALL" },
  { asset: "Ethereum (OTC)", direction: "PUT" },
  { asset: "Solana (OTC)", direction: "CALL" },
  { asset: "Gold (OTC)", direction: "CALL" },
  { asset: "NZD/CAD (OTC)", direction: "CALL" },
  { asset: "Solana OTC", direction: "CALL" },
  { asset: "Gold OTC", direction: "CALL" },
  { asset: "BNB OTC", direction: "PUT" },
  { asset: "Toncoin OTC", direction: "CALL" },
  { asset: "Microsoft OTC", direction: "CALL" },
  { asset: "Netflix OTC", direction: "PUT" },
  { asset: "EUR/JPY OTC", direction: "CALL" },
  { asset: "GBP/JPY OTC", direction: "PUT" },
  { asset: "USD/CHF OTC", direction: "CALL" },
  { asset: "AUD/CAD OTC", direction: "PUT" },
  { asset: "USD/SGD OTC", direction: "CALL" },
  { asset: "Gold OTC", direction: "CALL" },
  { asset: "Litecoin OTC", direction: "PUT" },
];

type MarketType = "real" | "quotex" | "po" | "iq" | "olymp";

interface SessionData {
  state: "idle" | "await_market" | "await_assets" | "await_direction" | "await_method";
  market?: MarketType;
  selectedAssets?: string[];
  direction?: "BOTH" | "CALL" | "PUT";
  method?: "generate" | "predefined";
}

type MyContext = import("telegraf").Context & {
  session: SessionData;
};

const MIN_ASSETS = 1;
const MAX_ASSETS = 5;

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

function generateSignals(
  assets: string[],
  direction: "BOTH" | "CALL" | "PUT",
  method: "generate" | "predefined",
): string[] {
  const signals: string[] = [];
  const now = new Date();

  if (method === "generate") {
    for (let i = 0; i < 12; i++) {
      for (const asset of assets) {
        const time = new Date(now.getTime() + i * 5 * 60000);
        const dir: "CALL" | "PUT" = Math.random() < 0.5 ? "CALL" : "PUT";
        if (direction === "BOTH" || dir === direction) {
          signals.push(
            `🕐 ${pad2(time.getHours())}:${pad2(time.getMinutes())}  |  ${asset}  |  ${dir === "CALL" ? "📈 CALL" : "📉 PUT"}`,
          );
        }
      }
    }
  } else {
    for (const s of predefinedSignals) {
      if (
        assets.includes(s.asset) &&
        (direction === "BOTH" || s.direction === direction)
      ) {
        const hour = 14 + Math.floor(Math.random() * 10);
        const min = Math.floor(Math.random() * 60);
        signals.push(
          `🕐 ${pad2(hour)}:${pad2(min)}  |  ${s.asset}  |  ${s.direction === "CALL" ? "📈 CALL" : "📉 PUT"}`,
        );
      }
    }
  }

  return signals;
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

function methodKeyboard(): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("🎲 Generate", "method_generate"),
      Markup.button.callback("📋 Predefined", "method_predefined"),
    ],
    [Markup.button.callback("🔙 Back", "back_to_direction")],
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

  bot.action("back_to_direction", async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.state = "await_direction";
    const selected = ctx.session.selectedAssets ?? [];
    await ctx.editMessageText(
      `✅ *${selected.length} asset(s) selected.*\n\n📊 Filter signal direction:`,
      {
        parse_mode: "Markdown",
        ...directionKeyboard(),
      },
    );
  });

  async function handleMarketSelect(ctx: MyContext, market: MarketType): Promise<void> {
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
      ctx.session.direction = dir;
      ctx.session.state = "await_method";
      await ctx.answerCbQuery();
      await ctx.editMessageText(
        `Direction: *${dir}*\n\n⚙️ Select signal method:`,
        {
          parse_mode: "Markdown",
          ...methodKeyboard(),
        },
      );
    });
  }

  for (const method of ["generate", "predefined"] as const) {
    bot.action(`method_${method}`, async (ctx) => {
      if (ctx.session.state !== "await_method") return;
      await ctx.answerCbQuery();

      const assets = ctx.session.selectedAssets ?? [];
      const direction = ctx.session.direction ?? "BOTH";
      const market = ctx.session.market ?? "real";
      const signals = generateSignals(assets, direction, method);

      ctx.session.state = "idle";

      if (signals.length === 0) {
        await ctx.editMessageText(
          "⚠️ No signals matched your filters. Tap the button below to try again.",
          {
            ...Markup.inlineKeyboard([
              [Markup.button.callback("🔮 FUTURE SIGNAL • TG", "futuresignal")],
            ]),
          },
        );
        return;
      }

      const header =
        `🚀 *TG ADVANCE SIGNAL GENERATOR*\n` +
        `📅 ${new Date().toUTCString()}\n` +
        `Market: *${marketLabel(market)}* | Direction: *${direction}*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n`;

      const chunkSize = 20;
      for (let i = 0; i < signals.length; i += chunkSize) {
        const chunk = signals.slice(i, i + chunkSize);
        const body = chunk.join("\n");
        if (i === 0) {
          await ctx.editMessageText(header + body, { parse_mode: "Markdown" });
        } else {
          await ctx.reply(body, { parse_mode: "Markdown" });
        }
      }

      await ctx.reply(
        `✅ *${signals.length} signals generated.*`,
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
