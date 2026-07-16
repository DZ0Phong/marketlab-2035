import { randomBytes } from "node:crypto";
import { EVENTS, INITIAL_STOCKS, POLICIES } from "../lib/game-data";

export type Phase =
  | "LOBBY"
  | "ORIENTATION"
  | "CALM"
  | "ANNOUNCEMENT"
  | "MARKET_REACTION"
  | "POLICY_DECISION"
  | "POLICY_REACTION"
  | "RESOLUTION"
  | "PAUSED"
  | "ENDED";
export type Team = {
  number: number;
  name: string;
  members: { id: string; name: string; online: boolean }[];
  cash: number;
  holdings: Record<string, number>;
  trades: number;
  votes: Record<string, string>;
  initialCash: number;
};
export type MarketCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};
export type Room = {
  code: string;
  hostToken: string;
  hostName: string;
  phase: Phase;
  previousPhase?: Phase;
  phaseEndsAt: number | null;
  startedAt: number | null;
  startingCash: number;
  teams: Team[];
  prices: Record<string, number>;
  openPrices: Record<string, number>;
  history: Record<string, MarketCandle[]>;
  orderFlow: Record<string, number>;
  eventIndex: number;
  activeEventId?: string;
  activeEventIds: string[];
  activePolicyId?: string;
  nextEventAt: number | null;
  indicators: Record<string, number>;
  usedKeys: Set<string>;
  logs: { time: number; text: string }[];
};

const playerTeams = [1, 2, 3, 4, 5, 6, 8, 9];
const roomCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const MARKET_TICK_MS = 1_000;
export const CANDLE_INTERVAL_MS = 3_000;
export const EVENT_INTERVAL_MS = 120_000;
const phaseDuration: Partial<Record<Phase, number>> = {
  MARKET_REACTION: 45,
  POLICY_DECISION: 30,
  POLICY_REACTION: 30,
};
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

function seedMarketHistory(symbol: string, basePrice: number): MarketCandle[] {
  const seed = symbol
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  let price = basePrice;
  return Array.from({ length: 30 }, (_, index) => {
    const open = price;
    const wave = Math.sin(index * 0.72 + seed) * 0.0045;
    const microTrend = Math.cos(index * 0.27 + seed / 3) * 0.0025;
    price = Math.max(100, Math.round(price * (1 + wave + microTrend)));
    const wick = Math.max(
      8,
      Math.round(open * (0.0018 + Math.abs(wave) * 0.35)),
    );
    return {
      time: Date.now() - (29 - index) * CANDLE_INTERVAL_MS,
      open,
      high: Math.max(open, price) + wick,
      low: Math.max(100, Math.min(open, price) - wick),
      close: price,
    };
  });
}

export class GameEngine {
  static createRoom(hostName: string, startingCash: number): Room {
    const code = Array.from(
      { length: 5 },
      () => roomCharacters[Math.floor(Math.random() * roomCharacters.length)],
    ).join("");
    const history = Object.fromEntries(
      INITIAL_STOCKS.map((stock) => [
        stock.symbol,
        seedMarketHistory(stock.symbol, stock.price * 100),
      ]),
    );
    const prices = Object.fromEntries(
      INITIAL_STOCKS.map((stock) => [
        stock.symbol,
        history[stock.symbol].at(-1)!.close,
      ]),
    );
    return {
      code,
      hostToken: randomBytes(18).toString("hex"),
      hostName,
      phase: "LOBBY",
      phaseEndsAt: null,
      startedAt: null,
      startingCash,
      teams: playerTeams.map((n) => ({
        number: n,
        name: `Nhóm ${n}`,
        members: [],
        cash: startingCash,
        holdings: {},
        trades: 0,
        votes: {},
        initialCash: startingCash,
      })),
      prices,
      openPrices: { ...prices },
      history,
      orderFlow: {},
      eventIndex: -1,
      activeEventIds: [],
      nextEventAt: null,
      indicators: {
        growth: 50,
        employment: 50,
        equality: 50,
        environment: 50,
        stability: 50,
        budget: 70,
      },
      usedKeys: new Set(),
      logs: [],
    };
  }
  static transition(room: Room, phase: Phase) {
    room.phase = phase;
    room.phaseEndsAt = phaseDuration[phase]
      ? Date.now() + phaseDuration[phase]! * 1000
      : null;
    room.logs.unshift({ time: Date.now(), text: `Chuyển sang ${phase}` });
  }
  static hostCommand(room: Room, command: string, value?: string) {
    if (command === "START") {
      room.startedAt = Date.now();
      room.nextEventAt = Date.now() + EVENT_INTERVAL_MS;
      this.transition(room, "CALM");
    }
    if (command === "PAUSE" && room.phase !== "PAUSED") {
      room.previousPhase = room.phase;
      this.transition(room, "PAUSED");
    }
    if (command === "RESUME" && room.phase === "PAUSED")
      this.transition(room, room.previousPhase || "CALM");
    if (command === "NEXT") this.advance(room);
    if (command === "APPLY_POLICY" && value) {
      this.applyPolicy(room, value);
    }
    if (command === "END") this.transition(room, "ENDED");
    if (command === "RESET") {
      const fresh = this.createRoom(room.hostName, room.startingCash);
      Object.assign(room, {
        ...fresh,
        code: room.code,
        hostToken: room.hostToken,
      });
    }
    if (command === "BOT") {
      for (const t of room.teams)
        if (!t.members.length)
          t.members.push({
            id: `bot-${t.number}`,
            name: `Bot ${t.number}`,
            online: true,
          });
    }
    return { ok: true };
  }
  static advance(room: Room) {
    const next: Record<Phase, Phase> = {
      LOBBY: "ORIENTATION",
      ORIENTATION: "CALM",
      CALM: "MARKET_REACTION",
      ANNOUNCEMENT: "MARKET_REACTION",
      MARKET_REACTION: "POLICY_DECISION",
      POLICY_DECISION: "POLICY_REACTION",
      POLICY_REACTION: "CALM",
      RESOLUTION: "CALM",
      PAUSED: room.previousPhase || "CALM",
      ENDED: "ENDED",
    };
    if (room.phase === "CALM") return this.startEventRound(room);
    if (room.phase === "POLICY_DECISION" && !room.activePolicyId)
      this.applyPolicy(room, this.winningPolicy(room));
    const phase = next[room.phase];
    if (room.phase === "POLICY_REACTION") {
      room.activeEventId = undefined;
      room.activeEventIds = [];
      room.activePolicyId = undefined;
      room.nextEventAt = Date.now() + EVENT_INTERVAL_MS;
    }
    this.transition(room, phase);
  }
  static tick(room: Room) {
    if (room.phaseEndsAt && Date.now() >= room.phaseEndsAt) this.advance(room);
    if (
      room.phase === "CALM" &&
      room.nextEventAt &&
      Date.now() >= room.nextEventAt
    )
      this.startEventRound(room);
    if (
      ![
        "CALM",
        "MARKET_REACTION",
        "POLICY_DECISION",
        "POLICY_REACTION",
      ].includes(room.phase)
    )
      return false;
    if (!room.startedAt) return false;
    const events = EVENTS.filter((e) => room.activeEventIds.includes(e.id)),
      policy = POLICIES.find((p) => p.id === room.activePolicyId);
    for (const stock of INITIAL_STOCKS) {
      const noise = (Math.random() - 0.5) * 0.009 * stock.volatility;
      const flow = clamp(
        (room.orderFlow[stock.symbol] || 0) / 5000,
        -0.012,
        0.012,
      );
      const eventMove =
        room.phase === "MARKET_REACTION"
          ? events.reduce(
              (sum, event) => sum + (event.effects[stock.symbol] || 0),
              0,
            ) /
            100 /
            (phaseDuration.MARKET_REACTION || 45)
          : 0;
      const policyMove =
        room.phase === "POLICY_REACTION"
          ? (policy?.effects[stock.symbol] || 0) /
            100 /
            (phaseDuration.POLICY_REACTION || 30)
          : 0;
      const move = clamp(noise + flow + eventMove + policyMove, -0.025, 0.025);
      const open = room.prices[stock.symbol];
      const close = Math.max(100, Math.round(open * (1 + move)));
      const wick = Math.max(
        8,
        Math.round(open * (0.0015 + Math.abs(move) * 0.22)),
      );
      room.prices[stock.symbol] = close;
      const last = room.history[stock.symbol].at(-1);
      if (last && Date.now() - last.time < CANDLE_INTERVAL_MS) {
        last.high = Math.max(last.high, close + wick);
        last.low = Math.min(last.low, Math.max(100, close - wick));
        last.close = close;
      } else {
        room.history[stock.symbol].push({
          time: Date.now(),
          open,
          high: Math.max(open, close) + wick,
          low: Math.max(100, Math.min(open, close) - wick),
          close,
        });
      }
      room.history[stock.symbol] = room.history[stock.symbol].slice(-120);
      room.orderFlow[stock.symbol] = 0;
    }
    return true;
  }
  static trade(
    room: Room,
    teamNumber: number,
    order: {
      symbol: string;
      side: "BUY" | "SELL";
      quantity: number;
      key: string;
    },
  ) {
    if (
      ![
        "CALM",
        "MARKET_REACTION",
        "POLICY_DECISION",
        "POLICY_REACTION",
      ].includes(room.phase)
    )
      return { ok: false, error: "Thị trường đang khóa giao dịch." };
    if (room.usedKeys.has(order.key))
      return { ok: false, error: "Lệnh đã được xử lý." };
    room.usedKeys.add(order.key);
    const team = room.teams.find((t) => t.number === teamNumber),
      price = room.prices[order.symbol];
    if (!team || !price || order.quantity > 100000)
      return { ok: false, error: "Lệnh không hợp lệ." };
    const gross = price * order.quantity,
      fee = Math.ceil(gross * 0.0015),
      held = team.holdings[order.symbol] || 0;
    if (order.side === "BUY" && team.cash < gross + fee)
      return { ok: false, error: "Không đủ tiền mặt." };
    if (order.side === "SELL" && held < order.quantity)
      return { ok: false, error: "Không đủ cổ phiếu." };
    team.cash += order.side === "BUY" ? -(gross + fee) : gross - fee;
    team.holdings[order.symbol] =
      held + (order.side === "BUY" ? order.quantity : -order.quantity);
    team.trades++;
    room.orderFlow[order.symbol] =
      (room.orderFlow[order.symbol] || 0) +
      (order.side === "BUY" ? order.quantity : -order.quantity);
    room.logs.unshift({
      time: Date.now(),
      text: `Nhóm ${teamNumber} ${order.side} ${order.quantity} ${order.symbol}`,
    });
    return { ok: true };
  }
  static vote(room: Room, teamNumber: number, policyId: string) {
    if (room.phase !== "POLICY_DECISION")
      return { ok: false, error: "Chưa đến lúc bỏ phiếu." };
    const team = room.teams.find((t) => t.number === teamNumber);
    if (!team) return { ok: false };
    team.votes[`round-${room.eventIndex}`] = policyId;
    return { ok: true };
  }
  static startEventRound(room: Room) {
    room.eventIndex++;
    const count = 1 + Math.floor(Math.random() * 3);
    const pool = [...EVENTS].sort(() => Math.random() - 0.5);
    const chosen = pool.slice(0, count);
    room.activeEventIds = chosen.map((event) => event.id);
    room.activeEventId = room.activeEventIds[0];
    room.activePolicyId = undefined;
    room.nextEventAt = null;
    for (const event of chosen)
      this.applyIndicatorEffects(room, event.scoreEffects);
    room.logs.unshift({
      time: Date.now(),
      text: `Biến cố đợt ${room.eventIndex + 1}: ${chosen.map((e) => e.title).join(" · ")}`,
    });
    this.transition(room, "MARKET_REACTION");
  }
  static winningPolicy(room: Room) {
    const votes = room.teams
      .map((team) => team.votes[`round-${room.eventIndex}`])
      .filter(Boolean);
    return (
      [...new Set(votes)].sort(
        (a, b) =>
          votes.filter((vote) => vote === b).length -
          votes.filter((vote) => vote === a).length,
      )[0] || "none"
    );
  }
  static applyPolicy(room: Room, policyId: string) {
    room.activePolicyId = policyId;
    this.applyIndicatorEffects(
      room,
      POLICIES.find((policy) => policy.id === policyId)?.scoreEffects,
    );
    this.transition(room, "POLICY_REACTION");
  }
  static applyIndicatorEffects(
    room: Room,
    e?: { social?: number; environment?: number; stability?: number },
  ) {
    if (!e) return;
    room.indicators.equality = clamp(
      room.indicators.equality + (e.social || 0),
      0,
      100,
    );
    room.indicators.environment = clamp(
      room.indicators.environment + (e.environment || 0),
      0,
      100,
    );
    room.indicators.stability = clamp(
      room.indicators.stability + (e.stability || 0),
      0,
      100,
    );
  }
}

export function publicRoom(room: Room) {
  return {
    ...room,
    hostToken: undefined,
    usedKeys: undefined,
    teams: room.teams.map((t) => ({
      ...t,
      cash: undefined,
      holdings: undefined,
      votes: undefined,
    })),
    serverTime: Date.now(),
    stocks: INITIAL_STOCKS,
    events: EVENTS,
    policies: POLICIES,
  };
}
