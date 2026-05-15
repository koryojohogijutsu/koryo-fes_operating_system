"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type RankEntry      = { code: string; label: string; count: number; rank: number };
type CategoryResult = { key: string; label: string; total: number; ranking: RankEntry[] };

// 同点時に同じ順位を付ける
function assignRanks<T extends { count: number }>(items: T[]): (T & { rank: number })[] {
  let rank = 1;
  return items.map((item, i, arr) => {
    if (i > 0 && item.count < arr[i - 1].count) rank = i + 1;
    return { ...item, rank };
  });
}

function rankLabel(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `${rank}位`;
}

export default function VoteResultsPage() {
  const router = useRouter();
  const [results,   setResults]   = useState<CategoryResult[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [authed,    setAuthed]    = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/vote-results");
    const data = await res.json();
    // rankを付与
    const withRank = (data.results ?? []).map((cat: CategoryResult) => ({
      ...cat,
      ranking: assignRanks(cat.ranking ?? []),
    }));
    setResults(withRank);
    setUpdatedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") { router.push("/admin/login"); return; }
    setAuthed(true);
    load();
  }, [router, load]);

  if (!authed) return null;

  return (
    <main style={{ padding: "24px 20px", maxWidth: "600px", margin: "0 auto" }}>
      <a href="/admin" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "20px" }}>
        ← 管理者メニューに戻る
      </a>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "20px", margin: 0 }}>🏫 クラス投票 得票数</h1>
        <button onClick={load} disabled={loading}
          style={{ padding: "8px 16px", fontSize: "13px", cursor: loading ? "not-allowed" : "pointer", backgroundColor: loading ? "#ccc" : "#e10102", color: "white", border: "none", borderRadius: "6px" }}>
          {loading ? "更新中..." : "🔄 更新"}
        </button>
      </div>

      {updatedAt && (
        <p style={{ fontSize: "12px", color: "#aaa", marginBottom: "20px" }}>
          最終更新: {updatedAt.toLocaleTimeString("ja-JP")}
        </p>
      )}

      {loading && results.length === 0 ? (
        <p style={{ color: "#aaa" }}>読み込み中...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {results.map((cat) => (
            <section key={cat.key}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: "bold", margin: 0 }}>{cat.label}</h2>
                <span style={{ fontSize: "13px", color: "#888" }}>合計 {cat.total} 票</span>
              </div>

              {cat.ranking.length === 0 ? (
                <p style={{ color: "#aaa", fontSize: "13px" }}>まだ投票がありません</p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {cat.ranking.map((r) => {
                    const isTop = r.rank === 1;
                    return (
                      <li key={r.code} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 8px", borderBottom: "1px solid #f0f0f0" }}>
                        {/* 順位 */}
                        <span style={{
                          width: "36px", height: "28px", borderRadius: "14px", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "12px", fontWeight: "bold",
                          backgroundColor: r.rank === 1 ? "#e10102" : r.rank === 2 ? "#888" : r.rank === 3 ? "#b87333" : "#eee",
                          color: r.rank <= 3 ? "white" : "#555",
                        }}>
                          {r.rank}位
                        </span>

                        {/* クラス名 */}
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: "bold", marginRight: "8px" }}>{r.code}</span>
                          <span style={{ color: "#555", fontSize: "14px" }}>{r.label}</span>
                        </div>

                        {/* 得票数バー */}
                        <div style={{ width: "120px", flexShrink: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <div style={{ flex: 1, height: "8px", borderRadius: "4px", backgroundColor: "#f0f0f0", overflow: "hidden" }}>
                              <div style={{
                                height: "100%", borderRadius: "4px",
                                backgroundColor: isTop ? "#e10102" : "#aaa",
                                width: cat.ranking[0]?.count > 0 ? `${(r.count / cat.ranking[0].count) * 100}%` : "0%",
                                transition: "width 0.5s ease",
                              }} />
                            </div>
                            <span style={{ fontSize: "14px", fontWeight: "bold", minWidth: "32px", textAlign: "right" }}>
                              {r.count}票
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
