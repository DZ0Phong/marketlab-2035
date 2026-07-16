"use client";

import { useEffect, useMemo, useState } from "react";
import { EVENTS, GameCard, INITIAL_STOCKS, POLICIES, Stock } from "@/lib/game-data";

type Team = { id: number; name: string; cash: number; holdings: Record<string, number> };
type Scores = { social: number; environment: number; stability: number };
type Log = { round: number; text: string };

const STARTING_CASH = 1000;
const EVENT_SECONDS = 120;
const makeTeam = (id: number, name = `Đội ${id}`): Team => ({ id, name, cash: STARTING_CASH, holdings: {} });
const money = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

export default function Home() {
  const [view, setView] = useState<"market" | "host" | "results" | "lesson">("market");
  const [stocks, setStocks] = useState<Stock[]>(INITIAL_STOCKS);
  const [teams, setTeams] = useState<Team[]>([makeTeam(1, "Sao Việt"), makeTeam(2, "Bình Minh"), makeTeam(3, "Mầm Xanh"), makeTeam(4, "Tiên Phong")]);
  const [activeTeam, setActiveTeam] = useState(1);
  const [round, setRound] = useState(1);
  const [seconds, setSeconds] = useState(EVENT_SECONDS);
  const [running, setRunning] = useState(false);
  const [scores, setScores] = useState<Scores>({ social: 50, environment: 50, stability: 50 });
  const [selected, setSelected] = useState<string>("VTC");
  const [quantity, setQuantity] = useState(1);
  const [logs, setLogs] = useState<Log[]>([{ round: 1, text: "Thị trường mở cửa. Mỗi đội có 1.000 tỷ vốn ảo." }]);
  const [activeCards, setActiveCards] = useState<GameCard[]>([]);
  const [history, setHistory] = useState<Record<string, number[]>>(Object.fromEntries(INITIAL_STOCKS.map(s => [s.symbol, [s.price]])));

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds(s => {
      if (s <= 1) { triggerRandomEvents(); return EVENT_SECONDS; }
      return s - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  function triggerRandomEvents() {
    const count = 1 + Math.floor(Math.random() * 3);
    const cards = [...EVENTS].sort(() => Math.random() - .5).slice(0, count);
    applyCards(cards, "Sự kiện tự động");
  }

  const team = teams.find(t => t.id === activeTeam)!;
  const stock = stocks.find(s => s.symbol === selected)!;
  const teamValue = (t: Team) => t.cash + stocks.reduce((sum, s) => sum + (t.holdings[s.symbol] || 0) * s.price, 0);
  const leaderboard = useMemo(() => [...teams].sort((a, b) => teamValue(b) - teamValue(a)), [teams, stocks]);

  function trade(kind: "buy" | "sell") {
    const qty = Math.max(1, Math.floor(quantity));
    const cost = stock.price * qty;
    if (kind === "buy" && team.cash < cost) return alert("Đội không đủ vốn.");
    if (kind === "sell" && (team.holdings[stock.symbol] || 0) < qty) return alert("Đội không đủ cổ phiếu.");
    setTeams(old => old.map(t => t.id !== team.id ? t : ({ ...t, cash: t.cash + (kind === "buy" ? -cost : cost), holdings: { ...t.holdings, [stock.symbol]: (t.holdings[stock.symbol] || 0) + (kind === "buy" ? qty : -qty) } })));
    const demandShift = kind === "buy" ? Math.min(4, qty * 0.45) : -Math.min(4, qty * 0.45);
    setStocks(old => old.map(s => s.symbol === stock.symbol ? { ...s, price: Math.max(3, +(s.price * (1 + demandShift / 100)).toFixed(2)) } : s));
    setLogs(old => [{ round, text: `${team.name} ${kind === "buy" ? "mua" : "bán"} ${qty} ${stock.symbol}.` }, ...old].slice(0, 12));
  }

  function applyCard(card: GameCard, type: "Biến cố" | "Chính sách") {
    setStocks(old => {
      const next = old.map(s => ({ ...s, price: Math.max(3, +(s.price * (1 + (card.effects[s.symbol] || 0) / 100)).toFixed(2)) }));
      setHistory(h => Object.fromEntries(next.map(s => [s.symbol, [...(h[s.symbol] || []), s.price]])));
      return next;
    });
    setScores(old => ({ social: clamp(old.social + (card.scoreEffects?.social || 0)), environment: clamp(old.environment + (card.scoreEffects?.environment || 0)), stability: clamp(old.stability + (card.scoreEffects?.stability || 0)) }));
    setActiveCards([card]);
    setLogs(old => [{ round, text: `${type}: ${card.title}.` }, ...old].slice(0, 12));
  }

  function applyCards(cards: GameCard[], type: string) {
    setStocks(old => {
      const next = old.map(s => {
        const total = cards.reduce((sum, card) => sum + (card.effects[s.symbol] || 0), 0);
        return { ...s, price: Math.max(3, +(s.price * (1 + total / 100)).toFixed(2)) };
      });
      setHistory(h => Object.fromEntries(next.map(s => [s.symbol, [...(h[s.symbol] || []), s.price]])));
      return next;
    });
    setScores(old => ({
      social: clamp(old.social + cards.reduce((n,c)=>n+(c.scoreEffects?.social||0),0)),
      environment: clamp(old.environment + cards.reduce((n,c)=>n+(c.scoreEffects?.environment||0),0)),
      stability: clamp(old.stability + cards.reduce((n,c)=>n+(c.scoreEffects?.stability||0),0)),
    }));
    setActiveCards(cards);
    setLogs(old => [{ round, text: `${type}: ${cards.map(c=>c.title).join(" + ")}.` }, ...old].slice(0, 12));
  }

  function nextRound() {
    setHistory(old => Object.fromEntries(stocks.map(s => [s.symbol, [...(old[s.symbol] || []), s.price]])));
    setRound(r => r + 1); setSeconds(EVENT_SECONDS); setRunning(false); setActiveCards([]);
  }

  function resetGame() {
    if (!confirm("Khởi tạo lại toàn bộ game?")) return;
    setStocks(INITIAL_STOCKS); setTeams([1,2,3,4].map(id => makeTeam(id))); setScores({ social: 50, environment: 50, stability: 50 }); setRound(1); setSeconds(EVENT_SECONDS); setRunning(false); setLogs([{ round: 1, text: "Game mới đã được khởi tạo." }]); setHistory(Object.fromEntries(INITIAL_STOCKS.map(s => [s.symbol, [s.price]])));
  }

  function addTeam() { if (teams.length < 8) setTeams(old => [...old, makeTeam(Date.now(), `Đội ${old.length + 1}`)]); }
  function renameTeam(id: number, name: string) { setTeams(old => old.map(t => t.id === id ? { ...t, name } : t)); }

  return (
    <main>
      <header className="topbar">
        <button className="brand" onClick={() => setView("market")}><span>M</span> MARKETLAB <b>2035</b></button>
        <nav>{[["market","Sàn giao dịch"],["host","Host control"],["results","Kết quả"],["lesson","Debrief"]].map(([id,label]) => <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id as typeof view)}>{label}</button>)}</nav>
        <div className="round-pill">VÒNG {round} <strong>{String(Math.floor(seconds/60)).padStart(2,"0")}:{String(seconds%60).padStart(2,"0")}</strong><i className={running ? "live" : ""}/></div>
      </header>

      {view === "market" && <section className="page market-page">
        <div className="hero-row"><div><p className="eyebrow">THỊ TRƯỜNG ĐANG {running ? "GIAO DỊCH" : "TẠM DỪNG"}</p><h1>Đầu tư hôm nay.<br/><em>Định hướng ngày mai.</em></h1><p className="sub">Tối đa hóa tài sản, nhưng đừng bỏ quên xã hội, môi trường và sự ổn định.</p></div><ScoreOrbit scores={scores}/></div>
        {activeCards.length > 0 && <div className="news"><span>{activeCards.length} TIN MỚI</span><div><b>{activeCards.map(c=>c.title).join(" · ")}</b><p>{activeCards.map(c=>c.description).join(" — ")}</p></div><strong>{activeCards.map(c=>c.tone === "positive" ? "TÍCH CỰC" : c.tone === "negative" ? "TIÊU CỰC" : "HỖN HỢP").join(" · ")}</strong></div>}
        <div className="market-grid">
          <section className="panel stock-list"><div className="panel-title"><span>MÃ / DOANH NGHIỆP</span><span>GIÁ / BIỂU ĐỒ</span></div>{stocks.map(s => { const first = history[s.symbol]?.[0] || s.price; const change = ((s.price-first)/first)*100; return <button key={s.symbol} className={selected === s.symbol ? "stock selected" : "stock"} onClick={() => setSelected(s.symbol)}><i style={{background:s.color}}>{s.symbol[0]}</i><div><b>{s.symbol}</b><small>{s.name} · {s.sector}</small></div><Spark values={[...(history[s.symbol] || []),s.price]} color={s.color}/><div className="quote"><b>{s.price.toFixed(2)}</b><small className={change >= 0 ? "up" : "down"}>{change>=0?"▲":"▼"} {Math.abs(change).toFixed(1)}%</small></div></button>})}</section>
          <aside className="panel trade-box"><div className="team-switch"><label>ĐANG GIAO DỊCH</label><select value={activeTeam} onChange={e=>setActiveTeam(Number(e.target.value))}>{teams.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></div><div className="balance"><span>Sức mua</span><b>{money.format(team.cash)} <small>tỷ</small></b></div><div className="chosen"><i style={{background:stock.color}}>{stock.symbol[0]}</i><div><b>{stock.symbol}</b><small>{stock.name}</small></div><strong>{stock.price.toFixed(2)}</strong></div><label className="qty">SỐ LƯỢNG<input type="number" min="1" value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label><div className="estimate"><span>Giá trị lệnh</span><b>{money.format(stock.price * quantity)} tỷ</b></div><div className="trade-actions"><button onClick={()=>trade("sell")}>BÁN</button><button onClick={()=>trade("buy")} className="buy">MUA</button></div><p className="hint">Mỗi lệnh tạo tác động cung–cầu nhỏ lên giá. Biến cố và chính sách tạo tác động lớn hơn.</p></aside>
        </div>
      </section>}

      {view === "host" && <section className="page"><div className="section-head"><div><p className="eyebrow">BẢNG ĐIỀU KHIỂN</p><h2>Nhịp game trong tay host.</h2></div><div className="host-actions"><button onClick={()=>setRunning(!running)} className="primary">{running ? "Tạm dừng" : "Chạy đồng hồ 2 phút"}</button><button onClick={triggerRandomEvents}>Rút 1–3 sự kiện</button><button onClick={nextRound}>Chốt vòng</button><button onClick={resetGame}>Reset</button></div></div><div className="host-grid"><section className="panel cards"><div className="panel-title"><span>KHO SỰ KIỆN TỐT / XẤU</span><span>TỰ ĐỘNG MỖI 2 PHÚT</span></div>{EVENTS.map(e=><CardButton key={e.id} card={e} onClick={()=>applyCard(e,"Biến cố")}/>)}</section><section className="panel cards"><div className="panel-title"><span>ÁP DỤNG CHÍNH SÁCH</span><span>SAU KHI LỚP BỎ PHIẾU</span></div>{POLICIES.map(p=><CardButton key={p.id} card={p} onClick={()=>applyCard(p,"Chính sách")}/>)}</section><aside className="panel team-admin"><div className="panel-title"><span>ĐỘI CHƠI</span><button onClick={addTeam}>+ Thêm đội</button></div>{teams.map(t=><div className="team-row" key={t.id}><span>{t.id.toString().slice(-2)}</span><input value={t.name} onChange={e=>renameTeam(t.id,e.target.value)}/><b>{money.format(teamValue(t))}</b></div>)}<div className="log"><b>NHẬT KÝ</b>{logs.map((l,i)=><p key={i}><span>V{l.round}</span>{l.text}</p>)}</div></aside></div></section>}

      {view === "results" && <section className="page"><div className="section-head"><div><p className="eyebrow">KẾT QUẢ TẠM TÍNH</p><h2>Giàu nhất chưa chắc<br/><em>phát triển tốt nhất.</em></h2></div><ScoreOrbit scores={scores}/></div><div className="result-grid"><section className="podium">{leaderboard.map((t,i)=><div className="rank" key={t.id}><span>0{i+1}</span><div><b>{t.name}</b><small>{Object.entries(t.holdings).filter(([,q])=>q>0).map(([s,q])=>`${s} ×${q}`).join(" · ") || "100% tiền mặt"}</small></div><strong>{money.format(teamValue(t))} <small>tỷ</small></strong></div>)}</section><aside className="balance-card"><p>CHỈ SỐ QUỐC GIA</p><Metric label="Xã hội" value={scores.social}/><Metric label="Môi trường" value={scores.environment}/><Metric label="Ổn định" value={scores.stability}/><div className="final-score"><span>Điểm cân bằng</span><b>{Math.round((scores.social+scores.environment+scores.stability)/3)}</b></div><small>Đây là kết quả chung do toàn lớp và chính sách cùng tạo ra — không thuộc riêng một đội.</small></aside></div></section>}

      {view === "lesson" && <section className="page lesson"><p className="eyebrow">DEBRIEF — PHẦN QUAN TRỌNG NHẤT</p><h2>Từ sàn giao dịch<br/>trở lại bài học.</h2><div className="lesson-grid">{[["01","Thị trường đã làm gì?","Giá phản ứng với cung–cầu, thông tin và kỳ vọng. Vốn chảy về nơi người chơi tin rằng có lợi nhuận."],["02","Vấn đề nào xuất hiện?","Đầu cơ, ô nhiễm, độc quyền và cú sốc cho thấy thị trường hiệu quả nhưng không hoàn hảo."],["03","Nhà nước can thiệp để làm gì?","Thiết lập luật chơi, xử lý khuyết tật thị trường, cung cấp hàng hóa công và định hướng phát triển."],["04","Định hướng XHCN nằm ở đâu?","Tăng trưởng được đặt cùng tiến bộ xã hội, công bằng, môi trường và lợi ích lâu dài của nhân dân."]].map(([n,q,a])=><article key={n}><span>{n}</span><h3>{q}</h3><p>{a}</p></article>)}</div><div className="debate"><div><p>CÂU HỎI CHỐT</p><h3>Nếu chính sách làm giảm lợi nhuận ngắn hạn nhưng tăng phúc lợi dài hạn, đó có phải là một chính sách tốt?</h3></div><p>Không có đáp án “có/không” tuyệt đối. Hãy yêu cầu mỗi đội bảo vệ lựa chọn bằng cả hiệu quả kinh tế và lợi ích xã hội.</p></div></section>}
    </main>
  );
}

function clamp(n:number){ return Math.max(0, Math.min(100,n)); }
function Metric({label,value}:{label:string,value:number}){ return <div className="metric"><span>{label}</span><div><i style={{width:`${value}%`}}/></div><b>{value}</b></div> }
function ScoreOrbit({scores}:{scores:Scores}){ const avg=Math.round((scores.social+scores.environment+scores.stability)/3); return <div className="score-orbit"><div><small>CÂN BẰNG</small><b>{avg}</b><span>/100</span></div><i/><i/><i/></div> }
function CardButton({card,onClick}:{card:GameCard,onClick:()=>void}){ return <button className="game-card" onClick={onClick}><div><b>{card.title}</b><p>{card.description}</p></div><span>{Object.entries(card.effects).slice(0,3).map(([s,v])=><i className={v>0?"up":"down"} key={s}>{s} {v>0?"+":""}{v}%</i>)}</span></button> }
function Spark({values,color}:{values:number[],color:string}){ const pts=(values.length<2?[values[0],values[0]]:values).map((v,i,a)=>`${(i/(a.length-1))*80},${28-((v-Math.min(...a))/(Math.max(...a)-Math.min(...a)||1))*24}`).join(" "); return <svg className="spark" viewBox="0 0 80 32" aria-hidden="true"><polyline points={pts} fill="none" stroke={color} strokeWidth="2.5"/></svg> }
