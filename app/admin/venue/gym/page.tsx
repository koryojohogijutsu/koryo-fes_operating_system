"use client";
import { useEffect, useState } from "react";

const VENUE_KEY = "gym";

const CROWD_LEVELS = [
  { level: 0, label: "混雑なし",   color: "#4caf50", bg: "#f1f8e9" },
  { level: 1, label: "やや混雑",   color: "#ff9800", bg: "#fff8e1" },
  { level: 2, label: "混雑",       color: "#f44336", bg: "#fce4ec" },
  { level: 3, label: "大変混雑",   color: "#7b1fa2", bg: "#f3e5f5" },
];

export default function GymManagePage() {
  const [crowdLevel, setCrowdLevel] = useState(0);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);

  useEffect(() => {
    fetch("/api/crowd?type=venue", { cache: "no-store" }).then((r) => r.json()).then((data) => {
      const venue = (data.venues ?? []).find((v: any) => v.venue_key === VENUE_KEY);
      if (venue) setCrowdLevel(venue.level);
    });
  }, []);

  const updateCrowd = async (level: number) => {
    setSaving(true);
    await fetch("/api/crowd", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ venueKey: VENUE_KEY, level }) });
    setCrowdLevel(level);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const current = CROWD_LEVELS[crowdLevel];

  return (
    <main style={{ padding: "20px", maxWidth: "480px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "20px", marginBottom: "8px" }}>🏟️ 体育館管理</h1>
      <p style={{ color: "#888", fontSize: "13px", marginBottom: "24px" }}>混雑状況を手動で設定します</p>

      <div style={{ marginBottom: "24px", padding: "20px", borderRadius: "10px", backgroundColor: current.bg, border: `2px solid ${current.color}`, textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: "#888", marginBottom: "4px" }}>現在の混雑状況</p>
        <p style={{ fontSize: "24px", fontWeight: "bold", color: current.color }}>{current.label}</p>
        {saved && <p style={{ fontSize: "12px", color: "#4caf50", marginTop: "4px" }}>✅ 保存しました</p>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "32px" }}>
        {CROWD_LEVELS.map((cl) => (
          <button key={cl.level} onClick={() => updateCrowd(cl.level)} disabled={saving}
            style={{ padding: "16px", borderRadius: "10px", fontSize: "15px", fontWeight: "bold", cursor: "pointer", border: crowdLevel === cl.level ? `3px solid ${cl.color}` : "2px solid #eee", backgroundColor: crowdLevel === cl.level ? cl.bg : "white", color: crowdLevel === cl.level ? cl.color : "#888" }}>
            {cl.label}
            {crowdLevel === cl.level && <span style={{ display: "block", fontSize: "11px", marginTop: "2px" }}>✓ 選択中</span>}
          </button>
        ))}
      </div>

    </main>
  );
}
