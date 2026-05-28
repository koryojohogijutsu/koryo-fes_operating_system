"use client";
import { useEffect, useState } from "react";
import { useVenueAuth } from "@/app/admin/venue/_auth";

const EVENT_KEY   = "coscon_performance";
const EVENT_LABEL = "コスコン（パフォーマンス）";

type VoteResult = { id: string; name: string; count: number; rank: number };
function assignRanks(items: Omit<VoteResult, "rank">[]): VoteResult[] {
  let rank = 1;
  return items.map((item, i, arr) => {
    if (i > 0 && item.count < arr[i - 1].count) rank = i + 1;
    return { ...item, rank };
  });
}

export default function EventManagePage() {
  const authed = useVenueAuth();
  const [isOpen,      setIsOpen]      = useState(false);
  const [voteData,    setVoteData]    = useState<VoteResult[]>([]);
  const [showVotes,   setShowVotes]   = useState(false);
  const [voteLoading, setVoteLoading] = useState(false);

  useEffect(() => {
    if (!authed) return;
    fetch(`/api/event-vote-status?eventKey=${EVENT_KEY}`, { cache: "no-store" })
      .then((r) => r.json()).then((data) => setIsOpen(data.is_open ?? false));
  }, [authed]);

  const toggleVote = async (open: boolean) => {
    await fetch("/api/event-vote-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventKey: EVENT_KEY, isOpen: open }) });
    setIsOpen(open);
  };

  const fetchVotes = async () => {
    if (showVotes) { setShowVotes(false); return; }
    setVoteLoading(true);
    const res  = await fetch(`/api/event-vote-count?eventKey=${EVENT_KEY}`, { cache: "no-store" });
    const data = await res.json();
    setVoteData(assignRanks(data.results ?? []));
    setShowVotes(true); setVoteLoading(false);
  };

  if (!authed) return null;

  const maxCount = voteData[0]?.count ?? 1;
  return (
    <main style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "20px", marginBottom: "24px" }}>👗 {EVENT_LABEL} 投開票管理</h1>
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <button onClick={() => toggleVote(true)}
          style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", backgroundColor: isOpen ? "#4caf50" : "#eee", color: isOpen ? "white" : "#888", fontWeight: "bold" }}>
          ▶ 投票開始
        </button>
        <button onClick={() => toggleVote(false)}
          style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", backgroundColor: !isOpen ? "#f44336" : "#eee", color: !isOpen ? "white" : "#888", fontWeight: "bold" }}>
          ■ 投票締切
        </button>
      </div>
      <button onClick={fetchVotes} disabled={voteLoading}
        style={{ width: "100%", padding: "10px", fontSize: "13px", borderRadius: "8px", border: "1px solid #e10102", backgroundColor: "white", color: "#e10102", cursor: "pointer", marginBottom: "8px" }}>
        {voteLoading ? "取得中..." : showVotes ? "📊 得票数を閉じる" : "📊 得票数を表示"}
      </button>
      {showVotes && (
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
