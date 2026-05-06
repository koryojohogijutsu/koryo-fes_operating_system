"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const EVENT_LABELS: Record<string, string> = {
  nodojiman:    "🎤 のど自慢",
  coscon_solo:  "👗 コスコン（個人）",
  coscon_group: "👥 コスコン（団体）",
  m1:           "🎭 M1",
};

type Entry = { id: string; name: string; description: string; order_num: number };

export default function VoteEventCategoryPage() {
  const router   = useRouter();
  const { category } = useParams<{ category: string }>();

  const [entries,  setEntries]  = useState<Entry[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const visitorId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("visitor_id="))
      ?.split("=")[1];
    if (!visitorId) { router.push("/register"); return; }

    // このカテゴリの出場者のみ取得
    fetch("/api/event-entries")
      .then((r) => r.json())
      .then((data) => {
        const filtered = (data.entries ?? [])
          .filter((e: Entry & { category: string }) => e.category === category)
          .sort((a: Entry, b: Entry) => a.order_num - b.order_num);
        setEntries(filtered);
        setLoading(false);
      });
  }, [router, category]);

  const handleNext = () => {
    if (!selected) return;
    router.push(`/vote/event/${category}/confirm?entryId=${selected}`);
  };

  if (!EVENT_LABELS[category]) {
    return <main style={{ padding: "40px", textAlign: "center" }}><p style={{ color: "#f44336" }}>無効なカテゴリです</p></main>;
  }

  if (loading) return <main style={{ padding: "40px", textAlign: "center" }}><p style={{ color: "#aaa" }}>読み込み中...</p></main>;

  return (
    <main style={{ padding: "24px 20px", maxWidth: "480px", margin: "0 auto" }}>
      <a href="/vote/event" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "20px" }}>
        ← 戻る
      </a>
      <h1 style={{ fontSize: "20px", marginBottom: "6px" }}>{EVENT_LABELS[category]}</h1>
      <p style={{ color: "#888", fontSize: "13px", marginBottom: "28px" }}>
        投票する出場者を選んでください
      </p>

      {entries.length === 0 ? (
        <p style={{ color: "#aaa", fontSize: "14px" }}>出場者が登録されていません</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          {entries.map((e) => {
            const isSelected = selected === e.id;
            return (
              <div
                key={e.id}
                onClick={() => setSelected(isSelected ? "" : e.id)}
                style={{
                  padding: "14px 16px",
                  borderRadius: "10px",
                  border: isSelected ? "2px solid #e10102" : "1px solid #ddd",
                  backgroundColor: isSelected ? "#fff5f5" : "white",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: "bold", fontSize: "16px" }}>{e.name}</span>
                  {isSelected && <span style={{ color: "#e10102", fontSize: "20px" }}>✔</span>}
                </div>
                {e.description && (
                  <div style={{ color: "#777", fontSize: "13px", marginTop: "4px" }}>{e.description}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={handleNext}
        disabled={!selected}
        style={{
          width: "100%",
          padding: "14px",
          fontSize: "16px",
          cursor: selected ? "pointer" : "not-allowed",
          backgroundColor: selected ? "#e10102" : "#ccc",
          color: "white",
          border: "none",
          borderRadius: "8px",
        }}
      >
        確認画面へ
      </button>
    </main>
  );
}
