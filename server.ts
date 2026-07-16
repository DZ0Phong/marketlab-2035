import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { z } from "zod";
import { GameEngine, publicRoom, type Room } from "./server/game-engine";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const app = next({ dev });
const handler = app.getRequestHandler();
const rooms = new Map<string, Room>();

await app.prepare();
const httpServer = createServer((req, res) => {
  if (req.url === "/api/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  handler(req, res);
});

const io = new Server(httpServer, {
  cors: { origin: true },
  pingTimeout: 15_000,
});

function broadcast(room: Room) {
  io.to(room.code).emit("room:state", publicRoom(room));
  for (const team of room.teams)
    io.to(`${room.code}:team:${team.number}`).emit("team:private", team);
}

io.on("connection", (socket) => {
  socket.on("host:create", (raw, done) => {
    const input = z
      .object({
        hostName: z.string().trim().min(1).max(30),
        startingCash: z
          .number()
          .int()
          .min(10_000)
          .max(10_000_000)
          .default(100_000),
      })
      .safeParse(raw);
    if (!input.success)
      return done({ ok: false, error: "Thông tin tạo phòng không hợp lệ." });
    const room = GameEngine.createRoom(
      input.data.hostName,
      input.data.startingCash,
    );
    rooms.set(room.code, room);
    socket.join(room.code);
    socket.data = {
      roomCode: room.code,
      role: "host",
      hostToken: room.hostToken,
    };
    broadcast(room);
    done({ ok: true, roomCode: room.code, hostToken: room.hostToken });
  });

  socket.on("host:join", (raw, done) => {
    const input = z
      .object({ roomCode: z.string(), hostToken: z.string() })
      .safeParse(raw);
    if (!input.success)
      return done({ ok: false, error: "Thiếu mã phòng hoặc host token." });
    const room = rooms.get(input.data.roomCode.toUpperCase());
    if (!room || room.hostToken !== input.data.hostToken)
      return done({ ok: false, error: "Không tìm thấy quyền host." });
    socket.join(room.code);
    socket.data = {
      roomCode: room.code,
      role: "host",
      hostToken: room.hostToken,
    };
    broadcast(room);
    done({ ok: true });
  });

  socket.on("player:join", (raw, done) => {
    const input = z
      .object({
        roomCode: z.string().trim().min(4),
        name: z.string().trim().min(1).max(24),
        teamNumber: z.number().int(),
      })
      .safeParse(raw);
    if (!input.success)
      return done({ ok: false, error: "Kiểm tra lại tên, phòng và đội." });
    const room = rooms.get(input.data.roomCode.toUpperCase());
    if (!room)
      return done({
        ok: false,
        error: "Phòng không tồn tại hoặc đã bị reset.",
      });
    if (room.phase !== "LOBBY")
      return done({ ok: false, error: "Game đã bắt đầu." });
    const team = room.teams.find((t) => t.number === input.data.teamNumber);
    if (!team || team.number === 7)
      return done({ ok: false, error: "Đội này không thể tham gia." });
    if (team.members.length >= 2)
      return done({ ok: false, error: "Đội đã đủ 2 người." });
    team.members.push({ id: socket.id, name: input.data.name, online: true });
    socket.join(room.code);
    socket.join(`${room.code}:team:${team.number}`);
    socket.data = {
      roomCode: room.code,
      role: "player",
      teamNumber: team.number,
    };
    broadcast(room);
    done({ ok: true, teamNumber: team.number });
  });

  socket.on("trade:execute", (raw, done) => {
    const input = z
      .object({
        symbol: z.string(),
        side: z.enum(["BUY", "SELL"]),
        quantity: z.number().int().positive(),
        key: z.string().min(8),
      })
      .safeParse(raw);
    const room = rooms.get(socket.data.roomCode);
    const teamNumber = socket.data.teamNumber;
    if (!input.success || !room || !teamNumber)
      return done({ ok: false, error: "Lệnh không hợp lệ." });
    const result = GameEngine.trade(room, teamNumber, input.data);
    if (result.ok) broadcast(room);
    done(result);
  });

  socket.on("policy:vote", (raw, done) => {
    const input = z.object({ policyId: z.string() }).safeParse(raw);
    const room = rooms.get(socket.data.roomCode);
    if (!input.success || !room || !socket.data.teamNumber)
      return done({ ok: false });
    const result = GameEngine.vote(
      room,
      socket.data.teamNumber,
      input.data.policyId,
    );
    broadcast(room);
    done(result);
  });

  socket.on("host:command", (raw, done) => {
    const input = z
      .object({
        command: z.enum([
          "START",
          "PAUSE",
          "RESUME",
          "NEXT",
          "APPLY_POLICY",
          "END",
          "RESET",
          "BOT",
        ]),
        value: z.string().optional(),
      })
      .safeParse(raw);
    const room = rooms.get(socket.data.roomCode);
    if (!input.success || !room || socket.data.hostToken !== room.hostToken)
      return done({ ok: false, error: "Không có quyền host." });
    const result = GameEngine.hostCommand(
      room,
      input.data.command,
      input.data.value,
    );
    broadcast(room);
    done(result);
  });

  socket.on("disconnect", () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return;
    for (const team of room.teams) {
      const member = team.members.find((m) => m.id === socket.id);
      if (member) member.online = false;
    }
    broadcast(room);
  });
});

setInterval(() => {
  for (const room of rooms.values()) if (GameEngine.tick(room)) broadcast(room);
}, 1000);

httpServer.listen(port, "0.0.0.0", () =>
  console.log(`MarketLab ready on http://localhost:${port}`),
);
