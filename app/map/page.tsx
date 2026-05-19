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
  koryokan: "ライブ",
};

type ClassCrowd  = { class_code: string; current: number; capacity: number; pct: number; level: number };
type VenueCrowd  = { venue_key: string; level: number; updated_at: string };
type ClassLayout = { class_code: string; x: number; y: number };
type VenueLayout = { venue_key: string; x: number; y: number };
type ClassInfo   = { code: string; label: string; comment: string };
type EventEntry  = { id: string; name: string; description: string; comment: string };
type VenueEvent  = { id: string; venue_key: string; title: string; description: string };

type ClassModal  = { type: "class"; crowd: ClassCrowd; info: ClassInfo | null };
type VenueModal  = { type: "venue"; venueKey: string; label: string; level: number; events: VenueEvent[] };
type LiveModal   = { type: "live"; entries: EventEntry[] };
type LibraryModal = { type: "library"; events: VenueEvent[] };
type Modal = ClassModal | VenueModal | LiveModal | LibraryModal;

export default function MapPage() {
  const [classCrowds,   setClassCrowds]   = useState<ClassCrowd[]>([]);
  const [venueCrowds,   setVenueCrowds]   = useState<VenueCrowd[]>([]);
  const [classLayouts,  setClassLayouts]  = useState<ClassLayout[]>([]);
  const [venueLayouts,  setVenueLayouts]  = useState<VenueLayout[]>([]);
  const [classInfos,    setClassInfos]    = useState<ClassInfo[]>([]);
  const [liveEntries,   setLiveEntries]   = useState<EventEntry[]>([]);
  const [venueEvents,   setVenueEvents]   = useState<VenueEvent[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [lastUpdated,   setLastUpdated]   = useState<Date | null>(null);
  const [modal,         setModal]         = useState<Modal | null>(null);

  const loadData = useCallback(async () => {
    const t = Date.now();
    const [crowdRes, classLayoutRes, venueLayoutRes, classRes, liveRes, venueEvRes] = await Promise.all([
      fetch(`/api/crowd?type=all&_t=${t}`,              { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/map-layout?_t=${t}`,                  { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/map-layout?type=venue&_t=${t}`,       { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/classes?_t=${t}`,                     { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/event-entries?category=live&_t=${t}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/venue-events?_t=${t}`,                { cache: "no-store" }).then((r) => r.json()),
    ]);
    setClassCrowds(crowdRes.classes   ?? []);
    setVenueCrowds(crowdRes.venues    ?? []);
    setClassLayouts(classLayoutRes.layouts ?? []);
    setVenueLayouts(venueLayoutRes.layouts ?? []);
    setClassInfos(classRes.classes    ?? []);
    setLiveEntries(liveRes.entries    ?? []);
    setVenueEvents(venueEvRes.events  ?? []);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  const getCrowdIcon = (level: number) => CROWD_ICONS[level] ?? CROWD_ICONS[0];

  const openClassModal = (layout: ClassLayout) => {
    const crowd = classCrowds.find((c) => c.class_code === layout.class_code);
    const info  = classInfos.find((c) => c.code === layout.class_code) ?? null;
    if (!crowd) return;
    setModal({ type: "class", crowd, info });
  };

  const openVenueModal = (venueKey: string) => {
    const crowd  = venueCrowds.find((v) => v.venue_key === venueKey);
    const label  = VENUE_LABELS[venueKey] ?? venueKey;
    const events = venueEvents.filter((e) => e.venue_key === venueKey);
    setModal({ type: "venue", venueKey, label, level: crowd?.level ?? 0, events });
  };

  const openLiveModal  = () => setModal({ type: "live", entries: liveEntries });
  const openLibraryModal = () => {
    const events = venueEvents.filter((e) => e.venue_key === "library");
    setModal({ type: "library", events });
  };

  if (loading) return (
    <main style={{ padding: "40px", textAlign: "center" }}>
      <p style={{ color: "#aaa" }}>読み込み中...</p>
    </main>
  );

  const mainClassLayouts  = classLayouts.filter((l) => !["将棋部", "囲碁部"].includes(l.class_code));
  const koryoClassLayouts = classLayouts.filter((l) => ["将棋部", "囲碁部"].includes(l.class_code));
  const libraryLayout     = venueLayouts.find((l) => l.venue_key === "library");

  return (
    <>
      <main style={{ padding: "20px 16px 40px", maxWidth: "600px", margin: "0 auto" }}>
        <Link href="/" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "16px" }}>← ホームに戻る</Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h1 style={{ fontSize: "20px" }}>📍 マップ</h1>
          <button onClick={loadData} style={{ padding: "6px 14px", fontSize: "12px", cursor: "pointer", backgroundColor: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: "20px" }}>🔄 更新</button>
        </div>
        {lastUpdated && <p style={{ fontSize: "11px", color: "#aaa", marginBottom: "20px" }}>最終更新: {lastUpdated.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>}

        {/* 凡例 */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
          {CROWD_ICONS.map((ci) => (
            <div key={ci.level} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}>
              <img src={ci.src} alt={ci.label} style={{ width: "20px", height: "20px", objectFit: "contain" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <span style={{ color: ci.color, fontWeight: "bold" }}>{ci.label}</span>
            </div>
          ))}
        </div>

        {/* 校舎マップ */}
        <h2 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "4px", color: "#333" }}>🏫 校舎（教室棟・管理棟）</h2>
        <p style={{ fontSize: "11px", color: "#aaa", marginBottom: "8px" }}>アイコンをタップすると詳細が見られます</p>
        <div style={{ position: "relative", width: "100%", marginBottom: "32px", border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden" }}>
          <img src="/map.png" alt="校舎マップ" style={{ width: "100%", display: "block" }} />
          {mainClassLayouts.map((layout) => {
            const crowd = classCrowds.find((c) => c.class_code === layout.class_code);
            const icon  = getCrowdIcon(crowd?.level ?? 0);
            return (
              <div key={layout.class_code} onClick={() => openClassModal(layout)}
                style={{ position: "absolute", left: `${layout.x}%`, top: `${layout.y}%`, transform: "translate(-50%, -100%)", textAlign: "center", cursor: "pointer" }}>
                <img src={icon.src} alt={icon.label} style={{ width: "32px", height: "32px", objectFit: "contain", display: "block", margin: "0 auto" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div style={{ backgroundColor: icon.color, color: "white", borderRadius: "12px", padding: "2px 6px", fontSize: "10px", fontWeight: "bold", whiteSpace: "nowrap", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>{layout.class_code}</div>
              </div>
            );
          })}
          {/* 図書館ピン */}
          {libraryLayout && libraryLayout.x >= 0 && libraryLayout.y >= 0 && (
            <div onClick={openLibraryModal}
              style={{ position: "absolute", left: `${libraryLayout.x}%`, top: `${libraryLayout.y}%`, transform: "translate(-50%, -100%)", textAlign: "center", cursor: "pointer" }}>
              <div style={{ backgroundColor: "#1976d2", color: "white", borderRadius: "12px", padding: "4px 8px", fontSize: "11px", fontWeight: "bold", whiteSpace: "nowrap", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>📚 図書館</div>
            </div>
          )}
        </div>

        {/* 体育館・記念館マップ */}
        <h2 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "8px", color: "#333" }}>🏟️ 体育館・記念館</h2>
        <div style={{ position: "relative", width: "100%", marginBottom: "24px", border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden" }}>
          <img src="/venue-map-gym-kinenkan.png" alt="体育館・記念館マップ" style={{ width: "100%", display: "block" }} />
          {venueLayouts.filter((l) => l.venue_key !== "koryokan" && l.venue_key !== "library").map((layout) => {
            const crowd = venueCrowds.find((v) => v.venue_key === layout.venue_key);
            const icon  = getCrowdIcon(crowd?.level ?? 0);
            return (
              <div key={layout.venue_key} onClick={() => openVenueModal(layout.venue_key)}
                style={{ position: "absolute", left: `${layout.x}%`, top: `${layout.y}%`, transform: "translate(-50%, -100%)", textAlign: "center", cursor: "pointer" }}>
                <img src={icon.src} alt={icon.label} style={{ width: "36px", height: "36px", objectFit: "contain", display: "block", margin: "0 auto" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
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
          {venueLayouts.filter((l) => l.venue_key === "koryokan").map((layout) => {
            const crowd = venueCrowds.find((v) => v.venue_key === layout.venue_key);
            const icon  = getCrowdIcon(crowd?.level ?? 0);
            return (
              <div key={layout.venue_key} onClick={openLiveModal}
                style={{ position: "absolute", left: `${layout.x}%`, top: `${layout.y}%`, transform: "translate(-50%, -100%)", textAlign: "center", cursor: "pointer" }}>
                <img src={icon.src} alt={icon.label} style={{ width: "36px", height: "36px", objectFit: "contain", display: "block", margin: "0 auto" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div style={{ backgroundColor: icon.color, color: "white", borderRadius: "12px", padding: "2px 8px", fontSize: "11px", fontWeight: "bold", whiteSpace: "nowrap", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>ライブ</div>
              </div>
            );
          })}
          {koryoClassLayouts.map((layout) => {
            const crowd = classCrowds.find((c) => c.class_code === layout.class_code);
            const icon  = getCrowdIcon(crowd?.level ?? 0);
            return (
              <div key={layout.class_code} onClick={() => openClassModal(layout)}
                style={{ position: "absolute", left: `${layout.x}%`, top: `${layout.y}%`, transform: "translate(-50%, -100%)", textAlign: "center", cursor: "pointer" }}>
                <img src={icon.src} alt={icon.label} style={{ width: "32px", height: "32px", objectFit: "contain", display: "block", margin: "0 auto" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div style={{ backgroundColor: icon.color, color: "white", borderRadius: "12px", padding: "2px 6px", fontSize: "10px", fontWeight: "bold", whiteSpace: "nowrap", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>{layout.class_code}</div>
              </div>
            );
          })}
        </div>

        {/* 会場混雑テキスト一覧 */}
        <h2 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "10px", color: "#333" }}>会場の混雑状況</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {venueCrowds.filter((v) => v.venue_key !== "library").map((v) => {
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

      {/* クラスモーダル */}
      {modal?.type === "class" && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: "20px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "white", borderRadius: "16px", padding: "24px 20px", maxWidth: "340px", width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div>
                <p style={{ fontWeight: "bold", fontSize: "18px", margin: 0 }}>{modal.info?.label ?? modal.crowd.class_code}</p>
                <p style={{ color: "#888", fontSize: "13px", margin: "2px 0 0" }}>{modal.crowd.class_code}</p>
              </div>
              <span style={{ fontWeight: "bold", color: getCrowdIcon(modal.crowd.level).color, fontSize: "13px" }}>{getCrowdIcon(modal.crowd.level).label}</span>
            </div>
            <img src={`/class-images/${modal.crowd.class_code}.png`} alt="" style={{ width: "100%", borderRadius: "10px", marginBottom: "12px" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <p style={{ fontSize: "14px", color: modal.info?.comment ? "#444" : "#bbb", lineHeight: "1.7", margin: "0 0 16px" }}>{modal.info?.comment || "コメントはありません"}</p>
            <button onClick={() => setModal(null)} style={{ width: "100%", padding: "10px", fontSize: "14px", cursor: "pointer", backgroundColor: "#f5f5f5", color: "#555", border: "none", borderRadius: "8px" }}>閉じる</button>
          </div>
        </div>
      )}

      {/* 体育館・記念館モーダル */}
      {modal?.type === "venue" && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: "20px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "white", borderRadius: "16px", padding: "24px 20px", maxWidth: "380px", width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>{modal.label}</h2>
              <span style={{ fontWeight: "bold", color: getCrowdIcon(modal.level).color, fontSize: "13px" }}>{getCrowdIcon(modal.level).label}</span>
            </div>
            {modal.events.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: "14px", marginBottom: "16px" }}>イベント情報はまだありません</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                {modal.events.map((ev) => (
                  <div key={ev.id} style={{ padding: "12px", backgroundColor: "#f9f9f9", borderRadius: "8px", border: "1px solid #eee" }}>
                    <p style={{ fontWeight: "bold", fontSize: "14px", margin: 0 }}>{ev.title}</p>
                    {ev.description && <p style={{ fontSize: "13px", color: "#666", margin: "4px 0 0", lineHeight: "1.6" }}>{ev.description}</p>}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setModal(null)} style={{ width: "100%", padding: "10px", fontSize: "14px", cursor: "pointer", backgroundColor: "#f5f5f5", color: "#555", border: "none", borderRadius: "8px" }}>閉じる</button>
          </div>
        </div>
      )}

      {/* ライブモーダル */}
      {modal?.type === "live" && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: "20px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "white", borderRadius: "16px", padding: "24px 20px", maxWidth: "380px", width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px" }}>🎵 ライブ 出演者</h2>
            {modal.entries.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: "14px", marginBottom: "16px" }}>出演者情報はまだありません</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "16px" }}>
                {modal.entries.map((entry, i) => (
                  <div key={entry.id} style={{ borderBottom: "1px solid #f0f0f0", paddingBottom: "14px" }}>
                    <img src={`/live/${i + 1}.png`} alt={entry.name} style={{ width: "100%", borderRadius: "10px", marginBottom: "8px" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <span style={{ fontWeight: "bold", fontSize: "15px" }}>{entry.name}</span>
                      {entry.comment && <span style={{ fontSize: "13px", color: "#555", flex: 1, textAlign: "right" }}>{entry.comment}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setModal(null)} style={{ width: "100%", padding: "10px", fontSize: "14px", cursor: "pointer", backgroundColor: "#f5f5f5", color: "#555", border: "none", borderRadius: "8px" }}>閉じる</button>
          </div>
        </div>
      )}

      {/* 図書館モーダル */}
      {modal?.type === "library" && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: "20px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "white", borderRadius: "16px", padding: "24px 20px", maxWidth: "380px", width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px" }}>📚 図書館</h2>
            {modal.events.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: "14px", marginBottom: "16px" }}>イベント情報はまだありません</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                {modal.events.map((ev) => (
                  <div key={ev.id} style={{ padding: "12px", backgroundColor: "#f9f9f9", borderRadius: "8px", border: "1px solid #eee" }}>
                    <p style={{ fontWeight: "bold", fontSize: "14px", margin: 0 }}>{ev.title}</p>
                    {ev.description && <p style={{ fontSize: "13px", color: "#666", margin: "4px 0 0", lineHeight: "1.6" }}>{ev.description}</p>}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setModal(null)} style={{ width: "100%", padding: "10px", fontSize: "14px", cursor: "pointer", backgroundColor: "#f5f5f5", color: "#555", border: "none", borderRadius: "8px" }}>閉じる</button>
          </div>
        </div>
      )}
    </>
  );
}
