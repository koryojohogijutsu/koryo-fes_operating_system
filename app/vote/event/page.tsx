"use client";

import { useRouter } from "next/navigation";

const EVENT_CATEGORIES = [
  { key: "nodojiman",    label: "🎤 のど自慢" },
  { key: "coscon_solo",  label: "👗 コスコン（個人）" },
  { key: "coscon_group", label: "👥 コスコン（団体）" },
  { key: "m1",           label: "🎭 M1" },
];

export default function VoteEventPage() {
  const router = useRouter();

  return (
    <main style={{ padding: "24px 20px", maxWidth: "480px", margin: "0 auto" }}>
      <a href="/vote" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "20px" }}>
        ← 戻る
      </a>
      <h1 style={{ fontSize: "20px", marginBottom: "6px" }}>🎤 イベント企画投票</h1>
      <p style={{ color: "#888", fontSize: "13px", marginBottom: "28px" }}>
        投票するイベントを選んでください
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {EVENT_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => router.push(`/vote/event/${cat.key}`)}
            style={{
              padding: "20px",
              fontSize: "17px",
              cursor: "pointer",
              backgroundColor: "white",
              color: "#333",
              border: "1px solid #ddd",
              borderRadius: "12px",
              textAlign: "left",
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </main>
  );
}
