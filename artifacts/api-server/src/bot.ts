import { Telegraf, Markup, session } from "telegraf";
import { logger } from "./lib/logger";

const BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"];
const ADMIN_CHAT_ID = process.env["TELEGRAM_ADMIN_CHAT_ID"];

const USERNAME = "qxpro";
const PASSWORD = "82286";

const realAssets = [
  "EURUSD", "EURGBP", "USDJPY", "GBPUSD", "AUDCAD", "GBPCHF", "CADJPY",
];

const otcAssets = [
  "NZDCAD-OTC", "NZDCHF-OTC", "EURCHF-OTC", "CADCHF-OTC", "EURAUD-OTC",
  "AUDCHF-OTC", "USDMXN-OTC", "USDBRL-OTC", "USDARS-OTC", "USDCHF-OTC",
  "USDCOP-OTC", "AUDNZD-OTC", "NZDUSD-OTC", "NZDJPY-OTC", "GBPNZD-OTC",
  "USDIDR-OTC", "USDINR-OTC", "USDNGN-OTC", "USDPHP-OTC", "USDBDT-OTC",
  "USDDZD-OTC", "USDTRY-OTC", "USDEGP-OTC", "USDZAR-OTC", "AUDUSD-OTC",
  "EURCAD-OTC", "GBPAUD-OTC", "EURNZD-OTC",
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
];

interface SessionData {
  state:
    | "idle"
    | "await_username"
    | "await_password"
    | "authenticated"
    | "await_market"
    | "await_assets"
    | "await_direction"
    | "await_method";
  username?: string;
  market?: "real" | "otc";
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

  bot.start(async (ctx) => {
    ctx.session = { state: "await_username" };
    await ctx.reply(
      "🤖 *Welcome to Quantum Signal Generator*\n\nPlease enter your *username*:",
      { parse_mode: "Markdown" },
    );
  });

  bot.command("login", async (ctx) => {
    ctx.session = { state: "await_username" };
    await ctx.reply("Please enter your *username*:", {
      parse_mode: "Markdown",
    });
  });

  bot.command("logout", async (ctx) => {
    ctx.session = { state: "idle" };
    await ctx.reply("👋 Logged out. Use /start to login again.");
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "📋 *Commands*\n\n" +
        "/start — Login and start\n" +
        "/login — Login again\n" +
        "/logout — Log out\n" +
        "/generate — Generate signals (after login)\n" +
        "/help — Show this message",
      { parse_mode: "Markdown" },
    );
  });

  bot.command("generate", async (ctx) => {
    if (ctx.session.state !== "authenticated") {
      await ctx.reply("⛔ Please /login first.");
      return;
    }
    ctx.session.state = "await_market";
    await ctx.reply(
      "📊 *Select Market Type:*",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("🌍 Real Market", "market_real"),
            Markup.button.callback("📈 QUOTEX OTC", "market_otc"),
          ],
        ]),
      },
    );
  });

  bot.on("text", async (ctx) => {
    const text = ctx.message.text.trim();
    const state = ctx.session.state;

    if (state === "await_username") {
      ctx.session.username = text;
      ctx.session.state = "await_password";
      await ctx.reply("🔑 Enter your *password*:", { parse_mode: "Markdown" });
      return;
    }

    if (state === "await_password") {
      if (ctx.session.username === USERNAME && text === PASSWORD) {
        ctx.session.state = "authenticated";
        await ctx.reply(
          "✅ *Login successful!*\n\nUse /generate to create signals or /help for commands.",
          { parse_mode: "Markdown" },
        );
      } else {
        ctx.session.state = "idle";
        await ctx.reply(
          "❌ *Authentication failed.* Use /start to try again.",
          { parse_mode: "Markdown" },
        );
      }
      return;
    }

    if (state !== "authenticated") {
      await ctx.reply("Use /start to begin.");
    }
  });

  bot.action("market_real", async (ctx) => {
    if (ctx.session.state !== "await_market") return;
    ctx.session.market = "real";
    ctx.session.state = "await_assets";
    await ctx.answerCbQuery();
    const buttons = realAssets.map((a) =>
      Markup.button.callback(a, `asset_${a}`),
    );
    const rows: ReturnType<typeof Markup.button.callback>[][] = [];
    for (let i = 0; i < buttons.length; i += 3) {
      rows.push(buttons.slice(i, i + 3));
    }
    rows.push([Markup.button.callback("✅ Done selecting", "assets_done")]);
    ctx.session.selectedAssets = [];
    await ctx.editMessageText(
      "📌 *Select assets* (tap to toggle, then press Done):\n\n_Selected: none_",
      { parse_mode: "Markdown", ...Markup.inlineKeyboard(rows) },
    );
  });

  bot.action("market_otc", async (ctx) => {
    if (ctx.session.state !== "await_market") return;
    ctx.session.market = "otc";
    ctx.session.state = "await_assets";
    await ctx.answerCbQuery();
    const buttons = otcAssets.map((a) =>
      Markup.button.callback(a, `asset_${a}`),
    );
    const rows: ReturnType<typeof Markup.button.callback>[][] = [];
    for (let i = 0; i < buttons.length; i += 3) {
      rows.push(buttons.slice(i, i + 3));
    }
    rows.push([Markup.button.callback("✅ Done selecting", "assets_done")]);
    ctx.session.selectedAssets = [];
    await ctx.editMessageText(
      "📌 *Select assets* (tap to toggle, then press Done):\n\n_Selected: none_",
      { parse_mode: "Markdown", ...Markup.inlineKeyboard(rows) },
    );
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
    const assets =
      ctx.session.market === "real" ? realAssets : otcAssets;

    const buttons = assets.map((a) => {
      const isSelected = selected.includes(a);
      return Markup.button.callback(
        isSelected ? `✔ ${a}` : a,
        `asset_${a}`,
      );
    });
    const rows: ReturnType<typeof Markup.button.callback>[][] = [];
    for (let i = 0; i < buttons.length; i += 3) {
      rows.push(buttons.slice(i, i + 3));
    }
    rows.push([Markup.button.callback("✅ Done selecting", "assets_done")]);

    await ctx.answerCbQuery(
      idx === -1 ? `Added: ${asset}` : `Removed: ${asset}`,
    );
    await ctx.editMessageText(
      `📌 *Select assets* (tap to toggle, then press Done):\n\n_Selected: ${selected.length > 0 ? selected.join(", ") : "none"}_`,
      { parse_mode: "Markdown", ...Markup.inlineKeyboard(rows) },
    );
  });

  bot.action("assets_done", async (ctx) => {
    await ctx.answerCbQuery();
    const selected = ctx.session.selectedAssets ?? [];
    if (selected.length < 5) {
      await ctx.answerCbQuery(
        "⚠️ Please select at least 5 assets!",
        { show_alert: true },
      );
      return;
    }
    ctx.session.state = "await_direction";
    await ctx.editMessageText(
      `✅ *${selected.length} assets selected.*\n\n📊 Filter direction:`,
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

      ctx.session.state = "authenticated";

      if (signals.length === 0) {
        await ctx.editMessageText(
          "⚠️ No signals matched your filters. Try /generate again with different settings.",
        );
        return;
      }

      const header =
        `🚀 *Quantum Signal Generator*\n` +
        `📅 ${new Date().toUTCString()}\n` +
        `Market: *${ctx.session.market?.toUpperCase()}* | Direction: *${direction}*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n`;

      const chunkSize = 20;
      for (let i = 0; i < signals.length; i += chunkSize) {
        const chunk = signals.slice(i, i + chunkSize);
        const body = chunk.join("\n");
        if (i === 0) {
          await ctx.editMessageText(header + body, {
            parse_mode: "Markdown",
          });
        } else {
          await ctx.reply(body, { parse_mode: "Markdown" });
        }
      }

      await ctx.reply(
        `✅ *${signals.length} signals generated.*\nUse /generate to create new signals.`,
        { parse_mode: "Markdown" },
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
    bot.telegram.sendMessage(
      ADMIN_CHAT_ID,
      "🤖 *Quantum Signal Bot is online!*\nSend /start to any user to begin.",
      { parse_mode: "Markdown" },
    ).catch(() => {});
  }
}
