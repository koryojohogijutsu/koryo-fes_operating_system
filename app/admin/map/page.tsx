"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Class = { code: string; label: string };

type LayoutItem = {
  class_code:   string;
  label:        string;
  x:            number;
  y:            number;
  capacity:     number;
  stay_minutes: number;
  thresh_mid:   number;
  thresh_high:  number;
  thresh_full:  number;
};

type VenueLayoutItem = {
  venue_key: string;
  label:     string;
  x:         number;
  y:         number;
};

const VENUES: VenueLayoutItem[] = [
  { venue_key: "gym",      label: "体育館",  x: -1, y: -1 },
  { venue_key: "kinenkan", label: "記念館",  x: -1, y: -1 },
  { venue_key: "koryokan", label: "蛟龍館",  x: -1, y: -1 },
];

export default function AdminMapPage() {
  const router       = useRouter();
  const mapRef       = useRef<HTMLDivElement>(null);
  const gymMapRef    = useRef<HTMLDivElement>(null);
  const koryoMapRef  = useRef<HTMLDivElement>(null);

  const [authed,       setAuthed]       = useState(false);
  const [tab,          setTab]          = useState<"class" | "venue">("class");
  const [layouts,      setLayouts]      = useState<LayoutItem[]>([]);
  const [venueLayouts, setVenueLayouts] = useState<VenueLayoutItem[]>(VENUES);
  const [dragging,     setDragging]     = useState<string | null>(null);
  const [selected,     setSelected]     = useState<string | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const dragOffset = useRef({ ox: 0, oy: 0 });
  const isVenueDrag = useRef(false);

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") { router.push("/admin/login"); return; }
    setAuthed(true);

    Promise.all([
      fetch("/api/classes",               { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/map-layout",            { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/map-layout?type=venue", { cache: "no-store" }).then((r) => r.json()),
    ]).then(([classData, layoutData, venueData]) => {
      const cls: Class[]        = classData.classes  ?? [];
      const saved: LayoutItem[] = layoutData.layouts ?? [];
      const vSaved              = venueData.layouts  ?? [];

      setLayouts(cls.map((c) => {
        const ex = saved.find((l) => l.class_code === c.code);
        return ex ? { ...ex, label: c.label }
                  : { class_code: c.code, label: c.label, x: -1, y: -1, capacity: 30, stay_minutes: 60, thresh_mid: 50, thresh_high: 75, thresh_full: 90 };
      }));

      setVenueLayouts(VENUES.map((v) => {
        const ex = vSaved.find((s: any) => s.venue_key === v.venue_key);
        return ex ? { ...v, x: ex.x, y: ex.y } : v;
      }));
    });
  }, [router]);

  // ── ドラッグ開始 ──
  const startDrag = (ref: React.RefObject<HTMLDivElement>, key: string, curX: number, curY: number, clientX: number, clientY: number, isVenue: boolean) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    dragOffset.current = {
      ox: clientX - rect.left - (curX / 100) * rect.width,
      oy: clientY - rect.top  - (curY / 100) * rect.height,
    };
    isVenueDrag.current = isVenue;
    setDragging(key);
    setSelected(key);
  };

  // ── ドラッグ移動 ──
  const moveDrag = (ref: React.RefObject<HTMLDivElement>, clientX: number, clientY: number) => {
    if (!dragging || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left - dragOffset.current.ox) / rect.width)  * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top  - dragOffset.current.oy) / rect.height) * 100));
    if (isVenueDrag.current) {
      setVenueLayouts((prev) => prev.map((l) => l.venue_key === dragging ? { ...l, x, y } : l));
    } else {
      setLayouts((prev) => prev.map((l) => l.class_code === dragging ? { ...l, x, y } : l));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    if (tab === "class") {
      await fetch("/api/map-layout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layouts: layouts.filter((l) => l.x >= 0 && l.y >= 0) }),
      });
    } else {
      await fetch("/api/map-layout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "venue", layouts: venueLayouts.filter((l) => l.x >= 0 && l.y >= 0) }),
      });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateSelected = (key: keyof LayoutItem, value: number) => {
    if (!selected) return;
    setLayouts((prev) => prev.map((l) => l.class_code === selected ? { ...l, [key]: value } : l));
  };

  const selectedItem    = layouts.find((l) => l.class_code === selected);
  const placedLayouts   = layouts.filter((l) => l.x >= 0 && l.y >= 0);
  const unplacedLayouts = layouts.filter((l) => l.x  < 0 || l.y  < 0);
  const gymVenues       = venueLayouts.filter((l) => l.venue_key !== "koryokan");
  const koryoVenue      = venueLayouts.find((l) => l.venue_key === "koryokan");

  if (!authed) return null;

  return (
    <main style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <Link href="/admin" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "16px" }}>← 管理者メニュー</Link>
      <h1 style={{ fontSize: "20px", marginBottom: "16px" }}>🗺️ 混雑マップ設定</h1>

      {/* タブ */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {(["class", "venue"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setSelected(null); setDragging(null); }}
            style={{ flex: 1, padding: "10px", fontSize: "14px", cursor: "pointer", borderRadius: "8px", border: "2px solid", borderColor: tab === t ? "#e10102" : "#ddd", backgroundColor: tab === t ? "#fff5f5" : "white", color: tab === t ? "#e10102" : "#555", fontWeight: tab === t ? "bold" : "normal" }}>
            {t === "class" ? "🏫 クラス企画" : "🏟️ 体育館・記念館・蛟龍館"}
          </button>
        ))}
      </div>

      {/* ── クラスタブ ── */}
      {tab === "class" && (
        <>
          <p style={{ color: "#888", fontSize: "13px", marginBottom: "12px" }}>クラスのアイコンをマップ上にドラッグして配置してください</p>

          {unplacedLayouts.length > 0 && (
            <div style={{ marginBottom: "16px", padding: "12px", backgroundColor: "#fff8e1", borderRadius: "8px", border: "1px solid #ffe082" }}>
              <p style={{ fontSize: "12px", color: "#b8860b", marginBottom: "8px", fontWeight: "bold" }}>未配置のクラス（クリックで中央に仮配置）</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {unplacedLayouts.map((l) => (
                  <div key={l.class_code}
                    onClick={() => setLayouts((prev) => prev.map((item) => item.class_code === l.class_code ? { ...item, x: 50, y: 50 } : item))}
                    style={{ padding: "6px 12px", backgroundColor: "#e10102", color: "white", borderRadius: "20px", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}>
                    {l.class_code}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div ref={mapRef}
            style={{ position: "relative", width: "100%", userSelect: "none", border: "2px solid #ddd", borderRadius: "8px", overflow: "hidden", cursor: dragging ? "grabbing" : "default" }}
            onMouseMove={(e) => moveDrag(mapRef, e.clientX, e.clientY)}
            onMouseUp={() => setDragging(null)}
            onMouseLeave={() => setDragging(null)}
            onTouchMove={(e) => { const t = e.touches[0]; moveDrag(mapRef, t.clientX, t.clientY); }}
            onTouchEnd={() => setDragging(null)}
          >
            <img src="/map.png" alt="クラスマップ" style={{ width: "100%", display: "block" }} draggable={false} />
            {placedLayouts.map((l) => (
              <div key={l.class_code}
                onMouseDown={(e) => { e.preventDefault(); startDrag(mapRef, l.class_code, l.x, l.y, e.clientX, e.clientY, false); }}
                onTouchStart={(e) => { const t = e.touches[0]; startDrag(mapRef, l.class_code, l.x, l.y, t.clientX, t.clientY, false); }}
                style={{
                  position: "absolute", left: `${l.x}%`, top: `${l.y}%`, transform: "translate(-50%, -50%)",
                  backgroundColor: selected === l.class_code ? "#1976d2" : "#e10102",
                  color: "white", borderRadius: "20px", padding: "4px 10px", fontSize: "12px", fontWeight: "bold",
                  cursor: "grab", boxShadow: selected === l.class_code ? "0 0 0 3px #90caf9" : "0 2px 6px rgba(0,0,0,0.3)",
                  whiteSpace: "nowrap", zIndex: selected === l.class_code ? 10 : 1, touchAction: "none",
                }}>
                {l.class_code}
              </div>
            ))}
          </div>

          {selectedItem && (
            <div style={{ marginTop: "20px", padding: "16px", border: "2px solid #1976d2", borderRadius: "10px", backgroundColor: "#f8f9ff" }}>
              <h2 style={{ fontSize: "16px", marginBottom: "16px", color: "#1976d2" }}>⚙️ {selectedItem.class_code}（{selectedItem.label}）の設定</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {[
                  { key: "capacity",     label: "定員（人）" },
                  { key: "stay_minutes", label: "滞在時間（分）" },
                  { key: "thresh_mid",   label: "やや混雑の閾値（%）" },
                  { key: "thresh_high",  label: "混雑の閾値（%）" },
                  { key: "thresh_full",  label: "大変混雑の閾値（%）" },
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", color: "#555" }}>
                    <span>{label}</span>
                    <input type="number" min={1} value={(selectedItem as any)[key]}
                      onChange={(e) => updateSelected(key as keyof LayoutItem, Number(e.target.value))}
                      style={{ padding: "8px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", width: "100%", boxSizing: "border-box" as const }} />
                  </label>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── 会場タブ ── */}
      {tab === "venue" && (
        <>
          <p style={{ color: "#888", fontSize: "13px", marginBottom: "16px" }}>各会場をマップ上にドラッグして配置してください</p>

          {/* 体育館・記念館マップ */}
          <p style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>体育館・記念館マップ</p>
          <div ref={gymMapRef}
            style={{ position: "relative", width: "100%", userSelect: "none", border: "2px solid #ddd", borderRadius: "8px", overflow: "hidden", cursor: dragging ? "grabbing" : "default", marginBottom: "20px" }}
            onMouseMove={(e) => moveDrag(gymMapRef, e.clientX, e.clientY)}
            onMouseUp={() => setDragging(null)}
            onMouseLeave={() => setDragging(null)}
            onTouchMove={(e) => { const t = e.touches[0]; moveDrag(gymMapRef, t.clientX, t.clientY); }}
            onTouchEnd={() => setDragging(null)}
          >
            <img src="/venue-map-gym-kinenkan.png" alt="体育館・記念館マップ" style={{ width: "100%", display: "block" }} draggable={false} />
            {gymVenues.filter((l) => l.x >= 0 && l.y >= 0).map((l) => (
              <div key={l.venue_key}
                onMouseDown={(e) => { e.preventDefault(); startDrag(gymMapRef, l.venue_key, l.x, l.y, e.clientX, e.clientY, true); }}
                onTouchStart={(e) => { const t = e.touches[0]; startDrag(gymMapRef, l.venue_key, l.x, l.y, t.clientX, t.clientY, true); }}
                style={{
                  position: "absolute", left: `${l.x}%`, top: `${l.y}%`, transform: "translate(-50%, -50%)",
                  backgroundColor: selected === l.venue_key ? "#7b1fa2" : "#1976d2",
                  color: "white", borderRadius: "20px", padding: "4px 10px", fontSize: "12px", fontWeight: "bold",
                  cursor: "grab", boxShadow: "0 2px 6px rgba(0,0,0,0.3)", whiteSpace: "nowrap", touchAction: "none",
                }}>
                {l.label}
              </div>
            ))}
            {/* 未配置の体育館・記念館 */}
            {gymVenues.filter((l) => l.x < 0 || l.y < 0).map((l) => (
              <div key={l.venue_key} style={{ position: "absolute", top: "8px", right: "8px" }}>
                <button onClick={() => setVenueLayouts((prev) => prev.map((item) => item.venue_key === l.venue_key ? { ...item, x: 50, y: 50 } : item))}
                  style={{ padding: "4px 10px", backgroundColor: "#1976d2", color: "white", border: "none", borderRadius: "12px", fontSize: "12px", cursor: "pointer" }}>
                  {l.label}を配置
                </button>
              </div>
            ))}
          </div>

          {/* 蛟龍館マップ */}
          <p style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>蛟龍館マップ</p>
          <div ref={koryoMapRef}
            style={{ position: "relative", width: "100%", userSelect: "none", border: "2px solid #ddd", borderRadius: "8px", overflow: "hidden", cursor: dragging ? "grabbing" : "default" }}
            onMouseMove={(e) => moveDrag(koryoMapRef, e.clientX, e.clientY)}
            onMouseUp={() => setDragging(null)}
            onMouseLeave={() => setDragging(null)}
            onTouchMove={(e) => { const t = e.touches[0]; moveDrag(koryoMapRef, t.clientX, t.clientY); }}
            onTouchEnd={() => setDragging(null)}
          >
            <img src="/venue-map-koryu.png" alt="蛟龍館マップ" style={{ width: "100%", display: "block" }} draggable={false} />
            {koryoVenue && koryoVenue.x >= 0 && koryoVenue.y >= 0 && (
              <div
                onMouseDown={(e) => { e.preventDefault(); startDrag(koryoMapRef, koryoVenue.venue_key, koryoVenue.x, koryoVenue.y, e.clientX, e.clientY, true); }}
                onTouchStart={(e) => { const t = e.touches[0]; startDrag(koryoMapRef, koryoVenue.venue_key, koryoVenue.x, koryoVenue.y, t.clientX, t.clientY, true); }}
                style={{
                  position: "absolute", left: `${koryoVenue.x}%`, top: `${koryoVenue.y}%`, transform: "translate(-50%, -50%)",
                  backgroundColor: selected === koryoVenue.venue_key ? "#7b1fa2" : "#1976d2",
                  color: "white", borderRadius: "20px", padding: "4px 10px", fontSize: "12px", fontWeight: "bold",
                  cursor: "grab", boxShadow: "0 2px 6px rgba(0,0,0,0.3)", whiteSpace: "nowrap", touchAction: "none",
                }}>
                {koryoVenue.label}
              </div>
            )}
            {/* 蛟龍館マップ上のクラスアイコン（将棋部・囲碁部のみ） */}
            {placedLayouts.filter((l) => ["将棋部", "囲碁部"].includes(l.class_code)).map((l) => (
              <div key={`koryo-class-${l.class_code}`}
                onMouseDown={(e) => { e.preventDefault(); startDrag(koryoMapRef, l.class_code, l.x, l.y, e.clientX, e.clientY, false); }}
                onTouchStart={(e) => { const t = e.touches[0]; startDrag(koryoMapRef, l.class_code, l.x, l.y, t.clientX, t.clientY, false); }}
                style={{
                  position: "absolute", left: `${l.x}%`, top: `${l.y}%`, transform: "translate(-50%, -50%)",
                  backgroundColor: selected === l.class_code ? "#1976d2" : "#e10102",
                  color: "white", borderRadius: "20px", padding: "4px 10px", fontSize: "12px", fontWeight: "bold",
                  cursor: "grab", boxShadow: selected === l.class_code ? "0 0 0 3px #90caf9" : "0 2px 6px rgba(0,0,0,0.3)",
                  whiteSpace: "nowrap", zIndex: selected === l.class_code ? 10 : 1, touchAction: "none",
                  display: l.x >= 0 && l.y >= 0 ? "block" : "none",
                }}>
                {l.class_code}
              </div>
            ))}
            {koryoVenue && (koryoVenue.x < 0 || koryoVenue.y < 0) && (
              <div style={{ position: "absolute", top: "8px", right: "8px" }}>
                <button onClick={() => setVenueLayouts((prev) => prev.map((item) => item.venue_key === "koryokan" ? { ...item, x: 50, y: 50 } : item))}
                  style={{ padding: "4px 10px", backgroundColor: "#1976d2", color: "white", border: "none", borderRadius: "12px", fontSize: "12px", cursor: "pointer" }}>
                  蛟龍館を配置
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <button onClick={handleSave} disabled={saving}
        style={{ marginTop: "20px", width: "100%", padding: "14px", fontSize: "16px", fontWeight: "bold", cursor: saving ? "not-allowed" : "pointer", backgroundColor: saved ? "#4caf50" : "#e10102", color: "white", border: "none", borderRadius: "8px" }}>
        {saving ? "保存中..." : saved ? "✅ 保存しました" : "配置・設定を保存する"}
      </button>
    </main>
  );
}
