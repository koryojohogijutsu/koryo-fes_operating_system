"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CATEGORY_LABELS: Record<string, string> = {
  grade1:     "1年 最優秀賞",
  grade2:     "2年 最優秀賞",
  grade3:     "3年 最優秀賞",
  decoration: "装飾賞",
};

export default function VoteClassConfirmPage() {
  return (
    <Suspense fallback={<main style={{ padding: "40px", textAlign: "center" }}><p style={{ color: "#aaa" }}>読み込み中...</p></main>}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [classes, setClasses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const selections: Record<string, string> = {};
  ["grade1", "grade2", "grade3", "decoration"].forEach((k) => {
    const v = searchParams.get(k);
    if (v) selections[k] = v;
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("classes").select("code, label");
      const map: Record<string, string> = {};
      (data ?? []).forEach((c) => { map[c.code] = c.label; });
      setClasses(map);
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
      body: JSON.stringify({ visitorId, type: "class", selections }),
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
      <a href="/vote/class" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "20px" }}>
        ← 選択に戻る
      </a>
      <h1 style={{ fontSize: "20px", marginBottom: "6px" }}>投票内容の確認</h1>
      <p style={{ color: "#888", fontSize: "13px", marginBottom: "24px" }}>以下の内容で投票します</p>

      <div style={{ border: "1px solid #eee", borderRadius: "12px", overflow: "hidden", marginBottom: "24px" }}>
        {Object.entries(selections).map(([key, code], i) => (
          <div
            key={key}
            style={{
              padding: "14px 16px",
              borderBottom: i < Object.keys(selections).length - 1 ? "1px solid #f0f0f0" : "none",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span style={{ color: "#888", fontSize: "13px" }}>{CATEGORY_LABELS[key]}</span>
            <span style={{ fontWeight: "bold" }}>
              {code}　{classes[code] ?? ""}
            </span>
          </div>
        ))}
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
