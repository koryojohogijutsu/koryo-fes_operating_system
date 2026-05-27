"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Settings = { day1_date: string; day2_date: string; display_mode: string };

export default function FestivalSettingsPage() {
  const router = useRouter();
  const [authed,      setAuthed]      = useState(false);
  const [day1Date,    setDay1Date]    = useState("");
  const [day2Date,    setDay2Date]    = useState("");
  const [displayMode, setDisplayMode] = useState("auto");
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [currentDay,  setCurrentDay]  = useState("");

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") { router.push("/admin/login"); return; }
    setAuthed(true);
    load();
    // 今日の日付を表示
    const today = new Date();
    setCurrentDay(`${today.getMonth() + 1}月${today.getDate()}日`);
  }, [router]);

  const load = async () => {
    const res  = await fetch("/api/festival-settings", { cache: "no-store" });
    const data = await res.json();
    const s: Settings = data.settings;
    setDay1Date(s.day1_date    ?? "");
    setDay2Date(s.day2_date    ?? "");
    setDisplayMode(s.display_mode ?? "auto");
  };

  const save = async () => {
    setSaving(true);
    await fetch("/api/festival-settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day1Date, day2Date, displayMode }),
    });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  if (!authed) return null;

  const modeStyle = (m: string): React.CSSProperties => ({
    flex: 1, padding: "12px", fontSize: "14px", cursor: "pointer", borderRadius: "8px",
    border: "2px solid", borderColor: displayMode === m ? "#e10102" : "#ddd",
    backgroundColor: displayMode === m ? "#fff5f5" : "white",
    color: displayMode === m ? "#e10102" : "#555", fontWeight: displayMode === m ? "bold" : "normal",
  });

  return (
    <main style={{ padding: "20px", maxWidth: "480px", margin: "0 auto" }}>
      <Link href="/admin" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "16px" }}>← 管理者メニュー</Link>
      <h1 style={{ fontSize: "20px", marginBottom: "8px" }}>📅 文化祭日程・表示設定</h1>
      <p style={{ fontSize: "13px", color: "#888", marginBottom: "24px" }}>今日: <strong>{currentDay}</strong></p>

      {/* 日程設定 */}
      <section style={{ marginBottom: "28px", padding: "16px", border: "1px solid #ddd", borderRadius: "10px" }}>
        <h2 style={{ fontSize: "15px", marginBottom: "14px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>日程設定</h2>
        <p style={{ fontSize: "12px", color: "#888", marginBottom: "12px" }}>
          イベント・部活動企画の登録時に選択する日付の基準です。<br />例: 1日目=6月6日、2日目=6月7日
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={{ fontSize: "13px", color: "#555" }}>
            1日目の日付
            <input value={day1Date} onChange={(e) => setDay1Date(e.target.value)} placeholder="例: 6月6日"
              style={{ display: "block", width: "100%", marginTop: "4px", padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }} />
          </label>
          <label style={{ fontSize: "13px", color: "#555" }}>
            2日目の日付
            <input value={day2Date} onChange={(e) => setDay2Date(e.target.value)} placeholder="例: 6月7日"
              style={{ display: "block", width: "100%", marginTop: "4px", padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }} />
          </label>
        </div>
      </section>

      {/* 表示モード */}
      <section style={{ marginBottom: "28px", padding: "16px", border: "1px solid #ddd", borderRadius: "10px" }}>
        <h2 style={{ fontSize: "15px", marginBottom: "6px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>マップ表示モード</h2>
        <p style={{ fontSize: "12px", color: "#888", marginBottom: "14px" }}>
          自動: 今日の日付で自動切替（{day1Date || "1日目"}→1日目表示、{day2Date || "2日目"}→2日目表示）
        </p>
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          <button onClick={() => setDisplayMode("auto")}  style={modeStyle("auto")}>🔄 自動</button>
          <button onClick={() => setDisplayMode("day1")}  style={modeStyle("day1")}>1日目のみ</button>
          <button onClick={() => setDisplayMode("day2")}  style={modeStyle("day2")}>2日目のみ</button>
          <button onClick={() => setDisplayMode("both")}  style={modeStyle("both")}>両日表示</button>
        </div>
        <p style={{ fontSize: "12px", color: "#888" }}>
          現在: <strong>
            {displayMode === "auto"  && "自動（今日の日付で判定）"}
            {displayMode === "day1"  && "1日目のみ強制表示"}
            {displayMode === "day2"  && "2日目のみ強制表示"}
            {displayMode === "both"  && "両日すべて表示"}
          </strong>
        </p>
      </section>

      <button onClick={save} disabled={saving}
        style={{ width: "100%", padding: "14px", fontSize: "16px", fontWeight: "bold", cursor: saving ? "not-allowed" : "pointer", backgroundColor: saved ? "#4caf50" : "#e10102", color: "white", border: "none", borderRadius: "8px" }}>
        {saving ? "保存中..." : saved ? "✅ 保存しました" : "保存する"}
      </button>
    </main>
  );
}
