"use client";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";


const Q_LABELS = ["Q0", "Q1", "Q2", "Q3", "Q4", "Final"];
const TOTAL_Q  = 6;

type Visit      = { class_code: string; entered_at: string };
type EventVisit = { event_key: string; event_label: string; entered_at: string };
type VoteRecord = { vote_type: string; category_label: string; target_label: string; voted_at: string };
type PuzzleProgress = { solved: number[]; currentQ: number };

function getPuzzleProgress(): PuzzleProgress {
  try {
    const raw = document.cookie.split("; ").find((r) => r.startsWith("puzzle_progress="))?.split("=")[1];
    if (!raw) return { solved: [], currentQ: 0 };
    const p = JSON.parse(decodeURIComponent(raw));
    return { solved: p.solved ?? [], currentQ: p.currentQ ?? 0 };
  } catch { return { solved: [], currentQ: 0 }; }
}

export default function HistoryPage() {
  const router = useRouter();
  const [visits,      setVisits]      = useState<Visit[]>([]);
  const [eventVisits, setEventVisits] = useState<EventVisit[]>([]);
  const [votes,       setVotes]       = useState<VoteRecord[]>([]);
  const [puzzle,      setPuzzle]      = useState<PuzzleProgress>({ solved: [], currentQ: 0 });
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => {
    const visitorId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("visitor_id="))
      ?.split("=")[1];

    if (!visitorId) {
      setError("来場者情報が見つかりません。ホームに戻ってください。");
      setLoading(false);
      return;
    }

    // 謎解き進捗はcookieから取得
    setPuzzle(getPuzzleProgress());

    const fetchAll = async () => {
      const [classRes, eventRes, voteRes] = await Promise.all([
        supabase.from("visits").select("class_code, entered_at").eq("visitor_id", visitorId).order("entered_at"),
        fetch(`/api/event-enter?visitorId=${visitorId}`).then((r) => r.json()),
        fetch(`/api/vote-history?visitorId=${visitorId}`).then((r) => r.json()),
      ]);
      if (classRes.error) { setError("データの取得に失敗しました"); }
      else {
        setVisits(classRes.data ?? []);
        setEventVisits(eventRes.visits ?? []);
        setVotes(voteRes.votes ?? []);
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  if (loading) return <main style={{ padding: "40px", textAlign: "center" }}><p style={{ color: "#aaa" }}>読み込み中...</p></main>;

  if (error) return (
    <main style={{ padding: "40px 20px", textAlign: "center" }}>
      <p style={{ color: "#f44336" }}>{error}</p>
      <button onClick={() => router.push("/")} style={{ marginTop: "16px", padding: "10px 20px", cursor: "pointer" }}>ホームへ</button>
    </main>
  );

  const classVotes = votes.filter((v) => v.vote_type === "class");
  const eventVotes = votes.filter((v) => v.vote_type === "event");
  const allSolved  = puzzle.solved.length === TOTAL_Q;

  return (
    <main style={{ padding: "24px 20px", maxWidth: "480px", margin: "0 auto" }}>
      <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#888", fontSize: "14px", cursor: "pointer", marginBottom: "16px", padding: 0 }}>
        ← 戻る
      </button>
      <h1 style={{ fontSize: "22px", marginBottom: "24px" }}>あなたの履歴</h1>

      {/* クラス入場履歴 */}
      <Section title="🏫 入場したクラス">
        {visits.length === 0 ? <Empty /> : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {visits.map((v, i) => (
              <li key={i} style={rowStyle}>
                <strong>{v.class_code}</strong>
                <Time ts={v.entered_at} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* イベント入場履歴 */}
      <Section title="🎤 参加したイベント">
        {eventVisits.length === 0 ? <Empty /> : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {eventVisits.map((v, i) => (
              <li key={i} style={rowStyle}>
                <strong>{v.event_label}</strong>
                <Time ts={v.entered_at} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* クラス投票履歴 */}
      <Section title="🏫 クラス企画投票">
        {classVotes.length === 0 ? <Empty text="まだ投票していません" /> : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {classVotes.map((v, i) => (
              <li key={i} style={{ ...rowStyle, flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
                <span style={{ fontSize: "12px", color: "#888" }}>{v.category_label}</span>
                <span style={{ fontWeight: "bold" }}>{v.target_label}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* イベント投票履歴 */}
      <Section title="🎤 イベント企画投票">
        {eventVotes.length === 0 ? <Empty text="まだ投票していません" /> : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {eventVotes.map((v, i) => (
              <li key={i} style={{ ...rowStyle, flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
                <span style={{ fontSize: "12px", color: "#888" }}>{v.category_label}</span>
                <span style={{ fontWeight: "bold" }}>{v.target_label}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 謎解き進捗 */}
      <Section title="🔍 謎解き">
        {puzzle.solved.length === 0 ? (
          <Empty text="まだ謎解きを始めていません" />
        ) : (
          <>
            {allSolved ? (
              <div style={{ marginBottom: "12px", padding: "10px 14px", backgroundColor: "#fff8e1", border: "1px solid #ffe082", borderRadius: "8px", fontSize: "14px", color: "#b8860b", fontWeight: "bold" }}>
                🏆 コンプリート達成！
              </div>
            ) : (
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "10px" }}>
                {puzzle.solved.length} / {TOTAL_Q} 問正解
              </p>
            )}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {Q_LABELS.map((label, i) => {
                const solved = puzzle.solved.includes(i);
                return (
                  <div key={i} style={{
                    padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold",
                    backgroundColor: solved ? "rgba(100,200,100,0.15)" : "#f5f5f5",
                    color: solved ? "#2e7d32" : "#aaa",
                    border: solved ? "1px solid #81c784" : "1px solid #eee",
                  }}>
                    {label} {solved ? "✅" : ""}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "32px" }}>
      <h2 style={{ fontSize: "16px", color: "#333", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>{title}</h2>
      {children}
    </section>
  );
}

function Empty({ text = "まだ記録がありません" }: { text?: string }) {
  return <p style={{ color: "#aaa", fontSize: "14px" }}>{text}</p>;
}

function Time({ ts }: { ts: string }) {
  return (
    <span style={{ color: "#888", fontSize: "13px" }}>
      {new Date(ts).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

const rowStyle: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "10px 0", borderBottom: "1px solid #f0f0f0", fontSize: "15px",
};
