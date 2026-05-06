"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const EVENT_CATEGORIES = [
  { key: "nodojiman",    label: "のど自慢" },
  { key: "coscon_solo",  label: "コスコン（個人）" },
  { key: "coscon_group", label: "コスコン（団体）" },
  { key: "m1",           label: "M1" },
];

type Entry = { id: string; category: string; name: string; description: string; order_num: number };

export default function EventAdminPage() {
  const router = useRouter();
  const [entries,     setEntries]     = useState<Entry[]>([]);
  const [category,    setCategory]    = useState("nodojiman");
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [loading,     setLoading]     = useState(true);
  const [authed,      setAuthed]      = useState(false);

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") { router.push("/admin/login"); return; }
    setAuthed(true);
    load();
  }, [router]);

  const load = async () => {
    const res  = await fetch("/api/event-entries");
    const data = await res.json();
    setEntries(data.entries ?? []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!name) { alert("氏名を入力してください"); return; }
    const res = await fetch("/api/event-entries/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, name, description }),
    });
    if (res.ok) { setName(""); setDescription(""); load(); }
    else { const data = await res.json(); alert("エラー: " + data.error); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    const res = await fetch("/api/event-entries/register", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) { load(); }
    else { const data = await res.json(); alert("エラー: " + data.error); }
  };

  if (!authed) return null;

  return (
    <main style={{ padding: "24px 20px", maxWidth: "500px", margin: "0 auto" }}>
      <a href="/admin" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "20px" }}>← 管理者メニューに戻る</a>
      <h1 style={{ fontSize: "20px", marginBottom: "24px" }}>イベント出場者登録</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px", padding: "16px", border: "1px solid #eee", borderRadius: "10px" }}>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }}>
          {EVENT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <input placeholder="氏名（例：山田太郎）" value={name} onChange={(e) => setName(e.target.value)}
          style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }} />
        <input placeholder="内容（例：〇〇の歌）" value={description} onChange={(e) => setDescription(e.target.value)}
          style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }} />
        <button onClick={handleAdd}
          style={{ padding: "10px", fontSize: "15px", cursor: "pointer", backgroundColor: "#e10102", color: "white", border: "none", borderRadius: "6px" }}>
          追加
        </button>
      </div>

      {loading ? <p style={{ color: "#aaa" }}>読み込み中...</p> : (
        EVENT_CATEGORIES.map((cat) => {
          const catEntries = entries.filter((e) => e.category === cat.key).sort((a, b) => a.order_num - b.order_num);
          return (
            <section key={cat.key} style={{ marginBottom: "28px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px", borderBottom: "2px solid #e10102", paddingBottom: "4px" }}>{cat.label}</h2>
              {catEntries.length === 0 ? (
                <p style={{ color: "#aaa", fontSize: "13px" }}>まだ登録されていません</p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {catEntries.map((e) => (
                    <li key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                      <div>
                        <span style={{ fontWeight: "bold", marginRight: "8px" }}>{e.name}</span>
                        <span style={{ color: "#777", fontSize: "13px" }}>{e.description}</span>
                      </div>
                      <button onClick={() => handleDelete(e.id)}
                        style={{ color: "#f44336", background: "none", border: "none", cursor: "pointer", fontSize: "13px" }}>
                        削除
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}
    </main>
  );
}
