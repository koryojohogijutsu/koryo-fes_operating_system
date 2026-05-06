"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";

const EVENT_LABELS: Record<string, string> = {
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
  const router       = useRouter();
  const { category } = useParams<{ category: string }>();
  const searchParams = useSearchParams();
  const entryId      = searchParams.get("entryId") ?? "";

  const [entry,      setEntry]      = useState<Entry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);

  useEffect(() => {
    if (!entryId) return;
    fetch("/api/event-entries")
      .then((r) => r.json())
      .then((data) => {
        const found = (data.entries ?? []).find((e: Entry) => e.id === entryId);
        setEntry(found ?? null);
      });
  }, [entryId]);

  const handleVote = async () => {
    const visitorId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("visitor_id="))
      ?.split("=")[1];
    if (!visitorId) { router.push("/register"); return; }

    setSubmitting(true);

    const res = await fetch("/api/vote", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        visitorId,
        type:       "event",
        selections: { [category]: entryId },
      }),
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
        <a href="/" style={{ color: "#e10102", fontSize: "15px" }}>ホームに戻る</a>
      </main>
    );
  }

  return (
    <main style={{ padding: "24px 20px", maxWidth: "480px", margin: "0 auto" }}>
      <a href={`/vote/event/${category}`} style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "20px" }}>
        ← 選択に戻る
      </a>
      <h1 style={{ fontSize: "20px", marginBottom: "6px" }}>投票内容の確認</h1>
      <p style={{ color: "#888", fontSize: "13px", marginBottom: "24px" }}>以下の内容で投票します</p>

      <div style={{ border: "1px solid #eee", borderRadius: "12px", padding: "16px 20px", marginBottom: "24px" }}>
        <div style={{ color: "#888", fontSize: "12px", marginBottom: "6px" }}>{EVENT_LABELS[category]}</div>
        <div style={{ fontWeight: "bold", fontSize: "17px" }}>{entry?.name ?? "..."}</div>
        {entry?.description && (
          <div style={{ color: "#777", fontSize: "13px", marginTop: "4px" }}>{entry.description}</div>
        )}
      </div>

      <button
        onClick={handleVote}
        disabled={submitting || !entry}
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
