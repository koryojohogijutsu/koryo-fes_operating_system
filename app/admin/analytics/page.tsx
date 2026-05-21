"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

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

const COLORS = [
  "#e10102","#1976d2","#4caf50","#ff9800","#7b1fa2",
  "#00bcd4","#f44336","#9c27b0","#607d8b","#795548",
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

  // グラフ用データ：日付ごとに各ページのアクセス数をまとめる
  const buildChartData = (items: SummaryItem[], pages: string[]) =>
    dates.map((date) => {
      const row: Record<string, any> = { date };
      pages.forEach((page) => {
        row[PAGE_LABELS[page] ?? page] = items.find((s) => s.date === date && s.page === page)?.count ?? 0;
      });
      return row;
    });

  const userChartData  = buildChartData(userSummary,  userPages);
  const adminChartData = buildChartData(adminSummary, adminPages);

  const getCount = (items: SummaryItem[], date: string, page: string) =>
    items.find((s) => s.date === date && s.page === page)?.count ?? 0;

  return (
    <main style={{ padding: "20px", maxWidth: "960px", margin: "0 auto" }}>
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
          {/* 来場者グラフ */}
          {userPages.length === 0 ? (
            <p style={{ color: "#aaa", fontSize: "14px" }}>データがありません</p>
          ) : (
            <>
              <h2 style={{ fontSize: "15px", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>日別アクセス数（グラフ）</h2>
              <div style={{ width: "100%", height: 360, marginBottom: "32px" }}>
                <ResponsiveContainer>
                  <BarChart data={userChartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    {userPages.map((page, i) => (
                      <Bar key={page} dataKey={PAGE_LABELS[page] ?? page} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 来場者テーブル */}
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
                    {userPages.map((page) => {
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
          )}
        </>
      ) : (
        <>
          {/* 管理者グラフ */}
          {adminPages.length > 0 && (
            <>
              <h2 style={{ fontSize: "15px", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>日別アクセス数（グラフ）</h2>
              <div style={{ width: "100%", height: 300, marginBottom: "32px" }}>
                <ResponsiveContainer>
                  <BarChart data={adminChartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    {adminPages.map((page, i) => (
                      <Bar key={page} dataKey={PAGE_LABELS[page] ?? page} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 管理者テーブル */}
              <h2 style={{ fontSize: "15px", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>日別×ページ別 詳細</h2>
              <div style={{ overflowX: "auto", marginBottom: "32px" }}>
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
                    {adminPages.map((page) => {
                      const total = adminSummary.filter((s) => s.page === page).reduce((sum, s) => sum + s.count, 0);
                      return (
                        <tr key={page} style={{ borderBottom: "1px solid #f0f0f0" }}>
                          <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                            <span style={{ fontWeight: "bold" }}>{PAGE_LABELS[page] ?? page}</span>
                            <span style={{ fontSize: "11px", color: "#aaa", marginLeft: "6px" }}>{page}</span>
                          </td>
                          {dates.map((d) => {
                            const c = getCount(adminSummary, d, page);
                            return (
                              <td key={d} style={{ padding: "10px 8px", textAlign: "center", color: c > 0 ? "#333" : "#ddd" }}>
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
          )}

          {/* 管理者アクセスログ */}
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
