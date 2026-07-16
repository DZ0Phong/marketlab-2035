import { io } from "socket.io-client";
import assert from "node:assert/strict";

const url=process.env.TEST_URL||"http://localhost:3000";
const host=io(url),player=io(url);
const emit=(socket,event,data)=>new Promise((resolve,reject)=>socket.timeout(5000).emit(event,data,(err,result)=>err?reject(err):resolve(result)));

await Promise.all([new Promise(r=>host.on("connect",r)),new Promise(r=>player.on("connect",r))]);
const created=await emit(host,"host:create",{hostName:"Smoke Host",startingCash:100000});
assert.equal(created.ok,true);
const joined=await emit(player,"player:join",{roomCode:created.roomCode,name:"Smoke Player",teamNumber:1});
assert.equal(joined.ok,true);
const started=await emit(host,"host:command",{command:"START"});
assert.equal(started.ok,true);
console.log(`Realtime smoke passed: room ${created.roomCode}, host + player synchronized.`);
host.close();player.close();
