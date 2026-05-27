"use client";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
        <a href="/admin/classes"           style={linkStyle}>🏫 クラス管理</a>
        <a href="/admin/map"               style={linkStyle}>🗺️ 混雑マップ設定（クラス配置）</a>
        <a href="/event-admin"             style={linkStyle}>🎤 イベント管理（出場者・部活動企画）</a>
        <a href="/event-manage"            style={linkStyle}>📊 イベント投票管理（投票開始・得票数）</a>
        <a href="/admin/pin-content"       style={linkStyle}>📌 ピン情報管理（部活・メニュー・図書館等）</a>
        <a href="/admin/festival-settings" style={linkStyle}>📅 文化祭日程・表示設定（1日目/2日目）</a>
        <a href="/staff/settings"          style={linkStyle}>📷 係員スキャン設定</a>
        <a href="/admin/vote-results"      style={linkStyle}>🏆 クラス投票得票数</a>
        <a href="/admin/info"              style={linkStyle}>📢 インフォメーション管理</a>
        <a href="/admin/puzzle-redeem"     style={linkStyle}>🎁 景品引換スキャン</a>
        <a href="/admin/analytics"         style={linkStyle}>📊 アクセス解析</a>
      </div>

      <h2 style={{ fontSize: "16px", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>会場管理（混雑状況）</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px" }}>
        <a href="/admin/venue/gym" style={{ ...linkStyle, borderLeft: "4px solid #e10102" }}>🏟️ 体育館（混雑状況）</a>
        <a href="/admin/venue/gym/nodojiman"          style={subLinkStyle}>　🎤 のど自慢</a>
        <a href="/admin/venue/gym/coscon_performance" style={subLinkStyle}>　👗 コスコン（パフォーマンス）</a>
        <a href="/admin/venue/gym/coscon_runway"      style={subLinkStyle}>　🏃 コスコン（ランウェイ）</a>
        <a href="/admin/venue/kinenkan" style={{ ...linkStyle, borderLeft: "4px solid #e10102" }}>🏛️ 記念館（M1・混雑状況）</a>
        <a href="/admin/venue/koryokan" style={{ ...linkStyle, borderLeft: "4px solid #e10102" }}>🎵 ライブ（蛟龍館）</a>
        <a href="/admin/venue/shogi"    style={subLinkStyle}>　♟️ 将棋部</a>
        <a href="/admin/venue/igo"      style={subLinkStyle}>　⚫ 囲碁部</a>
        <a href="/admin/venue/library"  style={{ ...linkStyle, borderLeft: "4px solid #e10102" }}>📚 図書館</a>
        <a href="/admin/venue/science"  style={{ ...linkStyle, borderLeft: "4px solid #1976d2" }}>🔬 科学物理部</a>
        <a href="/admin/venue/tetsudo"  style={{ ...linkStyle, borderLeft: "4px solid #1976d2" }}>🚃 鉄道研究部</a>
        <a href="/admin/venue/quiz"     style={{ ...linkStyle, borderLeft: "4px solid #1976d2" }}>❓ クイズ研究会</a>
        <a href="/admin/venue/bazar"    style={{ ...linkStyle, borderLeft: "4px solid #1976d2" }}>🛍️ バザー</a>
        <a href="/admin/venue/doso"     style={{ ...linkStyle, borderLeft: "4px solid #1976d2" }}>🎓 同窓会</a>
        <a href="/admin/venue/kyukei"   style={{ ...linkStyle, borderLeft: "4px solid #1976d2" }}>☕ 休憩所</a>
        <a href="/admin/venue/kendo"    style={{ ...linkStyle, borderLeft: "4px solid #1976d2" }}>🥋 剣道部</a>
        <a href="/admin/venue/kyudo"    style={{ ...linkStyle, borderLeft: "4px solid #1976d2" }}>🏹 弓道部</a>
      </div>

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
const subLinkStyle: React.CSSProperties = {
  ...linkStyle, borderLeft: "2px solid #e10102", marginLeft: "16px", fontSize: "14px",
};
