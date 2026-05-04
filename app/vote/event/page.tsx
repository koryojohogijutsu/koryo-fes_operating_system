"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Entry = { id: string; category: string; name: string; description: string; order_num: number };

const EVENT_CATEGORIES = [
  { key: "nodojiman",    label: "🎤 のど自慢" },
  { key: "coscon_solo",  label: "👗 コスコン（個人）" },
  { key: "coscon_group", label: "👥 コスコン（団体）" },
  { key: "m1",           label: "🎭 M1" },
] as const;

export default function VoteEventPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const visitorId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("visitor_id="))
      ?.split("=")[1];
    if (!visitorId) { router.push("/register"); return; }

    const load = async () => {
      const res = await fetch("/api/event-entries");
      const data = await res.json();
      setEntries(data.entries ?? []);
      setLoading(false);
    };
    load();
  }, [router]);

  const handleSelect = (category: string, id: string) => {
    setSelections((prev) => ({ ...prev, [category]: prev[category] === id ? "" : id }));
  };

  const handleNext = () => {
    const params = new URLSearchParams();
    Object.entries(selections).forEach(([k, v]) => { if (v) params.set(k, v); });
    router.push(`/vote/event/confirm?${params.toString()}`);
  };

  const hasAnySelection = Object.values(selections).some((v) => v !== "");

  if (loading) return <main style={{ padding: "40px", textAlign: "center" }}><p style={{ color: "#aaa" }}>読み込み中...</p></main>;

  return (
    <main style={{ padding: "24px 20px", maxWidth: "480px", margin: "0 auto" }}>
      <a href="/vote" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "20px" }}>
        ← 戻る
      </a>
      <h1 style={{ fontSize: "20px", marginBottom: "6px" }}>🎤 イベント企画投票</h1>
      <p style={{ color: "#888", fontSize: "13px", marginBottom: "28px" }}>
        各カテゴリで1名（1団体）を選んでください
      </p>

      {EVENT_CATEGORIES.map((cat) => {
        const catEntries = entries
          .filter((e) => e.category === cat.key)
          .sort((a, b) => a.order_num - b.order_num);

        return (
          <section key={cat.key} style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "10px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>
              {cat.label}
            </h2>
            {catEntries.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: "13px" }}>出場者が登録されていません</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {catEntries.map((e) => {
                  const selected = selections[cat.key] === e.id;
                  return (
                    <div
                      key={e.id}
                      onClick={() => handleSelect(cat.key, e.id)}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: selected ? "2px solid #e10102" : "1px solid #ddd",
                        backgroundColor: selected ? "#fff5f5" : "white",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: "bold", fontSize: "15px" }}>{e.name}</span>
                        {selected && <span style={{ color: "#e10102", fontSize: "18px" }}>✔</span>}
                      </div>
                      <div style={{ color: "#777", fontSize: "13px", marginTop: "4px" }}>{e.description}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      <button
        onClick={handleNext}
        disabled={!hasAnySelection}
        style={{
          width: "100%",
          padding: "14px",
          fontSize: "16px",
          cursor: hasAnySelection ? "pointer" : "not-allowed",
          backgroundColor: hasAnySelection ? "#e10102" : "#ccc",
          color: "white",
          border: "none",
          borderRadius: "8px",
          marginTop: "8px",
        }}
      >
        確認画面へ
      </button>
    </main>
  );
}
