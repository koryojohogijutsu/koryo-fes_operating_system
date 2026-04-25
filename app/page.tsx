"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // visitor_id をcookieから取得 or 新規生成
    const existing = document.cookie
      .split("; ")
      .find((row) => row.startsWith("visitor_id="))
      ?.split("=")[1];

    if (!existing) {
      const id = crypto.randomUUID();
      document.cookie = `visitor_id=${id}; path=/; SameSite=Lax`;
    }
  }, []);

  return (
    <main style={{ padding: "40px 20px", textAlign: "center" }}>
      <h1>蛟龍祭</h1>
      <p style={{ color: "#555", marginBottom: "40px" }}>
        クラス企画に入るときはQRを表示してください
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "280px", margin: "0 auto" }}>
        <button
          onClick={() => router.push("/myqr")}
          style={{
            padding: "16px",
            fontSize: "18px",
            cursor: "pointer",
            backgroundColor: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "8px",
          }}
        >
          QRを表示する
        </button>

        <button
          onClick={() => router.push("/vote-auth")}
          style={{
            padding: "14px",
            fontSize: "16px",
            cursor: "pointer",
            backgroundColor: "white",
            color: "#1976d2",
            border: "2px solid #1976d2",
            borderRadius: "8px",
          }}
        >
          投票はこちら
        </button>
      </div>
    </main>
  );
}
