import test from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../server/game-engine";

test("room has exactly eight playable teams and eight instruments",()=>{
 const room=GameEngine.createRoom("Host",100_000_00);
 assert.deepEqual(room.teams.map(t=>t.number),[1,2,3,4,5,6,8,9]);
 assert.equal(Object.keys(room.prices).length,8);
});

test("market order cannot overspend or short sell",()=>{
 const room=GameEngine.createRoom("Host",10_000_00); room.phase="CALM";
 assert.equal(GameEngine.trade(room,1,{symbol:"NOVA",side:"BUY",quantity:99999,key:"key-buy-too-large"}).ok,false);
 assert.equal(GameEngine.trade(room,1,{symbol:"NOVA",side:"SELL",quantity:1,key:"key-short-sell"}).ok,false);
 assert.equal(room.teams[0].cash,10_000_00);
});

test("valid trade updates shared portfolio and idempotency blocks replay",()=>{
 const room=GameEngine.createRoom("Host",100_000_00); room.phase="CALM";
 const order={symbol:"NOVA",side:"BUY" as const,quantity:10,key:"unique-order-key"};
 assert.equal(GameEngine.trade(room,1,order).ok,true);
 assert.equal(room.teams[0].holdings.NOVA,10);
 assert.equal(GameEngine.trade(room,1,order).ok,false);
 assert.equal(room.teams[0].holdings.NOVA,10);
});

test("trade is rejected while policy vote pauses the market",()=>{
 const room=GameEngine.createRoom("Host",100_000_00); room.phase="POLICY_DECISION";
 assert.equal(GameEngine.trade(room,1,{symbol:"NOVA",side:"BUY",quantity:1,key:"paused-order-key"}).ok,false);
});
