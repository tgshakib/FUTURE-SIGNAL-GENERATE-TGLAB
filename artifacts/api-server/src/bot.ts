import { Telegraf, Markup, session } from "telegraf";
import { logger } from "./lib/logger";

const BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"];
const ADMIN_CHAT_ID = process.env["TELEGRAM_ADMIN_CHAT_ID"];

const realAssets = [
  "EURUSD", "EURGBP", "USDJPY", "GBPUSD", "AUDCAD", "GBPCHF", "CADJPY",
];

const quotexOtcAssets = [
  "NZDCAD-OTC", "NZDCHF-OTC", "EURCHF-OTC", "CADCHF-OTC", "EURAUD-OTC",
  "AUDCHF-OTC", "USDMXN-OTC", "USDBRL-OTC", "USDARS-OTC", "USDCHF-OTC",
  "USDCOP-OTC", "AUDNZD-OTC", "NZDUSD-OTC", "NZDJPY-OTC", "GBPNZD-OTC",
  "USDIDR-OTC", "USDINR-OTC", "USDNGN-OTC", "USDPHP-OTC", "USDBDT-OTC",
  "USDDZD-OTC", "USDTRY-OTC", "USDEGP-OTC", "USDZAR-OTC", "AUDUSD-OTC",
  "EURCAD-OTC", "GBPAUD-OTC", "EURNZD-OTC",
];

const pocketOptionOtcAssets = [
  "EURUSD-PO", "GBPUSD-PO", "USDJPY-PO", "AUDUSD-PO", "USDCAD-PO",
  "USDCHF-PO", "EURGBP-PO", "EURJPY-PO", "GBPJPY-PO", "CADJPY-PO",
  "AUDCAD-PO", "NZDUSD-PO", "EURCHF-PO", "AUDCHF-PO", "CADCHF-PO",
  "GBPCHF-PO", "AUDJPY-PO", "CHFJPY-PO", "EURAUD-PO", "GBPAUD-PO",
  "EURCAD-PO", "GBPCAD-PO", "AUDNZD-PO", "NZDCAD-PO", "NZDCHF-PO",
  "NZDJPY-PO", "GBPNZD-PO", "EURNZD-PO",
];

const predefinedSignals: { asset: string; direction: "CALL" | "PUT" }[] = [
  { asset: "USDMXN-OTC", direction: "PUT" },
  { asset: "USDCOP-OTC", direction: "CALL" },
  { asset: "USDIDR-OTC", direction: "PUT" },
  { asset: "USDEGP-OTC", direction: "CALL" },
  { asset: "USDARS-OTC", direction: "CALL" },
  { asset: "USDPHP-OTC", direction: "CALL" },
  { asset: "USDDZD-OTC", direction: "PUT" },
  { asset: "USDNGN-OTC", direction: "PUT" },
  { asset: "USDMXN-OTC", direction: "CALL" },
  { asset: "USDINR-OTC", direction: "CALL" },
  { asset: "USDIDR-OTC", direction: "PUT" },
  { asset: "USDBRL-OTC", direction: "CALL" },
  { asset: "USDCOP-OTC", direction: "PUT" },
  { asset: "USDBDT-OTC", direction: "PUT" },
  { asset: "USDARS-OTC", direction: "PUT" },
  { asset: "USDPHP-OTC", direction: "PUT" },
  { asset: "USDEGP-OTC", direction: "PUT" },
  { asset: "USDNGN-OTC", direction: "CALL" },
  { asset: "NZDCAD-OTC", direction: "CALL" },
  { asset: "EURUSD-PO", direction: "CALL" },
  { asset: "GBPUSD-PO", direction: "PUT" },
  { asset: "USDJPY-PO", direction: "CALL" },
  { asset: "AUDUSD-PO", direction: "PUT" },
  { asset: "USDCAD-PO", direction: "CALL" },
  { asset: "EURJPY-PO", direction: "PUT" },
  { asset: "GBPJPY-PO", direction: "CALL" },
  { asset: "NZDUSD-PO", direction: "PUT" },
];

type MarketType = "real" | "quotex" | "po";

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

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function getAssetsForMarket(market: MarketType): string[] {
  if (market === "real") return realAssets;
  if (market === "quotex") return quotexOtcAssets;
  return pocketOptionOtcAssets;
}

function marketLabel(market: MarketType): string {
  if (market === "real") return "REAL MARKET";
  if (market === "quotex") return "QUOTEX OTC";
  return "POCKET OPTION OTC";
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
  rows.push([Markup.button.callback("✅ Done selecting", "assets_done")]);
  return Markup.inlineKeyboard(rows);
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
    await ctx.reply(
      "📊 *Select Market Type:*",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("🌍 Real Market", "market_real")],
          [Markup.button.callback("📈 Quotex OTC", "market_quotex")],
          [Markup.button.callback("💼 Pocket Option OTC", "market_po")],
        ]),
      },
    );
  });

  bot.action("futuresignal", async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.state = "await_market";
    await ctx.editMessageText(
      "📊 *Select Market Type:*",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("🌍 Real Market", "market_real")],
          [Markup.button.callback("📈 Quotex OTC", "market_quotex")],
          [Markup.button.callback("💼 Pocket Option OTC", "market_po")],
        ]),
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
      "📌 *Select assets* (tap to toggle, then press Done):\n\n_Selected: none_",
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

  bot.action(/^asset_(.+)$/, async (ctx) => {
    if (ctx.session.state !== "await_assets") return;
    const asset = ctx.match[1];
    if (!ctx.session.selectedAssets) ctx.session.selectedAssets = [];

    const idx = ctx.session.selectedAssets.indexOf(asset);
    if (idx === -1) {
      ctx.session.selectedAssets.push(asset);
    } else {
      ctx.session.selectedAssets.splice(idx, 1);
    }

    const selected = ctx.session.selectedAssets;
    const assets = getAssetsForMarket(ctx.session.market ?? "real");

    await ctx.answerCbQuery(idx === -1 ? `✔ ${asset}` : `✖ ${asset}`);
    await ctx.editMessageText(
      `📌 *Select assets* (tap to toggle, then press Done):\n\n_Selected: ${selected.length > 0 ? selected.join(", ") : "none"}_`,
      {
        parse_mode: "Markdown",
        ...buildAssetKeyboard(assets, selected),
      },
    );
  });

  bot.action("assets_done", async (ctx) => {
    const selected = ctx.session.selectedAssets ?? [];
    if (selected.length < 5) {
      await ctx.answerCbQuery("⚠️ Please select at least 5 assets!", {
        show_alert: true,
      });
      return;
    }
    await ctx.answerCbQuery();
    ctx.session.state = "await_direction";
    await ctx.editMessageText(
      `✅ *${selected.length} assets selected.*\n\n📊 Filter signal direction:`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("↕ Both", "dir_BOTH"),
            Markup.button.callback("📈 CALL", "dir_CALL"),
            Markup.button.callback("📉 PUT", "dir_PUT"),
          ],
        ]),
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
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback("🎲 Generate", "method_generate"),
              Markup.button.callback("📋 Predefined", "method_predefined"),
            ],
          ]),
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
      const signals = generateSignals(assets, direction, method);
      const market = ctx.session.market ?? "real";

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
