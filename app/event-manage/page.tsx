"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const EVENT_CATEGORIES = [
  { key: "nodojiman",    label: "🎤 のど自慢" },
  { key: "coscon_solo",  label: "👗 コスコン（個人）" },
  { key: "coscon_group", label: "👥 コスコン（団体）" },
  { key: "m1",           label: "🎭 M1" },
];

type VoteResult = { id: string; name: string; count: number; rank: number };
type StatusMap  = Record<string, boolean>;

// 同点時に同じ順位を付ける
function assignRanks<T extends { count: number }>(items: T[]): (T & { rank: number })[] {
  let rank = 1;
  return items.map((item, i, arr) => {
    if (i > 0 && item.count < arr[i - 1].count) rank = i + 1;
    return { ...item, rank };
  });
}

export default function EventManagePage() {
  const router = useRouter();
  const [authed,      setAuthed]      = useState(false);
  const [statusMap,   setStatusMap]   = useState<StatusMap>({});
  const [results,     setResults]     = useState<Record<string, VoteResult[]>>({});
  const [showResults, setShowResults] = useState<Record<string, boolean>>({});
  const [loadingMap,  setLoadingMap]  = useState<Record<string, boolean>>({});

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") { router.push("/admin/login"); return; }
    setAuthed(true);
  }, [router]);

  useEffect(() => {
    const fetchAll = async () => {
      const entries = await Promise.all(
        EVENT_CATEGORIES.map(async (cat) => {
          const res  = await fetch(`/api/event-vote-status?eventKey=${cat.key}`);
          const data = await res.json();
          return [cat.key, data.is_open ?? false] as [string, boolean];
        })
      );
      setStatusMap(Object.fromEntries(entries));
    };
    fetchAll();
  }, []);

  const toggleVoteStatus = async (eventKey: string) => {
    const next = !(statusMap[eventKey] ?? false);
    setLoadingMap((prev) => ({ ...prev, [eventKey]: true }));
    await fetch("/api/event-vote-status", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventKey, isOpen: next }),
    });
    setStatusMap((prev) => ({ ...prev, [eventKey]: next }));
    setLoadingMap((prev) => ({ ...prev, [eventKey]: false }));
  };

  const fetchResults = async (eventKey: string) => {
    if (showResults[eventKey]) {
      setShowResults((prev) => ({ ...prev, [eventKey]: false }));
      return;
    }
    setLoadingMap((prev) => ({ ...prev, [`result_${eventKey}`]: true }));
    const res  = await fetch(`/api/event-vote-count?eventKey=${eventKey}`);
    const data = await res.json();
    const ranked = assignRanks(data.results ?? []);
    setResults((prev)     => ({ ...prev, [eventKey]: ranked }));
    setShowResults((prev) => ({ ...prev, [eventKey]: true }));
    setLoadingMap((prev)  => ({ ...prev, [`result_${eventKey}`]: false }));
  };

  if (!authed) return null;

  return (
    <main style={{ padding: "24px 20px", maxWidth: "500px", margin: "0 auto" }}>
      <a href="/admin" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "20px" }}>
        ← 管理者メニューに戻る
      </a>
      <h1 style={{ fontSize: "20px", marginBottom: "24px" }}>イベント管理</h1>

      {EVENT_CATEGORIES.map((cat) => {
        const isOpen        = statusMap[cat.key] ?? false;
        const loading       = loadingMap[cat.key] ?? false;
        const resultLoading = loadingMap[`result_${cat.key}`] ?? false;
        const showResult    = showResults[cat.key] ?? false;
        const catResults    = results[cat.key] ?? [];
        const maxCount      = catResults[0]?.count ?? 1;

        return (
          <section key={cat.key} style={{ marginBottom: "28px", padding: "16px", border: "1px solid #eee", borderRadius: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h2 style={{ fontSize: "16px", margin: 0 }}>{cat.label}</h2>
              <span style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "20px", backgroundColor: isOpen ? "#e8f5e9" : "#fce4ec", color: isOpen ? "#2e7d32" : "#c62828", fontWeight: "bold" }}>
                {isOpen ? "投票受付中" : "締切"}
              </span>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button onClick={() => toggleVoteStatus(cat.key)} disabled={loading}
                style={{ padding: "8px 14px", fontSize: "13px", borderRadius: "6px", border: "none", backgroundColor: isOpen ? "#f44336" : "#4caf50", color: "white", cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "処理中..." : isOpen ? "🔒 締め切る" : "🟢 投票を開始する"}
              </button>
              <button onClick={() => fetchResults(cat.key)} disabled={resultLoading}
                style={{ padding: "8px 14px", fontSize: "13px", borderRadius: "6px", border: "1px solid #e10102", backgroundColor: "white", color: "#e10102", cursor: resultLoading ? "not-allowed" : "pointer" }}>
                {resultLoading ? "取得中..." : showResult ? "📊 閉じる" : "📊 得票数を表示"}
              </button>
            </div>

            {/* 得票数一覧 */}
            {showResult && (
              <div style={{ marginTop: "14px", backgroundColor: "#fafafa", borderRadius: "8px", padding: "12px" }}>
                {catResults.length === 0 ? (
                  <p style={{ color: "#aaa", fontSize: "13px", margin: 0 }}>まだ投票がありません</p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {catResults.map((r) => (
                      <li key={r.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid #eee" }}>
                        <span style={{
                          width: "36px", height: "24px", borderRadius: "12px", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "11px", fontWeight: "bold",
                          backgroundColor: r.rank === 1 ? "#e10102" : r.rank === 2 ? "#888" : r.rank === 3 ? "#b87333" : "#eee",
                          color: r.rank <= 3 ? "white" : "#555",
                        }}>
                          {r.rank}位
                        </span>
                        <span style={{ flex: 1, fontSize: "14px" }}>{r.name}</span>
                        {/* バー */}
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
