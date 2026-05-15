"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const VENUE_KEY   = "kinenkan";
const VENUE_LABEL = "記念館";
const EVENT       = { key: "m1", label: "M1" };

const CROWD_LEVELS = [
  { level: 0, label: "混雑なし",   color: "#4caf50", bg: "#f1f8e9" },
  { level: 1, label: "やや混雑",   color: "#ff9800", bg: "#fff8e1" },
  { level: 2, label: "混雑",       color: "#f44336", bg: "#fce4ec" },
  { level: 3, label: "大変混雑",   color: "#7b1fa2", bg: "#f3e5f5" },
];

type EntryItem = { id: string; name: string; description: string; order_num: number };

export default function KinenkanManagePage() {
  const router = useRouter();
  const [authed,     setAuthed]     = useState(false);
  const [crowdLevel, setCrowdLevel] = useState(0);
  const [isOpen,     setIsOpen]     = useState(false);
  const [entries,    setEntries]    = useState<EntryItem[]>([]);
  const [votes,      setVotes]      = useState<{ name: string; count: number }[]>([]);
  const [saving,     setSaving]     = useState(false);
  const [newName,    setNewName]    = useState("");
  const [newDesc,    setNewDesc]    = useState("");

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") { router.push("/admin/login"); return; }
    setAuthed(true);
    loadAll();
  }, [router]);

  const loadAll = async () => {
    const [crowdRes, statusRes, entryRes, voteRes] = await Promise.all([
      fetch("/api/crowd?type=venue", { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/event-vote-status?eventKey=${EVENT.key}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/event-entries?category=${EVENT.key}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/event-vote-count?eventKey=${EVENT.key}`, { cache: "no-store" }).then((r) => r.json()),
    ]);
    const venue = (crowdRes.venues ?? []).find((v: any) => v.venue_key === VENUE_KEY);
    if (venue) setCrowdLevel(venue.level);
    setIsOpen(statusRes.is_open ?? false);
    setEntries(entryRes.entries ?? []);
    setVotes(voteRes.results ?? []);
  };

  const updateCrowd = async (level: number) => {
    setSaving(true);
    await fetch("/api/crowd", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ venueKey: VENUE_KEY, level }) });
    setCrowdLevel(level);
    setSaving(false);
  };

  const toggleVote = async (open: boolean) => {
    await fetch("/api/event-vote-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventKey: EVENT.key, isOpen: open }) });
    setIsOpen(open);
  };

  const addEntry = async () => {
    if (!newName) return;
    await fetch("/api/event-entries/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: EVENT.key, name: newName, description: newDesc }) });
    setNewName(""); setNewDesc("");
    loadAll();
  };

  const deleteEntry = async (id: string) => {
    await fetch("/api/event-entries/register", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadAll();
  };

  if (!authed) return null;

  return (
    <main style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <Link href="/admin" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "16px" }}>← 管理者メニュー</Link>
      <h1 style={{ fontSize: "20px", marginBottom: "24px" }}>🏛️ {VENUE_LABEL}管理</h1>

      {/* 混雑状況 */}
      <section style={{ marginBottom: "32px", padding: "16px", border: "1px solid #ddd", borderRadius: "10px" }}>
        <h2 style={{ fontSize: "16px", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>混雑状況</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {CROWD_LEVELS.map((cl) => (
            <button key={cl.level} onClick={() => updateCrowd(cl.level)} disabled={saving}
              style={{ padding: "12px", borderRadius: "8px", fontSize: "14px", fontWeight: "bold", cursor: "pointer", border: crowdLevel === cl.level ? `3px solid ${cl.color}` : "2px solid #eee", backgroundColor: crowdLevel === cl.level ? cl.bg : "white", color: crowdLevel === cl.level ? cl.color : "#888" }}>
              {cl.label}{crowdLevel === cl.level && " ✓"}
            </button>
          ))}
        </div>
      </section>

      {/* M1管理 */}
      <section style={{ padding: "16px", border: "1px solid #ddd", borderRadius: "10px" }}>
        <h2 style={{ fontSize: "16px", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>🎤 {EVENT.label}</h2>
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <button onClick={() => toggleVote(true)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", backgroundColor: isOpen ? "#4caf50" : "#eee", color: isOpen ? "white" : "#888", fontWeight: "bold" }}>▶ 投票開始</button>
          <button onClick={() => toggleVote(false)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", backgroundColor: !isOpen ? "#f44336" : "#eee", color: !isOpen ? "white" : "#888", fontWeight: "bold" }}>■ 投票締切</button>
        </div>
        {votes.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "13px", color: "#888", marginBottom: "6px" }}>得票数</p>
            {votes.sort((a, b) => b.count - a.count).map((v, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f0", fontSize: "14px" }}>
                <span>{i + 1}. {v.name}</span><strong>{v.count}票</strong>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginBottom: "12px" }}>
          <p style={{ fontSize: "13px", color: "#888", marginBottom: "6px" }}>出場者</p>
          {entries.length === 0 ? <p style={{ color: "#aaa", fontSize: "13px" }}>登録なし</p> : entries.map((entry) => (
            <div key={entry.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
              <div><span style={{ fontWeight: "bold", fontSize: "14px" }}>{entry.name}</span>{entry.description && <span style={{ color: "#888", fontSize: "12px", marginLeft: "8px" }}>{entry.description}</span>}</div>
              <button onClick={() => deleteEntry(entry.id)} style={{ padding: "4px 10px", fontSize: "12px", cursor: "pointer", backgroundColor: "#f44336", color: "white", border: "none", borderRadius: "6px" }}>削除</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <input placeholder="名前" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ flex: 2, padding: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px" }} />
          <input placeholder="内容（任意）" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} style={{ flex: 3, padding: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px" }} />
          <button onClick={addEntry} style={{ padding: "8px 16px", fontSize: "13px", cursor: "pointer", backgroundColor: "#e10102", color: "white", border: "none", borderRadius: "6px" }}>追加</button>
        </div>
      </section>
    </main>
  );
}
