"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminPage() {
  const router = useRouter();
  const [visits, setVisits] = useState<any[]>([]);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") { router.push("/admin/login"); return; }
    setAuthed(true);
    supabase.from("visits").select("*").order("entered_at", { ascending: false })
      .then(({ data }) => setVisits(data ?? []));
  }, [router]);

  if (!authed) return null;

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <Link href="/" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "16px" }}>← ホームに戻る</Link>
      <h1 style={{ fontSize: "20px", marginBottom: "20px" }}>管理者メニュー</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px" }}>
        <a href="/admin/classes"   style={linkStyle}>🏫 クラス管理</a>
        <a href="/admin/map"       style={linkStyle}>🗺️ 混雑マップ設定（クラス配置）</a>
        <a href="/event-admin"     style={linkStyle}>🎤 イベント出場者登録</a>
        <a href="/event-manage"    style={linkStyle}>📊 イベント管理（投票開始・得票数）</a>
        <a href="/staff/settings"  style={linkStyle}>📷 係員スキャン設定</a>
        <a href="/admin/vote-results" style={linkStyle}>🏆 クラス投票得票数</a>
        <a href="/admin/info"      style={linkStyle}>📢 インフォメーション管理</a>
        <a href="/admin/puzzle-redeem" style={linkStyle}>🎁 景品引換スキャン</a>
      </div>

      {/* 会場管理 */}
      <h2 style={{ fontSize: "16px", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>会場管理（混雑状況）</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px" }}>
        <a href="/admin/venue/gym"      style={{ ...linkStyle, borderLeft: "4px solid #e10102" }}>🏟️ 体育館（混雑状況）</a>
        <a href="/admin/venue/gym/nodojiman"          style={{ ...linkStyle, borderLeft: "2px solid #e10102", marginLeft: "16px", fontSize: "14px" }}>　🎤 のど自慢</a>
        <a href="/admin/venue/gym/coscon_performance" style={{ ...linkStyle, borderLeft: "2px solid #e10102", marginLeft: "16px", fontSize: "14px" }}>　👗 コスコン（パフォーマンス）</a>
        <a href="/admin/venue/gym/coscon_runway"      style={{ ...linkStyle, borderLeft: "2px solid #e10102", marginLeft: "16px", fontSize: "14px" }}>　🏃 コスコン（ランウェイ）</a>
        <a href="/admin/venue/kinenkan" style={{ ...linkStyle, borderLeft: "4px solid #e10102" }}>🏛️ 記念館（M1）</a>
        <a href="/admin/venue/koryokan"    style={{ ...linkStyle, borderLeft: "4px solid #e10102" }}>🎵 ライブ（蛟龍館）</a>
        <a href="/admin/venue/library"     style={{ ...linkStyle, borderLeft: "4px solid #e10102" }}>📚 図書館</a>
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
            クラス: <strong>{v.class_code ?? "-"}</strong>　visitor: {v.visitor_id?.slice(0, 8)}...
          </li>
        ))}
      </ul>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  display: "block", padding: "14px 16px", borderRadius: "8px",
  border: "1px solid #ddd", textDecoration: "none", color: "#333",
  fontSize: "15px", backgroundColor: "white",
};
