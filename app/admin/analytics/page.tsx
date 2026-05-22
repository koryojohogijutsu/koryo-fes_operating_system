"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SummaryItem = { date: string; page: string; type: string; count: number };
type AdminLog    = { date: string; page: string; visitor_id: string; viewed_at: string };

const PAGE_LABELS: Record<string, string> = {
  "/":                    "ホーム",
  "/enter":               "QR表示",
  "/vote":                "クラス投票",
  "/event-enter":         "イベント入場",
  "/puzzle":              "謎解き",
  "/map":                 "マップ",
  "/info":                "インフォメーション",
  "/history":             "履歴",
  "/penlight":            "ペンライト",
  "/survey":              "アンケート",
  "/register":            "入場登録",
  "/admin":               "管理者メニュー",
  "/admin/classes":       "クラス管理",
  "/admin/map":           "マップ設定",
  "/admin/info":          "インフォ管理",
  "/admin/vote-results":  "投票結果",
  "/admin/analytics":     "アクセス解析",
  "/event-admin":         "イベント出場者",
  "/event-manage":        "イベント管理",
  "/staff":               "係員スキャン",
  "/staff/settings":      "係員設定",
};

const BAR_COLORS = [
  "#e10102","#1976d2","#4caf50","#ff9800","#7b1fa2",
  "#00bcd4","#f06292","#9c27b0","#607d8b","#795548",
];

export default function AnalyticsPage() {
  const router = useRouter();
  const [authed,    setAuthed]    = useState(false);
  const [summary,   setSummary]   = useState<SummaryItem[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [days,      setDays]      = useState(7);
  const [viewTab,   setViewTab]   = useState<"user" | "admin">("user");

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") { router.push("/admin/login"); return; }
    setAuthed(true);
  }, [router]);

  useEffect(() => { if (authed) load(); }, [authed, days]);

  const load = async () => {
    setLoading(true);
    const res  = await fetch(`/api/analytics?days=${days}&_t=${Date.now()}`, { cache: "no-store" });
    const data = await res.json();
    setSummary(data.summary   ?? []);
    setAdminLogs(data.adminLogs ?? []);
    setLoading(false);
  };

  if (!authed) return null;

  const userSummary  = summary.filter((s) => s.type === "user");
  const adminSummary = summary.filter((s) => s.type === "admin");
  const dates        = [...new Set(summary.map((s) => s.date))].sort();
  const userPages    = [...new Set(userSummary.map((s) => s.page))].sort();
  const adminPages   = [...new Set(adminSummary.map((s) => s.page))].sort();

  const getCount = (items: SummaryItem[], date: string, page: string) =>
    items.find((s) => s.date === date && s.page === page)?.count ?? 0;

  // ページごとの合計でソート
  const sortedUserPages = [...userPages].sort((a, b) => {
    const totalA = userSummary.filter((s) => s.page === a).reduce((sum, s) => sum + s.count, 0);
    const totalB = userSummary.filter((s) => s.page === b).reduce((sum, s) => sum + s.count, 0);
    return totalB - totalA;
  });

  // 棒グラフ（CSS）
  function BarGraph({ items, pages }: { items: SummaryItem[]; pages: string[] }) {
    if (pages.length === 0) return <p style={{ color: "#aaa", fontSize: "14px" }}>データがありません</p>;
    const maxCount = Math.max(...items.map((s) => s.count), 1);
    // ページごとの合計を表示
    const totals = pages.map((page, i) => ({
      page,
      label: PAGE_LABELS[page] ?? page,
      total: items.filter((s) => s.page === page).reduce((sum, s) => sum + s.count, 0),
      color: BAR_COLORS[i % BAR_COLORS.length],
    })).sort((a, b) => b.total - a.total);

    const maxTotal = Math.max(...totals.map((t) => t.total), 1);

    return (
      <div style={{ marginBottom: "32px" }}>
        {/* 合計バーグラフ */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {totals.map(({ page, label, total, color }) => (
            <div key={page} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "120px", fontSize: "12px", color: "#555", textAlign: "right", flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {label}
              </div>
              <div style={{ flex: 1, backgroundColor: "#f0f0f0", borderRadius: "4px", height: "24px", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: "4px",
                  backgroundColor: color,
                  width: `${(total / maxTotal) * 100}%`,
                  transition: "width 0.5s ease",
                  minWidth: total > 0 ? "4px" : "0",
                }} />
              </div>
              <div style={{ width: "36px", fontSize: "13px", fontWeight: "bold", color: "#333", flexShrink: 0, textAlign: "right" }}>
                {total}
              </div>
            </div>
          ))}
        </div>

        {/* 日別折れ線風（各日付の合計） */}
        {dates.length > 1 && (
          <div style={{ marginTop: "24px" }}>
            <p style={{ fontSize: "13px", color: "#888", marginBottom: "10px" }}>日別アクセス数</p>
            <div style={{ display: "flex", gap: "4px", alignItems: "flex-end", height: "120px" }}>
              {dates.map((date) => {
                const dayTotal = items.filter((s) => s.date === date).reduce((sum, s) => sum + s.count, 0);
                const height   = maxTotal > 0 ? Math.max((dayTotal / maxTotal) * 100, dayTotal > 0 ? 4 : 0) : 0;
                return (
                  <div key={date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                    <div style={{ fontSize: "11px", color: "#333", fontWeight: "bold" }}>{dayTotal || ""}</div>
                    <div style={{ width: "100%", backgroundColor: "#e10102", borderRadius: "3px 3px 0 0", height: `${height}%`, minHeight: dayTotal > 0 ? "4px" : "0" }} />
                    <div style={{ fontSize: "10px", color: "#888", whiteSpace: "nowrap" }}>{date}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <main style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <Link href="/admin" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "16px" }}>← 管理者メニュー</Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <h1 style={{ fontSize: "20px", margin: 0 }}>📊 アクセス解析</h1>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}
            style={{ padding: "8px 12px", fontSize: "13px", borderRadius: "8px", border: "1px solid #ddd", cursor: "pointer" }}>
            <option value={1}>今日</option>
            <option value={3}>3日間</option>
            <option value={7}>7日間</option>
            <option value={14}>14日間</option>
          </select>
          <button onClick={load} disabled={loading}
            style={{ padding: "8px 16px", fontSize: "13px", cursor: "pointer", backgroundColor: "#e10102", color: "white", border: "none", borderRadius: "8px" }}>
            {loading ? "読込中..." : "🔄 更新"}
          </button>
        </div>
      </div>

      {/* タブ */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        {([{ key: "user", label: "来場者ページ" }, { key: "admin", label: "管理者ページ" }] as const).map((t) => (
          <button key={t.key} onClick={() => setViewTab(t.key)}
            style={{ flex: 1, padding: "10px", fontSize: "14px", cursor: "pointer", borderRadius: "8px", border: "2px solid", borderColor: viewTab === t.key ? "#e10102" : "#ddd", backgroundColor: viewTab === t.key ? "#fff5f5" : "white", color: viewTab === t.key ? "#e10102" : "#555", fontWeight: viewTab === t.key ? "bold" : "normal" }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "#aaa", textAlign: "center", padding: "40px" }}>読み込み中...</p>
      ) : viewTab === "user" ? (
        <>
          <h2 style={{ fontSize: "15px", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>ページ別アクセス数</h2>
          <BarGraph items={userSummary} pages={userPages} />

          <h2 style={{ fontSize: "15px", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>日別×ページ別 詳細</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f5f5f5" }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #ddd", whiteSpace: "nowrap" }}>ページ</th>
                  {dates.map((d) => (
                    <th key={d} style={{ padding: "10px 8px", textAlign: "center", borderBottom: "2px solid #ddd", whiteSpace: "nowrap" }}>{d}</th>
                  ))}
                  <th style={{ padding: "10px 8px", textAlign: "center", borderBottom: "2px solid #ddd", backgroundColor: "#fff8e1" }}>合計</th>
                </tr>
              </thead>
              <tbody>
                {sortedUserPages.map((page) => {
                  const total = userSummary.filter((s) => s.page === page).reduce((sum, s) => sum + s.count, 0);
                  return (
                    <tr key={page} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: "bold" }}>{PAGE_LABELS[page] ?? page}</span>
                        <span style={{ fontSize: "11px", color: "#aaa", marginLeft: "6px" }}>{page}</span>
                      </td>
                      {dates.map((d) => {
                        const c = getCount(userSummary, d, page);
                        return (
                          <td key={d} style={{ padding: "10px 8px", textAlign: "center", color: c > 0 ? "#333" : "#ddd", fontWeight: c > 10 ? "bold" : "normal", backgroundColor: c > 20 ? "#fff0f0" : c > 10 ? "#fff8e1" : "transparent" }}>
                            {c > 0 ? c : "-"}
                          </td>
                        );
                      })}
                      <td style={{ padding: "10px 8px", textAlign: "center", fontWeight: "bold", backgroundColor: "#fff8e1" }}>{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <h2 style={{ fontSize: "15px", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>ページ別アクセス数</h2>
          <BarGraph items={adminSummary} pages={adminPages} />

          <h2 style={{ fontSize: "15px", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>アクセスログ</h2>
          {adminLogs.length === 0 ? (
            <p style={{ color: "#aaa", fontSize: "14px" }}>データがありません</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "13px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>日時</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>ページ</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Visitor ID</th>
                  </tr>
                </thead>
                <tbody>
                  {adminLogs.slice(0, 200).map((log, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "8px 12px", whiteSpace: "nowrap", color: "#888", fontSize: "12px" }}>
                        {new Date(log.viewed_at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                        {PAGE_LABELS[log.page] ?? log.page}
                        <span style={{ fontSize: "11px", color: "#aaa", marginLeft: "4px" }}>{log.page}</span>
                      </td>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: "12px", color: "#555" }}>
                        {log.visitor_id === "不明" ? <span style={{ color: "#ccc" }}>不明</span> : log.visitor_id.slice(0, 12) + "..."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {adminLogs.length > 200 && <p style={{ fontSize: "12px", color: "#aaa", marginTop: "8px" }}>※ 最新200件を表示</p>}
            </div>
          )}
        </>
      )}
    </main>
  );
}
