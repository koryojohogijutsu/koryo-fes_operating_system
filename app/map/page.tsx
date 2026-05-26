"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

const CROWD_ICONS = [
  { level: 0, src: "/crowd-low.png",  label: "混雑なし", color: "#4caf50" },
  { level: 1, src: "/crowd-mid.png",  label: "やや混雑", color: "#ff9800" },
  { level: 2, src: "/crowd-high.png", label: "混雑",     color: "#f44336" },
  { level: 3, src: "/crowd-full.png", label: "大変混雑", color: "#7b1fa2" },
];

const VENUE_LABELS: Record<string, string> = {
  gym: "体育館", kinenkan: "記念館", koryokan: "ライブ", library: "図書館",
  sundelica: "サンデリカ", mockstore: "模擬店", football: "サッカー部",
  tontonhiroba: "とんとん広場", tea: "茶道部", science: "科学物理部",
  tetsudo: "鉄道研究部", quiz: "クイズ研究会", bazar: "バザー",
  doso: "同窓会", shogi: "将棋部", igo: "囲碁部", kyukei: "休憩所",
  kendo: "剣道部", kyudo: "弓道部", ouen: "應援團演舞",
};

// 日時・内容モーダルを持つピン
const PIN_INFO_KEYS = ["science","tetsudo","quiz","tea","shogi","igo","kendo","kyudo","ouen"];
// メニューモーダルを持つピン
const MENU_KEYS = ["tontonhiroba","football","mockstore"];

type ClassCrowd   = { class_code: string; current: number; capacity: number; pct: number; level: number };
type VenueCrowd   = { venue_key: string; level: number; updated_at: string };
type ClassLayout  = { class_code: string; x: number; y: number };
type VenueLayout  = { venue_key: string; x: number; y: number; map_key?: string };
type ClassInfo    = { code: string; label: string; comment: string; image_url?: string };
type EventEntry   = { id: string; name: string; description: string; comment: string; datetime?: string; image_url?: string; members?: string };
type VenueEvent   = { id: string; venue_key: string; title: string; description: string };
type VenueProgram = { id: string; venue_key: string; name: string; datetime: string; comment: string };
type PinInfo      = { venue_key: string; datetime: string; content: string };
type DosoInfo     = { title: string; datetime: string; content: string };
type LibClub      = { id: string; name: string; comment: string };
type MenuItem     = { id: string; venue_key: string; title: string; description: string; image_url: string | null; price: number | null };

type ClassModal   = { type: "class";    crowd: ClassCrowd; info: ClassInfo | null };
type VenueModal   = { type: "venue";    venueKey: string; label: string; level: number; programs: VenueProgram[]; entries: EventEntry[] };
type LiveModal    = { type: "live";     entries: EventEntry[] };
type LibraryModal = { type: "library";  level: number; clubs: LibClub[] };
type PinModal     = { type: "pin";      venueKey: string; label: string; level: number; pinInfo: PinInfo | null };
type DosoModal    = { type: "doso";     info: DosoInfo | null };
type MenuModal    = { type: "menu";     venueKey: string; label: string; level: number; items: MenuItem[] };
type Modal = ClassModal | VenueModal | LiveModal | LibraryModal | PinModal | DosoModal | MenuModal;

export default function MapPage() {
  const [classCrowds,   setClassCrowds]   = useState<ClassCrowd[]>([]);
  const [venueCrowds,   setVenueCrowds]   = useState<VenueCrowd[]>([]);
  const [classLayouts,  setClassLayouts]  = useState<ClassLayout[]>([]);
  const [venueLayouts,  setVenueLayouts]  = useState<VenueLayout[]>([]);
  const [classInfos,    setClassInfos]    = useState<ClassInfo[]>([]);
  const [liveEntries,   setLiveEntries]   = useState<EventEntry[]>([]);
  const [venueEvents,   setVenueEvents]   = useState<VenueEvent[]>([]);
  const [venuePrograms, setVenuePrograms] = useState<VenueProgram[]>([]);
  const [pinInfos,      setPinInfos]      = useState<PinInfo[]>([]);
  const [libClubs,      setLibClubs]      = useState<LibClub[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [lastUpdated,   setLastUpdated]   = useState<Date | null>(null);
  const [modal,         setModal]         = useState<Modal | null>(null);

  const loadData = useCallback(async () => {
    const t = Date.now();
    const [crowdRes, classLayoutRes, venueLayoutRes, classRes, liveRes, venueEvRes, venuePrgRes, pinInfoRes, libClubRes] = await Promise.all([
      fetch(`/api/crowd?type=all&_t=${t}`,              { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/map-layout?_t=${t}`,                  { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/map-layout?type=venue&_t=${t}`,       { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/classes?_t=${t}`,                     { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/event-entries?category=live&_t=${t}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/venue-events?_t=${t}`,                { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/venue-programs?_t=${t}`,              { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/pin-info?_t=${t}`,                    { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/library-clubs?_t=${t}`,               { cache: "no-store" }).then((r) => r.json()),
    ]);
    setClassCrowds(crowdRes.classes        ?? []);
    setVenueCrowds(crowdRes.venues         ?? []);
    setClassLayouts(classLayoutRes.layouts ?? []);
    setVenueLayouts(venueLayoutRes.layouts ?? []);
    setClassInfos(classRes.classes         ?? []);
    setLiveEntries(liveRes.entries         ?? []);
    setVenueEvents(venueEvRes.events       ?? []);
    setVenuePrograms(venuePrgRes.programs  ?? []);
    setPinInfos(pinInfoRes.items           ?? []);
    setLibClubs(libClubRes.clubs           ?? []);
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

  const openVenueModal = async (venueKey: string) => {
    const crowd    = venueCrowds.find((v) => v.venue_key === venueKey);
    const label    = VENUE_LABELS[venueKey] ?? venueKey;
    const programs = venuePrograms.filter((p) => p.venue_key === venueKey);
    // event_entriesも時系列で合わせる（gym/kinenkan/koryokan）
    const res      = await fetch(`/api/event-entries?_t=${Date.now()}`, { cache: "no-store" });
    const data     = await res.json();
    // venue_keyに対応するcategoryのentries（gym→nodojiman系、kinenkan→m1、koryokan→live）
    const VENUE_CATEGORIES: Record<string, string[]> = {
      gym:      ["nodojiman-1","nodojiman-2","nodojiman-3","coscon_performance","coscon_runway"],
      kinenkan: ["m1"],
      koryokan: ["live"],
    };
    const cats    = VENUE_CATEGORIES[venueKey] ?? [];
    const entries = (data.entries ?? []).filter((e: any) => cats.includes(e.category));
    setModal({ type: "venue", venueKey, label, level: crowd?.level ?? 0, programs, entries });
  };

  const openLiveModal = () => setModal({ type: "live", entries: liveEntries });

  const openLibraryModal = () => {
    const libCrowd = venueCrowds.find((v) => v.venue_key === "library");
    setModal({ type: "library", level: libCrowd?.level ?? 0, clubs: libClubs });
  };

  const openPinModal = (venueKey: string) => {
    const crowd   = venueCrowds.find((v) => v.venue_key === venueKey);
    const label   = VENUE_LABELS[venueKey] ?? venueKey;
    const pinInfo = pinInfos.find((p) => p.venue_key === venueKey) ?? null;
    setModal({ type: "pin", venueKey, label, level: crowd?.level ?? 0, pinInfo });
  };

  const openDosoModal = async () => {
    const res  = await fetch(`/api/doso-info?_t=${Date.now()}`, { cache: "no-store" });
    const data = await res.json();
    setModal({ type: "doso", info: data.info ?? null });
  };

  const openMenuModal = async (venueKey: string) => {
    const crowd = venueCrowds.find((v) => v.venue_key === venueKey);
    const label = VENUE_LABELS[venueKey] ?? venueKey;
    const res   = await fetch(`/api/menu-items?venueKey=${venueKey}&_t=${Date.now()}`, { cache: "no-store" });
    const data  = await res.json();
    setModal({ type: "menu", venueKey, label, level: crowd?.level ?? 0, items: data.items ?? [] });
  };

  const handleVenuePin = (venueKey: string) => {
    if (PIN_INFO_KEYS.includes(venueKey))  { openPinModal(venueKey); return; }
    if (venueKey === "doso")               { openDosoModal();         return; }
    if (MENU_KEYS.includes(venueKey))      { openMenuModal(venueKey); return; }
    if (venueKey === "library")            { openLibraryModal();      return; }
    if (venueKey === "koryokan")           { openLiveModal();         return; }
    openVenueModal(venueKey);
  };

  if (loading) return <main style={{ padding: "40px", textAlign: "center" }}><p style={{ color: "#aaa" }}>読み込み中...</p></main>;

  const schoolClassLayouts = classLayouts.filter((l) => !["将棋部","囲碁部"].includes(l.class_code));
  const koryoClassLayouts  = classLayouts.filter((l) => ["将棋部","囲碁部"].includes(l.class_code));
  const schoolVenueLayouts = venueLayouts.filter((l) => l.map_key === "school" || (!l.map_key && l.venue_key === "library"));
  const allVenueLayouts    = venueLayouts.filter((l) => l.map_key === "all");
  const koryoVenueLayouts  = venueLayouts.filter((l) => l.map_key === "koryo");

  const pinIcon = (venueKey: string) => {
    const crowd = venueCrowds.find((v) => v.venue_key === venueKey);
    return getCrowdIcon(crowd?.level ?? 0);
  };

  const modalOverlay: React.CSSProperties = { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: "20px" };
  const modalBox: React.CSSProperties     = { backgroundColor: "white", borderRadius: "16px", padding: "24px 20px", maxWidth: "380px", width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" };
  const closeBtn: React.CSSProperties     = { width: "100%", padding: "10px", fontSize: "14px", cursor: "pointer", backgroundColor: "#f5f5f5", color: "#555", border: "none", borderRadius: "8px", marginTop: "12px" };

  return (
    <>
      <main style={{ padding: "20px 16px 40px", maxWidth: "600px", margin: "0 auto" }}>
        <Link href="/" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "16px" }}>← ホームに戻る</Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h1 style={{ fontSize: "20px" }}>📍 マップ</h1>
          <button onClick={loadData} style={{ padding: "6px 14px", fontSize: "12px", cursor: "pointer", backgroundColor: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: "20px" }}>🔄 更新</button>
        </div>
        {lastUpdated && <p style={{ fontSize: "11px", color: "#aaa", marginBottom: "20px" }}>最終更新: {lastUpdated.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>}

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
          {schoolClassLayouts.map((layout) => {
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
          {schoolVenueLayouts.map((layout) => {
            const icon  = pinIcon(layout.venue_key);
            const label = VENUE_LABELS[layout.venue_key] ?? layout.venue_key;
            return (
              <div key={layout.venue_key} onClick={() => handleVenuePin(layout.venue_key)}
                style={{ position: "absolute", left: `${layout.x}%`, top: `${layout.y}%`, transform: "translate(-50%, -100%)", textAlign: "center", cursor: "pointer" }}>
                <img src={icon.src} alt={icon.label} style={{ width: "32px", height: "32px", objectFit: "contain", display: "block", margin: "0 auto" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div style={{ backgroundColor: icon.color, color: "white", borderRadius: "12px", padding: "2px 8px", fontSize: "10px", fontWeight: "bold", whiteSpace: "nowrap", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>{label}</div>
              </div>
            );
          })}
        </div>

        {/* 校内全体図 */}
        <h2 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "8px", color: "#333" }}>🏫 校内全体図</h2>
        <div style={{ position: "relative", width: "100%", marginBottom: "24px", border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden" }}>
          <img src="/venue-map-all.png" alt="校内全体図" style={{ width: "100%", display: "block" }} />
          {allVenueLayouts.map((layout) => {
            const icon  = pinIcon(layout.venue_key);
            const label = VENUE_LABELS[layout.venue_key] ?? layout.venue_key;
            return (
              <div key={layout.venue_key} onClick={() => handleVenuePin(layout.venue_key)}
                style={{ position: "absolute", left: `${layout.x}%`, top: `${layout.y}%`, transform: "translate(-50%, -100%)", textAlign: "center", cursor: "pointer" }}>
                <img src={icon.src} alt={icon.label} style={{ width: "36px", height: "36px", objectFit: "contain", display: "block", margin: "0 auto" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div style={{ backgroundColor: icon.color, color: "white", borderRadius: "12px", padding: "2px 8px", fontSize: "11px", fontWeight: "bold", whiteSpace: "nowrap", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>{label}</div>
              </div>
            );
          })}
        </div>

        {/* 蛟龍館マップ */}
        <h2 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "8px", color: "#333" }}>🏢 蛟龍館</h2>
        <div style={{ position: "relative", width: "100%", marginBottom: "32px", border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden" }}>
          <img src="/venue-map-koryokan.png" alt="蛟龍館マップ" style={{ width: "100%", display: "block" }} />
          {koryoVenueLayouts.map((layout) => {
            const icon  = pinIcon(layout.venue_key);
            const label = VENUE_LABELS[layout.venue_key] ?? layout.venue_key;
            return (
              <div key={layout.venue_key} onClick={() => handleVenuePin(layout.venue_key)}
                style={{ position: "absolute", left: `${layout.x}%`, top: `${layout.y}%`, transform: "translate(-50%, -100%)", textAlign: "center", cursor: "pointer" }}>
                <img src={icon.src} alt={icon.label} style={{ width: "36px", height: "36px", objectFit: "contain", display: "block", margin: "0 auto" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div style={{ backgroundColor: icon.color, color: "white", borderRadius: "12px", padding: "2px 8px", fontSize: "11px", fontWeight: "bold", whiteSpace: "nowrap", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>{label}</div>
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

        {/* 会場混雑一覧 */}
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

      {/* ── クラスモーダル ── */}
      {modal?.type === "class" && (
        <div onClick={() => setModal(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...modalBox, maxWidth: "340px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div>
                <p style={{ fontWeight: "bold", fontSize: "18px", margin: 0 }}>{modal.info?.label ?? modal.crowd.class_code}</p>
                <p style={{ color: "#888", fontSize: "13px", margin: "2px 0 0" }}>{modal.crowd.class_code}</p>
              </div>
              <span style={{ fontWeight: "bold", color: getCrowdIcon(modal.crowd.level).color, fontSize: "13px" }}>{getCrowdIcon(modal.crowd.level).label}</span>
            </div>
            {modal.info?.image_url
              ? <img src={modal.info.image_url} alt="" style={{ width: "100%", borderRadius: "10px", marginBottom: "12px" }} />
              : <img src={`/class-images/${modal.crowd.class_code}.png`} alt="" style={{ width: "100%", borderRadius: "10px", marginBottom: "12px" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            }
            <p style={{ fontSize: "14px", color: modal.info?.comment ? "#444" : "#bbb", lineHeight: "1.7", margin: "0 0 4px" }}>{modal.info?.comment || "コメントはありません"}</p>
            <button onClick={() => setModal(null)} style={closeBtn}>閉じる</button>
          </div>
        </div>
      )}

      {/* ── 体育館・記念館・ライブモーダル（部活動企画＋出場者を時系列） ── */}
      {modal?.type === "venue" && (
        <div onClick={() => setModal(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={modalBox}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>{modal.label}</h2>
              <span style={{ fontWeight: "bold", color: getCrowdIcon(modal.level).color, fontSize: "13px" }}>{getCrowdIcon(modal.level).label}</span>
            </div>
            {(() => {
              // 部活動企画とイベント出場者を時系列でマージ
              type Item = { datetime: string | null; kind: "program" | "entry"; data: VenueProgram | EventEntry };
              const items: Item[] = [
                ...modal.programs.map((p) => ({ datetime: p.datetime || null, kind: "program" as const, data: p })),
                ...modal.entries.map((e)  => ({ datetime: (e as EventEntry).datetime || null, kind: "entry"   as const, data: e })),
              ].sort((a, b) => {
                if (!a.datetime && !b.datetime) return 0;
                if (!a.datetime) return 1;
                if (!b.datetime) return -1;
                return a.datetime.localeCompare(b.datetime);
              });
              if (items.length === 0) return <p style={{ color: "#aaa", fontSize: "14px" }}>情報はまだありません</p>;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "4px" }}>
                  {items.map((item, i) => (
                    <div key={i} style={{ padding: "12px", backgroundColor: "#f9f9f9", borderRadius: "8px", border: "1px solid #eee" }}>
                      {item.kind === "program" ? (
                        <>
                          <p style={{ fontWeight: "bold", fontSize: "14px", margin: 0 }}>{(item.data as VenueProgram).name}</p>
                          {(item.data as VenueProgram).datetime && <p style={{ fontSize: "12px", color: "#1976d2", margin: "3px 0 0" }}>🕐 {(item.data as VenueProgram).datetime}</p>}
                          {(item.data as VenueProgram).comment  && <p style={{ fontSize: "13px", color: "#666", margin: "4px 0 0", lineHeight: "1.6" }}>{(item.data as VenueProgram).comment}</p>}
                        </>
                      ) : (
                        <>
                          {(item.data as EventEntry).image_url && <img src={(item.data as EventEntry).image_url!} alt={(item.data as EventEntry).name} style={{ width: "100%", borderRadius: "8px", marginBottom: "8px" }} />}
                          <p style={{ fontWeight: "bold", fontSize: "14px", margin: 0 }}>{(item.data as EventEntry).name}</p>
                          {(item.data as EventEntry).datetime    && <p style={{ fontSize: "12px", color: "#1976d2", margin: "3px 0 0" }}>🕐 {(item.data as EventEntry).datetime}</p>}
                          {(item.data as EventEntry).description && <p style={{ fontSize: "13px", color: "#666", margin: "4px 0 0" }}>{(item.data as EventEntry).description}</p>}
                          {(item.data as EventEntry).members     && <p style={{ fontSize: "12px", color: "#555", margin: "4px 0 0" }}>👥 {(item.data as EventEntry).members}</p>}
                          {(item.data as EventEntry).comment     && <p style={{ fontSize: "13px", color: "#888", margin: "4px 0 0", fontStyle: "italic" }}>"{(item.data as EventEntry).comment}"</p>}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
            <button onClick={() => setModal(null)} style={closeBtn}>閉じる</button>
          </div>
        </div>
      )}

      {/* ── ライブモーダル（koryokanピン直接タップ） ── */}
      {modal?.type === "live" && (
        <div onClick={() => setModal(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={modalBox}>
            <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px" }}>🎵 ライブ 出演者</h2>
            {modal.entries.length === 0 ? <p style={{ color: "#aaa", fontSize: "14px" }}>出演者情報はまだありません</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "4px" }}>
                {modal.entries.map((entry, i) => (
                  <div key={entry.id} style={{ borderBottom: "1px solid #f0f0f0", paddingBottom: "14px" }}>
                    {entry.image_url
                      ? <img src={entry.image_url} alt={entry.name} style={{ width: "100%", borderRadius: "10px", marginBottom: "8px" }} />
                      : <img src={`/live/${i + 1}.png`} alt={entry.name} style={{ width: "100%", borderRadius: "10px", marginBottom: "8px" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    }
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <span style={{ fontWeight: "bold", fontSize: "15px" }}>{entry.name}</span>
                      {entry.comment && <span style={{ fontSize: "13px", color: "#555", flex: 1, textAlign: "right" }}>{entry.comment}</span>}
                    </div>
                    {entry.members && <p style={{ fontSize: "12px", color: "#666", margin: "4px 0 0" }}>👥 {entry.members}</p>}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setModal(null)} style={closeBtn}>閉じる</button>
          </div>
        </div>
      )}

      {/* ── 図書館モーダル ── */}
      {modal?.type === "library" && (
        <div onClick={() => setModal(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={modalBox}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>📚 図書館</h2>
              <span style={{ fontWeight: "bold", color: getCrowdIcon(modal.level).color, fontSize: "13px" }}>{getCrowdIcon(modal.level).label}</span>
            </div>
            {modal.clubs.length === 0 ? <p style={{ color: "#aaa", fontSize: "14px" }}>情報はまだありません</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "4px" }}>
                {modal.clubs.map((c) => (
                  <div key={c.id} style={{ padding: "12px", backgroundColor: "#f9f9f9", borderRadius: "8px", border: "1px solid #eee" }}>
                    <p style={{ fontWeight: "bold", fontSize: "14px", margin: 0 }}>{c.name}</p>
                    {c.comment && <p style={{ fontSize: "13px", color: "#666", margin: "4px 0 0" }}>{c.comment}</p>}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setModal(null)} style={closeBtn}>閉じる</button>
          </div>
        </div>
      )}

      {/* ── ピン情報モーダル（科学物理部・鉄道研究部・クイズ研究会・茶道部・将棋部・囲碁部・剣道部・弓道部・應援團演舞） ── */}
      {modal?.type === "pin" && (
        <div onClick={() => setModal(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={modalBox}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>{modal.label}</h2>
              {modal.level !== undefined && <span style={{ fontWeight: "bold", color: getCrowdIcon(modal.level).color, fontSize: "13px" }}>{getCrowdIcon(modal.level).label}</span>}
            </div>
            {modal.pinInfo ? (
              <div style={{ marginBottom: "4px" }}>
                {modal.pinInfo.datetime && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px", padding: "8px 12px", backgroundColor: "#e3f2fd", borderRadius: "8px" }}>
                    <span style={{ fontSize: "16px" }}>🕐</span>
                    <span style={{ fontSize: "14px", color: "#1976d2", fontWeight: "bold" }}>{modal.pinInfo.datetime}</span>
                  </div>
                )}
                {modal.pinInfo.content && <p style={{ fontSize: "14px", color: "#444", lineHeight: "1.7", margin: 0 }}>{modal.pinInfo.content}</p>}
              </div>
            ) : (
              <p style={{ color: "#aaa", fontSize: "14px" }}>情報はまだありません</p>
            )}
            <button onClick={() => setModal(null)} style={closeBtn}>閉じる</button>
          </div>
        </div>
      )}

      {/* ── 同窓会モーダル ── */}
      {modal?.type === "doso" && (
        <div onClick={() => setModal(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={modalBox}>
            <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px" }}>🎓 同窓会</h2>
            {modal.info ? (
              <div style={{ marginBottom: "4px" }}>
                {modal.info.title    && <p style={{ fontWeight: "bold", fontSize: "16px", margin: "0 0 8px" }}>{modal.info.title}</p>}
                {modal.info.datetime && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px", padding: "8px 12px", backgroundColor: "#e3f2fd", borderRadius: "8px" }}>
                    <span style={{ fontSize: "16px" }}>🕐</span>
                    <span style={{ fontSize: "14px", color: "#1976d2", fontWeight: "bold" }}>{modal.info.datetime}</span>
                  </div>
                )}
                {modal.info.content && <p style={{ fontSize: "14px", color: "#444", lineHeight: "1.7", margin: 0 }}>{modal.info.content}</p>}
              </div>
            ) : (
              <p style={{ color: "#aaa", fontSize: "14px" }}>情報はまだありません</p>
            )}
            <button onClick={() => setModal(null)} style={closeBtn}>閉じる</button>
          </div>
        </div>
      )}

      {/* ── メニューモーダル（とんとん広場・サッカー部・模擬店） ── */}
      {modal?.type === "menu" && (
        <div onClick={() => setModal(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={modalBox}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>{modal.label}</h2>
              {modal.level !== undefined && <span style={{ fontWeight: "bold", color: getCrowdIcon(modal.level).color, fontSize: "13px" }}>{getCrowdIcon(modal.level).label}</span>}
            </div>
            {modal.items.length === 0 ? <p style={{ color: "#aaa", fontSize: "14px" }}>メニューはまだありません</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "4px" }}>
                {modal.items.map((m) => (
                  <div key={m.id} style={{ borderBottom: "1px solid #f0f0f0", paddingBottom: "12px" }}>
                    {m.image_url && <img src={m.image_url} alt={m.title} style={{ width: "100%", borderRadius: "8px", marginBottom: "8px", maxHeight: "180px", objectFit: "cover" }} />}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: "bold", fontSize: "15px" }}>{m.title}</span>
                      {m.price !== null && <span style={{ color: "#e10102", fontWeight: "bold", fontSize: "15px" }}>¥{m.price}</span>}
                    </div>
                    {m.description && <p style={{ fontSize: "13px", color: "#666", margin: "4px 0 0", lineHeight: "1.6" }}>{m.description}</p>}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setModal(null)} style={closeBtn}>閉じる</button>
          </div>
        </div>
      )}
    </>
  );
}
