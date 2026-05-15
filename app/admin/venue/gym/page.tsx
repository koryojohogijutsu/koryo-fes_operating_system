"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const VENUE_KEY = "gym";
const VENUE_LABEL = "体育館";

const EVENTS = [
  { key: "nodojiman",    label: "のど自慢" },
  { key: "coscon_solo",  label: "コスコン（個人）" },
  { key: "coscon_group", label: "コスコン（団体）" },
];

const CROWD_LEVELS = [
  { level: 0, label: "混雑なし",   color: "#4caf50", bg: "#f1f8e9" },
  { level: 1, label: "やや混雑",   color: "#ff9800", bg: "#fff8e1" },
  { level: 2, label: "混雑",       color: "#f44336", bg: "#fce4ec" },
  { level: 3, label: "大変混雑",   color: "#7b1fa2", bg: "#f3e5f5" },
];

type EventStatus = { event_key: string; is_open: boolean };
type EntryItem   = { id: string; name: string; description: string; order_num: number };

export default function GymManagePage() {
  const router = useRouter();
  const [authed,       setAuthed]       = useState(false);
  const [crowdLevel,   setCrowdLevel]   = useState(0);
  const [statuses,     setStatuses]     = useState<Record<string, boolean>>({});
  const [entries,      setEntries]      = useState<Record<string, EntryItem[]>>({});
  const [votes,        setVotes]        = useState<Record<string, { name: string; count: number }[]>>({});
  const [saving,       setSaving]       = useState(false);
  const [newEntry,     setNewEntry]     = useState<Record<string, { name: string; description: string }>>({});

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") { router.push("/admin/login"); return; }
    setAuthed(true);
    loadAll();
  }, [router]);

  const loadAll = async () => {
    // 混雑状況
    const crowdRes = await fetch("/api/crowd?type=venue", { cache: "no-store" }).then((r) => r.json());
    const venue = (crowdRes.venues ?? []).find((v: any) => v.venue_key === VENUE_KEY);
    if (venue) setCrowdLevel(venue.level);

    // 各イベントのステータス・出場者・得票数
    const statusMap: Record<string, boolean> = {};
    const entryMap:  Record<string, EntryItem[]> = {};
    const voteMap:   Record<string, { name: string; count: number }[]> = {};

    await Promise.all(EVENTS.map(async (ev) => {
      const [statusRes, entryRes, voteRes] = await Promise.all([
        fetch(`/api/event-vote-status?eventKey=${ev.key}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/event-entries?category=${ev.key}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/event-vote-count?eventKey=${ev.key}`, { cache: "no-store" }).then((r) => r.json()),
      ]);
      statusMap[ev.key] = statusRes.is_open ?? false;
      entryMap[ev.key]  = entryRes.entries ?? [];
      voteMap[ev.key]   = voteRes.results ?? [];
    }));

    setStatuses(statusMap);
    setEntries(entryMap);
    setVotes(voteMap);
  };

  const updateCrowd = async (level: number) => {
    setSaving(true);
    await fetch("/api/crowd", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueKey: VENUE_KEY, level }),
    });
    setCrowdLevel(level);
    setSaving(false);
  };

  const toggleVoteStatus = async (eventKey: string, open: boolean) => {
    await fetch("/api/event-vote-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventKey, is_open: open }),
    });
    setStatuses((prev) => ({ ...prev, [eventKey]: open }));
  };

  const addEntry = async (eventKey: string) => {
    const e = newEntry[eventKey];
    if (!e?.name) return;
    const res = await fetch("/api/event-entries/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: eventKey, name: e.name, description: e.description ?? "" }),
    });
    if (res.ok) {
      setNewEntry((prev) => ({ ...prev, [eventKey]: { name: "", description: "" } }));
      loadAll();
    }
  };

  const deleteEntry = async (id: string) => {
    await fetch("/api/event-entries/register", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadAll();
  };

  if (!authed) return null;

  return (
    <main style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <Link href="/admin" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "16px" }}>← 管理者メニュー</Link>
      <h1 style={{ fontSize: "20px", marginBottom: "24px" }}>🏟️ {VENUE_LABEL}管理</h1>

      {/* 混雑状況 */}
      <section style={{ marginBottom: "32px", padding: "16px", border: "1px solid #ddd", borderRadius: "10px" }}>
        <h2 style={{ fontSize: "16px", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>混雑状況</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {CROWD_LEVELS.map((cl) => (
            <button key={cl.level} onClick={() => updateCrowd(cl.level)} disabled={saving}
              style={{
                padding: "12px", borderRadius: "8px", fontSize: "14px", fontWeight: "bold", cursor: "pointer",
                border: crowdLevel === cl.level ? `3px solid ${cl.color}` : "2px solid #eee",
                backgroundColor: crowdLevel === cl.level ? cl.bg : "white",
                color: crowdLevel === cl.level ? cl.color : "#888",
              }}>
              {cl.label}
              {crowdLevel === cl.level && " ✓"}
            </button>
          ))}
        </div>
      </section>

      {/* 各イベント */}
      {EVENTS.map((ev) => (
        <section key={ev.key} style={{ marginBottom: "32px", padding: "16px", border: "1px solid #ddd", borderRadius: "10px" }}>
          <h2 style={{ fontSize: "16px", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>🎤 {ev.label}</h2>

          {/* 投票ステータス */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <button onClick={() => toggleVoteStatus(ev.key, true)}
              style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", backgroundColor: statuses[ev.key] ? "#4caf50" : "#eee", color: statuses[ev.key] ? "white" : "#888", fontWeight: "bold" }}>
              ▶ 投票開始
            </button>
            <button onClick={() => toggleVoteStatus(ev.key, false)}
              style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", backgroundColor: !statuses[ev.key] ? "#f44336" : "#eee", color: !statuses[ev.key] ? "white" : "#888", fontWeight: "bold" }}>
              ■ 投票締切
            </button>
          </div>

          {/* 得票数 */}
          {(votes[ev.key] ?? []).length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "6px" }}>得票数</p>
              {(votes[ev.key] ?? []).sort((a, b) => b.count - a.count).map((v, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f0f0", fontSize: "14px" }}>
                  <span>{i + 1}. {v.name}</span>
                  <strong>{v.count}票</strong>
                </div>
              ))}
            </div>
          )}

          {/* 出場者一覧 */}
          <div style={{ marginBottom: "12px" }}>
            <p style={{ fontSize: "13px", color: "#888", marginBottom: "6px" }}>出場者</p>
            {(entries[ev.key] ?? []).length === 0
              ? <p style={{ color: "#aaa", fontSize: "13px" }}>登録なし</p>
              : (entries[ev.key] ?? []).map((entry) => (
                <div key={entry.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                  <div>
                    <span style={{ fontWeight: "bold", fontSize: "14px" }}>{entry.name}</span>
                    {entry.description && <span style={{ color: "#888", fontSize: "12px", marginLeft: "8px" }}>{entry.description}</span>}
                  </div>
                  <button onClick={() => deleteEntry(entry.id)}
                    style={{ padding: "4px 10px", fontSize: "12px", cursor: "pointer", backgroundColor: "#f44336", color: "white", border: "none", borderRadius: "6px" }}>
                    削除
                  </button>
                </div>
              ))
            }
          </div>

          {/* 出場者追加 */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input placeholder="名前" value={newEntry[ev.key]?.name ?? ""}
              onChange={(e) => setNewEntry((prev) => ({ ...prev, [ev.key]: { ...prev[ev.key], name: e.target.value } }))}
              style={{ flex: 2, padding: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px" }} />
            <input placeholder="内容（任意）" value={newEntry[ev.key]?.description ?? ""}
              onChange={(e) => setNewEntry((prev) => ({ ...prev, [ev.key]: { ...prev[ev.key], description: e.target.value } }))}
              style={{ flex: 3, padding: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "13px" }} />
            <button onClick={() => addEntry(ev.key)}
              style={{ padding: "8px 16px", fontSize: "13px", cursor: "pointer", backgroundColor: "#e10102", color: "white", border: "none", borderRadius: "6px" }}>
              追加
            </button>
          </div>
        </section>
      ))}
    </main>
  );
}
