"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Visit = {
  class_code: string;
  entered_at: string;
};

export default function HistoryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const vid = searchParams.get("vid");
    if (!vid) {
      setError("visitor_idが指定されていません");
      setLoading(false);
      return;
    }

    const fetch = async () => {
      // 入場履歴
      const { data, error } = await supabase
        .from("visits")
        .select("class_code, entered_at")
        .eq("visitor_id", vid)
        .order("entered_at", { ascending: true });

      if (error) {
        setError("データの取得に失敗しました");
      } else {
        setVisits(data ?? []);
      }
      setLoading(false);
    };

    fetch();
  }, [searchParams]);

  if (loading) {
    return (
      <main style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ color: "#aaa" }}>読み込み中...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: "40px 20px", textAlign: "center" }}>
        <p style={{ color: "#f44336" }}>{error}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "24px 20px", maxWidth: "480px", margin: "0 auto" }}>
      <button
        onClick={() => router.back()}
        style={{
          background: "none",
          border: "none",
          color: "#888",
          fontSize: "14px",
          cursor: "pointer",
          marginBottom: "16px",
          padding: 0,
        }}
      >
        ← 戻る
      </button>

      <h1 style={{ fontSize: "22px", marginBottom: "24px" }}>あなたの履歴</h1>

      {/* 入場履歴 */}
      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "16px", color: "#333", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>
          🏫 入場したクラス
        </h2>
        {visits.length === 0 ? (
          <p style={{ color: "#aaa", fontSize: "14px" }}>まだ記録がありません</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {visits.map((v, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid #f0f0f0",
                  fontSize: "15px",
                }}
              >
                <strong>{v.class_code}</strong>
                <span style={{ color: "#888", fontSize: "13px" }}>
                  {new Date(v.entered_at).toLocaleString("ja-JP", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 投票履歴（未実装） */}
      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "16px", color: "#333", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>
          🗳️ 投票
        </h2>
        <p style={{ color: "#aaa", fontSize: "14px" }}>準備中</p>
      </section>

      {/* 謎解き履歴（未実装） */}
      <section style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "16px", color: "#333", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>
          🔍 謎解き
        </h2>
        <p style={{ color: "#aaa", fontSize: "14px" }}>準備中</p>
      </section>
    </main>
  );
}
