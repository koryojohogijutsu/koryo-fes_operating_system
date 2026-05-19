"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { key: "nodojiman",          label: "🎤 のど自慢" },
  { key: "coscon_performance", label: "👗 コスコン（パフォーマンス）" },
  { key: "coscon_runway",      label: "🏃 コスコン（ランウェイ）" },
  { key: "m1",                 label: "🎭 M1" },
  { key: "live",               label: "🎵 ライブ" },
];

type Entry = { id: string; name: string; description: string; comment: string; order_num: number };

export default function EventAdminPage() {
  const router = useRouter();
  const [authed,      setAuthed]      = useState(false);
  const [category,    setCategory]    = useState("nodojiman");
  const [entries,     setEntries]     = useState<Entry[]>([]);
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [comment,     setComment]     = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editComment, setEditComment] = useState("");

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") { router.push("/admin/login"); return; }
    setAuthed(true);
  }, [router]);

  useEffect(() => { if (authed) load(); }, [category, authed]);

  const load = async () => {
    const res  = await fetch(`/api/event-entries?category=${category}`, { cache: "no-store" });
    const data = await res.json();
    setEntries(data.entries ?? []);
  };

  const addEntry = async () => {
    if (!name) { alert("名前を入力してください"); return; }
    setSubmitting(true);
    const res = await fetch("/api/event-entries/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, name, description, comment }),
    });
    if (res.ok) { setName(""); setDescription(""); setComment(""); load(); }
    else { const d = await res.json(); alert("エラー: " + d.error); }
    setSubmitting(false);
  };

  const saveComment = async (id: string) => {
    const res = await fetch("/api/event-entries/register", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, comment: editComment }),
    });
    if (res.ok) { setEditingId(null); load(); }
    else { const d = await res.json(); alert("エラー: " + d.error); }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    const res = await fetch("/api/event-entries/register", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
  };

  if (!authed) return null;

  return (
    <main style={{ padding: "24px 20px", maxWidth: "560px", margin: "0 auto" }}>
      <a href="/admin" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "20px" }}>← 管理者メニューに戻る</a>
      <h1 style={{ fontSize: "20px", marginBottom: "20px" }}>🎤 イベント出場者登録</h1>

      {/* カテゴリタブ */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" }}>
        {CATEGORIES.map((c) => (
          <button key={c.key} onClick={() => setCategory(c.key)}
            style={{ padding: "8px 14px", fontSize: "13px", borderRadius: "20px", border: "2px solid", borderColor: category === c.key ? "#e10102" : "#ddd", backgroundColor: category === c.key ? "#fff5f5" : "white", color: category === c.key ? "#e10102" : "#555", cursor: "pointer", fontWeight: category === c.key ? "bold" : "normal" }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* 追加フォーム */}
      <div style={{ padding: "16px", border: "1px solid #eee", borderRadius: "10px", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <input placeholder="名前 *" value={name} onChange={(e) => setName(e.target.value)}
          style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }} />
        <input placeholder="出場内容（任意）" value={description} onChange={(e) => setDescription(e.target.value)}
          style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }} />
        <textarea placeholder="一言コメント（マップのモーダルに表示されます）" value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
          style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", resize: "vertical", fontFamily: "sans-serif" }} />
        <button onClick={addEntry} disabled={submitting}
          style={{ padding: "10px", fontSize: "14px", cursor: submitting ? "not-allowed" : "pointer", backgroundColor: submitting ? "#ccc" : "#e10102", color: "white", border: "none", borderRadius: "6px" }}>
          {submitting ? "追加中..." : "追加"}
        </button>
      </div>

      {/* 出場者一覧 */}
      <h2 style={{ fontSize: "16px", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>
        {CATEGORIES.find((c) => c.key === category)?.label} 出場者一覧
      </h2>
      {entries.length === 0 ? (
        <p style={{ color: "#aaa", fontSize: "13px" }}>まだ登録がありません</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {entries.map((entry) => (
            <div key={entry.id} style={{ padding: "14px 16px", border: "1px solid #eee", borderRadius: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <div>
                  <span style={{ fontWeight: "bold", fontSize: "15px" }}>{entry.name}</span>
                  {entry.description && <span style={{ color: "#888", fontSize: "13px", marginLeft: "8px" }}>{entry.description}</span>}
                </div>
                <button onClick={() => deleteEntry(entry.id)}
                  style={{ color: "#f44336", background: "none", border: "none", cursor: "pointer", fontSize: "13px", flexShrink: 0 }}>削除</button>
              </div>
              {/* 一言編集 */}
              {editingId === entry.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} rows={2}
                    style={{ padding: "8px", fontSize: "13px", borderRadius: "6px", border: "1px solid #ccc", resize: "vertical", fontFamily: "sans-serif" }} />
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => saveComment(entry.id)}
                      style={{ padding: "6px 16px", fontSize: "13px", cursor: "pointer", backgroundColor: "#e10102", color: "white", border: "none", borderRadius: "6px" }}>保存</button>
                    <button onClick={() => setEditingId(null)}
                      style={{ padding: "6px 16px", fontSize: "13px", cursor: "pointer", backgroundColor: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: "6px" }}>キャンセル</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                  <p style={{ fontSize: "13px", color: entry.comment ? "#444" : "#bbb", margin: 0, flex: 1 }}>
                    💬 {entry.comment || "一言未設定"}
                  </p>
                  <button onClick={() => { setEditingId(entry.id); setEditComment(entry.comment); }}
                    style={{ fontSize: "12px", color: "#1976d2", background: "none", border: "1px solid #1976d2", borderRadius: "6px", padding: "3px 10px", cursor: "pointer", flexShrink: 0 }}>編集</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
