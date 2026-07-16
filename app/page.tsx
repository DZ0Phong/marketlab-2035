"use client";
import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Mode = "HOME" | "LOBBY" | "PLAYER" | "HOST" | "PROJECTOR";
type PrivateTeam = {
  number: number;
  name: string;
  cash: number;
  holdings: Record<string, number>;
  trades: number;
  members: { name: string; online: boolean }[];
};
const fmt = (c: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(c / 100));
const phaseLabel: Record<string, string> = {
  LOBBY: "Phòng chờ",
  ORIENTATION: "Hướng dẫn",
  CALM: "Thị trường bình thường",
  ANNOUNCEMENT: "Công bố biến cố",
  MARKET_REACTION: "Thị trường phản ứng",
  POLICY_DECISION: "Bỏ phiếu chính sách",
  POLICY_REACTION: "Phản ứng sau chính sách",
  RESOLUTION: "Tổng kết chu kỳ",
  PAUSED: "Tạm dừng",
  ENDED: "Đóng cửa",
};

export default function Home() {
  const pathname = usePathname();
  const isHostRoute = pathname.startsWith("/host");
  const [socket, setSocket] = useState<Socket | null>(null),
    [mode, setMode] = useState<Mode>("HOME"),
    [room, setRoom] = useState<any>(null),
    [team, setTeam] = useState<PrivateTeam | null>(null),
    [online, setOnline] = useState(false),
    [error, setError] = useState("");
  const [roomCode, setRoomCode] = useState(""),
    [name, setName] = useState(""),
    [teamNumber, setTeamNumber] = useState(1),
    [hostToken, setHostToken] = useState(""),
    [selected, setSelected] = useState("NOVA"),
    [qty, setQty] = useState(1),
    [side, setSide] = useState<"BUY" | "SELL">("BUY"),
    [now, setNow] = useState(Date.now()),
    [savedHost, setSavedHost] = useState<{
      roomCode: string;
      hostToken: string;
    } | null>(null);
  useEffect(() => {
    const s = io({ transports: ["websocket", "polling"] });
    setSocket(s);
    s.on("connect", () => {
      setOnline(true);
      if (location.pathname.startsWith("/host")) {
        const saved = sessionStorage.getItem("host");
        if (saved) {
          try {
            setSavedHost(JSON.parse(saved));
          } catch {
            sessionStorage.removeItem("host");
          }
        }
      }
    });
    s.on("disconnect", () => setOnline(false));
    s.on("room:state", setRoom);
    s.on("team:private", setTeam);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      s.close();
      clearInterval(timer);
    };
  }, []);
  const remaining = Math.max(
    0,
    Math.ceil(((room?.phaseEndsAt || now) - now) / 1000),
  );
  const nextEventRemaining = Math.max(
    0,
    Math.ceil(((room?.nextEventAt || now) - now) / 1000),
  );
  const countdown = room?.phase === "CALM" ? nextEventRemaining : remaining;
  const countdownLabel =
    room?.phase === "CALM" ? "SỰ KIỆN SAU" : "PHASE CÒN LẠI";
  const stock = room?.stocks?.find((s: any) => s.symbol === selected);
  const price = room?.prices?.[selected] || 0;
  const netWorth = team
    ? team.cash +
      Object.entries(team.holdings).reduce(
        (n, [s, q]) => n + (room?.prices?.[s] || 0) * (q as number),
        0,
      )
    : 0;
  const currentEvents =
      room?.events?.filter((e: any) => room.activeEventIds?.includes(e.id)) ||
      [],
    currentEvent = currentEvents[0],
    currentPolicy = room?.policies?.find(
      (p: any) => p.id === room.activePolicyId,
    );
  const policyOptions =
    room?.policies?.filter((p: any) =>
      currentEvents.some((event: any) =>
        event.responsePolicyIds?.includes(p.id),
      ),
    ) || [];
  const leaderboard = useMemo(
    () =>
      room?.teams
        ? [...room.teams].map((t: any) => ({
            name: t.name,
            online: t.members.filter((m: any) => m.online).length,
            members: t.members
              .filter((m: any) => m.online)
              .map((m: any) => m.name),
          }))
        : [],
    [room],
  );
  function ack(event: string, data: any, success?: (r: any) => void) {
    setError("");
    socket?.emit(event, data, (r: any) => {
      if (!r?.ok) setError(r?.error || "Không thể thực hiện.");
      else success?.(r);
    });
  }
  function createRoom() {
    ack(
      "host:create",
      { hostName: name || "Host nhóm 7", startingCash: 10000000 },
      (r) => {
        setRoomCode(r.roomCode);
        setHostToken(r.hostToken);
        sessionStorage.setItem("host", JSON.stringify(r));
        setSavedHost({ roomCode: r.roomCode, hostToken: r.hostToken });
        setMode("HOST");
      },
    );
  }
  function join() {
    ack("player:join", { roomCode, name, teamNumber }, () => setMode("PLAYER"));
  }
  function resumeHost() {
    if (!savedHost) return;
    ack("host:join", savedHost, (result) => {
      setRoomCode(result.roomCode || savedHost.roomCode);
      setHostToken(savedHost.hostToken);
      setMode("HOST");
    });
  }
  function forgetHost() {
    sessionStorage.removeItem("host");
    setSavedHost(null);
  }
  function hostCmd(command: string, value?: string) {
    ack("host:command", { command, value });
  }
  function trade() {
    ack(
      "trade:execute",
      { symbol: selected, side, quantity: qty, key: crypto.randomUUID() },
      () => setError("Lệnh đã khớp thành công."),
    );
  }
  function vote(policyId: string) {
    ack("policy:vote", { policyId }, () =>
      setError("Đã ghi nhận phiếu của đội."),
    );
  }
  if (mode === "HOME")
    return (
      <main className="landing">
        <header>
          <Brand />
          <span className={online ? "status on" : "status"}>
            {online ? "Server sẵn sàng" : "Đang kết nối"}
          </span>
        </header>
        <section className="landing-grid">
          <div className="intro">
            <p className="kicker">MÔ PHỎNG KINH TẾ REALTIME</p>
            <h1>
              Thị trường tạo động lực.
              <br />
              <em>Chính sách tạo hướng đi.</em>
            </h1>
            <p>
              8 đội cùng giao dịch, phản ứng trước biến cố và lựa chọn chính
              sách. Lợi nhuận cao nhất chưa chắc là phát triển tốt nhất.
            </p>
            <div className="pill-row">
              <span>8 doanh nghiệp</span>
              <span>Event–Policy Cycle</span>
              <span>20+ thiết bị</span>
            </div>
          </div>
          <div className="join-card">
            <h2>{isHostRoute ? "Bảng điều khiển Host" : "Vào MarketLab"}</h2>
            <label>
              {isHostRoute ? "TÊN NGƯỜI ĐIỀU PHỐI" : "TÊN HIỂN THỊ"}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Minh Anh"
              />
            </label>
            {!isHostRoute && (
              <>
                <label>
                  MÃ PHÒNG
                  <input
                    className="room-input"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="ABCD"
                    maxLength={5}
                  />
                </label>
                <label>
                  CHỌN NHÓM
                  <select
                    value={teamNumber}
                    onChange={(e) => setTeamNumber(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 9].map((n) => (
                      <option key={n} value={n}>
                        Nhóm {n}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="cta"
                  disabled={!name || roomCode.length < 5}
                  onClick={join}
                >
                  Tham gia phòng
                </button>
                <div className="host-link">
                  <Link href="/host">Mở trang dành cho Host →</Link>
                </div>
              </>
            )}
            {isHostRoute && (
              <>
                <p className="host-intro">
                  Tạo phòng mới, chiếu mã phòng lên màn hình và điều phối toàn
                  bộ diễn biến thị trường.
                </p>
                <button
                  className="cta"
                  disabled={!name.trim()}
                  onClick={createRoom}
                >
                  Tạo phòng thuyết trình
                </button>
                {savedHost && (
                  <div className="resume-host">
                    <span>
                      Đang có phòng cũ: <b>{savedHost.roomCode}</b>
                    </span>
                    <button type="button" onClick={resumeHost}>
                      Khôi phục phòng cũ
                    </button>
                    <button type="button" onClick={forgetHost}>
                      Bỏ phiên cũ
                    </button>
                  </div>
                )}
                <div className="host-link">
                  <Link href="/">← Về trang người chơi</Link>
                </div>
              </>
            )}
            {error && <p className="error">{error}</p>}
          </div>
        </section>
        <footer>Game giáo dục · Không phải lời khuyên đầu tư</footer>
      </main>
    );
  if (!room)
    return (
      <main className="center">
        <div className="loader" />
        <p>Đang đồng bộ phòng…</p>
      </main>
    );
  if (mode === "HOST" && room.phase === "LOBBY")
    return (
      <main className="lobby-shell">
        <LobbyHeader room={room} online={online} host />
        <section className="lobby-stage">
          <section className="join-stage-card">
            <p className="kicker">SẴN SÀNG THAM GIA</p>
            <h1>
              Quét mã hoặc
              <br />
              nhập phòng.
            </h1>
            <p>
              Người chơi vào trang chính, nhập mã phòng và chọn đúng nhóm của
              mình. Thị trường sẽ chạy liên tục ngay khi Host mở sàn.
            </p>
            <div className="lobby-code">
              <span>MÃ PHÒNG</span>
              <strong>{room.code}</strong>
            </div>
            <div className="lobby-steps">
              <span>
                <b>01</b> Vào nhóm
              </span>
              <span>
                <b>02</b> Giá chạy mỗi giây
              </span>
              <span>
                <b>03</b> Mở thị trường
              </span>
            </div>
          </section>
          <TeamLobbyCard leaderboard={leaderboard} />
        </section>
        <footer className="lobby-actionbar">
          <p>
            <b>Luật nhanh:</b> giá cập nhật mỗi giây; nến 3 giây; biến cố 1–3
            tin sẽ tự tới sau mỗi 2 phút.
          </p>
          <div>
            <button className="quiet-action" onClick={() => hostCmd("BOT")}>
              Điền bot cho đội vắng
            </button>
            <button className="open-market" onClick={() => hostCmd("START")}>
              Mở thị trường →
            </button>
          </div>
        </footer>
        {error && <Toast text={error} />}
      </main>
    );
  if (mode === "HOST")
    return (
      <main className="terminal">
        <Top
          room={room}
          remaining={countdown}
          label={countdownLabel}
          online={online}
        />
        <section className="host-event-banner">
          <div className="room-code-block">
            <span>MÃ PHÒNG</span>
            <strong>{room.code}</strong>
            <small>Người chơi vào trang chính và nhập mã này</small>
          </div>
          <div className="event-focus">
            <p className="kicker">
              {currentEvent?.category || "PHIÊN ĐIỀU HÀNH"}
            </p>
            <h1>{currentEvent?.title || phaseLabel[room.phase]}</h1>
            <p>
              {currentEvent?.description ||
                "Giá cập nhật mỗi giây. Sự kiện sẽ tự mở sau mỗi hai phút."}
            </p>
          </div>
          <div className="event-clock">
            <span>THỜI GIAN PHASE</span>
            <strong>
              {remaining == null
                ? "--:--"
                : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}
            </strong>
            <Link href="/">← Trang người chơi</Link>
          </div>
        </section>
        <section className="host-layout">
          <div>
            <section className="hero-panel">
              <p className="kicker">ĐIỀU KHIỂN PHIÊN</p>
              <h2>{phaseLabel[room.phase]}</h2>
              <p className="control-help">
                Thị trường tự chạy. Chỉ dùng điều khiển bên dưới để tạm dừng,
                kiểm thử biến cố hoặc kết thúc phiên.
              </p>
              <div className="host-buttons">
                <button
                  onClick={() => hostCmd("START")}
                  disabled={room.phase !== "LOBBY"}
                >
                  Mở thị trường
                </button>
                <button
                  onClick={() =>
                    hostCmd(room.phase === "PAUSED" ? "RESUME" : "PAUSE")
                  }
                >
                  {room.phase === "PAUSED"
                    ? "Mở lại thị trường"
                    : "Tạm khóa giao dịch"}
                </button>
                <button
                  onClick={() => hostCmd("NEXT")}
                  disabled={room.phase !== "CALM"}
                >
                  Mở biến cố ngay (test)
                </button>
                <button
                  onClick={() => hostCmd("BOT")}
                  disabled={room.phase !== "LOBBY"}
                >
                  Điền bot cho đội vắng
                </button>
                <button className="danger" onClick={() => hostCmd("END")}>
                  Kết thúc phiên
                </button>
              </div>
            </section>
            <MarketBoard
              room={room}
              selected={selected}
              setSelected={setSelected}
            />
            <EventPanel events={currentEvents} policy={currentPolicy} />
          </div>
          <aside>
            <section className="side-card">
              <h3>Đội trong phòng</h3>
              {leaderboard.map((t: any) => (
                <div className="team-line" key={t.name}>
                  <span>
                    <b>{t.name}</b>
                    <small>
                      {t.members.length
                        ? t.members.join(" · ")
                        : "Chưa có người tham gia"}
                    </small>
                  </span>
                  <b className={t.online ? "green" : ""}>{t.online}/2</b>
                </div>
              ))}
            </section>
            <section className="side-card">
              <h3>Chỉ số quốc gia</h3>
              {Object.entries(room.indicators).map(([k, v]) => (
                <Meter key={k} label={k} value={v as number} />
              ))}
            </section>
            {room.phase === "POLICY_DECISION" && (
              <section className="side-card">
                <h3>Chọn chính sách</h3>
                {policyOptions.map((p: any) => (
                  <button
                    className="policy"
                    key={p.id}
                    onClick={() => hostCmd("APPLY_POLICY", p.id)}
                  >
                    <b>{p.title}</b>
                    <small>{p.description}</small>
                  </button>
                ))}
              </section>
            )}
            <section className="side-card logs">
              <h3>Nhật ký</h3>
              {room.logs.slice(0, 8).map((l: any, i: number) => (
                <p key={i}>{l.text}</p>
              ))}
            </section>
          </aside>
        </section>
        {error && <Toast text={error} />}
      </main>
    );
  if (["LOBBY", "ORIENTATION"].includes(room.phase))
    return (
      <main className="lobby-shell player-waiting-shell">
        <LobbyHeader room={room} online={online} />
        <section className="player-wait-stage">
          <div className="waiting-mark">↗</div>
          <div>
            <p className="kicker">ĐÃ VÀO PHÒNG {room.code}</p>
            <h1>
              {room.phase === "LOBBY"
                ? "Chờ Host mở thị trường"
                : "Host đang giới thiệu cách chơi"}
            </h1>
            <p>
              Giữ màn hình này. Khi thị trường được mở, tài khoản, biểu đồ nến
              và bảng đặt lệnh của đội sẽ tự xuất hiện.
            </p>
            <div className="my-team-chip">
              <span>ĐỘI CỦA BẠN</span>
              <b>{team?.name || `Nhóm ${teamNumber}`}</b>
              <small>
                {team?.members
                  .filter((member) => member.online)
                  .map((member) => member.name)
                  .join(" · ") || "Đang đồng bộ thành viên"}
              </small>
            </div>
          </div>
        </section>
        <footer className="lobby-actionbar player-wait-footer">
          <p>Giá chưa chạy và chưa thể giao dịch trong lúc chờ.</p>
          <div className="wait-rule-list">
            <span>01 Theo dõi biến cố</span>
            <span>02 Chọn ngành</span>
            <span>03 Quản lý rủi ro</span>
          </div>
        </footer>
        {error && <Toast text={error} />}
      </main>
    );
  return (
    <main className="terminal">
      <Top
        room={room}
        remaining={countdown}
        label={countdownLabel}
        online={online}
      />
      <section className="player-head">
        <div>
          <p className="kicker">{currentEvent?.category || "MARKETLAB LIVE"}</p>
          <h1>{currentEvent?.title || phaseLabel[room.phase]}</h1>
          <p>
            {currentEvent?.description ||
              "Theo dõi thị trường và chuẩn bị chiến lược."}
          </p>
        </div>
        <div className="wallet">
          <span>{team?.name || `Nhóm ${teamNumber}`}</span>
          <small>TỔNG TÀI SẢN</small>
          <b>{fmt(netWorth)} ML$</b>
          <em>Tiền mặt {fmt(team?.cash || 0)} ML$</em>
        </div>
      </section>
      <section className="trade-layout">
        <div>
          <EventPanel events={currentEvents} policy={currentPolicy} />
          <MarketBoard
            room={room}
            selected={selected}
            setSelected={setSelected}
          />
          {room.phase === "POLICY_DECISION" && (
            <section className="vote-panel">
              <p className="kicker">MỖI ĐỘI MỘT PHIẾU</p>
              <h2>Chọn phản ứng chính sách</h2>
              <div>
                {policyOptions.map((p: any) => (
                  <button key={p.id} onClick={() => vote(p.id)}>
                    <b>{p.title}</b>
                    <small>{p.description}</small>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
        <aside className="order-card">
          <div className="tabs">
            <button
              className={side === "BUY" ? "active buy" : ""}
              onClick={() => setSide("BUY")}
            >
              MUA
            </button>
            <button
              className={side === "SELL" ? "active sell" : ""}
              onClick={() => setSide("SELL")}
            >
              BÁN
            </button>
          </div>
          <h2>{selected}</h2>
          <p>{stock?.name}</p>
          <strong className="live-price">{fmt(price)} ML$</strong>
          <label>
            SỐ LƯỢNG
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            />
          </label>
          <div className="quick">
            {[0.25, 0.5, 0.75, 1].map((x) => (
              <button
                key={x}
                onClick={() =>
                  setQty(
                    side === "BUY"
                      ? Math.max(1, Math.floor(((team?.cash || 0) * x) / price))
                      : Math.max(
                          1,
                          Math.floor((team?.holdings?.[selected] || 0) * x),
                        ),
                  )
                }
              >
                {x === 1 ? "ALL" : `${x * 100}%`}
              </button>
            ))}
          </div>
          <div className="summary">
            <span>Tạm tính</span>
            <b>{fmt(price * qty)} ML$</b>
            <span>Phí 0,15%</span>
            <b>{fmt(price * qty * 0.0015)} ML$</b>
          </div>
          <button
            className={side === "BUY" ? "execute buy" : "execute sell"}
            disabled={
              !["CALM", "MARKET_REACTION", "POLICY_REACTION"].includes(
                room.phase,
              )
            }
            onClick={trade}
          >
            {side === "BUY" ? "Xác nhận mua" : "Xác nhận bán"}
          </button>
          <p className="fine">
            Đang giữ: {team?.holdings?.[selected] || 0} cổ phiếu
          </p>
          <hr />
          <h3>Danh mục</h3>
          {Object.entries(team?.holdings || {})
            .filter(([, q]) => (q as number) > 0)
            .map(([s, q]) => (
              <div className="holding" key={s}>
                <span>
                  {s} × {q as number}
                </span>
                <b>{fmt((room.prices[s] || 0) * (q as number))}</b>
              </div>
            ))}
        </aside>
      </section>
      {error && <Toast text={error} />}
    </main>
  );
}

function Brand() {
  return (
    <div className="brand">
      <i>M</i>
      <b>MARKETLAB</b>
      <span>2035</span>
    </div>
  );
}
function LobbyHeader({
  room,
  online,
  host = false,
}: {
  room: any;
  online: boolean;
  host?: boolean;
}) {
  return (
    <header className="lobby-topbar">
      <Brand />
      <div className="lobby-topbar-meta">
        <span className="room-chip">
          <small>PHÒNG</small>
          <b>{room.code}</b>
        </span>
        {host && <span className="host-chip">MÀN ĐIỀU PHỐI</span>}
        <span className={online ? "connection on" : "connection"}>
          {online ? "KẾT NỐI ỔN ĐỊNH" : "ĐANG KẾT NỐI"}
        </span>
      </div>
    </header>
  );
}
function TeamLobbyCard({ leaderboard }: { leaderboard: any[] }) {
  const joined = leaderboard.reduce((sum, team) => sum + team.online, 0);
  return (
    <section className="team-lobby-card">
      <div className="lobby-card-heading">
        <div>
          <p className="kicker">DANH SÁCH THAM GIA</p>
          <h2>8 đội trên sàn</h2>
        </div>
        <span>
          <b>{joined}</b> / 16 người
        </span>
      </div>
      <div className="team-lobby-grid">
        {leaderboard.map((team: any, index: number) => (
          <article
            className={team.online ? "lobby-team joined" : "lobby-team"}
            key={team.name}
          >
            <i>{String(index + 1).padStart(2, "0")}</i>
            <div>
              <b>{team.name}</b>
              <small>
                {team.members.length
                  ? team.members.join(" · ")
                  : "Chưa có người chơi"}
              </small>
            </div>
            <em>{team.online}/2</em>
          </article>
        ))}
      </div>
    </section>
  );
}
function Top({
  room,
  remaining,
  label,
  online,
}: {
  room: any;
  remaining: number;
  label: string;
  online: boolean;
}) {
  return (
    <header className="top">
      <Brand />
      <div className="phase">
        <span>{phaseLabel[room.phase]}</span>
        <small>{label}</small>
        <b>
          {String(Math.floor(remaining / 60)).padStart(2, "0")}:
          {String(remaining % 60).padStart(2, "0")}
        </b>
      </div>
      <div className={online ? "connection on" : "connection"}>
        {online ? "LIVE" : "OFFLINE"}
      </div>
    </header>
  );
}
function MarketBoard({
  room,
  selected,
  setSelected,
}: {
  room: any;
  selected: string;
  setSelected: (s: string) => void;
}) {
  return (
    <section className="market-board">
      <div className="chart">
        <div className="chart-title">
          <div>
            <b>{selected}</b>
            <span>
              {room.stocks.find((s: any) => s.symbol === selected)?.name}
            </span>
          </div>
          <strong>{fmt(room.prices[selected])} ML$</strong>
        </div>
        <PriceChart candles={room.history[selected] || []} />
      </div>
      <div className="watch">
        <div className="watch-title">THỊ TRƯỜNG</div>
        {room.stocks.map((s: any) => {
          const change =
            (room.prices[s.symbol] / room.openPrices[s.symbol] - 1) * 100;
          return (
            <button
              className={selected === s.symbol ? "selected" : ""}
              key={s.symbol}
              onClick={() => setSelected(s.symbol)}
            >
              <i style={{ background: s.color }} />
              <div>
                <b>{s.symbol}</b>
                <small>{s.sector}</small>
              </div>
              <span>
                <b>{fmt(room.prices[s.symbol])}</b>
                <small className={change >= 0 ? "up" : "down"}>
                  {change >= 0 ? "+" : ""}
                  {change.toFixed(1)}%
                </small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
function PriceChart({ candles }: { candles: any[] }) {
  const data = candles.slice(-30);
  const values = data.flatMap((c) => [c.low, c.high]);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const y = (value: number) => 220 - ((value - min) / (max - min || 1)) * 180;
  const xGap = 740 / Math.max(data.length, 1);
  return (
    <svg
      viewBox="0 0 800 250"
      className="price-chart candle-chart"
      aria-label="Biểu đồ nến realtime, mỗi nến tương ứng ba giây"
    >
      {[70, 115, 160, 205].map((line) => (
        <line
          key={line}
          x1="30"
          x2="770"
          y1={line}
          y2={line}
          className="chart-grid"
        />
      ))}
      {data.map((c, index) => {
        const x = 30 + index * xGap + xGap / 2;
        const rising = c.close >= c.open;
        const color = rising ? "#2c8a45" : "#d14b5e";
        const bodyTop = Math.min(y(c.open), y(c.close));
        const bodyHeight = Math.max(3, Math.abs(y(c.open) - y(c.close)));
        return (
          <g key={`${c.time}-${index}`}>
            <line
              x1={x}
              x2={x}
              y1={y(c.high)}
              y2={y(c.low)}
              stroke={color}
              strokeWidth="2"
            />
            <rect
              x={x - Math.min(8, xGap * 0.32)}
              y={bodyTop}
              width={Math.min(16, xGap * 0.64)}
              height={bodyHeight}
              fill={color}
              rx="1"
            />
          </g>
        );
      })}
      <text x="30" y="242" className="candle-caption">
        NẾN 3 GIÂY · GIÁ CẬP NHẬT MỖI GIÂY
      </text>
    </svg>
  );
}
function EventPanel({ events, policy }: { events: any[]; policy: any }) {
  if (!events.length && !policy) return null;
  return (
    <section className="event-panel">
      {events.map((event) => (
        <div key={event.id} className={event.tone || "mixed"}>
          <span>BIẾN CỐ · {event.category}</span>
          <b>{event.title}</b>
          <p>{event.lesson}</p>
        </div>
      ))}
      {policy && (
        <div>
          <span>CHÍNH SÁCH ĐANG ÁP DỤNG</span>
          <b>{policy.title}</b>
          <p>{policy.lesson}</p>
        </div>
      )}
    </section>
  );
}
function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="meter">
      <span>{label}</span>
      <div>
        <i style={{ width: `${value}%` }} />
      </div>
      <b>{Math.round(value)}</b>
    </div>
  );
}
function Toast({ text }: { text: string }) {
  return <div className="toast">{text}</div>;
}
