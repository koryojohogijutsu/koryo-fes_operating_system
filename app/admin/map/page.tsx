"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Class = { code: string; label: string };
type LayoutItem = {
  class_code: string; label: string; x: number; y: number;
  capacity: number; stay_minutes: number; thresh_mid: number; thresh_high: number; thresh_full: number;
};
type VenueLayoutItem = { venue_key: string; label: string; pinLabel: string; x: number; y: number; mapKey: string };

const VENUE_DEFAULTS: Omit<VenueLayoutItem, "mapKey">[] = [
  { venue_key: "gym",          label: "体育館",       pinLabel: "体育館",         x: -1, y: -1 },
  { venue_key: "kinenkan",     label: "記念館",       pinLabel: "記念館",         x: -1, y: -1 },
  { venue_key: "koryokan",     label: "ライブ",       pinLabel: "ライブ",         x: -1, y: -1 },
  { venue_key: "sundelica",    label: "サンデリカ",   pinLabel: "サンデリカ",     x: -1, y: -1 },
  { venue_key: "football",     label: "サッカー部",   pinLabel: "サッカー部",     x: -1, y: -1 },
  { venue_key: "tontonhiroba", label: "とんとん広場", pinLabel: "とんとん
広場", x: -1, y: -1 },
  { venue_key: "library",      label: "図書館",       pinLabel: "図書館",         x: -1, y: -1 },
  { venue_key: "tea",          label: "茶道部",       pinLabel: "茶道部",         x: -1, y: -1 },
  { venue_key: "science",      label: "科学物理部",   pinLabel: "科学
物理部",   x: -1, y: -1 },
  { venue_key: "tetsudo",      label: "鉄道研究部",   pinLabel: "鉄道
研究部",   x: -1, y: -1 },
  { venue_key: "quiz",         label: "クイズ研究会", pinLabel: "クイズ
研究会", x: -1, y: -1 },
  { venue_key: "bazar",        label: "バザー",       pinLabel: "バザー",         x: -1, y: -1 },
  { venue_key: "doso",         label: "同窓会",       pinLabel: "同窓会",         x: -1, y: -1 },
  { venue_key: "shogi",        label: "将棋部",       pinLabel: "将棋部",         x: -1, y: -1 },
  { venue_key: "igo",          label: "囲碁部",       pinLabel: "囲碁部",         x: -1, y: -1 },
  { venue_key: "kyukei",       label: "休憩所",       pinLabel: "休憩所",         x: -1, y: -1 },
  { venue_key: "kendo",        label: "剣道部",       pinLabel: "剣道部",         x: -1, y: -1 },
  { venue_key: "kyudo",        label: "弓道部",       pinLabel: "弓道部",         x: -1, y: -1 },
  { venue_key: "ouen",         label: "應援團演舞",   pinLabel: "應援團
演舞",   x: -1, y: -1 },
  { venue_key: "mockstore",    label: "模擬店",       pinLabel: "模擬店",         x: -1, y: -1 },
];

const KORYO_CLASSES = ["将棋部", "囲碁部"];
type MapId = "school" | "all" | "koryo";
type DragState = { key: string; kind: "class" | "venue"; fromList: boolean; fromMap?: MapId };

export default function AdminMapPage() {
  const router = useRouter();
  const schoolMapRef = useRef<HTMLDivElement>(null);
  const allMapRef    = useRef<HTMLDivElement>(null);
  const koryoMapRef  = useRef<HTMLDivElement>(null);
  const unplacedRef  = useRef<HTMLDivElement>(null);
  const mapRefs: Record<MapId, React.RefObject<HTMLDivElement>> = { school: schoolMapRef, all: allMapRef, koryo: koryoMapRef };

  const [authed,       setAuthed]       = useState(false);
  const [layouts,      setLayouts]      = useState<LayoutItem[]>([]);
  const [venueLayouts, setVenueLayouts] = useState<VenueLayoutItem[]>(VENUE_DEFAULTS.map((v) => ({ ...v, mapKey: "" })));
  const [selected,     setSelected]     = useState<string | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [isDirty,      setIsDirty]      = useState(false);

  const draggingRef = useRef<DragState | null>(null);
  const dragOffset  = useRef({ ox: 0, oy: 0 });
  const [ghostPos,  setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate((n) => n + 1);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => { if (!isDirty) return; e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const handleNavAway = useCallback((e: React.MouseEvent) => {
    if (isDirty && !confirm("保存されていない変更があります。このページを離れますか？")) e.preventDefault();
  }, [isDirty]);

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") { router.push("/admin/login"); return; }
    setAuthed(true);
    Promise.all([
      fetch("/api/classes",               { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/map-layout",            { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/map-layout?type=venue", { cache: "no-store" }).then((r) => r.json()),
    ]).then(([classData, layoutData, venueData]) => {
      const cls: Class[] = classData.classes ?? [];
      const savedLayouts = layoutData.layouts ?? [];
      const savedVenue   = venueData.layouts  ?? [];
      setLayouts(cls.map((c) => {
        const ex = savedLayouts.find((l: any) => l.class_code === c.code);
        return ex ? { ...ex, label: c.label } : { class_code: c.code, label: c.label, x: -1, y: -1, capacity: 30, stay_minutes: 60, thresh_mid: 50, thresh_high: 75, thresh_full: 90 };
      }));
      setVenueLayouts(VENUE_DEFAULTS.map((v) => {
        const ex = savedVenue.find((s: any) => s.venue_key === v.venue_key);
        return ex ? { ...v, x: ex.x, y: ex.y, mapKey: ex.map_key ?? "all" } : { ...v, mapKey: "" };
      }));
    });
  }, [router]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (!draggingRef.current) return; setGhostPos({ x: e.clientX, y: e.clientY }); };
    const onUp   = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      tryDropOnMap(e.clientX, e.clientY);
      draggingRef.current = null; setGhostPos(null); rerender();
    };
    const onTouchMove = (e: TouchEvent) => { if (!draggingRef.current) return; e.preventDefault(); const t = e.touches[0]; setGhostPos({ x: t.clientX, y: t.clientY }); };
    const onTouchEnd  = (e: TouchEvent) => {
      if (!draggingRef.current) return;
      const t = e.changedTouches[0]; tryDropOnMap(t.clientX, t.clientY);
      draggingRef.current = null; setGhostPos(null); rerender();
    };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false }); window.addEventListener("touchend", onTouchEnd);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); window.removeEventListener("touchmove", onTouchMove); window.removeEventListener("touchend", onTouchEnd); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layouts, venueLayouts]);

  const tryDropOnMap = (clientX: number, clientY: number) => {
    const drag = draggingRef.current;
    if (!drag) return;
    // 未配置エリアにドロップ → 配置を外す（会場ピンのみ）
    if (drag.kind === "venue" && unplacedRef.current) {
      const r = unplacedRef.current.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        setVenueLayouts((prev) => prev.map((v) => v.venue_key === drag.key ? { ...v, x: -1, y: -1, mapKey: "" } : v));
        setSelected(null); setIsDirty(true); return;
      }
    }
    const mapIds: MapId[] = ["school", "all", "koryo"];
    for (const mapId of mapIds) {
      const ref = mapRefs[mapId];
      if (!ref.current) continue;
      const rect = ref.current.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) continue;
      const x = ((clientX - rect.left) / rect.width)  * 100;
      const y = ((clientY - rect.top)  / rect.height) * 100;
      if (drag.kind === "class") { setLayouts((prev) => prev.map((l) => l.class_code === drag.key ? { ...l, x, y } : l)); }
      else { setVenueLayouts((prev) => prev.map((v) => v.venue_key === drag.key ? { ...v, x, y, mapKey: mapId } : v)); }
      setSelected(drag.key); setIsDirty(true); return;
    }
  };

  const startMapDrag = (key: string, kind: "class" | "venue", curX: number, curY: number, clientX: number, clientY: number, fromMap: MapId) => {
    const ref = mapRefs[fromMap];
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    dragOffset.current = { ox: clientX - rect.left - (curX / 100) * rect.width, oy: clientY - rect.top - (curY / 100) * rect.height };
    draggingRef.current = { key, kind, fromList: false, fromMap };
    setSelected(key);
  };

  const moveMapDrag = (ref: React.RefObject<HTMLDivElement>, mapId: MapId, clientX: number, clientY: number) => {
    const drag = draggingRef.current;
    if (!drag || drag.fromList || drag.fromMap !== mapId || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left - dragOffset.current.ox) / rect.width)  * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top  - dragOffset.current.oy) / rect.height) * 100));
    if (drag.kind === "class") { setLayouts((prev) => prev.map((l) => l.class_code === drag.key ? { ...l, x, y } : l)); }
    else { setVenueLayouts((prev) => prev.map((v) => v.venue_key === drag.key ? { ...v, x, y } : v)); }
    setIsDirty(true);
  };

  const endMapDrag = () => { if (draggingRef.current && !draggingRef.current.fromList) { draggingRef.current = null; rerender(); } };
  const startListDrag = (key: string, kind: "class" | "venue") => { draggingRef.current = { key, kind, fromList: true }; rerender(); };

  const handleSave = async () => {
    setSaving(true);
    await Promise.all([
      fetch("/api/map-layout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ layouts: layouts.filter((l) => l.x >= 0 && l.y >= 0) }) }),
      fetch("/api/map-layout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "venue", layouts: venueLayouts.filter((l) => l.x >= 0 && l.y >= 0).map((l) => ({ venue_key: l.venue_key, x: l.x, y: l.y, map_key: l.mapKey })) }) }),
    ]);
    setSaving(false); setSaved(true); setIsDirty(false); setTimeout(() => setSaved(false), 2000);
  };

  const updateSelected = (key: keyof LayoutItem, value: number) => {
    if (!selected) return;
    setLayouts((prev) => prev.map((l) => l.class_code === selected ? { ...l, [key]: value } : l));
    setIsDirty(true);
  };

  const selectedItem    = layouts.find((l) => l.class_code === selected);
  const unplacedClasses = layouts.filter((l) => l.x < 0 || l.y < 0);
  const unplacedVenues  = venueLayouts.filter((v) => v.x < 0 || v.y < 0);
  const schoolClassPins = layouts.filter((l) => l.x >= 0 && l.y >= 0 && !KORYO_CLASSES.includes(l.class_code));
  const schoolVenuePins = venueLayouts.filter((v) => v.x >= 0 && v.y >= 0 && v.mapKey === "school");
  const allVenuePins    = venueLayouts.filter((v) => v.x >= 0 && v.y >= 0 && v.mapKey === "all");
  const koryoVenuePins  = venueLayouts.filter((v) => v.x >= 0 && v.y >= 0 && v.mapKey === "koryo");
  const koryoClassPins  = layouts.filter((l) => l.x >= 0 && l.y >= 0 && KORYO_CLASSES.includes(l.class_code));

  const isDragging     = !!draggingRef.current;
  const dragKey        = draggingRef.current?.key;
  const isCrossMapDrag = isDragging && draggingRef.current?.fromMap !== undefined;

  const pinStyle = (key: string, isSelected: boolean, color = "#e10102"): React.CSSProperties => ({
    position: "absolute", transform: "translate(-50%, -50%)",
    backgroundColor: isSelected ? "#1976d2" : color,
    color: "white", borderRadius: "10px", padding: "3px 7px",
    fontSize: "9px", fontWeight: "bold", cursor: "grab",
    boxShadow: isSelected ? "0 0 0 3px #90caf9" : "0 2px 6px rgba(0,0,0,0.3)",
    whiteSpace: "pre-line", textAlign: "center",
    zIndex: isSelected ? 10 : 1, touchAction: "none", lineHeight: "1.3",
    opacity: (isCrossMapDrag && dragKey === key) ? 0.3 : 1,
  });

  const mapContainer: React.CSSProperties = {
    position: "relative", userSelect: "none", border: "2px solid #ddd",
    borderRadius: "8px", overflow: "hidden", cursor: isDragging ? "copy" : "default", flex: 1, minWidth: 0,
  };

  if (!authed) return null;

  return (
    <main style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <Link href="/admin" onClick={handleNavAway} style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "16px" }}>← 管理者メニュー</Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h1 style={{ fontSize: "20px", margin: 0 }}>🗺️ 混雑マップ設定</h1>
        {isDirty && <span style={{ fontSize: "12px", color: "#ff9800", fontWeight: "bold", backgroundColor: "#fff8e1", padding: "4px 10px", borderRadius: "20px", border: "1px solid #ffe082" }}>● 未保存の変更あり</span>}
      </div>

      {/* 未配置ピン一覧（常に表示） */}
      <div ref={unplacedRef} style={{ marginBottom: "20px", padding: "14px 16px", backgroundColor: isDragging && draggingRef.current?.kind === "venue" && !draggingRef.current?.fromList ? "#fff3cd" : "#fff8e1", borderRadius: "10px", border: isDragging && draggingRef.current?.kind === "venue" && !draggingRef.current?.fromList ? "2px dashed #ff9800" : "1px solid #ffe082", transition: "all .15s" }}>
        <p style={{ fontSize: "12px", color: "#b8860b", fontWeight: "bold", marginBottom: "10px" }}>未配置のピン — 任意の地図にドラッグ / 配置済み会場ピンをここにドロップすると未配置に戻します</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", minHeight: "32px" }}>
          {unplacedClasses.map((l) => (
            <div key={l.class_code} onMouseDown={() => startListDrag(l.class_code, "class")} onTouchStart={() => startListDrag(l.class_code, "class")}
              style={{ padding: "6px 12px", backgroundColor: dragKey === l.class_code ? "#b71c1c" : "#e10102", color: "white", borderRadius: "20px", fontSize: "13px", fontWeight: "bold", cursor: "grab", userSelect: "none", touchAction: "none", opacity: dragKey === l.class_code ? 0.4 : 1 }}>
              {l.class_code}
            </div>
          ))}
          {unplacedVenues.map((v) => (
            <div key={v.venue_key} onMouseDown={() => startListDrag(v.venue_key, "venue")} onTouchStart={() => startListDrag(v.venue_key, "venue")}
              style={{ padding: "6px 12px", backgroundColor: dragKey === v.venue_key ? "#4a148c" : "#7b1fa2", color: "white", borderRadius: "20px", fontSize: "13px", fontWeight: "bold", cursor: "grab", userSelect: "none", touchAction: "none", opacity: dragKey === v.venue_key ? 0.4 : 1 }}>
              {v.label}
            </div>
          ))}
          {unplacedClasses.length === 0 && unplacedVenues.length === 0 && <p style={{ fontSize: "12px", color: "#ccc", margin: 0, lineHeight: "32px" }}>すべて配置済みです</p>}
        </div>
        <p style={{ fontSize: "11px", color: "#999", marginTop: "10px" }}>赤 = クラス企画　紫 = 会場ピン　※どの地図にもドロップできます・配置済みピンも別の地図へ移動可</p>
      </div>

      {/* 3枚の地図を横並び */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", alignItems: "flex-start" }}>

        {/* 校舎マップ */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px", color: "#333" }}>🏫 校舎</p>
          <div ref={schoolMapRef} style={mapContainer}
            onMouseMove={(e) => moveMapDrag(schoolMapRef, "school", e.clientX, e.clientY)}
            onMouseUp={endMapDrag} onMouseLeave={endMapDrag}
            onTouchMove={(e) => { const t = e.touches[0]; moveMapDrag(schoolMapRef, "school", t.clientX, t.clientY); }}
            onTouchEnd={endMapDrag}>
            <img src="/map.png" alt="校舎マップ" style={{ width: "100%", display: "block" }} draggable={false} />
            {schoolClassPins.map((l) => (
              <div key={l.class_code}
                onMouseDown={(e) => { e.preventDefault(); startMapDrag(l.class_code, "class", l.x, l.y, e.clientX, e.clientY, "school"); }}
                onTouchStart={(e) => { const t = e.touches[0]; startMapDrag(l.class_code, "class", l.x, l.y, t.clientX, t.clientY, "school"); }}
                onClick={() => setSelected(l.class_code)}
                style={{ ...pinStyle(l.class_code, selected === l.class_code, "#e10102"), left: `${l.x}%`, top: `${l.y}%` }}>
                {l.class_code}
              </div>
            ))}
            {schoolVenuePins.map((v) => (
              <div key={v.venue_key}
                onMouseDown={(e) => { e.preventDefault(); startMapDrag(v.venue_key, "venue", v.x, v.y, e.clientX, e.clientY, "school"); }}
                onTouchStart={(e) => { const t = e.touches[0]; startMapDrag(v.venue_key, "venue", v.x, v.y, t.clientX, t.clientY, "school"); }}
                style={{ ...pinStyle(v.venue_key, selected === v.venue_key, "#1976d2"), left: `${v.x}%`, top: `${v.y}%` }}>
                {v.pinLabel}
              </div>
            ))}
          </div>
        </div>

        {/* 全体図 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px", color: "#333" }}>🏫 全体図</p>
          <div ref={allMapRef} style={mapContainer}
            onMouseMove={(e) => moveMapDrag(allMapRef, "all", e.clientX, e.clientY)}
            onMouseUp={endMapDrag} onMouseLeave={endMapDrag}
            onTouchMove={(e) => { const t = e.touches[0]; moveMapDrag(allMapRef, "all", t.clientX, t.clientY); }}
            onTouchEnd={endMapDrag}>
            <img src="/venue-map-all.png" alt="全体図" style={{ width: "100%", display: "block" }} draggable={false} />
            {allVenuePins.map((v) => (
              <div key={v.venue_key}
                onMouseDown={(e) => { e.preventDefault(); startMapDrag(v.venue_key, "venue", v.x, v.y, e.clientX, e.clientY, "all"); }}
                onTouchStart={(e) => { const t = e.touches[0]; startMapDrag(v.venue_key, "venue", v.x, v.y, t.clientX, t.clientY, "all"); }}
                style={{ ...pinStyle(v.venue_key, selected === v.venue_key, "#1976d2"), left: `${v.x}%`, top: `${v.y}%` }}>
                {v.pinLabel}
              </div>
            ))}
          </div>
        </div>

        {/* 蛟龍館 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px", color: "#333" }}>🏢 蛟龍館</p>
          <div ref={koryoMapRef} style={mapContainer}
            onMouseMove={(e) => moveMapDrag(koryoMapRef, "koryo", e.clientX, e.clientY)}
            onMouseUp={endMapDrag} onMouseLeave={endMapDrag}
            onTouchMove={(e) => { const t = e.touches[0]; moveMapDrag(koryoMapRef, "koryo", t.clientX, t.clientY); }}
            onTouchEnd={endMapDrag}>
            <img src="/venue-map-koryokan.png" alt="蛟龍館" style={{ width: "100%", display: "block" }} draggable={false} />
            {koryoVenuePins.map((v) => (
              <div key={v.venue_key}
                onMouseDown={(e) => { e.preventDefault(); startMapDrag(v.venue_key, "venue", v.x, v.y, e.clientX, e.clientY, "koryo"); }}
                onTouchStart={(e) => { const t = e.touches[0]; startMapDrag(v.venue_key, "venue", v.x, v.y, t.clientX, t.clientY, "koryo"); }}
                style={{ ...pinStyle(v.venue_key, selected === v.venue_key, "#1976d2"), left: `${v.x}%`, top: `${v.y}%` }}>
                {v.pinLabel}
              </div>
            ))}
            {koryoClassPins.map((l) => (
              <div key={l.class_code}
                onMouseDown={(e) => { e.preventDefault(); startMapDrag(l.class_code, "class", l.x, l.y, e.clientX, e.clientY, "koryo"); }}
                onTouchStart={(e) => { const t = e.touches[0]; startMapDrag(l.class_code, "class", l.x, l.y, t.clientX, t.clientY, "koryo"); }}
                onClick={() => setSelected(l.class_code)}
                style={{ ...pinStyle(l.class_code, selected === l.class_code, "#e10102"), left: `${l.x}%`, top: `${l.y}%` }}>
                {l.class_code}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 選択中クラスの設定 */}
      {selectedItem && (
        <div style={{ marginBottom: "20px", padding: "16px", border: "2px solid #1976d2", borderRadius: "10px", backgroundColor: "#f8f9ff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "16px", color: "#1976d2", margin: 0 }}>⚙️ {selectedItem.class_code}（{selectedItem.label}）の設定</h2>
            <button onClick={() => { setLayouts((prev) => prev.map((l) => l.class_code === selectedItem.class_code ? { ...l, x: -1, y: -1 } : l)); setSelected(null); setIsDirty(true); }}
              style={{ padding: "4px 12px", fontSize: "12px", cursor: "pointer", backgroundColor: "#f5f5f5", color: "#888", border: "1px solid #ddd", borderRadius: "8px" }}>✕ 配置を外す</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            {([
              { key: "capacity",     label: "定員（人）" },
              { key: "stay_minutes", label: "滞在時間（分）" },
              { key: "thresh_mid",   label: "やや混雑（%）" },
              { key: "thresh_high",  label: "混雑（%）" },
              { key: "thresh_full",  label: "大変混雑（%）" },
            ] as { key: keyof LayoutItem; label: string }[]).map(({ key, label }) => (
              <label key={key} style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", color: "#555" }}>
                <span>{label}</span>
                <input type="number" min={1} value={(selectedItem as any)[key]}
                  onChange={(e) => updateSelected(key, Number(e.target.value))}
                  style={{ padding: "8px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", width: "100%", boxSizing: "border-box" as const }} />
              </label>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleSave} disabled={saving}
        style={{ width: "100%", padding: "14px", fontSize: "16px", fontWeight: "bold", cursor: saving ? "not-allowed" : "pointer", backgroundColor: saved ? "#4caf50" : "#e10102", color: "white", border: "none", borderRadius: "8px" }}>
        {saving ? "保存中..." : saved ? "✅ 保存しました" : "配置・設定を保存する"}
      </button>

      {/* ゴースト */}
      {ghostPos && draggingRef.current && (() => {
        const drag  = draggingRef.current!;
        const label = drag.kind === "class" ? layouts.find((l) => l.class_code === drag.key)?.class_code ?? drag.key : venueLayouts.find((v) => v.venue_key === drag.key)?.label ?? drag.key;
        const color = drag.kind === "class" ? "#e10102" : "#7b1fa2";
        if (!drag.fromList && drag.fromMap !== undefined) {
          const ref = mapRefs[drag.fromMap!];
          if (ref.current) {
            const r = ref.current.getBoundingClientRect();
            if (ghostPos.x >= r.left && ghostPos.x <= r.right && ghostPos.y >= r.top && ghostPos.y <= r.bottom) return null;
          }
        }
        return (
          <div style={{ position: "fixed", left: ghostPos.x, top: ghostPos.y, transform: "translate(-50%, -50%)", backgroundColor: color, color: "white", borderRadius: "20px", padding: "4px 12px", fontSize: "12px", fontWeight: "bold", pointerEvents: "none", zIndex: 9999, opacity: 0.85, boxShadow: "0 4px 12px rgba(0,0,0,0.3)", whiteSpace: "nowrap" }}>
            {label}
          </div>
        );
      })()}
    </main>
  );
}
