"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Notice = { id: string; title: string; body: string; created_at: string };
type Lost   = { id: string; time: string; place: string; memo: string; created_at: string };

export default function AdminInfoPage() {
  const router = useRouter();
  const [notices,  setNotices]  = useState<Notice[]>([]);
  const [lost,     setLost]     = useState<Lost[]>([]);
  const [tab,      setTab]      = useState<"notice" | "lost">("notice");
  const [authed,   setAuthed]   = useState(false);

  // notice form
  const [nTitle, setNTitle] = useState("");
  const [nBody,  setNBody]  = useState("");

  // lost form
  const [lTime,  setLTime]  = useState("");
  const [lPlace, setLPlace] = useState("");
  const [lMemo,  setLMemo]  = useState("");

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") { router.push("/admin/login"); return; }
    setAuthed(true);
    load();
  }, [router]);

  const load = async () => {
    const res = await fetch("/api/info");
    const d   = await res.json();
    setNotices(d.notices ?? []);
    setLost(d.lost ?? []);
  };

  const addNotice = async () => {
    if (!nTitle || !nBody) { alert("タイトルと本文を入力してください"); return; }
    await fetch("/api/info/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "notice", title: nTitle, body: nBody }) });
    setNTitle(""); setNBody(""); load();
  };

  const addLost = async () => {
    if (!lTime || !lPlace || !lMemo) { alert("すべての項目を入力してください"); return; }
    await fetch("/api/info/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "lost", time: lTime, place: lPlace, memo: lMemo }) });
    setLTime(""); setLPlace(""); setLMemo(""); load();
  };

  const deleteItem = async (type: "notice" | "lost", id: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch("/api/info/manage", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, id }) });
    load();
  };

  if (!authed) return null;

  return (
    <main style={{ padding: "24px 20px", maxWidth: "500px", margin: "0 auto" }}>
      <a href="/admin" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "20px" }}>← 管理者メニューに戻る</a>
      <h1 style={{ fontSize: "20px", marginBottom: "20px" }}>インフォメーション管理</h1>

      {/* タブ */}
      <div style={{ display: "flex", marginBottom: "20px", borderBottom: "2px solid #eee" }}>
        {[{ key: "notice", label: "📢 お知らせ" }, { key: "lost", label: "🎒 落とし物" }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            style={{ padding: "10px 20px", fontSize: "14px", border: "none", background: "none", cursor: "pointer", borderBottom: tab === t.key ? "3px solid #e10102" : "3px solid transparent", color: tab === t.key ? "#e10102" : "#555", fontWeight: tab === t.key ? "bold" : "normal", marginBottom: "-2px" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "notice" && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "16px", border: "1px solid #eee", borderRadius: "10px", marginBottom: "20px" }}>
            <input placeholder="タイトル" value={nTitle} onChange={(e) => setNTitle(e.target.value)}
              style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }} />
            <textarea placeholder="本文" value={nBody} onChange={(e) => setNBody(e.target.value)} rows={4}
              style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", resize: "vertical" }} />
            <button onClick={addNotice}
              style={{ padding: "10px", fontSize: "14px", cursor: "pointer", backgroundColor: "#e10102", color: "white", border: "none", borderRadius: "6px" }}>
              追加
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {notices.map((n) => (
              <div key={n.id} style={{ padding: "12px 16px", borderRadius: "8px", border: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "14px" }}>{n.title}</div>
                  <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>{n.body}</div>
                </div>
                <button onClick={() => deleteItem("notice", n.id)}
                  style={{ color: "#f44336", background: "none", border: "none", cursor: "pointer", fontSize: "13px", flexShrink: 0, marginLeft: "12px" }}>削除</button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "lost" && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "16px", border: "1px solid #eee", borderRadius: "10px", marginBottom: "20px" }}>
            <input placeholder="発見時間（例：10:30）" value={lTime} onChange={(e) => setLTime(e.target.value)}
              style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }} />
            <input placeholder="発見場所（例：体育館入口）" value={lPlace} onChange={(e) => setLPlace(e.target.value)}
              style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }} />
            <textarea placeholder="特徴メモ（例：黒い財布、カード複数枚入り）" value={lMemo} onChange={(e) => setLMemo(e.target.value)} rows={3}
              style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", resize: "vertical" }} />
            <button onClick={addLost}
              style={{ padding: "10px", fontSize: "14px", cursor: "pointer", backgroundColor: "#e10102", color: "white", border: "none", borderRadius: "6px" }}>
              追加
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {lost.map((l) => (
              <div key={l.id} style={{ padding: "12px 16px", borderRadius: "8px", border: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>🕐 {l.time}　📍 {l.place}</div>
                  <div style={{ fontSize: "13px", color: "#444" }}>{l.memo}</div>
                </div>
                <button onClick={() => deleteItem("lost", l.id)}
                  style={{ color: "#f44336", background: "none", border: "none", cursor: "pointer", fontSize: "13px", flexShrink: 0, marginLeft: "12px" }}>削除</button>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
