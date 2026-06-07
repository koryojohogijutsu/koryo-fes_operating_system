"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Program = { id: string; name: string; datetime: string; festival_day: string };

// コスコン（パフォーマンス・ランウェイ共通）は "coscon" としてまとめる
const COSCON_KEY   = "coscon";
const COSCON_LABEL = "コスコン";

// のど自慢（1日目・2日目①②を「のど自慢」としてまとめる場合と分ける場合）
// 今回は日程別に3つ表示
const NODOJIMAN_ITEMS = [
  { key: "nodojiman-day1", label: "のど自慢（1日目）" },
  { key: "nodojiman-day2-1", label: "のど自慢（2日目①）" },
  { key: "nodojiman-day2-2", label: "のど自慢（2日目②）" },
];

export default function GymRatingPage() {
  const router = useRouter();
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [programs,  setPrograms]  = useState<Program[]>([]);
  const [rated,     setRated]     = useState<Record<string, number>>({});   // target_key → stars
  const [hover,     setHover]     = useState<Record<string, number>>({});   // target_key → hover stars
  const [saving,    setSaving]    = useState<string | null>(null);
  const [done,      setDone]      = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const id = document.cookie.split("; ").find((r) => r.startsWith("visitor_id="))?.split("=")[1];
    if (!id) { router.push("/register"); return; }
    setVisitorId(id);

    Promise.all([
      fetch("/api/venue-programs?venueKey=gym", { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/event-ratings?visitorId=${id}`, { cache: "no-store" }).then((r) => r.json()),
    ]).then(([progData, ratingData]) => {
      // 同名の部活動企画を重複排除（例：ギター・マンドリン部が複数登録されている場合）
    const rawPrograms: Program[] = progData.programs ?? [];
    const seen = new Set<string>();
    const deduped = rawPrograms.filter((p) => {
      if (seen.has(p.name)) return false;
      seen.add(p.name);
      return true;
    });
    setPrograms(deduped);
      setRated(ratingData.rated ?? {});
      setLoading(false);
    });
  }, [router]);

  const submitRating = async (targetKey: string, targetLabel: string, stars: number) => {
    if (!visitorId || saving) return;
    setSaving(targetKey);
    await fetch("/api/event-ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId, targetKey, targetLabel, stars }),
    });
    setRated((prev) => ({ ...prev, [targetKey]: stars }));
    setDone(targetKey);
    setTimeout(() => setDone(null), 1500);
    setSaving(null);
  };

  const StarRating = ({ targetKey, label }: { targetKey: string; label: string }) => {
    const currentStars = rated[targetKey] ?? 0;
    const hoverStars   = hover[targetKey]  ?? 0;
    const display      = hoverStars || currentStars;
    const isSaving     = saving === targetKey;
    const isDone       = done   === targetKey;

    return (
      <div style={{ padding: "16px", border: "1px solid var(--card-border)", borderRadius: "12px", backgroundColor: isDone ? "rgba(76,175,80,0.08)" : "var(--card-bg)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span style={{ fontWeight: "bold", fontSize: "15px" }}>{label}</span>
          {isDone && <span style={{ fontSize: "12px", color: "#4caf50", fontWeight: "bold" }}>✅ 評価済み</span>}
          {currentStars > 0 && !isDone && <span style={{ fontSize: "11px", color: "var(--muted)" }}>タップで変更可</span>}
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {[1,2,3,4,5].map((s) => (
            <button
              key={s}
              disabled={isSaving}
              onClick={() => submitRating(targetKey, label, s)}
              onMouseEnter={() => setHover((prev) => ({ ...prev, [targetKey]: s }))}
              onMouseLeave={() => setHover((prev) => ({ ...prev, [targetKey]: 0 }))}
              onTouchStart={() => setHover((prev) => ({ ...prev, [targetKey]: s }))}
              style={{
                fontSize: "32px",
                background: "none",
                border: "none",
                cursor: isSaving ? "not-allowed" : "pointer",
                color: s <= display ? "#f5a623" : "#ddd",
                padding: "2px",
                lineHeight: 1,
                transition: "color 0.1s",
              }}
            >
              ★
            </button>
          ))}
        </div>
        {isSaving && <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "6px" }}>送信中...</p>}
      </div>
    );
  };

  if (loading) return <main style={{ padding: "40px", textAlign: "center" }}><p style={{ color: "var(--muted)" }}>読み込み中...</p></main>;

  return (
    <main style={{ padding: "24px 20px 60px", maxWidth: "480px", margin: "0 auto" }}>
      <button onClick={() => router.back()}
        style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "14px", cursor: "pointer", marginBottom: "16px", padding: 0 }}>
        ← 戻る
      </button>
      <h1 style={{ fontSize: "20px", marginBottom: "4px" }}>🏟️ 体育館イベントの評価</h1>
      <p style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "24px" }}>
        各イベントを星1〜5で評価してください。後から変更することもできます。
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* のど自慢 */}
        <p style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "bold", marginTop: "4px" }}>🎤 のど自慢</p>
        {NODOJIMAN_ITEMS.map((item) => (
          <StarRating key={item.key} targetKey={item.key} label={item.label} />
        ))}

        {/* コスコン（パフォーマンス・ランウェイ共通） */}
        <p style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "bold", marginTop: "8px" }}>👗 コスコン</p>
        <StarRating targetKey={COSCON_KEY} label={COSCON_LABEL} />

        {/* 部活動企画 */}
        {programs.length > 0 && (
          <>
            <p style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "bold", marginTop: "8px" }}>📋 部活動企画</p>
            {programs.map((p) => (
              <StarRating key={p.id} targetKey={`program:${p.id}`} label={p.name} />
            ))}
          </>
        )}

        {programs.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: "14px" }}>部活動企画の情報がまだありません</p>
        )}
      </div>
    </main>
  );
}
