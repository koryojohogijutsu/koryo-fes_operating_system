"use client";
import { useEffect, useState } from "react";

const VENUE_KEY = "kinenkan";

const M1_SUBS = [
  { key: "m1-1", label: "１日目" },
  { key: "m1-2", label: "２日目" },
];

const CROWD_LEVELS = [
  { level: 0, label: "混雑なし",   color: "#4caf50", bg: "#f1f8e9" },
  { level: 1, label: "やや混雑",   color: "#ff9800", bg: "#fff8e1" },
  { level: 2, label: "混雑",       color: "#f44336", bg: "#fce4ec" },
  { level: 3, label: "大変混雑",   color: "#7b1fa2", bg: "#f3e5f5" },
];

type VoteResult = { id: string; name: string; count: number; rank: number };

function assignRanks(items: Omit<VoteResult, "rank">[]): VoteResult[] {
  let rank = 1;
  return items.map((item, i, arr) => {
    if (i > 0 && item.count < arr[i - 1].count) rank = i + 1;
    return { ...item, rank };
  });
}

export default function KinenkanManagePage() {
  const [crowdLevel,  setCrowdLevel]  = useState(0);
  const [saving,      setSaving]      = useState(false);
  const [selectedSub, setSelectedSub] = useState("m1-1");
  const [statuses,    setStatuses]    = useState<Record<string, boolean>>({});
  const [votes,       setVotes]       = useState<Record<string, VoteResult[]>>({});
  const [showVotes,   setShowVotes]   = useState<Record<string, boolean>>({});
  const [voteLoading, setVoteLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/crowd?type=venue", { cache: "no-store" }).then((r) => r.json()).then((data) => {
      const venue = (data.venues ?? []).find((v: any) => v.venue_key === VENUE_KEY);
      if (venue) setCrowdLevel(venue.level);
    });

    Promise.all(M1_SUBS.map(async (s) => {
      const res  = await fetch(`/api/event-vote-status?eventKey=${s.key}`, { cache: "no-store" });
      const data = await res.json();
      return [s.key, data.is_open ?? false] as [string, boolean];
    })).then((entries) => setStatuses(Object.fromEntries(entries)));
  }, []);

  const updateCrowd = async (level: number) => {
    setSaving(true);
    await fetch("/api/crowd", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ venueKey: VENUE_KEY, level }) });
    setCrowdLevel(level);
    setSaving(false);
  };

  const toggleVote = async (key: string, open: boolean) => {
    await fetch("/api/event-vote-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventKey: key, isOpen: open }) });
    setStatuses((prev) => ({ ...prev, [key]: open }));
  };

  const fetchVotes = async (key: string) => {
    if (showVotes[key]) { setShowVotes((prev) => ({ ...prev, [key]: false })); return; }
    setVoteLoading((prev) => ({ ...prev, [key]: true }));
    const res  = await fetch(`/api/event-vote-count?eventKey=${key}`, { cache: "no-store" });
    const data = await res.json();
    setVotes((prev) => ({ ...prev, [key]: assignRanks(data.results ?? []) }));
    setShowVotes((prev) => ({ ...prev, [key]: true }));
    setVoteLoading((prev) => ({ ...prev, [key]: false }));
  };

  const isOpen   = statuses[selectedSub] ?? false;
  const voteData = votes[selectedSub]    ?? [];
  const maxCount = voteData[0]?.count    ?? 1;

  return (
    <main style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "20px", marginBottom: "24px" }}>🏛️ 記念館管理</h1>

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

      {/* M1 */}
      <section style={{ padding: "16px", border: "1px solid #ddd", borderRadius: "10px" }}>
        <h2 style={{ fontSize: "16px", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>🎭 M1</h2>

        {/* プルダウン */}
        <div style={{ marginBottom: "12px" }}>
          <select value={selectedSub} onChange={(e) => setSelectedSub(e.target.value)}
            style={{ padding: "8px 12px", fontSize: "14px", borderRadius: "8px", border: "1px solid #ddd", width: "100%", cursor: "pointer" }}>
            {M1_SUBS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* 投票ステータス */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <button onClick={() => toggleVote(selectedSub, true)}
            style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", backgroundColor: isOpen ? "#4caf50" : "#eee", color: isOpen ? "white" : "#888", fontWeight: "bold" }}>
            ▶ 投票開始
          </button>
          <button onClick={() => toggleVote(selectedSub, false)}
            style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", backgroundColor: !isOpen ? "#f44336" : "#eee", color: !isOpen ? "white" : "#888", fontWeight: "bold" }}>
            ■ 投票締切
          </button>
        </div>

        {/* 得票数 */}
        <button onClick={() => fetchVotes(selectedSub)} disabled={voteLoading[selectedSub]}
          style={{ width: "100%", padding: "10px", fontSize: "13px", borderRadius: "8px", border: "1px solid #e10102", backgroundColor: "white", color: "#e10102", cursor: "pointer", marginBottom: "8px" }}>
          {voteLoading[selectedSub] ? "取得中..." : showVotes[selectedSub] ? "📊 得票数を閉じる" : "📊 得票数を表示"}
        </button>

        {showVotes[selectedSub] && (
          <div style={{ backgroundColor: "#fafafa", borderRadius: "8px", padding: "12px" }}>
            {voteData.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: "13px", margin: 0 }}>まだ投票がありません</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {voteData.map((r) => (
                  <li key={r.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid #eee" }}>
                    <span style={{ width: "36px", height: "24px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "bold", backgroundColor: r.rank === 1 ? "#e10102" : r.rank === 2 ? "#888" : r.rank === 3 ? "#b87333" : "#eee", color: r.rank <= 3 ? "white" : "#555", flexShrink: 0 }}>
                      {r.rank}位
                    </span>
                    <span style={{ flex: 1, fontSize: "14px" }}>{r.name}</span>
                    <div style={{ width: "80px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <div style={{ flex: 1, height: "6px", borderRadius: "3px", backgroundColor: "#eee", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: "3px", backgroundColor: r.rank === 1 ? "#e10102" : "#aaa", width: maxCount > 0 ? `${(r.count / maxCount) * 100}%` : "0%", transition: "width 0.5s" }} />
                      </div>
                      <span style={{ fontWeight: "bold", fontSize: "13px", minWidth: "28px", textAlign: "right" }}>{r.count}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
