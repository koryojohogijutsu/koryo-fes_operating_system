"use client";

import { useRouter } from "next/navigation";

export default function VotePage() {
  const router = useRouter();

  return (
    <main style={{ padding: "40px 20px", textAlign: "center", maxWidth: "400px", margin: "0 auto" }}>
      <a href="/" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "24px", textAlign: "left" }}>
        ← ホームに戻る
      </a>

      <h1 style={{ fontSize: "22px", marginBottom: "8px" }}>投票</h1>
      <p style={{ color: "#888", fontSize: "13px", marginBottom: "40px" }}>
        投票するカテゴリを選んでください
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <button
          onClick={() => router.push("/vote/class")}
          style={{
            padding: "20px",
            fontSize: "18px",
            cursor: "pointer",
            backgroundColor: "#e10102",
            color: "white",
            border: "none",
            borderRadius: "12px",
          }}
        >
          🏫 クラス企画
        </button>

        <button
          onClick={() => router.push("/vote/event")}
          style={{
            padding: "20px",
            fontSize: "18px",
            cursor: "pointer",
            backgroundColor: "white",
            color: "#e10102",
            border: "2px solid #e10102",
            borderRadius: "12px",
          }}
        >
          🎤 イベント企画
        </button>
      </div>
    </main>
  );
}
