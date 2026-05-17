"use client";
import { useEffect, useState } from "react";

const EVENT_KEY_BASE = "coscon_runway";
const EVENT_LABEL    = "コスコン（ランウェイ）";

const SUBS = [
  { key: "coscon_runway-1", label: "１日目" },
  { key: "coscon_runway-2", label: "２日目" },
];

type VoteResult = { id: string; name: string; count: number; rank: number };

function assignRanks(items: Omit<VoteResult, "rank">[]): VoteResult[] {
  let rank = 1;
  return items.map((item, i, arr) => {
    if (i > 0 && item.count < arr[i - 1].count) rank = i + 1;
    return { ...item, rank };
  });
}

export default function EventManageSubPage() {
  const [selectedSub, setSelectedSub] = useState(SUBS[0].key);
  const [statuses,    setStatuses]    = useState<Record<string, boolean>>({} );
  const [votes,       setVotes]       = useState<Record<string, VoteResult[]>>({} );
  const [showVotes,   setShowVotes]   = useState<Record<string, boolean>>({} );
  const [voteLoading, setVoteLoading] = useState<Record<string, boolean>>({} );

  useEffect(() => {
    Promise.all(SUBS.map(async (s) => {
      const res  = await fetch(`/api/event-vote-status?eventKey=${s.key}`, { cache: "no-store" });
      const data = await res.json();
      return [s.key, data.is_open ?? false] as [string, boolean];
    })).then((entries) => setStatuses(Object.fromEntries(entries)));
  }, []);

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
      <h1 style={{ fontSize: "20px", marginBottom: "24px" }}>{EVENT_LABEL} 投開票管理</h1>

      <div style={{ marginBottom: "12px" }}>
        <select value={selectedSub} onChange={(e) => setSelectedSub(e.target.value)}
          style={{ padding: "8px 12px", fontSize: "14px", borderRadius: "8px", border: "1px solid #ddd", width: "100%", cursor: "pointer" }}>
          {SUBS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

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
    </main>
  );
}
