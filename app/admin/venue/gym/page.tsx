"use client";
import { useEffect, useState } from "react";

const VENUE_KEY = "gym";

// のど自慢・コスコンのサブイベント定義
const EVENT_GROUPS = [
  {
    base: "nodojiman",
    label: "🎤 のど自慢",
    subs: [
      { key: "nodojiman-1", label: "１日目" },
      { key: "nodojiman-2", label: "２日目①" },
      { key: "nodojiman-3", label: "２日目②" },
    ],
  },
  {
    base: "coscon_solo",
    label: "👗 コスコン（個人）",
    subs: [
      { key: "coscon_solo-1", label: "１日目" },
      { key: "coscon_solo-2", label: "２日目" },
    ],
  },
  {
    base: "coscon_group",
    label: "👥 コスコン（グループ）",
    subs: [
      { key: "coscon_group-1", label: "１日目" },
      { key: "coscon_group-2", label: "２日目" },
    ],
  },
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

export default function GymManagePage() {
  const [crowdLevel,   setCrowdLevel]   = useState(0);
  const [saving,       setSaving]       = useState(false);
  // サブイベントごとの選択・ステータス・得票数
  const [selectedSub,  setSelectedSub]  = useState<Record<string, string>>({});
  const [statuses,     setStatuses]     = useState<Record<string, boolean>>({});
  const [votes,        setVotes]        = useState<Record<string, VoteResult[]>>({});
  const [showVotes,    setShowVotes]    = useState<Record<string, boolean>>({});
  const [voteLoading,  setVoteLoading]  = useState<Record<string, boolean>>({});

  useEffect(() => {
    // 混雑状況取得
    fetch("/api/crowd?type=venue", { cache: "no-store" }).then((r) => r.json()).then((data) => {
      const venue = (data.venues ?? []).find((v: any) => v.venue_key === VENUE_KEY);
      if (venue) setCrowdLevel(venue.level);
    });

    // 各サブイベントの初期選択と投票ステータス取得
    const initSubs: Record<string, string> = {};
    EVENT_GROUPS.forEach((g) => { initSubs[g.base] = g.subs[0].key; });
    setSelectedSub(initSubs);

    // 全サブイベントのステータス取得
    const allKeys = EVENT_GROUPS.flatMap((g) => g.subs.map((s) => s.key));
    Promise.all(allKeys.map(async (key) => {
      const res = await fetch(`/api/event-vote-status?eventKey=${key}`, { cache: "no-store" });
      const data = await res.json();
      return [key, data.is_open ?? false] as [string, boolean];
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

  return (
    <main style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "20px", marginBottom: "24px" }}>🏟️ 体育館管理</h1>

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

      {/* 各イベント */}
      {EVENT_GROUPS.map((group) => {
        const currentKey = selectedSub[group.base] ?? group.subs[0].key;
        const isOpen     = statuses[currentKey] ?? false;
        const voteData   = votes[currentKey] ?? [];
        const maxCount   = voteData[0]?.count ?? 1;

        return (
          <section key={group.base} style={{ marginBottom: "32px", padding: "16px", border: "1px solid #ddd", borderRadius: "10px" }}>
            <h2 style={{ fontSize: "16px", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>{group.label}</h2>

            {/* プルダウン */}
            <div style={{ marginBottom: "12px" }}>
              <select value={currentKey}
                onChange={(e) => setSelectedSub((prev) => ({ ...prev, [group.base]: e.target.value }))}
                style={{ padding: "8px 12px", fontSize: "14px", borderRadius: "8px", border: "1px solid #ddd", width: "100%", cursor: "pointer" }}>
                {group.subs.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* 投票ステータス */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <button onClick={() => toggleVote(currentKey, true)}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", backgroundColor: isOpen ? "#4caf50" : "#eee", color: isOpen ? "white" : "#888", fontWeight: "bold" }}>
                ▶ 投票開始
              </button>
              <button onClick={() => toggleVote(currentKey, false)}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", backgroundColor: !isOpen ? "#f44336" : "#eee", color: !isOpen ? "white" : "#888", fontWeight: "bold" }}>
                ■ 投票締切
              </button>
            </div>

            {/* 得票数表示ボタン */}
            <button onClick={() => fetchVotes(currentKey)} disabled={voteLoading[currentKey]}
              style={{ width: "100%", padding: "10px", fontSize: "13px", borderRadius: "8px", border: "1px solid #e10102", backgroundColor: "white", color: "#e10102", cursor: "pointer", marginBottom: "8px" }}>
              {voteLoading[currentKey] ? "取得中..." : showVotes[currentKey] ? "📊 得票数を閉じる" : "📊 得票数を表示"}
            </button>

            {/* 得票数一覧 */}
            {showVotes[currentKey] && (
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
        );
      })}
    </main>
  );
}
