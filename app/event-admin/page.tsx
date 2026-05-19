"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// 出場者管理カテゴリ
const ENTRY_CATEGORIES = [
  { key: "nodojiman",          label: "🎤 のど自慢" },
  { key: "coscon_performance", label: "👗 コスコン（パフォーマンス）" },
  { key: "coscon_runway",      label: "🏃 コスコン（ランウェイ）" },
  { key: "m1",                 label: "🎭 M1" },
  { key: "live",               label: "🎵 ライブ" },
];

// 会場イベント管理
const VENUE_KEYS = [
  { key: "gym",      label: "🏟️ 体育館" },
  { key: "kinenkan", label: "🏛️ 記念館" },
  { key: "library",  label: "📚 図書館" },
];

type Entry       = { id: string; name: string; description: string; comment: string; order_num: number };
type VenueEvent  = { id: string; venue_key: string; title: string; description: string; order_num: number };

export default function EventAdminPage() {
  const router = useRouter();
  const [authed,      setAuthed]      = useState(false);
  const [mainTab,     setMainTab]     = useState<"entries" | "venue">("entries");

  // 出場者管理
  const [entryCategory, setEntryCategory] = useState("nodojiman");
  const [entries,       setEntries]       = useState<Entry[]>([]);
  const [eName,         setEName]         = useState("");
  const [eDescription,  setEDescription]  = useState("");
  const [eComment,      setEComment]      = useState("");
  const [eSubmitting,   setESubmitting]   = useState(false);
  const [editingId,     setEditingId]     = useState<string | null>(null);
  const [editComment,   setEditComment]   = useState("");

  // 会場イベント管理
  const [venueKey,     setVenueKey]     = useState("gym");
  const [venueEvents,  setVenueEvents]  = useState<VenueEvent[]>([]);
  const [vTitle,       setVTitle]       = useState("");
  const [vDescription, setVDescription] = useState("");
  const [vSubmitting,  setVSubmitting]  = useState(false);

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") { router.push("/admin/login"); return; }
    setAuthed(true);
  }, [router]);

  useEffect(() => { if (authed && mainTab === "entries") loadEntries(); }, [entryCategory, authed, mainTab]);
  useEffect(() => { if (authed && mainTab === "venue") loadVenueEvents(); }, [venueKey, authed, mainTab]);

  const loadEntries = async () => {
    const res  = await fetch(`/api/event-entries?category=${entryCategory}`, { cache: "no-store" });
    const data = await res.json();
    setEntries(data.entries ?? []);
  };

  const loadVenueEvents = async () => {
    const res  = await fetch(`/api/venue-events?venueKey=${venueKey}`, { cache: "no-store" });
    const data = await res.json();
    setVenueEvents(data.events ?? []);
  };

  const addEntry = async () => {
    if (!eName) { alert("名前を入力してください"); return; }
    setESubmitting(true);
    const res = await fetch("/api/event-entries/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: entryCategory, name: eName, description: eDescription, comment: eComment }),
    });
    if (res.ok) { setEName(""); setEDescription(""); setEComment(""); loadEntries(); }
    else { const d = await res.json(); alert("エラー: " + d.error); }
    setESubmitting(false);
  };

  const saveComment = async (id: string) => {
    const res = await fetch("/api/event-entries/register", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, comment: editComment }),
    });
    if (res.ok) { setEditingId(null); loadEntries(); }
    else { const d = await res.json(); alert("エラー: " + d.error); }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    const res = await fetch("/api/event-entries/register", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) loadEntries();
  };

  const addVenueEvent = async () => {
    if (!vTitle) { alert("タイトルを入力してください"); return; }
    setVSubmitting(true);
    const res = await fetch("/api/venue-events", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueKey, title: vTitle, description: vDescription }),
    });
    if (res.ok) { setVTitle(""); setVDescription(""); loadVenueEvents(); }
    else { const d = await res.json(); alert("エラー: " + d.error); }
    setVSubmitting(false);
  };

  const deleteVenueEvent = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    const res = await fetch("/api/venue-events", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) loadVenueEvents();
  };

  if (!authed) return null;

  return (
    <main style={{ padding: "24px 20px", maxWidth: "560px", margin: "0 auto" }}>
      <a href="/admin" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "20px" }}>← 管理者メニューに戻る</a>
      <h1 style={{ fontSize: "20px", marginBottom: "20px" }}>🎤 イベント管理</h1>

      {/* メインタブ */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        {([{ key: "entries", label: "出場者管理" }, { key: "venue", label: "会場イベント管理" }] as const).map((t) => (
          <button key={t.key} onClick={() => setMainTab(t.key)}
            style={{ flex: 1, padding: "10px", fontSize: "14px", cursor: "pointer", borderRadius: "8px", border: "2px solid", borderColor: mainTab === t.key ? "#e10102" : "#ddd", backgroundColor: mainTab === t.key ? "#fff5f5" : "white", color: mainTab === t.key ? "#e10102" : "#555", fontWeight: mainTab === t.key ? "bold" : "normal" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 出場者管理タブ ── */}
      {mainTab === "entries" && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" }}>
            {ENTRY_CATEGORIES.map((c) => (
              <button key={c.key} onClick={() => setEntryCategory(c.key)}
                style={{ padding: "8px 14px", fontSize: "13px", borderRadius: "20px", border: "2px solid", borderColor: entryCategory === c.key ? "#e10102" : "#ddd", backgroundColor: entryCategory === c.key ? "#fff5f5" : "white", color: entryCategory === c.key ? "#e10102" : "#555", cursor: "pointer", fontWeight: entryCategory === c.key ? "bold" : "normal" }}>
                {c.label}
              </button>
            ))}
          </div>

          <div style={{ padding: "16px", border: "1px solid #eee", borderRadius: "10px", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <input placeholder="名前 *" value={eName} onChange={(e) => setEName(e.target.value)}
              style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }} />
            <input placeholder="出場内容（任意）" value={eDescription} onChange={(e) => setEDescription(e.target.value)}
              style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }} />
            <textarea placeholder="一言コメント（マップのモーダルに表示）" value={eComment} onChange={(e) => setEComment(e.target.value)} rows={2}
              style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", resize: "vertical", fontFamily: "sans-serif" }} />
            <button onClick={addEntry} disabled={eSubmitting}
              style={{ padding: "10px", fontSize: "14px", cursor: eSubmitting ? "not-allowed" : "pointer", backgroundColor: eSubmitting ? "#ccc" : "#e10102", color: "white", border: "none", borderRadius: "6px" }}>
              {eSubmitting ? "追加中..." : "追加"}
            </button>
          </div>

          <h2 style={{ fontSize: "15px", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>
            {ENTRY_CATEGORIES.find((c) => c.key === entryCategory)?.label} 出場者一覧
          </h2>
          {entries.length === 0 ? <p style={{ color: "#aaa", fontSize: "13px" }}>まだ登録がありません</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {entries.map((entry) => (
                <div key={entry.id} style={{ padding: "14px 16px", border: "1px solid #eee", borderRadius: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <span style={{ fontWeight: "bold", fontSize: "15px" }}>{entry.name}</span>
                      {entry.description && <span style={{ color: "#888", fontSize: "13px", marginLeft: "8px" }}>{entry.description}</span>}
                    </div>
                    <button onClick={() => deleteEntry(entry.id)}
                      style={{ color: "#f44336", background: "none", border: "none", cursor: "pointer", fontSize: "13px" }}>削除</button>
                  </div>
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
        </>
      )}

      {/* ── 会場イベント管理タブ ── */}
      {mainTab === "venue" && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" }}>
            {VENUE_KEYS.map((v) => (
              <button key={v.key} onClick={() => setVenueKey(v.key)}
                style={{ padding: "8px 14px", fontSize: "13px", borderRadius: "20px", border: "2px solid", borderColor: venueKey === v.key ? "#1976d2" : "#ddd", backgroundColor: venueKey === v.key ? "#e3f2fd" : "white", color: venueKey === v.key ? "#1976d2" : "#555", cursor: "pointer", fontWeight: venueKey === v.key ? "bold" : "normal" }}>
                {v.label}
              </button>
            ))}
          </div>

          <div style={{ padding: "16px", border: "1px solid #eee", borderRadius: "10px", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <input placeholder="イベントタイトル *" value={vTitle} onChange={(e) => setVTitle(e.target.value)}
              style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }} />
            <textarea placeholder="一言・説明（任意）" value={vDescription} onChange={(e) => setVDescription(e.target.value)} rows={2}
              style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", resize: "vertical", fontFamily: "sans-serif" }} />
            <button onClick={addVenueEvent} disabled={vSubmitting}
              style={{ padding: "10px", fontSize: "14px", cursor: vSubmitting ? "not-allowed" : "pointer", backgroundColor: vSubmitting ? "#ccc" : "#1976d2", color: "white", border: "none", borderRadius: "6px" }}>
              {vSubmitting ? "追加中..." : "追加"}
            </button>
          </div>

          <h2 style={{ fontSize: "15px", marginBottom: "12px", borderBottom: "2px solid #1976d2", paddingBottom: "6px" }}>
            {VENUE_KEYS.find((v) => v.key === venueKey)?.label} イベント一覧
          </h2>
          {venueEvents.length === 0 ? <p style={{ color: "#aaa", fontSize: "13px" }}>まだ登録がありません</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {venueEvents.map((ev) => (
                <div key={ev.id} style={{ padding: "12px 16px", border: "1px solid #eee", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontWeight: "bold", fontSize: "14px", margin: 0 }}>{ev.title}</p>
                    {ev.description && <p style={{ fontSize: "13px", color: "#666", margin: "4px 0 0" }}>{ev.description}</p>}
                  </div>
                  <button onClick={() => deleteVenueEvent(ev.id)}
                    style={{ color: "#f44336", background: "none", border: "none", cursor: "pointer", fontSize: "13px", flexShrink: 0, marginLeft: "8px" }}>削除</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
