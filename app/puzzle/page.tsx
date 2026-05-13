"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const TOTAL_Q = 6;
const Q_LABELS = ["Q0", "Q1", "Q2", "Q3", "Q4", "Final"];
const HAS_HINT = [true, true, true, false, true, true];

const ANSWERS: string[][] = [
  (process.env.NEXT_PUBLIC_PUZZLE_ANS_0 ?? "").split("|").map((s) => s.trim()).filter(Boolean),
  (process.env.NEXT_PUBLIC_PUZZLE_ANS_1 ?? "").split("|").map((s) => s.trim()).filter(Boolean),
  (process.env.NEXT_PUBLIC_PUZZLE_ANS_2 ?? "").split("|").map((s) => s.trim()).filter(Boolean),
  (process.env.NEXT_PUBLIC_PUZZLE_ANS_3 ?? "").split("|").map((s) => s.trim()).filter(Boolean),
  (process.env.NEXT_PUBLIC_PUZZLE_ANS_4 ?? "").split("|").map((s) => s.trim()).filter(Boolean),
  (process.env.NEXT_PUBLIC_PUZZLE_ANS_5 ?? "").split("|").map((s) => s.trim()).filter(Boolean),
];

type Progress = {
  solved:   number[];
  hints:    number[];
  hints0_2: boolean;
  currentQ: number;
};

function getProgress(): Progress {
  try {
    const raw = document.cookie.split("; ").find((r) => r.startsWith("puzzle_progress="))?.split("=")[1];
    if (!raw) return { solved: [], hints: [], hints0_2: false, currentQ: 0 };
    const p = JSON.parse(decodeURIComponent(raw));
    return { solved: p.solved ?? [], hints: p.hints ?? [], hints0_2: p.hints0_2 ?? false, currentQ: p.currentQ ?? 0 };
  } catch { return { solved: [], hints: [], hints0_2: false, currentQ: 0 }; }
}

function saveProgress(p: Progress) {
  const expires = new Date(); expires.setDate(expires.getDate() + 180);
  document.cookie = `puzzle_progress=${encodeURIComponent(JSON.stringify(p))}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}

// Q0〜Q5(Final)の表示ラベル（履歴用）
const PROGRESS_LABELS = ["Q0", "Q1", "Q2", "Q3", "Q4", "Final", "Complete"];

const STYLE = `
  body { background: #000 !important; }
  .q-box { width:44px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:1px solid #444;transition:all 0.2s;user-select:none; }
  .q-box.solved  { background:rgba(100,200,100,0.25);color:#7dff7d;border-color:#4a9;cursor:pointer; }
  .q-box.final   { background:rgba(40,40,40,0.8);color:#888;border-color:#333;cursor:pointer; }
  .q-box.current { border-color:#e10102 !important;color:#fff;background:rgba(225,1,2,0.15);cursor:default; }
  .q-box.locked  { color:#333;cursor:not-allowed;border-color:#222; }
  .q-box.open    { color:#aaa;cursor:pointer; }
`;

export default function PuzzlePage() {
  return <Suspense fallback={<div style={{ background:"#000",minHeight:"100vh" }} />}><PuzzleInner /></Suspense>;
}

function PuzzleInner() {
  const router = useRouter();
  const [phase,       setPhase]       = useState<"cover"|"game">("cover");
  const [currentQ,    setCurrentQ]    = useState(0);
  const [progress,    setProgress]    = useState<Progress>({ solved:[], hints:[], hints0_2:false, currentQ:0 });
  const [answer,      setAnswer]      = useState("");
  const [answerErr,   setAnswerErr]   = useState<string|null>(null);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showEnding,  setShowEnding]  = useState(false);
  const [redeemed,    setRedeemed]    = useState(false);
  const [hintOpen,    setHintOpen]    = useState(false);
  const [ticket,      setTicket]      = useState<number|null>(null);
  const [visitorId,   setVisitorId]   = useState<string|null>(null);
  const [clearCount,  setClearCount]  = useState<number|null>(null);

  useEffect(() => {
    const id = document.cookie.split("; ").find((r) => r.startsWith("visitor_id="))?.split("=")[1];
    setVisitorId(id ?? null);
    const p = getProgress();
    setProgress(p);

    if (p.solved.length === TOTAL_Q) {
      setCurrentQ(p.currentQ);
      setPhase("game");
      if (id) {
        fetch(`/api/puzzle-clear?visitorId=${id}`, { cache: "no-store" })
          .then((r) => r.json())
          .then((d) => { if (d.redeemed) setRedeemed(true); });
      }
      // コンプリート者数取得
      fetch("/api/puzzle-clear-count", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => { if (typeof d.count === "number") setClearCount(d.count); })
        .catch(() => {});
      setShowEnding(true);
      return;
    }
    if (p.solved.length > 0 || p.currentQ > 0) {
      setCurrentQ(p.currentQ);
      setPhase("game");
    }

    // カバー表示時もコンプリート者数を取得（コンプリート済みの場合）
    if (p.solved.length === TOTAL_Q) {
      fetch("/api/puzzle-clear-count", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => { if (typeof d.count === "number") setClearCount(d.count); })
        .catch(() => {});
    }
  }, []);

  // コンプリート済みでカバーを開いたときにも取得
  useEffect(() => {
    if (phase === "cover" && progress.solved.length === TOTAL_Q) {
      fetch("/api/puzzle-clear-count", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => { if (typeof d.count === "number") setClearCount(d.count); })
        .catch(() => {});
    }
  }, [phase, progress.solved.length]);

  const fetchTicket = useCallback(async (vid: string, p: Progress) => {
    const res  = await fetch(`/api/puzzle-ticket?visitorId=${vid}`, { cache: "no-store" });
    const data = await res.json();
    const consumed = p.hints.length + (p.hints0_2 ? 1 : 0);
    setTicket(Math.max(0, (data.total ?? 0) - consumed));
  }, []);

  const openHintModal = async () => {
    if (!visitorId) return;
    await fetchTicket(visitorId, progress);
    setHintOpen(true);
  };

  const unlockHint = (key: "hint1"|"hint0_2") => {
    if (!ticket || ticket <= 0) { alert("チケットが足りません"); return; }
    let newP = { ...progress };
    if (key === "hint1") newP = { ...newP, hints: [...new Set([...newP.hints, currentQ])] };
    else newP = { ...newP, hints0_2: true };
    setProgress(newP); saveProgress(newP);
    setTicket((t) => (t ?? 1) - 1);
  };

  const goToQ = (q: number) => {
    if (!progress.solved.includes(0) && q !== 0) return;
    const newP = { ...progress, currentQ: q };
    setProgress(newP); saveProgress(newP);
    setCurrentQ(q); setAnswer(""); setAnswerErr(null); setShowCorrect(false); setHintOpen(false);
  };

  const handleSubmit = () => {
    const correct: string[] = ANSWERS[currentQ];
    if (!correct || correct.length === 0) { alert("この問題の答えは未設定です"); return; }
    if (correct.some((c) => answer.trim().toLowerCase() === c.toLowerCase())) {
      const newSolved = [...new Set([...progress.solved, currentQ])];
      const newP = { ...progress, solved: newSolved };
      setProgress(newP); saveProgress(newP);
      setAnswerErr(null);
      if (newSolved.length === TOTAL_Q) {
        if (visitorId) {
          fetch("/api/puzzle-clear", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ visitorId }) });
        }
        // コンプリート者数更新
        fetch("/api/puzzle-clear-count", { cache: "no-store" })
          .then((r) => r.json())
          .then((d) => { if (typeof d.count === "number") setClearCount(d.count); })
          .catch(() => {});
        setShowEnding(true);
      } else {
        setShowCorrect(true);
      }
    } else {
      setAnswerErr("不正解です。もう一度試してください。");
    }
  };

  const goNext = () => { setShowCorrect(false); setAnswer(""); if (currentQ < TOTAL_Q-1) goToQ(currentQ+1); };

  const openRedeemQR = async () => {
    if (!visitorId) return;
    const res  = await fetch(`/api/puzzle-clear?visitorId=${visitorId}`, { cache:"no-store" });
    const data = await res.json();
    if (data.redeemed) {
      setRedeemed(true);
      alert("この景品はすでに引き換え済みです。");
      return;
    }
    router.push("/enter?mode=redeem");
  };

  const isSolved  = progress.solved.includes(currentQ);
  const q0Solved  = progress.solved.includes(0);
  const hint1Open = progress.hints.includes(currentQ);
  const hint2Open = currentQ === 0 && progress.hints0_2;
  const allSolved = progress.solved.length === TOTAL_Q;

  // ── 表紙 ──
  if (phase === "cover") {
    return (
      <>
        <style>{STYLE}</style>
        <main style={{ background:"#000",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px",position:"relative" }}>
          {/* ホームへ戻る（上部） */}
          <Link href="/" style={{ position:"absolute",top:"20px",left:"20px",fontSize:"13px",color:"#666",textDecoration:"none" }}>
            ← ホーム
          </Link>

          <img src="/puzzle/cover.png" alt="謎解き" style={{ maxWidth:"320px",width:"100%",borderRadius:"12px",marginBottom:"24px" }} />

          {/* 謎解きガイド説明文 */}
          <div style={{ maxWidth:"320px",width:"100%",marginBottom:"28px",textAlign:"left",backgroundColor:"rgba(255,255,255,0.05)",borderRadius:"12px",padding:"16px 18px",border:"1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ color:"#fff",fontSize:"17px",fontWeight:"bold",marginBottom:"12px",textAlign:"center" }}>謎解きガイド</p>
            <p style={{ color:"#bbb",fontSize:"13px",lineHeight:"1.8",margin:"0 0 8px" }}>
              • Q0〜Q4とFinalの全6問に挑戦しよう！
            </p>
            <p style={{ color:"#bbb",fontSize:"13px",lineHeight:"1.8",margin:"0 0 8px" }}>
              • まずQ0を解くと、Q1〜Finalが開放されます。
            </p>
            <p style={{ color:"#bbb",fontSize:"13px",lineHeight:"1.8",margin:"0 0 8px" }}>
              • 各問題の答えを入力して「送信」を押してください。
            </p>
            <p style={{ color:"#bbb",fontSize:"13px",lineHeight:"1.8",margin:"0 0 8px" }}>
              • 困ったときはヒントを使おう（クラス企画やイベントに参加するともらえるヒントチケットが必要です）。
            </p>
            <p style={{ color:"#bbb",fontSize:"13px",lineHeight:"1.8",margin:"0" }}>
              • 全問正解するとスペシャルな景品と交換できます！
            </p>
          </div>

          {/* コンプリート者数（コンプリート済みの場合のみ表示） */}
          {allSolved && clearCount !== null && (
            <div style={{ marginBottom:"16px",display:"inline-flex",alignItems:"center",gap:"6px",backgroundColor:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.3)",borderRadius:"20px",padding:"6px 16px",fontSize:"13px",color:"#ffd700" }}>
              <span>🏆</span>
              <span>コンプリート達成者: <strong>{clearCount}人</strong></span>
            </div>
          )}

          <button onClick={() => { setCurrentQ(progress.currentQ); setPhase("game"); }}
            style={{ padding:"14px 40px",fontSize:"18px",fontWeight:"bold",backgroundColor:"#e10102",color:"white",border:"none",borderRadius:"10px",cursor:"pointer" }}>
            {progress.solved.length > 0 ? "途中から再開" : "はじめる"}
          </button>
        </main>
      </>
    );
  }

  // ── ゲーム ──
  return (
    <>
      <style>{STYLE}</style>
      <main style={{ background:"#000",minHeight:"100vh",padding:"16px 12px 40px",color:"white",maxWidth:"480px",margin:"0 auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px" }}>
          <Link href="/" style={{ fontSize:"13px",color:"#666",textDecoration:"none" }}>← ホーム</Link>
          <span style={{ fontSize:"12px",color:"#444" }}>謎解き</span>
        </div>

        {/* Qボックス */}
        <div style={{ display:"flex",gap:"6px",justifyContent:"center",marginBottom:"16px",flexWrap:"wrap" }}>
          {Q_LABELS.map((label, i) => {
            const solved  = progress.solved.includes(i);
            const isFinal = i === TOTAL_Q-1;
            const isCur   = i === currentQ;
            const locked  = !q0Solved && i !== 0;
            let cls = "q-box";
            if (isCur) cls += " current";
            else if (solved) cls += " solved";
            else if (locked) cls += " locked";
            else if (isFinal) cls += " final";
            else cls += " open";
            return <div key={i} className={cls} onClick={() => !locked && !isCur && goToQ(i)} title={locked?"Q0を先に解いてください":""}>{label}</div>;
          })}
        </div>

        {/* Q4バナー */}
        {currentQ === 4 && (
          <div style={{ marginBottom:"12px",padding:"10px 16px",backgroundColor:"rgba(255,200,0,0.12)",border:"1px solid rgba(255,200,0,0.35)",borderRadius:"8px",display:"flex",alignItems:"center",gap:"8px" }}>
            <span style={{ fontSize:"18px" }}>🛍️</span>
            <span style={{ fontSize:"13px",color:"#ffd700",fontWeight:"bold",lineHeight:"1.5" }}>
              この教室で開催されるバザーも是非ご覧ください！
            </span>
          </div>
        )}

        {/* 問題画像 */}
        <div style={{ position:"relative",width:"100%" }}>
          <img src={`/puzzle/q${currentQ}.png`} alt={`Q${currentQ}`} style={{ width:"100%",borderRadius:"10px",display:"block" }} />
          {HAS_HINT[currentQ] && (
            <button onClick={openHintModal}
              style={{ position:"absolute",bottom:"10px",left:"10px",padding:"8px 14px",fontSize:"13px",backgroundColor:"rgba(0,0,0,0.75)",color:"#fff",border:"1px solid #555",borderRadius:"8px",cursor:"pointer" }}>
              💡 ヒント
            </button>
          )}
          {!isSolved && (
            <button onClick={handleSubmit}
              style={{ position:"absolute",bottom:"10px",right:"10px",padding:"8px 14px",fontSize:"13px",backgroundColor:"#e10102",color:"#fff",border:"none",borderRadius:"8px",cursor:"pointer" }}>
              送信
            </button>
          )}
        </div>

        {!isSolved ? (
          <div style={{ marginTop:"16px" }}>
            <input value={answer} onChange={(e) => setAnswer(e.target.value)} onKeyDown={(e) => { if(e.key==="Enter") handleSubmit(); }}
              placeholder="答えを入力..."
              style={{ width:"100%",padding:"12px",fontSize:"16px",borderRadius:"8px",border:"1px solid #444",backgroundColor:"#111",color:"white",boxSizing:"border-box" }} />
            {answerErr && <div style={{ marginTop:"10px",padding:"10px",backgroundColor:"rgba(225,1,2,0.2)",borderRadius:"8px",color:"#ff6666",textAlign:"center",fontSize:"14px" }}>{answerErr}</div>}
          </div>
        ) : (
          <div style={{ marginTop:"16px",padding:"12px",backgroundColor:"rgba(100,200,100,0.15)",borderRadius:"8px",color:"#7dff7d",textAlign:"center",fontSize:"15px" }}>✅ この問題は正解済みです</div>
        )}
      </main>

      {/* 正解モーダル */}
      {showCorrect && (
        <div style={{ position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.92)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:200,overflowY:"auto",padding:"20px 0" }}>
          <div style={{ backgroundColor:"#111",borderRadius:"16px",padding:"24px 20px",textAlign:"center",maxWidth:"420px",width:"92%",border:"1px solid #333",margin:"auto" }}>
            <div style={{ fontSize:"40px",marginBottom:"8px" }}>🎉</div>
            <h2 style={{ color:"#7dff7d",fontSize:"20px",marginBottom:"4px" }}>正解！</h2>
            <p style={{ color:"#aaa",fontSize:"13px",marginBottom:"16px" }}>{Q_LABELS[currentQ]} クリア！</p>
            <img src={`/puzzle/correct${currentQ}.png`} alt="解説" style={{ width:"100%",borderRadius:"10px",marginBottom:"20px" }} />
            <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
              {currentQ < TOTAL_Q-1 && (
                <button onClick={goNext} style={{ padding:"13px",fontSize:"15px",backgroundColor:"#e10102",color:"white",border:"none",borderRadius:"8px",cursor:"pointer",fontWeight:"bold" }}>次へ進む →</button>
              )}
              <button onClick={() => setShowCorrect(false)} style={{ padding:"12px",fontSize:"14px",backgroundColor:"#222",color:"#aaa",border:"1px solid #444",borderRadius:"8px",cursor:"pointer" }}>閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* エンディングモーダル */}
      {showEnding && (
        <div style={{ position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.97)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:300,overflowY:"auto",padding:"20px 0" }}>
          <div style={{ backgroundColor:"#111",borderRadius:"16px",padding:"24px 20px",textAlign:"center",maxWidth:"420px",width:"92%",border:"1px solid #555",margin:"auto" }}>
            <div style={{ fontSize:"48px",marginBottom:"8px" }}>🏆</div>
            <h2 style={{ color:"#ffd700",fontSize:"22px",marginBottom:"4px" }}>全問正解！</h2>
            <p style={{ color:"#aaa",fontSize:"13px",marginBottom:"4px" }}>おめでとうございます！</p>
            {clearCount !== null && (
              <p style={{ color:"#ffd700",fontSize:"13px",marginBottom:"4px" }}>
                🏅 コンプリート達成者: <strong>{clearCount}人</strong>
              </p>
            )}
            <p style={{ color:"#ffd700",fontSize:"14px",fontWeight:"bold",marginBottom:"20px" }}>
              🎁 景品交換は受付（正面玄関）にて
            </p>
            <img src="/puzzle/ending.png" alt="エンディング" style={{ width:"100%",borderRadius:"10px",marginBottom:"20px" }} />
            <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
              {redeemed ? (
                <div style={{ padding:"12px",backgroundColor:"rgba(100,100,100,0.2)",borderRadius:"8px",color:"#888",fontSize:"14px" }}>
                  景品は引き換え済みです
                </div>
              ) : (
                <button onClick={openRedeemQR}
                  style={{ padding:"13px",fontSize:"15px",backgroundColor:"#ffd700",color:"#000",border:"none",borderRadius:"8px",cursor:"pointer",fontWeight:"bold" }}>
                  🎁 景品引換QRを表示
                </button>
              )}
              <button onClick={() => { setShowEnding(false); router.push("/"); }}
                style={{ padding:"13px",fontSize:"15px",backgroundColor:"#e10102",color:"white",border:"none",borderRadius:"8px",cursor:"pointer",fontWeight:"bold" }}>
                ホームに戻る
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ヒントモーダル */}
      {hintOpen && (
        <div style={{ position:"fixed",inset:0,backgroundColor:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:"16px" }}>
          <div style={{ backgroundColor:"#111",borderRadius:"16px",padding:"24px 20px",maxWidth:"380px",width:"100%",border:"1px solid #333",textAlign:"center",maxHeight:"90vh",overflowY:"auto" }}>
            <h2 style={{ color:"white",fontSize:"18px",marginBottom:"16px" }}>💡 ヒント</h2>
            {currentQ === 0 ? (
              <>
                <p style={{ color:"#666",fontSize:"12px",marginBottom:"12px" }}>Q0にはヒントが2つあります</p>
                <div style={{ marginBottom:"16px",textAlign:"left" }}>
                  <p style={{ color:"#888",fontSize:"12px",marginBottom:"6px" }}>ヒント 1</p>
                  {hint1Open ? (
                    <img src="/puzzle/hint0-1.png" alt="ヒント1" style={{ width:"100%",borderRadius:"8px" }} />
                  ) : (
                    <div style={{ padding:"14px",backgroundColor:"#1a1a1a",borderRadius:"8px",border:"1px solid #333" }}>
                      <p style={{ color:"#aaa",fontSize:"13px",marginBottom:"8px" }}>🎫 チケット1枚で開封</p>
                      <button onClick={() => unlockHint("hint1")} disabled={!ticket||ticket<=0}
                        style={{ padding:"8px 20px",fontSize:"13px",backgroundColor:ticket&&ticket>0?"#e10102":"#444",color:"white",border:"none",borderRadius:"6px",cursor:ticket&&ticket>0?"pointer":"not-allowed" }}>
                        使う（残り {ticket??"..."} 枚）
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ marginBottom:"16px",textAlign:"left" }}>
                  <p style={{ color:"#888",fontSize:"12px",marginBottom:"6px" }}>ヒント 2</p>
                  {hint2Open ? (
                    <img src="/puzzle/hint0-2.png" alt="ヒント2" style={{ width:"100%",borderRadius:"8px" }} />
                  ) : (
                    <div style={{ padding:"14px",backgroundColor:"#1a1a1a",borderRadius:"8px",border:"1px solid #333" }}>
                      <p style={{ color:"#aaa",fontSize:"13px",marginBottom:"8px" }}>🎫 チケット1枚で開封</p>
                      <button onClick={() => unlockHint("hint0_2")} disabled={!ticket||ticket<=0}
                        style={{ padding:"8px 20px",fontSize:"13px",backgroundColor:ticket&&ticket>0?"#e10102":"#444",color:"white",border:"none",borderRadius:"6px",cursor:ticket&&ticket>0?"pointer":"not-allowed" }}>
                        使う（残り {ticket??"..."} 枚）
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ marginBottom:"16px" }}>
                {hint1Open ? (
                  <img src={`/puzzle/hint${currentQ}.png`} alt="ヒント" style={{ width:"100%",borderRadius:"8px" }} />
                ) : (
                  <div style={{ padding:"20px",backgroundColor:"#1a1a1a",borderRadius:"8px",border:"1px solid #333" }}>
                    <p style={{ color:"#aaa",fontSize:"13px",marginBottom:"8px" }}>🎫 チケット1枚で開封</p>
                    <p style={{ color:"#fff",fontSize:"20px",fontWeight:"bold",marginBottom:"12px" }}>残り {ticket??"..."} 枚</p>
                    <button onClick={() => unlockHint("hint1")} disabled={!ticket||ticket<=0}
                      style={{ padding:"10px 28px",fontSize:"14px",backgroundColor:ticket&&ticket>0?"#e10102":"#444",color:"white",border:"none",borderRadius:"8px",cursor:ticket&&ticket>0?"pointer":"not-allowed" }}>
                      チケットを使う
                    </button>
                  </div>
                )}
              </div>
            )}
            <button onClick={() => setHintOpen(false)}
              style={{ padding:"10px",fontSize:"14px",backgroundColor:"#222",color:"#aaa",border:"1px solid #444",borderRadius:"8px",cursor:"pointer",width:"100%" }}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}
