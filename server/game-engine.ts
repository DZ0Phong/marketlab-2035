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
  history: Record<string, { time: number; price: number }[]>;
  orderFlow: Record<string, number>;
  eventIndex: number;
  activeEventId?: string;
  activePolicyId?: string;
  indicators: Record<string, number>;
  usedKeys: Set<string>;
  logs: { time: number; text: string }[];
};

const playerTeams = [1, 2, 3, 4, 5, 6, 8, 9];
const phaseDuration: Partial<Record<Phase, number>> = {
  ORIENTATION: 60,
  CALM: 45,
  ANNOUNCEMENT: 12,
  MARKET_REACTION: 70,
  POLICY_DECISION: 25,
  POLICY_REACTION: 50,
  RESOLUTION: 12,
};
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

function seedMarketHistory(symbol: string, basePrice: number) {
  const seed = symbol
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  let price = basePrice;
  return Array.from({ length: 30 }, (_, index) => {
    const wave = Math.sin(index * 0.72 + seed) * 0.0045;
    const microTrend = Math.cos(index * 0.27 + seed / 3) * 0.0025;
    price = Math.max(100, Math.round(price * (1 + wave + microTrend)));
    return { time: Date.now() - (29 - index) * 5_000, price };
  });
}

export class GameEngine {
  static createRoom(hostName: string, startingCash: number): Room {
    const code = Math.random().toString(36).slice(2, 6).toUpperCase();
    const history = Object.fromEntries(
      INITIAL_STOCKS.map((stock) => [
        stock.symbol,
        seedMarketHistory(stock.symbol, stock.price * 100),
      ]),
    );
    const prices = Object.fromEntries(
      INITIAL_STOCKS.map((stock) => [
        stock.symbol,
        history[stock.symbol].at(-1)!.price,
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
      this.transition(room, "ORIENTATION");
    }
    if (command === "PAUSE" && room.phase !== "PAUSED") {
      room.previousPhase = room.phase;
      this.transition(room, "PAUSED");
    }
    if (command === "RESUME" && room.phase === "PAUSED")
      this.transition(room, room.previousPhase || "CALM");
    if (command === "NEXT") this.advance(room);
    if (command === "APPLY_POLICY" && value) {
      room.activePolicyId = value;
      this.applyIndicatorEffects(
        room,
        POLICIES.find((p) => p.id === value)?.scoreEffects,
      );
      this.transition(room, "POLICY_REACTION");
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
      CALM: "ANNOUNCEMENT",
      ANNOUNCEMENT: "MARKET_REACTION",
      MARKET_REACTION: "POLICY_DECISION",
      POLICY_DECISION: "POLICY_REACTION",
      POLICY_REACTION: "RESOLUTION",
      RESOLUTION: "ANNOUNCEMENT",
      PAUSED: room.previousPhase || "CALM",
      ENDED: "ENDED",
    };
    const phase = next[room.phase];
    if (phase === "ANNOUNCEMENT") {
      room.eventIndex = (room.eventIndex + 1) % EVENTS.length;
      room.activeEventId = EVENTS[room.eventIndex].id;
      room.activePolicyId = undefined;
    }
    if (room.phase === "POLICY_DECISION" && !room.activePolicyId) {
      const votes = Object.values(
        room.teams.flatMap((t) => Object.values(t.votes)),
      ).filter(Boolean);
      room.activePolicyId =
        votes.sort(
          (a, b) =>
            votes.filter((x) => x === b).length -
            votes.filter((x) => x === a).length,
        )[0] || "none";
    }
    this.transition(room, phase);
  }
  static tick(room: Room) {
    if (room.phaseEndsAt && Date.now() >= room.phaseEndsAt) this.advance(room);
    if (!["CALM", "MARKET_REACTION", "POLICY_REACTION"].includes(room.phase))
      return false;
    if (
      !room.startedAt ||
      Math.floor((Date.now() - room.startedAt) / 1000) % 5 !== 0
    )
      return false;
    const event = EVENTS.find((e) => e.id === room.activeEventId),
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
          ? (event?.effects[stock.symbol] || 0) / 100 / 10
          : 0;
      const policyMove =
        room.phase === "POLICY_REACTION"
          ? (policy?.effects[stock.symbol] || 0) / 100 / 8
          : 0;
      const move = clamp(noise + flow + eventMove + policyMove, -0.06, 0.06);
      room.prices[stock.symbol] = Math.max(
        100,
        Math.round(room.prices[stock.symbol] * (1 + move)),
      );
      room.history[stock.symbol].push({
        time: Date.now(),
        price: room.prices[stock.symbol],
      });
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
    if (!["CALM", "MARKET_REACTION", "POLICY_REACTION"].includes(room.phase))
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
    team.votes[room.activeEventId || "event"] = policyId;
    return { ok: true };
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
