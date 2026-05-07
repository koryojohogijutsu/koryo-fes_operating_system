"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Notice = { id: string; title: string; body: string; created_at: string };
type Lost   = { id: string; time: string; place: string; memo: string; created_at: string };

export default function InfoPage() {
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [lost,    setLost]    = useState<Lost[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<"notice" | "lost">("notice");

  useEffect(() => {
    fetch("/api/info")
      .then((r) => r.json())
      .then((d) => { setNotices(d.notices ?? []); setLost(d.lost ?? []); setLoading(false); });
  }, []);

  return (
    <main style={{ padding: "24px 20px", maxWidth: "480px", margin: "0 auto" }}>
      <button onClick={() => router.back()}
        style={{ background: "none", border: "none", color: "#888", fontSize: "14px", cursor: "pointer", marginBottom: "16px", padding: 0 }}>
        ← 戻る
      </button>
      <h1 style={{ fontSize: "20px", marginBottom: "20px" }}>ℹ️ インフォメーション</h1>

      {/* タブ */}
      <div style={{ display: "flex", marginBottom: "20px", borderBottom: "2px solid #eee" }}>
        {[{ key: "notice", label: "📢 お知らせ" }, { key: "lost", label: "🎒 落とし物" }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            style={{ padding: "10px 20px", fontSize: "14px", border: "none", background: "none", cursor: "pointer", borderBottom: tab === t.key ? "3px solid #e10102" : "3px solid transparent", color: tab === t.key ? "#e10102" : "#555", fontWeight: tab === t.key ? "bold" : "normal", marginBottom: "-2px" }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <p style={{ color: "#aaa" }}>読み込み中...</p> : (
        <>
          {tab === "notice" && (
            notices.length === 0 ? <p style={{ color: "#aaa", fontSize: "14px" }}>お知らせはありません</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {notices.map((n) => (
                  <div key={n.id} style={{ padding: "14px 16px", borderRadius: "10px", border: "1px solid #eee", backgroundColor: "#fafafa" }}>
                    <div style={{ fontWeight: "bold", fontSize: "15px", marginBottom: "6px" }}>{n.title}</div>
                    <div style={{ fontSize: "14px", color: "#444", whiteSpace: "pre-line" }}>{n.body}</div>
                    <div style={{ fontSize: "11px", color: "#aaa", marginTop: "8px" }}>
                      {new Date(n.created_at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === "lost" && (
            lost.length === 0 ? <p style={{ color: "#aaa", fontSize: "14px" }}>落とし物の情報はありません</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {lost.map((l) => (
                  <div key={l.id} style={{ padding: "14px 16px", borderRadius: "10px", border: "1px solid #eee", backgroundColor: "#fafafa" }}>
                    <div style={{ display: "flex", gap: "12px", fontSize: "13px", color: "#888", marginBottom: "6px" }}>
                      <span>🕐 {l.time}</span>
                      <span>📍 {l.place}</span>
                    </div>
                    <div style={{ fontSize: "14px", color: "#444", whiteSpace: "pre-line" }}>{l.memo}</div>
                    <div style={{ fontSize: "11px", color: "#aaa", marginTop: "8px" }}>
                      {new Date(l.created_at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </main>
  );
}
