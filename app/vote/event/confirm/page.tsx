"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const CATEGORY_LABELS: Record<string, string> = {
  nodojiman:    "🎤 のど自慢",
  coscon_solo:  "👗 コスコン（個人）",
  coscon_group: "👥 コスコン（団体）",
  m1:           "🎭 M1",
};

type Entry = { id: string; name: string; description: string };

export default function VoteEventConfirmPage() {
  return (
    <Suspense fallback={<main style={{ padding: "40px", textAlign: "center" }}><p style={{ color: "#aaa" }}>読み込み中...</p></main>}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const selections: Record<string, string> = {};
  ["nodojiman", "coscon_solo", "coscon_group", "m1"].forEach((k) => {
    const v = searchParams.get(k);
    if (v) selections[k] = v;
  });

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/event-entries");
      const data = await res.json();
      const map: Record<string, Entry> = {};
      (data.entries ?? []).forEach((e: Entry) => { map[e.id] = e; });
      setEntries(map);
    };
    load();
  }, []);

  const handleVote = async () => {
    const visitorId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("visitor_id="))
      ?.split("=")[1];

    if (!visitorId) { router.push("/register"); return; }

    setSubmitting(true);

    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId, type: "event", selections }),
    });

    if (res.ok) {
      setDone(true);
    } else {
      const data = await res.json();
      alert("エラー: " + (data.error || "不明"));
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <main style={{ padding: "60px 20px", textAlign: "center" }}>
        <div style={{ fontSize: "56px", marginBottom: "16px" }}>✅</div>
        <h1 style={{ fontSize: "20px", marginBottom: "8px" }}>投票完了！</h1>
        <p style={{ color: "#888", marginBottom: "24px" }}>ありがとうございました</p>
        <a href="/vote" style={{ color: "#e10102", fontSize: "15px" }}>投票トップに戻る</a>
      </main>
    );
  }

  return (
    <main style={{ padding: "24px 20px", maxWidth: "480px", margin: "0 auto" }}>
      <a href="/vote/event" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "20px" }}>
        ← 選択に戻る
      </a>
      <h1 style={{ fontSize: "20px", marginBottom: "6px" }}>投票内容の確認</h1>
      <p style={{ color: "#888", fontSize: "13px", marginBottom: "24px" }}>以下の内容で投票します</p>

      <div style={{ border: "1px solid #eee", borderRadius: "12px", overflow: "hidden", marginBottom: "24px" }}>
        {Object.entries(selections).map(([key, id], i) => {
          const entry = entries[id];
          return (
            <div
              key={key}
              style={{
                padding: "14px 16px",
                borderBottom: i < Object.keys(selections).length - 1 ? "1px solid #f0f0f0" : "none",
              }}
            >
              <div style={{ color: "#888", fontSize: "12px", marginBottom: "4px" }}>{CATEGORY_LABELS[key]}</div>
              <div style={{ fontWeight: "bold" }}>{entry?.name ?? id}</div>
              {entry?.description && (
                <div style={{ color: "#777", fontSize: "13px", marginTop: "2px" }}>{entry.description}</div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleVote}
        disabled={submitting}
        style={{
          width: "100%",
          padding: "14px",
          fontSize: "16px",
          cursor: submitting ? "not-allowed" : "pointer",
          backgroundColor: submitting ? "#ccc" : "#e10102",
          color: "white",
          border: "none",
          borderRadius: "8px",
        }}
      >
        {submitting ? "送信中..." : "この内容で投票する"}
      </button>
    </main>
  );
}
