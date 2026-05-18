"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

const CROWD_ICONS = [
  { level: 0, src: "/crowd-low.png",  label: "混雑なし",   color: "#4caf50" },
  { level: 1, src: "/crowd-mid.png",  label: "やや混雑",   color: "#ff9800" },
  { level: 2, src: "/crowd-high.png", label: "混雑",       color: "#f44336" },
  { level: 3, src: "/crowd-full.png", label: "大変混雑",   color: "#7b1fa2" },
];

const VENUE_LABELS: Record<string, string> = {
  gym:      "体育館",
  kinenkan: "記念館",
  koryokan:    "ライブ",
};

type ClassCrowd = {
  class_code: string;
  current:    number;
  capacity:   number;
  pct:        number;
  level:      number;
};

type ClassInfo = { code: string; label: string; comment: string };

type VenueCrowd = {
  venue_key:  string;
  level:      number;
  updated_at: string;
};

type ClassLayout = {
  class_code:  string;
  x:           number;
  y:           number;
};

type VenueLayout = {
  venue_key: string;
  x:         number;
  y:         number;
};

export default function MapPage() {
  const [classCrowds,   setClassCrowds]   = useState<ClassCrowd[]>([]);
  const [venueCrowds,   setVenueCrowds]   = useState<VenueCrowd[]>([]);
  const [classLayouts,  setClassLayouts]  = useState<ClassLayout[]>([]);
  const [venueLayouts,  setVenueLayouts]  = useState<VenueLayout[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [lastUpdated,   setLastUpdated]   = useState<Date | null>(null);
  const [classInfos,    setClassInfos]    = useState<ClassInfo[]>([]);
  const [modalClass,    setModalClass]    = useState<{ crowd: ClassCrowd; info: ClassInfo | null } | null>(null);

  const loadData = useCallback(async () => {
    const [crowdRes, classLayoutRes, venueLayoutRes, classRes] = await Promise.all([
      fetch("/api/crowd?type=all", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/map-layout", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/map-layout?type=venue", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/classes", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setClassCrowds(crowdRes.classes ?? []);
    setVenueCrowds(crowdRes.venues  ?? []);
    setClassLayouts(classLayoutRes.layouts ?? []);
    setVenueLayouts(venueLayoutRes.layouts ?? []);
    setClassInfos(classRes.classes ?? []);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    // 60秒ごとに自動更新
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  const getCrowdIcon = (level: number) => CROWD_ICONS[level] ?? CROWD_ICONS[0];

  if (loading) return (
    <main style={{ padding: "40px", textAlign: "center" }}>
      <p style={{ color: "#aaa" }}>読み込み中...</p>
    </main>
  );

  return (
    <>
    <main style={{ padding: "20px 16px 40px", maxWidth: "600px", margin: "0 auto" }}>
      <Link href="/" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "16px" }}>← ホームに戻る</Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <h1 style={{ fontSize: "20px" }}>📍 混雑状況マップ</h1>
        <button onClick={loadData}
          style={{ padding: "6px 14px", fontSize: "12px", cursor: "pointer", backgroundColor: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: "20px" }}>
          🔄 更新
        </button>
      </div>
      {lastUpdated && (
        <p style={{ fontSize: "11px", color: "#aaa", marginBottom: "20px" }}>
          最終更新: {lastUpdated.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      )}

      {/* 凡例 */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        {CROWD_ICONS.map((ci) => (
          <div key={ci.level} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}>
            <img src={ci.src} alt={ci.label} style={{ width: "20px", height: "20px", objectFit: "contain" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span style={{ color: ci.color, fontWeight: "bold" }}>{ci.label}</span>
          </div>
        ))}
      </div>

      {/* クラスマップ */}
      <h2 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "8px", color: "#333" }}>🏫 クラス企画</h2>
      <div style={{ position: "relative", width: "100%", marginBottom: "32px", border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden" }}>
        <img src="/map.png" alt="クラスマップ" style={{ width: "100%", display: "block" }} />
        {classLayouts.map((layout) => {
          const crowd = classCrowds.find((c) => c.class_code === layout.class_code);
          const level = crowd?.level ?? 0;
          const icon  = getCrowdIcon(level);
          return (
            <div key={layout.class_code}
              onClick={() => {
                const crowd = classCrowds.find((c) => c.class_code === layout.class_code);
                const info  = classInfos.find((c) => c.code === layout.class_code) ?? null;
                if (crowd) setModalClass({ crowd, info });
              }}
              style={{ position: "absolute", left: `${layout.x}%`, top: `${layout.y}%`, transform: "translate(-50%, -100%)", textAlign: "center", cursor: "pointer" }}>
              <img src={icon.src} alt={icon.label} style={{ width: "32px", height: "32px", objectFit: "contain", display: "block", margin: "0 auto" }}
                onError={(e) => {
                  // 画像がない場合は色付き丸で代替
                  const el = e.target as HTMLImageElement;
                  el.style.display = "none";
                }} />
              {/* 画像フォールバック用の色付きバッジ */}
              <div style={{
                backgroundColor: icon.color, color: "white", borderRadius: "12px",
                padding: "2px 6px", fontSize: "10px", fontWeight: "bold", whiteSpace: "nowrap",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}>
                {layout.class_code}
              </div>
            </div>
          );
        })}
        {classLayouts.length === 0 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.7)" }}>
            <p style={{ color: "#aaa", fontSize: "13px" }}>マップ配置が設定されていません</p>
          </div>
        )}
      </div>

      {/* 体育館・記念館マップ */}
      <h2 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "8px", color: "#333" }}>🏟️ 体育館・記念館</h2>
      <div style={{ position: "relative", width: "100%", marginBottom: "24px", border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden" }}>
        <img src="/venue-map-gym-kinenkan.png" alt="体育館・記念館マップ" style={{ width: "100%", display: "block" }} />
        {venueLayouts.filter(l => l.venue_key !== "koryokan").map((layout) => {
          const crowd = venueCrowds.find((v) => v.venue_key === layout.venue_key);
          const level = crowd?.level ?? 0;
          const icon  = getCrowdIcon(level);
          return (
            <div key={layout.venue_key}
              onClick={() => {
                const crowd = classCrowds.find((c) => c.class_code === layout.class_code);
                const info  = classInfos.find((c) => c.code === layout.class_code) ?? null;
                if (crowd) setModalClass({ crowd, info });
              }}
              style={{ position: "absolute", left: `${layout.x}%`, top: `${layout.y}%`, transform: "translate(-50%, -100%)", textAlign: "center", cursor: "pointer" }}>
              <img src={icon.src} alt={icon.label} style={{ width: "36px", height: "36px", objectFit: "contain", display: "block", margin: "0 auto" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <div style={{ backgroundColor: icon.color, color: "white", borderRadius: "12px", padding: "2px 8px", fontSize: "11px", fontWeight: "bold", whiteSpace: "nowrap", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
                {VENUE_LABELS[layout.venue_key] ?? layout.venue_key}
              </div>
            </div>
          );
        })}
      </div>

      {/* 蛟龍館マップ */}
      <h2 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "8px", color: "#333" }}>🏢 蛟龍館</h2>
      <div style={{ position: "relative", width: "100%", marginBottom: "32px", border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden" }}>
        <img src="/venue-map-koryokan.png" alt="蛟龍館マップ" style={{ width: "100%", display: "block" }} />
      {/* 蛟龍館クラス（将棋部・囲碁部）*/}
      {(() => {
        const KORYO_CLASS_CODES = ["将棋部", "囲碁部"];
        const koryoClasses = classLayouts.filter((l) => KORYO_CLASS_CODES.includes(l.class_code));
        if (koryoClasses.length === 0) return null;
        return koryoClasses.map((layout) => {
          const crowd = classCrowds.find((c) => c.class_code === layout.class_code);
          const level = crowd?.level ?? 0;
          const icon  = getCrowdIcon(level);
          return (
            <div key={layout.class_code}
              onClick={() => {
                const crowd = classCrowds.find((c) => c.class_code === layout.class_code);
                const info  = classInfos.find((c) => c.code === layout.class_code) ?? null;
                if (crowd) setModalClass({ crowd, info });
              }}
              style={{ position: "absolute", left: `${layout.x}%`, top: `${layout.y}%`, transform: "translate(-50%, -100%)", textAlign: "center", cursor: "pointer" }}>
              <img src={icon.src} alt={icon.label} style={{ width: "32px", height: "32px", objectFit: "contain", display: "block", margin: "0 auto" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <div style={{ backgroundColor: icon.color, color: "white", borderRadius: "12px", padding: "2px 6px", fontSize: "10px", fontWeight: "bold", whiteSpace: "nowrap", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
                {layout.class_code}
              </div>
            </div>
          );
        });
      })()}
        {venueLayouts.filter(l => l.venue_key === "koryokan").map((layout) => {
          const crowd = venueCrowds.find((v) => v.venue_key === layout.venue_key);
          const level = crowd?.level ?? 0;
          const icon  = getCrowdIcon(level);
          return (
            <div key={layout.venue_key}
              onClick={() => {
                const crowd = classCrowds.find((c) => c.class_code === layout.class_code);
                const info  = classInfos.find((c) => c.code === layout.class_code) ?? null;
                if (crowd) setModalClass({ crowd, info });
              }}
              style={{ position: "absolute", left: `${layout.x}%`, top: `${layout.y}%`, transform: "translate(-50%, -100%)", textAlign: "center", cursor: "pointer" }}>
              <img src={icon.src} alt={icon.label} style={{ width: "36px", height: "36px", objectFit: "contain", display: "block", margin: "0 auto" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <div style={{ backgroundColor: icon.color, color: "white", borderRadius: "12px", padding: "2px 8px", fontSize: "11px", fontWeight: "bold", whiteSpace: "nowrap", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
                {VENUE_LABELS[layout.venue_key] ?? layout.venue_key}
              </div>
            </div>
          );
        })}
      </div>

      {/* テキスト一覧（会場） */}
      <h2 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "10px", color: "#333" }}>会場の混雑状況</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {venueCrowds.map((v) => {
          const icon = getCrowdIcon(v.level);
          return (
            <div key={v.venue_key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: "8px", border: `1px solid ${icon.color}33`, backgroundColor: `${icon.color}11` }}>
              <span style={{ fontWeight: "bold", fontSize: "15px" }}>{VENUE_LABELS[v.venue_key] ?? v.venue_key}</span>
              <span style={{ fontWeight: "bold", color: icon.color, fontSize: "14px" }}>{icon.label}</span>
            </div>
          );
        })}
      </div>
    </main>

        {/* クラスコメントモーダル */}
      {modalClass && (
        <div onClick={() => setModalClass(null)}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: "20px" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: "white", borderRadius: "16px", padding: "24px 20px", maxWidth: "320px", width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div>
                <p style={{ fontWeight: "bold", fontSize: "16px", margin: 0 }}>{modalClass.info?.code ?? modalClass.crowd.class_code}</p>
                <p style={{ color: "#888", fontSize: "13px", margin: "2px 0 0" }}>{modalClass.info?.label}</p>
              </div>
              {(() => {
                const icon = getCrowdIcon(modalClass.crowd.level);
                return <span style={{ fontWeight: "bold", color: icon.color, fontSize: "13px" }}>{icon.label}</span>;
              })()}
            </div>
            {modalClass.info?.comment ? (
              <p style={{ fontSize: "14px", color: "#444", lineHeight: "1.7", margin: "0 0 16px" }}>{modalClass.info.comment}</p>
            ) : (
              <p style={{ fontSize: "13px", color: "#bbb", margin: "0 0 16px" }}>コメントはありません</p>
            )}
            <button onClick={() => setModalClass(null)}
              style={{ width: "100%", padding: "10px", fontSize: "14px", cursor: "pointer", backgroundColor: "#f5f5f5", color: "#555", border: "none", borderRadius: "8px" }}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}
