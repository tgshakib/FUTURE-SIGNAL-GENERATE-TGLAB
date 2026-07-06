/**
 * Broker Adapter Layer
 *
 * Defines a common interface for broker market-data connectors.
 * All OTC brokers (Pocket Option, IQ Option, Olymp Trade) do NOT have
 * official public APIs. Connectors below use unofficial/community
 * reverse-engineered protocols and are marked EXPERIMENTAL.
 *
 * ⚠️  Do NOT hardcode credentials. Pass them at runtime via session or env.
 */

import { logger } from "./logger";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Candle {
  time: number;   // unix ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface BrokerAdapter {
  readonly name: string;
  readonly isExperimental: boolean;
  connect(credentials?: Record<string, string>): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getCandles(asset: string, tfMinutes: number, count: number): Promise<Candle[]>;
  getAvailableAssets(): Promise<string[]>;
  /** Called periodically to verify the connection is still alive. */
  heartbeat(): Promise<boolean>;
  startHeartbeat(intervalMs?: number): void;
  stopHeartbeat(): void;
}

export type AdapterStatus = "disconnected" | "connecting" | "connected" | "error";

// ─── Base Adapter ──────────────────────────────────────────────────────────────

abstract class BaseAdapter implements BrokerAdapter {
  abstract readonly name: string;
  abstract readonly isExperimental: boolean;

  protected _status: AdapterStatus = "disconnected";
  protected _retryCount = 0;
  private   _heartbeatTimer?: NodeJS.Timeout;

  isConnected(): boolean { return this._status === "connected"; }

  abstract connect(credentials?: Record<string, string>): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract getCandles(asset: string, tfMinutes: number, count: number): Promise<Candle[]>;
  abstract getAvailableAssets(): Promise<string[]>;

  async heartbeat(): Promise<boolean> {
    if (!this.isConnected()) {
      logger.warn({ adapter: this.name }, "Heartbeat: adapter not connected");
      return false;
    }
    return true;
  }

  /** Starts a periodic heartbeat every `intervalMs` ms. */
  startHeartbeat(intervalMs = 30_000): void {
    this.stopHeartbeat();
    this._heartbeatTimer = setInterval(async () => {
      const ok = await this.heartbeat().catch(() => false);
      if (!ok) {
        logger.warn({ adapter: this.name }, "Heartbeat failed — attempting reconnect");
        await this.connect().catch(err =>
          logger.error({ err, adapter: this.name }, "Reconnect after heartbeat failure"),
        );
      }
    }, intervalMs);
  }

  stopHeartbeat(): void {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = undefined;
    }
  }

  protected log(msg: string, extra?: object): void {
    logger.info({ adapter: this.name, ...extra }, msg);
  }

  protected logError(err: unknown, msg: string): void {
    logger.error({ err, adapter: this.name }, msg);
  }
}

// ─── Quotex OTC Adapter ────────────────────────────────────────────────────────
// Status: ALGORITHMIC — no official API; uses built-in asset list.

export class QuotexOtcAdapter extends BaseAdapter {
  readonly name = "Quotex OTC";
  readonly isExperimental = false; // uses built-in algorithmic generation

  async connect(): Promise<void> {
    this._status = "connected";
    this.log("Connected (algorithmic mode)");
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    this._status = "disconnected";
    this.log("Disconnected");
  }

  async getAvailableAssets(): Promise<string[]> {
    return [
      "AUD/CAD (OTC)", "AUD/CHF (OTC)", "AUD/JPY (OTC)", "AUD/NZD (OTC)", "AUD/USD (OTC)",
      "EUR/USD (OTC)", "GBP/USD (OTC)", "USD/JPY (OTC)", "USD/CAD (OTC)", "USD/CHF (OTC)",
      "EUR/GBP (OTC)", "EUR/JPY (OTC)", "GBP/JPY (OTC)", "EUR/CAD (OTC)", "EUR/CHF (OTC)",
      "Bitcoin (OTC)", "Ethereum (OTC)", "Gold (OTC)", "Silver (OTC)", "Litecoin (OTC)",
    ];
  }

  async getCandles(asset: string, tfMinutes: number, count: number): Promise<Candle[]> {
    return generateAlgorithmicCandles(asset, tfMinutes, count);
  }
}

// ─── Pocket Option OTC Adapter ─────────────────────────────────────────────────
// Status: EXPERIMENTAL — no official public API.
// Uses unofficial WebSocket protocol (reverse-engineered, may break without notice).

export class PocketOptionAdapter extends BaseAdapter {
  readonly name = "Pocket Option OTC";
  readonly isExperimental = true;

  private _assets: string[] = [];

  async connect(credentials?: Record<string, string>): Promise<void> {
    if (!credentials?.["session_id"]) {
      this.log("No session_id provided — running in algorithmic fallback mode");
      this._status = "connected";
      return;
    }
    try {
      this._status = "connecting";
      this.log("Connecting to Pocket Option WebSocket… (EXPERIMENTAL)");
      // Placeholder: real implementation would open wss://api.po.market/socket.io/
      // and authenticate using the session_id cookie value.
      // This is NOT implemented because the protocol is unofficial.
      this._status = "connected";
      this.log("Connected in algorithmic fallback mode");
    } catch (err) {
      this._status = "error";
      this.logError(err, "Failed to connect");
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    this._status = "disconnected";
    this.log("Disconnected");
  }

  async getAvailableAssets(): Promise<string[]> {
    if (this._assets.length) return this._assets;
    return [
      "Avalanche OTC", "Dogecoin OTC", "Solana OTC", "BNB OTC", "Bitcoin ETF OTC",
      "Litecoin OTC", "Gold OTC", "Silver OTC", "Brent Oil OTC", "WTI Crude Oil OTC",
      "EUR/JPY OTC", "USD/CHF OTC", "USD/IDR OTC", "GBP/JPY OTC", "AUD/CAD OTC",
      "USD/CAD OTC", "CHF/JPY OTC", "AUD/JPY OTC", "NZD/JPY OTC", "EUR/TRY OTC",
    ];
  }

  async getCandles(asset: string, tfMinutes: number, count: number): Promise<Candle[]> {
    if (!this.isConnected()) throw new Error("Pocket Option adapter not connected");
    return generateAlgorithmicCandles(asset, tfMinutes, count);
  }
}

// ─── IQ Option OTC Adapter ─────────────────────────────────────────────────────
// Status: EXPERIMENTAL — no official public API.
// Community library (iqoptionapi) exists for Python but not Node.js.

export class IqOptionAdapter extends BaseAdapter {
  readonly name = "IQ Option OTC";
  readonly isExperimental = true;

  async connect(credentials?: Record<string, string>): Promise<void> {
    if (!credentials?.["email"] || !credentials?.["password"]) {
      this.log("No credentials provided — running in algorithmic fallback mode");
      this._status = "connected";
      return;
    }
    try {
      this._status = "connecting";
      this.log("Connecting to IQ Option… (EXPERIMENTAL)");
      // Placeholder: real implementation would POST to
      // https://auth.iqoption.com/api/v1.0/login with email+password,
      // then open a WebSocket on wss://iqoption.com/echo/websocket.
      // NOT implemented — unofficial and may violate ToS.
      this._status = "connected";
      this.log("Connected in algorithmic fallback mode");
    } catch (err) {
      this._status = "error";
      this.logError(err, "Failed to connect");
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    this._status = "disconnected";
    this.log("Disconnected");
  }

  async getAvailableAssets(): Promise<string[]> {
    return [
      "Avalanche OTC", "Dogecoin OTC", "Solana OTC", "BNB OTC", "Cardano OTC",
      "Polygon OTC", "Litecoin OTC", "Gold OTC", "Silver OTC", "Natural Gas OTC",
      "EUR/JPY OTC", "USD/CHF OTC", "GBP/JPY OTC", "AUD/CAD OTC", "CHF/JPY OTC",
      "USD/CAD OTC", "AUD/JPY OTC", "NZD/JPY OTC", "USD/SGD OTC", "EUR/TRY OTC",
    ];
  }

  async getCandles(asset: string, tfMinutes: number, count: number): Promise<Candle[]> {
    if (!this.isConnected()) throw new Error("IQ Option adapter not connected");
    return generateAlgorithmicCandles(asset, tfMinutes, count);
  }
}

// ─── Olymp Trade OTC Adapter ───────────────────────────────────────────────────
// Status: EXPERIMENTAL — no official public API.

export class OlympTradeAdapter extends BaseAdapter {
  readonly name = "Olymp Trade OTC";
  readonly isExperimental = true;

  async connect(credentials?: Record<string, string>): Promise<void> {
    if (!credentials?.["token"]) {
      this.log("No token provided — running in algorithmic fallback mode");
      this._status = "connected";
      return;
    }
    try {
      this._status = "connecting";
      this.log("Connecting to Olymp Trade… (EXPERIMENTAL)");
      // Placeholder: real implementation would authenticate via
      // https://olymptrade.com/api/v1/login and subscribe to
      // WebSocket streams on wss://ws.olymptrade.com.
      // NOT implemented — unofficial.
      this._status = "connected";
      this.log("Connected in algorithmic fallback mode");
    } catch (err) {
      this._status = "error";
      this.logError(err, "Failed to connect");
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    this._status = "disconnected";
    this.log("Disconnected");
  }

  async getAvailableAssets(): Promise<string[]> {
    return [
      "TRON OTC", "Toncoin OTC", "Polygon OTC", "Litecoin OTC", "Cardano OTC",
      "Palladium spot OTC", "Platinum spot OTC", "Gold OTC", "Silver OTC",
      "Cisco OTC", "Netflix OTC", "Boeing Company OTC", "Intel OTC", "Microsoft OTC",
      "EUR/JPY OTC", "USD/RUB OTC", "GBP/JPY OTC", "AUD/CAD OTC", "EUR/TRY OTC",
      "USD/MYR OTC",
    ];
  }

  async getCandles(asset: string, tfMinutes: number, count: number): Promise<Candle[]> {
    if (!this.isConnected()) throw new Error("Olymp Trade adapter not connected");
    return generateAlgorithmicCandles(asset, tfMinutes, count);
  }
}

// ─── Adapter Registry ──────────────────────────────────────────────────────────

export const adapters: Record<string, BrokerAdapter> = {
  quotex: new QuotexOtcAdapter(),
  po:     new PocketOptionAdapter(),
  iq:     new IqOptionAdapter(),
  olymp:  new OlympTradeAdapter(),
};

export async function initAdapters(): Promise<void> {
  for (const [key, adapter] of Object.entries(adapters)) {
    try {
      await adapter.connect();
      adapter.startHeartbeat(60_000);
      logger.info({ broker: key, experimental: adapter.isExperimental }, "Broker adapter ready");
    } catch (err) {
      logger.error({ err, broker: key }, "Broker adapter init failed");
    }
  }
}

// ─── Algorithmic Candle Generator ──────────────────────────────────────────────
// Used as a safe fallback when a broker API is unavailable.

function generateAlgorithmicCandles(
  _asset: string,
  tfMinutes: number,
  count: number,
): Candle[] {
  const candles: Candle[] = [];
  let price = 1.1000 + Math.random() * 0.5;
  const now = Date.now();

  for (let i = count; i >= 1; i--) {
    const time = now - i * tfMinutes * 60_000;
    const change = (Math.random() - 0.5) * 0.002;
    const open   = price;
    const close  = +(price + change).toFixed(5);
    const high   = +(Math.max(open, close) + Math.random() * 0.001).toFixed(5);
    const low    = +(Math.min(open, close) - Math.random() * 0.001).toFixed(5);
    const volume = Math.floor(500 + Math.random() * 2000);
    candles.push({ time, open: +open.toFixed(5), high, low, close, volume });
    price = close;
  }

  return candles;
}

// ─── Signal Quality Filters ────────────────────────────────────────────────────

export interface SignalQuality {
  direction: "CALL" | "PUT";
  strength: "strong" | "medium" | "weak";
  confirmed: boolean;
}

/**
 * Analyses a candle array and returns a signal quality assessment.
 * Uses simple momentum + volatility filters — no martingale logic.
 */
export function analyseSignalQuality(candles: Candle[]): SignalQuality {
  if (candles.length < 3) {
    return { direction: "CALL", strength: "weak", confirmed: false };
  }

  const recent = candles.slice(-5);

  // Volatility filter: ignore if ATR is below threshold
  const atr = recent.reduce((sum, c) => sum + (c.high - c.low), 0) / recent.length;
  const lowVolatility = atr < 0.0003;

  // Unstable candle filter: ignore if last candle is a doji/spike
  const last    = recent[recent.length - 1]!;
  const body    = Math.abs(last.close - last.open);
  const wick    = (last.high - last.low);
  const isDoji  = wick > 0 && body / wick < 0.25;

  // Momentum: count bullish vs bearish candles
  let bulls = 0, bears = 0;
  for (const c of recent) {
    if (c.close > c.open) bulls++;
    else if (c.close < c.open) bears++;
  }
  const direction: "CALL" | "PUT" = bulls >= bears ? "CALL" : "PUT";
  const momentum = Math.abs(bulls - bears);

  const confirmed = !lowVolatility && !isDoji && momentum >= 2;
  const strength  = confirmed && momentum >= 3 ? "strong"
                  : confirmed                   ? "medium"
                  : "weak";

  return { direction, strength, confirmed };
}
