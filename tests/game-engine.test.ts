import test from "node:test";
import assert from "node:assert/strict";
import {
  CANDLE_INTERVAL_MS,
  EVENT_INTERVAL_MS,
  GameEngine,
} from "../server/game-engine";

test("room has exactly eight playable teams and eight instruments", () => {
  const room = GameEngine.createRoom("Host", 100_000_00);
  assert.deepEqual(
    room.teams.map((t) => t.number),
    [1, 2, 3, 4, 5, 6, 8, 9],
  );
  assert.equal(Object.keys(room.prices).length, 8);
});

test("room code is projector-friendly and seeded history is valid 3-second candles", () => {
  const room = GameEngine.createRoom("Host", 100_000_00);
  assert.match(room.code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/);
  const candle = room.history.NOVA.at(-1)!;
  assert.ok(candle.high >= Math.max(candle.open, candle.close));
  assert.ok(candle.low <= Math.min(candle.open, candle.close));
  assert.equal(room.prices.NOVA, candle.close);
});

test("market updates every tick while the current 3-second candle is still open", () => {
  const room = GameEngine.createRoom("Host", 100_000_00);
  GameEngine.hostCommand(room, "START");
  const candle = room.history.NOVA.at(-1)!;
  candle.time = Date.now();
  const before = room.history.NOVA.length;
  assert.equal(GameEngine.tick(room), true);
  assert.equal(room.history.NOVA.length, before);
  candle.time = Date.now() - CANDLE_INTERVAL_MS - 1;
  assert.equal(GameEngine.tick(room), true);
  assert.equal(room.history.NOVA.length, before + 1);
  assert.ok((room.nextEventAt || 0) >= Date.now() + EVENT_INTERVAL_MS - 50);
});

test("a market round can surface one to three events at the same time", () => {
  const room = GameEngine.createRoom("Host", 100_000_00);
  room.phase = "CALM";
  room.startedAt = Date.now();
  room.nextEventAt = Date.now() - 1;
  GameEngine.tick(room);
  assert.equal(room.phase, "MARKET_REACTION");
  assert.ok(room.activeEventIds.length >= 1 && room.activeEventIds.length <= 3);
});

test("market order cannot overspend or short sell", () => {
  const room = GameEngine.createRoom("Host", 10_000_00);
  room.phase = "CALM";
  assert.equal(
    GameEngine.trade(room, 1, {
      symbol: "NOVA",
      side: "BUY",
      quantity: 99999,
      key: "key-buy-too-large",
    }).ok,
    false,
  );
  assert.equal(
    GameEngine.trade(room, 1, {
      symbol: "NOVA",
      side: "SELL",
      quantity: 1,
      key: "key-short-sell",
    }).ok,
    false,
  );
  assert.equal(room.teams[0].cash, 10_000_00);
});

test("valid trade updates shared portfolio and idempotency blocks replay", () => {
  const room = GameEngine.createRoom("Host", 100_000_00);
  room.phase = "CALM";
  const order = {
    symbol: "NOVA",
    side: "BUY" as const,
    quantity: 10,
    key: "unique-order-key",
  };
  assert.equal(GameEngine.trade(room, 1, order).ok, true);
  assert.equal(room.teams[0].holdings.NOVA, 10);
  assert.equal(GameEngine.trade(room, 1, order).ok, false);
  assert.equal(room.teams[0].holdings.NOVA, 10);
});

test("market remains open while teams vote on a policy", () => {
  const room = GameEngine.createRoom("Host", 100_000_00);
  room.phase = "POLICY_DECISION";
  assert.equal(
    GameEngine.trade(room, 1, {
      symbol: "NOVA",
      side: "BUY",
      quantity: 1,
      key: "paused-order-key",
    }).ok,
    true,
  );
});
