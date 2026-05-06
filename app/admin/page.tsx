"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminPage() {
  const [visits, setVisits] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("visits")
        .select("*")
        .order("entered_at", { ascending: false });
      setVisits(data ?? []);
    };
    fetchData();
  }, []);

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <a href="/" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "16px" }}>← ホームに戻る</a>
      <h1 style={{ fontSize: "20px", marginBottom: "20px" }}>管理者メニュー</h1>

      {/* 管理リンク */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px" }}>
        <a href="/admin/classes" style={linkStyle}>🏫 クラス管理</a>
        <a href="/event-admin" style={linkStyle}>🎤 イベント出場者登録</a>
        <a href="/event-manage" style={linkStyle}>📊 イベント管理（投票開始・得票数）</a>
        <a href="/staff/settings" style={linkStyle}>📷 係員スキャン設定</a>
      </div>

      {/* 入場一覧 */}
      <h2 style={{ fontSize: "16px", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>入場一覧</h2>
      <p style={{ color: "#666", fontSize: "13px", marginBottom: "8px" }}>{visits.length} 件</p>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {visits.map((v, i) => (
          <li key={i} style={{ padding: "8px 0", borderBottom: "1px solid #eee", fontSize: "13px" }}>
            <span style={{ color: "#888", marginRight: "12px" }}>
              {v.entered_at ? new Date(v.entered_at).toLocaleString("ja-JP") : "-"}
            </span>
            クラス: <strong>{v.class_code ?? "-"}</strong>
            　visitor: {v.visitor_id?.slice(0, 8)}...
          </li>
        ))}
      </ul>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  display: "block",
  padding: "14px 16px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  textDecoration: "none",
  color: "#333",
  fontSize: "15px",
  backgroundColor: "white",
};
