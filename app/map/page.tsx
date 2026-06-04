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
  kyudo: "弓道部", nakaniwa: "中庭",
};

const PIN_INFO_KEYS  = ["science","tetsudo","quiz","tea","shogi","igo","kyudo"];
// ★修正: サンデリカをメニューキーに追加
const MENU_KEYS      = ["tontonhiroba","football","mockstore","sundelica"];
const VENUE_CATEGORIES: Record<string, string[]> = {
  gym:      ["nodojiman-1","nodojiman-2","nodojiman-3","coscon_performance","coscon_runway"],
  kinenkan: ["m1"],
  koryokan: ["live"],
};

// ★修正: イベントカテゴリのラベル
const CATEGORY_LABELS: Record<string, string> = {
  "nodojiman-1":        "🎤 のど自慢（1日目）",
  "nodojiman-2":        "🎤 のど自慢（2日目①）",
  "nodojiman-3":        "🎤 のど自慢（2日目②）",
  "coscon_performance": "👗 コスコン（パフォーマンス）",
  "coscon_runway":      "👠 コスコン（ランウェイ）",
  "m1":                 "🎭 M1",
  "live":               "🎵 ライブ",
};

type FestivalSettings = { day1_date: string; day2_date: string; display_mode: string };
type ClassCrowd   = { class_code: string; current: number; capacity: number; pct: number; level: number };
type VenueCrowd   = { venue_key: string; level: number; updated_at: string };
type ClassLayout  = { class_code: string; x: number; y: number };
type VenueLayout  = { venue_key: string; x: number; y: number; map_key?: string };
type ClassInfo    = { code: string; label: string; comment: string; image_url?: string };
type EventEntry   = { id: string; name: string; description: string; comment: string; datetime?: string; image_url?: string; members?: string; festival_day?: string; category?: string; order_num?: number };
type VenueProgram = { id: string; venue_key: string; name: string; datetime: string; comment: string; festival_day?: string; order_num?: number };
type PinInfo      = { venue_key: string; datetime: string; content: string };
type LibClub      = { id: string; name: string; comment: string };
type MenuItem     = { id: string; venue_key: string; title: string; description: string; image_url: string | null; price: number | null };

type ClassModal   = { type: "class";   crowd: ClassCrowd; info: ClassInfo | null };
type UnifiedItem =
  | { kind: "program";   data: VenueProgram; order_num: number }
  | { kind: "event_cat"; categoryKey: string; entries: EventEntry[]; order_num: number };
type VenueModal   = { type: "venue";   venueKey: string; label: string; level: number; programs: VenueProgram[]; entriesByCategory: Record<string, EventEntry[]>; venueEventItems: { id: string; venue_key: string; title: string; description: string }[]; unified: UnifiedItem[] };
type VenueSubModal = { type: "venue_sub"; categoryKey: string; entries: EventEntry[] };
type LiveModal    = { type: "live";    entries: EventEntry[] };
type LibraryModal = { type: "library"; venueKey?: string; level: number; clubs: LibClub[]; events: { id: string; venue_key: string; title: string; description: string }[] };
type PinModal     = { type: "pin";     venueKey: string; label: string; level: number; pinInfo: PinInfo | null };
type DosoModal    = { type: "doso";    info: { title: string; datetime: string; content: string } | null };
type MenuModal    = { type: "menu";    venueKey: string; label: string; level: number; items: MenuItem[]; venueTitle: string; venueDesc: string };
type Modal = ClassModal | VenueModal | VenueSubModal | LiveModal | LibraryModal | PinModal | DosoModal | MenuModal;

function filterByDay(items: { festival_day?: string }[], activeDay: "day1" | "day2" | "both") {
  if (activeDay === "both") return items;
  return items.filter((item) => {
    const fd = item.festival_day ?? "both";
    return fd === "both" || fd === activeDay;
  });
}

// ★修正: 1日目/2日目/両日を自動判別（nodojiman-1→day1, nodojiman-2/3→day2, etc.）
function inferFestivalDay(entry: EventEntry): "day1" | "day2" | "both" {
  if (entry.festival_day === "day1" || entry.festival_day === "day2" || entry.festival_day === "both") {
    return entry.festival_day;
  }
  const cat = entry.category ?? "";
  // ★修正: nodojiman-1→day1、nodojiman-2・nodojiman-3→day2（2日目①②はどちらも2日目）
  if (cat === "nodojiman-1") return "day1";
  if (cat === "nodojiman-2" || cat === "nodojiman-3") return "day2";
  return "both";
}

function detectActiveDay(settings: FestivalSettings): "day1" | "day2" | "both" {
  if (settings.display_mode === "day1") return "day1";
  if (settings.display_mode === "day2") return "day2";
  if (settings.display_mode === "both") return "both";
  const today = new Date();
  const todayStr = `${today.getMonth() + 1}月${today.getDate()}日`;
  if (settings.day1_date && todayStr === settings.day1_date) return "day1";
  if (settings.day2_date && todayStr === settings.day2_date) return "day2";
  return "both";
}

// ★修正: 日目バッジ（1日目/2日目のみ、重複表記なし）
function DayBadge({ fd }: { fd?: string }) {
  if (!fd || fd === "both") return null;
  const isDay1 = fd === "day1";
  return (
    <span style={{ fontSize: "10px", fontWeight: "bold", color: "white", backgroundColor: isDay1 ? "#1976d2" : "#e10102", borderRadius: "8px", padding: "1px 6px", marginLeft: "4px" }}>
      {isDay1 ? "1日目" : "2日目"}
    </span>
  );
}

export default function MapPage() {
  const [classCrowds,    setClassCrowds]    = useState<ClassCrowd[]>([]);
  const [venueCrowds,    setVenueCrowds]    = useState<VenueCrowd[]>([]);
  const [classLayouts,   setClassLayouts]   = useState<ClassLayout[]>([]);
  const [venueLayouts,   setVenueLayouts]   = useState<VenueLayout[]>([]);
  const [classInfos,     setClassInfos]     = useState<ClassInfo[]>([]);
  const [liveEntries,    setLiveEntries]    = useState<EventEntry[]>([]);
  const [venuePrograms,  setVenuePrograms]  = useState<VenueProgram[]>([]);
  const [venueAllEvents, setVenueAllEvents] = useState<{ id: string; venue_key: string; title: string; description: string }[]>([]);
  const [pinInfos,       setPinInfos]       = useState<PinInfo[]>([]);
  const [libClubs,       setLibClubs]       = useState<LibClub[]>([]);
  const [festivalSettings, setFestivalSettings] = useState<FestivalSettings>({ day1_date: "", day2_date: "", display_mode: "auto" });
  const [loading,        setLoading]        = useState(true);
  const [lastUpdated,    setLastUpdated]    = useState<Date | null>(null);
  const [modal,          setModal]          = useState<Modal | null>(null);
  const [prevModal,      setPrevModal]      = useState<Modal | null>(null); // サブモーダルから戻るため

  // モーダルを開く際に前のモーダルを保存するラッパー
  const openSubModal = (next: Modal) => {
    setPrevModal(modal);
    setModal(next);
  };
  const closeSubModal = () => {
    setModal(prevModal);
    setPrevModal(null);
  };

  const loadData = useCallback(async () => {
    const t = Date.now();
    const [crowdRes, classLayoutRes, venueLayoutRes, classRes, liveRes, venuePrgRes, pinInfoRes, libClubRes, festivalRes, venueEventsRes] = await Promise.all([
      fetch(`/api/crowd?type=all&_t=${t}`,              { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/map-layout?_t=${t}`,                  { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/map-layout?type=venue&_t=${t}`,       { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/classes?_t=${t}`,                     { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/event-entries?category=live&_t=${t}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/venue-programs?_t=${t}`,              { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/pin-info?_t=${t}`,                    { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/library-clubs?_t=${t}`,               { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/festival-settings?_t=${t}`,           { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/venue-events?_t=${t}`,                { cache: "no-store" }).then((r) => r.json()),
    ]);
    setClassCrowds(crowdRes.classes        ?? []);
    setVenueCrowds(crowdRes.venues         ?? []);
    setClassLayouts(classLayoutRes.layouts ?? []);
    // ouen(應援團演舞)・kendo(剣道部)はDBに残っていても表示しない
    const EXCLUDED_VENUES = ["ouen", "kendo"];
    setVenueLayouts((venueLayoutRes.layouts ?? []).filter(
      (l: { venue_key: string }) => !EXCLUDED_VENUES.includes(l.venue_key)
    ));
    setClassInfos(classRes.classes         ?? []);
    setLiveEntries(liveRes.entries         ?? []);
    setVenuePrograms(venuePrgRes.programs  ?? []);
    setPinInfos(pinInfoRes.items           ?? []);
    setLibClubs(libClubRes.clubs           ?? []);
    setVenueAllEvents(venueEventsRes.events ?? []);
    if (festivalRes.settings) setFestivalSettings(festivalRes.settings);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  const getCrowdIcon = (level: number) => CROWD_ICONS[level] ?? CROWD_ICONS[0];
  const activeDay    = detectActiveDay(festivalSettings);

  const openClassModal = (layout: ClassLayout) => {
    const crowd = classCrowds.find((c) => c.class_code === layout.class_code);
    const info  = classInfos.find((c) => c.code === layout.class_code) ?? null;
    if (!crowd) return;
    setModal({ type: "class", crowd, info });
  };

  const openVenueModal = async (venueKey: string) => {
    const crowd  = venueCrowds.find((v) => v.venue_key === venueKey);
    const label  = VENUE_LABELS[venueKey] ?? venueKey;
    const cats   = VENUE_CATEGORIES[venueKey] ?? [];

    const res    = await fetch(`/api/event-entries?_t=${Date.now()}`, { cache: "no-store" });
    const data   = await res.json();

    // 当日フィルタ済み部活動企画
    const programs = filterByDay(
      venuePrograms.filter((p) => p.venue_key === venueKey), activeDay
    ) as VenueProgram[];

    // 当日フィルタ済みイベント出場者
    const allEntries = (data.entries ?? []).filter((e: EventEntry) => cats.includes(e.category ?? ""));
    const filteredEntries = allEntries.filter((e: EventEntry) => {
      const fd = inferFestivalDay(e);
      return activeDay === "both" || fd === "both" || fd === activeDay;
    });

    // カテゴリ別マップ（サブモーダル用）
    const entriesByCategory: Record<string, EventEntry[]> = {};
    for (const cat of cats) {
      const catEntries = filteredEntries.filter((e: EventEntry) => e.category === cat);
      if (catEntries.length > 0) entriesByCategory[cat] = catEntries;
    }

    // ★ 部活動企画とイベントカテゴリを order_num で統合ソート
    // イベントカテゴリはカテゴリ内の最小 order_num を代表値にする
    type UnifiedItem =
      | { kind: "program"; data: VenueProgram; order_num: number }
      | { kind: "event_cat"; categoryKey: string; entries: EventEntry[]; order_num: number };

    const unified: UnifiedItem[] = [
      ...programs.map((p) => ({ kind: "program" as const, data: p, order_num: p.order_num ?? 0 })),
      ...Object.entries(entriesByCategory).map(([cat, entries]) => ({
        kind: "event_cat" as const,
        categoryKey: cat,
        entries,
        order_num: Math.min(...entries.map((e) => e.order_num ?? 0)),
      })),
    ].sort((a, b) => a.order_num - b.order_num);

    // venue_eventsのデータ（会場イベント管理で登録したもの）
    const venueEventItems = venueAllEvents.filter((e) => e.venue_key === venueKey);

    setModal({ type: "venue", venueKey, label, level: crowd?.level ?? 0, programs, entriesByCategory, venueEventItems, unified });
  };

  const openLiveModal = () => {
    const filtered = filterByDay(liveEntries, activeDay) as EventEntry[];
    setModal({ type: "live", entries: filtered });
  };

  const openLibraryModal = () => {
    const libCrowd  = venueCrowds.find((v) => v.venue_key === "library");
    // venue_eventsから図書館のデータを取得
    const libEvents = venueAllEvents.filter((e) => e.venue_key === "library");
    setModal({ type: "library", level: libCrowd?.level ?? 0, clubs: libClubs, events: libEvents });
  };

  const openPinModal = (venueKey: string) => {
    const crowd   = venueCrowds.find((v) => v.venue_key === venueKey);
    const pinInfo = pinInfos.find((p) => p.venue_key === venueKey) ?? null;
    setModal({ type: "pin", venueKey, label: VENUE_LABELS[venueKey] ?? venueKey, level: crowd?.level ?? 0, pinInfo });
  };

  const openDosoModal = async () => {
    const res  = await fetch(`/api/doso-info?_t=${Date.now()}`, { cache: "no-store" });
    const data = await res.json();
    setModal({ type: "doso", info: data.info ?? null });
  };

  const openMenuModal = async (venueKey: string) => {
    const crowd = venueCrowds.find((v) => v.venue_key === venueKey);
    const t = Date.now();
    const [itemsRes, infoRes] = await Promise.all([
      fetch(`/api/menu-items?venueKey=${venueKey}&_t=${t}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/menu-items?type=info&venueKey=${venueKey}&_t=${t}`, { cache: "no-store" }).then((r) => r.json()),
    ]);
    const info = (infoRes.infos ?? [])[0];
    setModal({
      type: "menu", venueKey, label: VENUE_LABELS[venueKey] ?? venueKey,
      level: crowd?.level ?? 0, items: itemsRes.items ?? [],
      venueTitle: info?.title ?? "", venueDesc: info?.description ?? "",
    });
  };

  // 中庭モーダル — venue_eventsで登録した情報を表示
  const openNakateiModal = () => {
    const crowd  = venueCrowds.find((v) => v.venue_key === "nakaniwa");
    const events = venueAllEvents.filter((e) => e.venue_key === "nakaniwa");
    setModal({ type: "library", venueKey: "nakaniwa", level: crowd?.level ?? 0, clubs: [], events });
  };

  const handleVenuePin = (venueKey: string) => {
    if (venueKey === "kyukei")              { return; } // 休憩所はピンのみ、モーダルなし
    if (venueKey === "nakaniwa")            { openNakateiModal();       return; }
    if (PIN_INFO_KEYS.includes(venueKey))  { openPinModal(venueKey);   return; }
    if (venueKey === "doso")               { openDosoModal();          return; }
    if (MENU_KEYS.includes(venueKey))      { openMenuModal(venueKey);  return; }
    if (venueKey === "library")            { openLibraryModal();       return; }
    if (venueKey === "koryokan")           { openLiveModal();          return; }
    openVenueModal(venueKey);
  };

  if (loading) return <main style={{ padding: "40px", textAlign: "center" }}><p style={{ color: "#aaa" }}>読み込み中...</p></main>;

  const schoolClassLayouts = classLayouts.filter((l) => !["将棋部","囲碁部"].includes(l.class_code));
  const koryoClassLayouts  = classLayouts.filter((l) => ["将棋部","囲碁部"].includes(l.class_code));
  const schoolVenueLayouts = venueLayouts.filter((l) => l.map_key === "school");
  const allVenueLayouts    = venueLayouts.filter((l) => l.map_key === "all");
  const koryoVenueLayouts  = venueLayouts.filter((l) => l.map_key === "koryo");

  const pinIcon = (venueKey: string) => {
    const crowd = venueCrowds.find((v) => v.venue_key === venueKey);
    return getCrowdIcon(crowd?.level ?? 0);
  };

  const activeDayLabel = activeDay === "day1" ? `1日目（${festivalSettings.day1_date}）` : activeDay === "day2" ? `2日目（${festivalSettings.day2_date}）` : "両日";

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
        {lastUpdated && <p style={{ fontSize: "11px", color: "#aaa", marginBottom: "6px" }}>最終更新: {lastUpdated.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>}
        <p style={{ fontSize: "11px", color: "#1976d2", marginBottom: "16px", fontWeight: "bold" }}>📅 表示中: {activeDayLabel}</p>

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
            return (
              <div key={layout.venue_key} onClick={() => handleVenuePin(layout.venue_key)}
                style={{ position: "absolute", left: `${layout.x}%`, top: `${layout.y}%`, transform: "translate(-50%, -100%)", textAlign: "center", cursor: "pointer" }}>
                <img src={icon.src} alt={icon.label} style={{ width: "32px", height: "32px", objectFit: "contain", display: "block", margin: "0 auto" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                {layout.venue_key !== "nakaniwa" && (
                  <div style={{ backgroundColor: icon.color, color: "white", borderRadius: "12px", padding: "2px 8px", fontSize: "10px", fontWeight: "bold", whiteSpace: "nowrap", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>{VENUE_LABELS[layout.venue_key] ?? layout.venue_key}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* 全体図 */}
        <h2 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "8px", color: "#333" }}>🏫 校内全体図</h2>
        <div style={{ position: "relative", width: "100%", marginBottom: "24px", border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden" }}>
          <img src="/venue-map-all.png" alt="校内全体図" style={{ width: "100%", display: "block" }} />
          {allVenueLayouts.map((layout) => {
            const icon = pinIcon(layout.venue_key);
            return (
              <div key={layout.venue_key} onClick={() => handleVenuePin(layout.venue_key)}
                style={{ position: "absolute", left: `${layout.x}%`, top: `${layout.y}%`, transform: "translate(-50%, -100%)", textAlign: "center", cursor: "pointer" }}>
                <img src={icon.src} alt={icon.label} style={{ width: "36px", height: "36px", objectFit: "contain", display: "block", margin: "0 auto" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                {layout.venue_key !== "nakaniwa" && (
                  <div style={{ backgroundColor: icon.color, color: "white", borderRadius: "12px", padding: "2px 8px", fontSize: "11px", fontWeight: "bold", whiteSpace: "nowrap", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>{VENUE_LABELS[layout.venue_key] ?? layout.venue_key}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* 蛟龍館 */}
        <h2 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "8px", color: "#333" }}>🏢 蛟龍館</h2>
        <div style={{ position: "relative", width: "100%", marginBottom: "32px", border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden" }}>
          <img src="/venue-map-koryokan.png" alt="蛟龍館マップ" style={{ width: "100%", display: "block" }} />
          {koryoVenueLayouts.map((layout) => {
            const icon = pinIcon(layout.venue_key);
            return (
              <div key={layout.venue_key} onClick={() => handleVenuePin(layout.venue_key)}
                style={{ position: "absolute", left: `${layout.x}%`, top: `${layout.y}%`, transform: "translate(-50%, -100%)", textAlign: "center", cursor: "pointer" }}>
                <img src={icon.src} alt={icon.label} style={{ width: "36px", height: "36px", objectFit: "contain", display: "block", margin: "0 auto" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div style={{ backgroundColor: icon.color, color: "white", borderRadius: "12px", padding: "2px 8px", fontSize: "11px", fontWeight: "bold", whiteSpace: "nowrap", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>{VENUE_LABELS[layout.venue_key] ?? layout.venue_key}</div>
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

      {/* クラスモーダル */}
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
            {/* ★修正: whiteSpace:pre-lineで改行反映 */}
            <p style={{ fontSize: "14px", color: modal.info?.comment ? "#444" : "#bbb", lineHeight: "1.7", margin: "0 0 4px", whiteSpace: "pre-line" }}>{modal.info?.comment || "コメントはありません"}</p>
            <button onClick={() => setModal(null)} style={closeBtn}>閉じる</button>
          </div>
        </div>
      )}

      {/* 体育館・記念館モーダル — unified order_num順で部活企画とイベントを混在表示 */}
      {modal?.type === "venue" && (
        <div onClick={() => setModal(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={modalBox}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>{modal.label}</h2>
              <span style={{ fontWeight: "bold", color: getCrowdIcon(modal.level).color, fontSize: "13px" }}>{getCrowdIcon(modal.level).label}</span>
            </div>
            <p style={{ fontSize: "11px", color: "#1976d2", marginBottom: "14px" }}>📅 {activeDayLabel}のプログラム</p>

            {/* 部活動企画とイベントをorder_num順で混在表示 */}
            {modal.unified.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
                {modal.unified.map((item, i) => {
                  if (item.kind === "program") {
                    const p = item.data;
                    return (
                      <div key={"p" + i} style={{ padding: "10px 12px", backgroundColor: "#f9f9f9", borderRadius: "8px", border: "1px solid #eee" }}>
                        <p style={{ fontWeight: "bold", fontSize: "14px", margin: 0 }}>{p.name}<DayBadge fd={p.festival_day} /></p>
                        {p.datetime && <p style={{ fontSize: "12px", color: "#1976d2", margin: "3px 0 0" }}>🕐 {p.datetime}</p>}
                        {p.comment  && <p style={{ fontSize: "13px", color: "#666", margin: "4px 0 0", lineHeight: "1.6", whiteSpace: "pre-line" }}>{p.comment}</p>}
                      </div>
                    );
                  } else {
                    const { categoryKey, entries } = item;
                    return (
                      <div key={"e" + i} style={{ padding: "10px 12px", backgroundColor: "#fff5f5", borderRadius: "8px", border: "1px solid #ffd0d0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <p style={{ fontWeight: "bold", fontSize: "13px", margin: 0, color: "#c62828" }}>{CATEGORY_LABELS[categoryKey] ?? categoryKey}</p>
                          <p style={{ fontSize: "12px", color: "#888", margin: "2px 0 0" }}>{entries.length}組 出場</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); openSubModal({ type: "venue_sub", categoryKey, entries }); }}
                          style={{ fontSize: "12px", color: "#e10102", background: "none", border: "1px solid #e10102", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", flexShrink: 0 }}>
                          詳細はこちら
                        </button>
                      </div>
                    );
                  }
                })}
              </div>
            ) : (
              <p style={{ color: "#aaa", fontSize: "14px", marginBottom: "14px" }}>この日のプログラムはまだありません</p>
            )}

            {/* 会場イベント（イベント管理→会場イベントで登録したもの）は下部に固定 */}
            {modal.venueEventItems.length > 0 && (
              <>
                <p style={{ fontSize: "12px", color: "#888", fontWeight: "bold", marginBottom: "6px" }}>📌 会場イベント</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
                  {modal.venueEventItems.map((ev) => (
                    <div key={ev.id} style={{ padding: "10px 12px", backgroundColor: "#f0f4ff", borderRadius: "8px", border: "1px solid #c5d5ff" }}>
                      <p style={{ fontWeight: "bold", fontSize: "14px", margin: 0 }}>{ev.title}</p>
                      {ev.description && <p style={{ fontSize: "13px", color: "#555", margin: "4px 0 0", whiteSpace: "pre-line" }}>{ev.description}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}

            <button onClick={() => setModal(null)} style={closeBtn}>閉じる</button>
          </div>
        </div>
      )}

      {/* ★新規: イベント詳細サブモーダル（前の画面に戻るボタン付き） */}
      {modal?.type === "venue_sub" && (
        <div onClick={() => setModal(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={modalBox}>
            <button
              onClick={(e) => { e.stopPropagation(); closeSubModal(); }}
              style={{ background: "none", border: "none", color: "#1976d2", fontSize: "13px", cursor: "pointer", padding: "0 0 12px", display: "flex", alignItems: "center", gap: "4px" }}
            >
              ← 前の画面に戻る
            </button>
            <h2 style={{ fontSize: "17px", fontWeight: "bold", marginBottom: "14px" }}>{CATEGORY_LABELS[modal.categoryKey] ?? modal.categoryKey}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "4px" }}>
              {modal.entries.map((entry) => (
                <div key={entry.id} style={{ padding: "12px", backgroundColor: "#f9f9f9", borderRadius: "8px", border: "1px solid #eee" }}>
                  {entry.image_url && <img src={entry.image_url} alt={entry.name} style={{ width: "100%", borderRadius: "8px", marginBottom: "8px" }} />}
                  <p style={{ fontWeight: "bold", fontSize: "14px", margin: 0 }}>
                    {entry.name}<DayBadge fd={inferFestivalDay(entry)} />
                  </p>
                  {entry.datetime    && <p style={{ fontSize: "12px", color: "#1976d2", margin: "3px 0 0" }}>🕐 {entry.datetime}</p>}
                  {entry.description && <p style={{ fontSize: "13px", color: "#666", margin: "4px 0 0" }}>{entry.description}</p>}
                  {entry.members     && <p style={{ fontSize: "12px", color: "#555", margin: "4px 0 0" }}>👥 {entry.members}</p>}
                  {entry.comment     && <p style={{ fontSize: "13px", color: "#888", margin: "4px 0 0", fontStyle: "italic", whiteSpace: "pre-line" }}>「{entry.comment}」</p>}
                </div>
              ))}
            </div>
            <button onClick={() => setModal(null)} style={closeBtn}>閉じる</button>
          </div>
        </div>
      )}

      {/* ライブモーダル */}
      {modal?.type === "live" && (
        <div onClick={() => setModal(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={modalBox}>
            <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "4px" }}>🎵 ライブ 出演者</h2>
            <p style={{ fontSize: "11px", color: "#1976d2", marginBottom: "14px" }}>📅 {activeDayLabel}</p>
            {modal.entries.length === 0 ? <p style={{ color: "#aaa", fontSize: "14px" }}>この日の出演者情報はまだありません</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "4px" }}>
                {modal.entries.map((entry, i) => (
                  <div key={entry.id} style={{ borderBottom: "1px solid #f0f0f0", paddingBottom: "14px" }}>
                    {entry.image_url
                      ? <img src={entry.image_url} alt={entry.name} style={{ width: "100%", borderRadius: "10px", marginBottom: "8px" }} />
                      : <img src={`/live/${i + 1}.png`} alt={entry.name} style={{ width: "100%", borderRadius: "10px", marginBottom: "8px" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    }
                    <p style={{ fontWeight: "bold", fontSize: "15px", margin: 0 }}>
                      {entry.name}<DayBadge fd={entry.festival_day} />
                    </p>
                    {entry.datetime && <p style={{ fontSize: "12px", color: "#1976d2", margin: "3px 0 0" }}>🕐 {entry.datetime}</p>}
                    {entry.members && <p style={{ fontSize: "12px", color: "#666", margin: "4px 0 0" }}>👥 {entry.members}</p>}
                    {/* ★修正: 一言表示・改行対応 */}
                    {entry.comment && <p style={{ fontSize: "13px", color: "#555", margin: "4px 0 0", whiteSpace: "pre-line" }}>{entry.comment}</p>}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setModal(null)} style={closeBtn}>閉じる</button>
          </div>
        </div>
      )}

      {/* 図書館モーダル */}
      {modal?.type === "library" && (
        <div onClick={() => setModal(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={modalBox}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>
                {modal.venueKey === "nakaniwa" ? "🌿 中庭" : "📚 図書館"}
              </h2>
              <span style={{ fontWeight: "bold", color: getCrowdIcon(modal.level).color, fontSize: "13px" }}>{getCrowdIcon(modal.level).label}</span>
            </div>

            {/* 会場イベント（イベント管理→会場イベントで登録したもの） */}
            {modal.events.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
                {modal.events.map((ev) => (
                  <div key={ev.id} style={{ padding: "12px", backgroundColor: "#f0f4ff", borderRadius: "8px", border: "1px solid #c5d5ff" }}>
                    <p style={{ fontWeight: "bold", fontSize: "14px", margin: 0 }}>{ev.title}</p>
                    {(ev as any).datetime && <p style={{ fontSize: "12px", color: "#1976d2", margin: "3px 0 0" }}>🕐 {(ev as any).datetime}</p>}
                    {ev.description && <p style={{ fontSize: "13px", color: "#555", margin: "4px 0 0", whiteSpace: "pre-line" }}>{ev.description}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* 図書館クラブ（library-clubsで登録したもの） */}
            {modal.clubs.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "4px" }}>
                {modal.clubs.map((c) => (
                  <div key={c.id} style={{ padding: "12px", backgroundColor: "#f9f9f9", borderRadius: "8px", border: "1px solid #eee" }}>
                    <p style={{ fontWeight: "bold", fontSize: "14px", margin: 0 }}>{c.name}</p>
                    {c.comment && <p style={{ fontSize: "13px", color: "#666", margin: "4px 0 0", whiteSpace: "pre-line" }}>{c.comment}</p>}
                  </div>
                ))}
              </div>
            )}

            {modal.events.length === 0 && modal.clubs.length === 0 && (
              <p style={{ color: "#aaa", fontSize: "14px" }}>情報はまだありません</p>
            )}
            <button onClick={() => setModal(null)} style={closeBtn}>閉じる</button>
          </div>
        </div>
      )}

      {/* ピン情報モーダル */}
      {modal?.type === "pin" && (
        <div onClick={() => setModal(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={modalBox}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>{modal.label}</h2>
              <span style={{ fontWeight: "bold", color: getCrowdIcon(modal.level).color, fontSize: "13px" }}>{getCrowdIcon(modal.level).label}</span>
            </div>
            {modal.pinInfo ? (
              <div style={{ marginBottom: "4px" }}>
                {modal.pinInfo.datetime && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px", padding: "8px 12px", backgroundColor: "#e3f2fd", borderRadius: "8px" }}>
                    <span style={{ fontSize: "16px" }}>🕐</span>
                    <span style={{ fontSize: "14px", color: "#1976d2", fontWeight: "bold" }}>{modal.pinInfo.datetime}</span>
                  </div>
                )}
                {modal.pinInfo.content && <p style={{ fontSize: "14px", color: "#444", lineHeight: "1.7", margin: 0, whiteSpace: "pre-line" }}>{modal.pinInfo.content}</p>}
              </div>
            ) : (
              <p style={{ color: "#aaa", fontSize: "14px" }}>情報はまだありません</p>
            )}
            <button onClick={() => setModal(null)} style={closeBtn}>閉じる</button>
          </div>
        </div>
      )}

      {/* 同窓会モーダル */}
      {modal?.type === "doso" && (
        <div onClick={() => setModal(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={modalBox}>
            <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px" }}>🎓 同窓会</h2>
            {modal.info ? (
              <div style={{ marginBottom: "4px" }}>
                {modal.info.title    && <p style={{ fontWeight: "bold", fontSize: "16px", margin: "0 0 8px" }}>{modal.info.title}</p>}
                {modal.info.datetime && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px", padding: "8px 12px", backgroundColor: "#e3f2fd", borderRadius: "8px" }}>
                    <span>🕐</span>
                    <span style={{ fontSize: "14px", color: "#1976d2", fontWeight: "bold" }}>{modal.info.datetime}</span>
                  </div>
                )}
                {modal.info.content && <p style={{ fontSize: "14px", color: "#444", lineHeight: "1.7", margin: 0, whiteSpace: "pre-line" }}>{modal.info.content}</p>}
              </div>
            ) : (
              <p style={{ color: "#aaa", fontSize: "14px" }}>情報はまだありません</p>
            )}
            <button onClick={() => setModal(null)} style={closeBtn}>閉じる</button>
          </div>
        </div>
      )}

      {/* メニューモーダル（サンデリカ含む） */}
      {modal?.type === "menu" && (
        <div onClick={() => setModal(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={modalBox}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>{modal.venueTitle || modal.label}</h2>
              <span style={{ fontWeight: "bold", color: getCrowdIcon(modal.level).color, fontSize: "13px" }}>{getCrowdIcon(modal.level).label}</span>
            </div>
            {/* ★修正: 会場タイトルと一言を表示 */}
            {modal.venueDesc && (
              <p style={{ fontSize: "13px", color: "#666", marginBottom: "14px", lineHeight: "1.6", whiteSpace: "pre-line" }}>{modal.venueDesc}</p>
            )}
            {!modal.venueDesc && <div style={{ marginBottom: "14px" }} />}
            {modal.items.length === 0 ? <p style={{ color: "#aaa", fontSize: "14px" }}>メニューはまだありません</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "4px" }}>
                {modal.items.map((m) => (
                  <div key={m.id} style={{ borderBottom: "1px solid #f0f0f0", paddingBottom: "12px" }}>
                    {m.image_url && <img src={m.image_url} alt={m.title} style={{ width: "100%", borderRadius: "8px", marginBottom: "8px", maxHeight: "180px", objectFit: "cover" }} />}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: "bold", fontSize: "15px" }}>{m.title}</span>
                      {m.price !== null && <span style={{ color: "#e10102", fontWeight: "bold", fontSize: "15px" }}>¥{m.price}</span>}
                    </div>
                    {m.description && <p style={{ fontSize: "13px", color: "#666", margin: "4px 0 0", lineHeight: "1.6", whiteSpace: "pre-line" }}>{m.description}</p>}
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
