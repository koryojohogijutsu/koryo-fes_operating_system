"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const TOTAL_Q = 6;
const Q_LABELS = ["Q0", "Q1", "Q2", "Q3", "Q4", "Final"];
const ANSWERS = [
  process.env.NEXT_PUBLIC_PUZZLE_ANS_0 ?? "",
  process.env.NEXT_PUBLIC_PUZZLE_ANS_1 ?? "",
  process.env.NEXT_PUBLIC_PUZZLE_ANS_2 ?? "",
  process.env.NEXT_PUBLIC_PUZZLE_ANS_3 ?? "",
  process.env.NEXT_PUBLIC_PUZZLE_ANS_4 ?? "",
  process.env.NEXT_PUBLIC_PUZZLE_ANS_5 ?? "",
];

type Progress = { solved: number[]; hints: number[] };

function getProgress(): Progress {
  const raw = document.cookie.split("; ").find((r) => r.startsWith("puzzle_progress="))?.split("=")[1];
  if (!raw) return { solved: [], hints: [] };
  try { return JSON.parse(decodeURIComponent(raw)); } catch { return { solved: [], hints: [] }; }
}

function saveProgress(p: Progress) {
  const expires = new Date();
  expires.setDate(expires.getDate() + 180);
  document.cookie = `puzzle_progress=${encodeURIComponent(JSON.stringify(p))}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}

const STYLE = `
  body { background: #000; }
  .q-box { width: 44px; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; cursor: pointer; border: 1px solid #444; transition: background 0.2s; }
  .q-box.solved { background: rgba(100,200,100,0.25); color: #7dff7d; border-color: #4a9; }
  .q-box.final { background: rgba(40,40,40,0.8); color: #888; border-color: #333; }
  .q-box.current { border-color: #e10102; color: #fff; }
  .q-box.default { color: #aaa; }
`;

export default function PuzzlePage() {
  return (
    <Suspense fallback={<div style={{ background: "#000", minHeight: "100vh" }} />}>
      <PuzzleInner />
    </Suspense>
  );
}

function PuzzleInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qParam = searchParams.get("q");

  const [phase, setPhase]         = useState<"cover" | "game">("cover");
  const [currentQ, setCurrentQ]   = useState(0);
  const [progress, setProgress]   = useState<Progress>({ solved: [], hints: [] });
  const [answer, setAnswer]        = useState("");
  const [answerMsg, setAnswerMsg]  = useState<{ ok: boolean; text: string } | null>(null);
  const [showCorrect, setShowCorrect] = useState(false);

  // ヒントモーダル
  const [hintOpen, setHintOpen]   = useState(false);
  const [ticket, setTicket]        = useState<number | null>(null);
  const [visitorId, setVisitorId]  = useState<string | null>(null);

  // 初期化
  useEffect(() => {
    const id = document.cookie.split("; ").find((r) => r.startsWith("visitor_id="))?.split("=")[1];
    setVisitorId(id ?? null);
    const p = getProgress();
    setProgress(p);

    if (qParam !== null) {
      const q = parseInt(qParam);
      if (!isNaN(q) && q >= 0 && q < TOTAL_Q) {
        setCurrentQ(q);
        setPhase("game");
      }
    }
  }, [qParam]);

  // チケット取得
  const fetchTicket = useCallback(async (vid: string) => {
    const res  = await fetch(`/api/puzzle-ticket?visitorId=${vid}`);
    const data = await res.json();
    const total    = data.total ?? 0;
    const consumed = progress.hints.length;
    setTicket(Math.max(0, total - consumed));
  }, [progress.hints.length]);

  const openHintModal = async () => {
    if (!visitorId) return;
    await fetchTicket(visitorId);
    setHintOpen(true);
  };

  const useTicket = () => {
    if (ticket === null || ticket <= 0) { alert("チケットが足りません"); return; }
    const newProgress = { ...progress, hints: [...new Set([...progress.hints, currentQ])] };
    setProgress(newProgress);
    saveProgress(newProgress);
    setTicket((t) => (t ?? 1) - 1);
  };

  const handleSubmit = () => {
    const correct = ANSWERS[currentQ];
    if (!correct) { alert("この問題の答えは未設定です"); return; }
    if (answer.trim().toLowerCase() === correct.toLowerCase()) {
      const newProgress = { ...progress, solved: [...new Set([...progress.solved, currentQ])] };
      setProgress(newProgress);
      saveProgress(newProgress);
      setAnswerMsg(null);
      setShowCorrect(true);
    } else {
      setAnswerMsg({ ok: false, text: "不正解です。もう一度試してください。" });
    }
  };

  const goNext = () => {
    setShowCorrect(false);
    setAnswer("");
    if (currentQ < TOTAL_Q - 1) {
      setCurrentQ(currentQ + 1);
    }
  };

  const goToQ = (q: number) => {
    setCurrentQ(q);
    setAnswer("");
    setAnswerMsg(null);
    setShowCorrect(false);
    setHintOpen(false);
  };

  const hintUnlocked = progress.hints.includes(currentQ);
  const isSolved     = progress.solved.includes(currentQ);

  // ── 表紙画面 ──
  if (phase === "cover") {
    return (
      <>
        <style>{STYLE}</style>
        <main style={{ background: "#000", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <a href="/" style={{ position: "absolute", top: "20px", left: "20px", fontSize: "13px", color: "#666", textDecoration: "none" }}>← ホーム</a>
          <img src="/puzzle/cover.png" alt="謎解き" style={{ maxWidth: "320px", width: "100%", borderRadius: "12px", marginBottom: "32px" }} />
          <button
            onClick={() => setPhase("game")}
            style={{ padding: "14px 40px", fontSize: "18px", fontWeight: "bold", backgroundColor: "#e10102", color: "white", border: "none", borderRadius: "10px", cursor: "pointer" }}
          >
            はじめる
          </button>
        </main>
      </>
    );
  }

  // ── ゲーム画面 ──
  return (
    <>
      <style>{STYLE}</style>
      <main style={{ background: "#000", minHeight: "100vh", padding: "16px 12px", color: "white", maxWidth: "480px", margin: "0 auto" }}>

        {/* Q番号ボックス一覧 */}
        <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginBottom: "16px", flexWrap: "wrap" }}>
          {Q_LABELS.map((label, i) => {
            const solved  = progress.solved.includes(i);
            const isFinal = i === TOTAL_Q - 1;
            const isCur   = i === currentQ;
            let cls = "q-box";
            if (solved)       cls += " solved";
            else if (isFinal) cls += " final";
            else if (isCur)   cls += " current";
            else              cls += " default";
            return (
              <div key={i} className={cls} onClick={() => goToQ(i)}>
                {label}
              </div>
            );
          })}
        </div>

        {/* 問題画像 */}
        <div style={{ position: "relative", width: "100%" }}>
          <img
            src={`/puzzle/q${currentQ}.png`}
            alt={`Q${currentQ}`}
            style={{ width: "100%", borderRadius: "10px", display: "block" }}
          />

          {/* ヒントボタン（左下） */}
          <button
            onClick={openHintModal}
            style={{ position: "absolute", bottom: "10px", left: "10px", padding: "8px 14px", fontSize: "13px", backgroundColor: "rgba(0,0,0,0.7)", color: "#fff", border: "1px solid #555", borderRadius: "8px", cursor: "pointer" }}
          >
            💡 ヒント
          </button>

          {/* 送信ボタン（右下） */}
          {!isSolved && (
            <button
              onClick={handleSubmit}
              style={{ position: "absolute", bottom: "10px", right: "10px", padding: "8px 14px", fontSize: "13px", backgroundColor: "#e10102", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
            >
              送信
            </button>
          )}
        </div>

        {/* 回答入力 */}
        {!isSolved && (
          <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              placeholder="答えを入力..."
              style={{ flex: 1, padding: "12px", fontSize: "16px", borderRadius: "8px", border: "1px solid #444", backgroundColor: "#111", color: "white" }}
            />
          </div>
        )}

        {isSolved && (
          <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "rgba(100,200,100,0.15)", borderRadius: "8px", color: "#7dff7d", textAlign: "center", fontSize: "15px" }}>
            ✅ この問題は正解済みです
          </div>
        )}

        {answerMsg && !answerMsg.ok && (
          <div style={{ marginTop: "12px", padding: "10px", backgroundColor: "rgba(225,1,2,0.2)", borderRadius: "8px", color: "#ff6666", textAlign: "center", fontSize: "14px" }}>
            {answerMsg.text}
          </div>
        )}
      </main>

      {/* 正解モーダル */}
      {showCorrect && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.92)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 200, overflowY: "auto", padding: "20px 0" }}>
          <div style={{ backgroundColor: "#111", borderRadius: "16px", padding: "24px 20px", textAlign: "center", maxWidth: "420px", width: "92%", border: "1px solid #333", margin: "auto" }}>
            <div style={{ fontSize: "40px", marginBottom: "8px" }}>🎉</div>
            <h2 style={{ color: "#7dff7d", fontSize: "20px", marginBottom: "4px" }}>正解！</h2>
            <p style={{ color: "#aaa", fontSize: "13px", marginBottom: "16px" }}>
              {Q_LABELS[currentQ]} クリア！
            </p>
            {/* 解説画像 */}
            <img
              src={}
              alt="解説"
              style={{ width: "100%", borderRadius: "10px", marginBottom: "20px", display: "block" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {currentQ < TOTAL_Q - 1 && (
                <button onClick={goNext}
                  style={{ padding: "13px", fontSize: "15px", backgroundColor: "#e10102", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
                  次へ進む →
                </button>
              )}
              <button onClick={() => setShowCorrect(false)}
                style={{ padding: "12px", fontSize: "14px", backgroundColor: "#222", color: "#aaa", border: "1px solid #444", borderRadius: "8px", cursor: "pointer" }}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ヒントモーダル */}
      {hintOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ backgroundColor: "#111", borderRadius: "16px", padding: "24px 20px", maxWidth: "360px", width: "90%", border: "1px solid #333", textAlign: "center" }}>
            <h2 style={{ color: "white", fontSize: "18px", marginBottom: "8px" }}>💡 ヒント</h2>

            {hintUnlocked ? (
              // 開封済み：ヒント画像を表示
              <>
                <img src={`/puzzle/hint${currentQ}.png`} alt="ヒント" style={{ width: "100%", borderRadius: "8px", marginBottom: "16px" }} />
                <button onClick={() => setHintOpen(false)}
                  style={{ padding: "10px 24px", fontSize: "14px", backgroundColor: "#222", color: "#aaa", border: "1px solid #444", borderRadius: "8px", cursor: "pointer" }}>
                  閉じる
                </button>
              </>
            ) : (
              // 未開封：チケット消費確認
              <>
                <p style={{ color: "#aaa", fontSize: "14px", marginBottom: "8px" }}>
                  チケットを1枚消費してヒントを見ますか？
                </p>
                <p style={{ color: "#fff", fontSize: "18px", fontWeight: "bold", marginBottom: "20px" }}>
                  🎫 残り {ticket ?? "..."} 枚
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <button
                    onClick={useTicket}
                    disabled={!ticket}
                    style={{ padding: "11px", fontSize: "14px", backgroundColor: ticket ? "#e10102" : "#444", color: "white", border: "none", borderRadius: "8px", cursor: ticket ? "pointer" : "not-allowed" }}>
                    チケットを使う
                  </button>
                  <button onClick={() => setHintOpen(false)}
                    style={{ padding: "11px", fontSize: "14px", backgroundColor: "#222", color: "#aaa", border: "1px solid #444", borderRadius: "8px", cursor: "pointer" }}>
                    閉じる
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
