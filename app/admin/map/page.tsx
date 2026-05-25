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
  mapTarget: "all" | "koryo" | "school"; // どの地図に配置されるか
};

// 全体図に配置する会場ピン
const VENUE_DEFAULTS: VenueLayoutItem[] = [
  { venue_key: "gym",          label: "体育館",       x: -1, y: -1, mapTarget: "all" },
  { venue_key: "kinenkan",     label: "記念館",       x: -1, y: -1, mapTarget: "all" },
  { venue_key: "koryokan",     label: "ライブ",       x: -1, y: -1, mapTarget: "koryo" },
  { venue_key: "sundelica",    label: "サンデリカ",   x: -1, y: -1, mapTarget: "all" },
  { venue_key: "football",     label: "サッカー部",   x: -1, y: -1, mapTarget: "all" },
  { venue_key: "tontonhiroba", label: "とんとん広場", x: -1, y: -1, mapTarget: "all" },
  { venue_key: "library",      label: "図書館",       x: -1, y: -1, mapTarget: "school" },
  { venue_key: "tea",          label: "茶道部",       x: -1, y: -1, mapTarget: "school" },
  { venue_key: "science",      label: "科学物理部",   x: -1, y: -1, mapTarget: "school" },
];

// 蛟龍館に配置するクラス
const KORYO_CLASSES = ["将棋部", "囲碁部"];

type DragState = {
  key:      string;
  kind:     "class" | "venue";
  fromList: boolean;
};

export default function AdminMapPage() {
  const router = useRouter();

  const schoolMapRef = useRef<HTMLDivElement>(null);
  const allMapRef    = useRef<HTMLDivElement>(null);
  const koryoMapRef  = useRef<HTMLDivElement>(null);

  const [authed,       setAuthed]       = useState(false);
  const [layouts,      setLayouts]      = useState<LayoutItem[]>([]);
  const [venueLayouts, setVenueLayouts] = useState<VenueLayoutItem[]>(VENUE_DEFAULTS);
  const [selected,     setSelected]     = useState<string | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);

  const draggingRef = useRef<DragState | null>(null);
  const dragOffset  = useRef({ ox: 0, oy: 0 });
  const [ghostPos,  setGhostPos]  = useState<{ x: number; y: number } | null>(null);
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate((n) => n + 1);

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") { router.push("/admin/login"); return; }
    setAuthed(true);

    Promise.all([
      fetch("/api/classes",               { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/map-layout",            { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/map-layout?type=venue", { cache: "no-store" }).then((r) => r.json()),
    ]).then(([classData, layoutData, venueData]) => {
      const cls: Class[]    = classData.classes  ?? [];
      const savedLayouts    = layoutData.layouts ?? [];
      const savedVenue      = venueData.layouts  ?? [];

      setLayouts(cls.map((c) => {
        const ex = savedLayouts.find((l: any) => l.class_code === c.code);
        return ex
          ? { ...ex, label: c.label }
          : { class_code: c.code, label: c.label, x: -1, y: -1, capacity: 30, stay_minutes: 60, thresh_mid: 50, thresh_high: 75, thresh_full: 90 };
      }));

      setVenueLayouts(VENUE_DEFAULTS.map((v) => {
        const ex = savedVenue.find((s: any) => s.venue_key === v.venue_key);
        return ex ? { ...v, x: ex.x, y: ex.y } : v;
      }));
    });
  }, [router]);

  // グローバルイベント（ピン一覧からのドラッグ用）
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current?.fromList) return;
      setGhostPos({ x: e.clientX, y: e.clientY });
    };
    const onUp = (e: MouseEvent) => {
      if (!draggingRef.current?.fromList) return;
      tryDropOnMap(e.clientX, e.clientY);
      draggingRef.current = null;
      setGhostPos(null);
      rerender();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current?.fromList) return;
      e.preventDefault();
      const t = e.touches[0];
      setGhostPos({ x: t.clientX, y: t.clientY });
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!draggingRef.current?.fromList) return;
      const t = e.changedTouches[0];
      tryDropOnMap(t.clientX, t.clientY);
      draggingRef.current = null;
      setGhostPos(null);
      rerender();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend",  onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend",  onTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layouts, venueLayouts]);

  const tryDropOnMap = (clientX: number, clientY: number) => {
    const drag = draggingRef.current;
    if (!drag) return;

    const targets = [
      {
        ref: schoolMapRef,
        accepts: (key: string, kind: "class" | "venue") =>
          kind === "class"
            ? !KORYO_CLASSES.includes(key)
            : venueLayouts.find((v) => v.venue_key === key)?.mapTarget === "school",
      },
      {
        ref: allMapRef,
        accepts: (key: string, kind: "class" | "venue") =>
          kind === "venue" && venueLayouts.find((v) => v.venue_key === key)?.mapTarget === "all",
      },
      {
        ref: koryoMapRef,
        accepts: (key: string, kind: "class" | "venue") =>
          kind === "class"
            ? KORYO_CLASSES.includes(key)
            : venueLayouts.find((v) => v.venue_key === key)?.mapTarget === "koryo",
      },
    ];

    for (const { ref, accepts } of targets) {
      if (!ref.current) continue;
      const rect = ref.current.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) continue;
      if (!accepts(drag.key, drag.kind)) continue;

      const x = ((clientX - rect.left) / rect.width)  * 100;
      const y = ((clientY - rect.top)  / rect.height) * 100;

      if (drag.kind === "class") {
        setLayouts((prev) => prev.map((l) => l.class_code === drag.key ? { ...l, x, y } : l));
      } else {
        setVenueLayouts((prev) => prev.map((v) => v.venue_key === drag.key ? { ...v, x, y } : v));
      }
      setSelected(drag.key);
      return;
    }
  };

  // 地図上のピンをドラッグして移動
  const startMapDrag = (
    ref: React.RefObject<HTMLDivElement>,
    key: string, kind: "class" | "venue",
    curX: number, curY: number,
    clientX: number, clientY: number,
  ) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    dragOffset.current = {
      ox: clientX - rect.left - (curX / 100) * rect.width,
      oy: clientY - rect.top  - (curY / 100) * rect.height,
    };
    draggingRef.current = { key, kind, fromList: false };
    setSelected(key);
  };

  const moveMapDrag = (ref: React.RefObject<HTMLDivElement>, clientX: number, clientY: number) => {
    const drag = draggingRef.current;
    if (!drag || drag.fromList || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left - dragOffset.current.ox) / rect.width)  * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top  - dragOffset.current.oy) / rect.height) * 100));
    if (drag.kind === "class") {
      setLayouts((prev) => prev.map((l) => l.class_code === drag.key ? { ...l, x, y } : l));
    } else {
      setVenueLayouts((prev) => prev.map((v) => v.venue_key === drag.key ? { ...v, x, y } : v));
    }
  };

  const endMapDrag = () => {
    if (draggingRef.current && !draggingRef.current.fromList) {
      draggingRef.current = null;
      rerender();
    }
  };

  // ピン一覧からドラッグ開始
  const startListDrag = (key: string, kind: "class" | "venue") => {
    draggingRef.current = { key, kind, fromList: true };
    rerender();
  };

  const handleSave = async () => {
    setSaving(true);
    await Promise.all([
      fetch("/api/map-layout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layouts: layouts.filter((l) => l.x >= 0 && l.y >= 0) }),
      }),
      fetch("/api/map-layout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "venue", layouts: venueLayouts.filter((l) => l.x >= 0 && l.y >= 0) }),
      }),
    ]);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateSelected = (key: keyof LayoutItem, value: number) => {
    if (!selected) return;
    setLayouts((prev) => prev.map((l) => l.class_code === selected ? { ...l, [key]: value } : l));
  };

  const selectedItem    = layouts.find((l) => l.class_code === selected);
  const unplacedClasses = layouts.filter((l) => l.x < 0 || l.y < 0);
  const unplacedVenues  = venueLayouts.filter((v) => v.x < 0 || v.y < 0);
  const schoolClassPins = layouts.filter((l) => l.x >= 0 && l.y >= 0 && !KORYO_CLASSES.includes(l.class_code));
  const schoolVenuePins = venueLayouts.filter((v) => v.x >= 0 && v.y >= 0 && v.mapTarget === "school");
  const allVenuePins    = venueLayouts.filter((v) => v.x >= 0 && v.y >= 0 && v.mapTarget === "all");
  const koryoVenuePins  = venueLayouts.filter((v) => v.x >= 0 && v.y >= 0 && v.mapTarget === "koryo");
  const koryoClassPins  = layouts.filter((l) => l.x >= 0 && l.y >= 0 && KORYO_CLASSES.includes(l.class_code));

  const isDragging = !!draggingRef.current;
  const dragKey    = draggingRef.current?.key;

  const pinStyle = (key: string, isSelected: boolean, color = "#e10102"): React.CSSProperties => ({
    position: "absolute", transform: "translate(-50%, -50%)",
    backgroundColor: isSelected ? "#1976d2" : color,
    color: "white", borderRadius: "20px", padding: "4px 10px",
    fontSize: "12px", fontWeight: "bold", cursor: "grab",
    boxShadow: isSelected ? "0 0 0 3px #90caf9" : "0 2px 6px rgba(0,0,0,0.3)",
    whiteSpace: "nowrap", zIndex: isSelected ? 10 : 1, touchAction: "none",
  });

  if (!authed) return null;

  return (
    <main style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <Link href="/admin" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "16px" }}>
        ← 管理者メニュー
      </Link>
      <h1 style={{ fontSize: "20px", marginBottom: "16px" }}>🗺️ 混雑マップ設定</h1>

      {/* ── 未配置ピン一覧 ── */}
      {(unplacedClasses.length > 0 || unplacedVenues.length > 0) && (
        <div style={{ marginBottom: "24px", padding: "14px 16px", backgroundColor: "#fff8e1", borderRadius: "10px", border: "1px solid #ffe082" }}>
          <p style={{ fontSize: "12px", color: "#b8860b", fontWeight: "bold", marginBottom: "10px" }}>
            未配置のピン — 各地図にドラッグして配置してください
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {unplacedClasses.map((l) => (
              <div key={l.class_code}
                onMouseDown={() => startListDrag(l.class_code, "class")}
                onTouchStart={() => startListDrag(l.class_code, "class")}
                style={{
                  padding: "6px 12px",
                  backgroundColor: dragKey === l.class_code ? "#b71c1c" : "#e10102",
                  color: "white", borderRadius: "20px", fontSize: "13px", fontWeight: "bold",
                  cursor: "grab", userSelect: "none", touchAction: "none",
                  opacity: dragKey === l.class_code ? 0.4 : 1,
                }}>
                {l.class_code}
              </div>
            ))}
            {unplacedVenues.map((v) => (
              <div key={v.venue_key}
                onMouseDown={() => startListDrag(v.venue_key, "venue")}
                onTouchStart={() => startListDrag(v.venue_key, "venue")}
                style={{
                  padding: "6px 12px",
                  backgroundColor: dragKey === v.venue_key ? "#4a148c" : "#7b1fa2",
                  color: "white", borderRadius: "20px", fontSize: "13px", fontWeight: "bold",
                  cursor: "grab", userSelect: "none", touchAction: "none",
                  opacity: dragKey === v.venue_key ? 0.4 : 1,
                }}>
                {v.label}
              </div>
            ))}
          </div>
          <p style={{ fontSize: "11px", color: "#999", marginTop: "10px" }}>
            赤 = クラス企画　紫 = 会場ピン
          </p>
        </div>
      )}

      {/* ── 校舎マップ ── */}
      <p style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "6px", color: "#333" }}>🏫 校舎（教室棟・管理棟）</p>
      <div ref={schoolMapRef}
        style={{ position: "relative", width: "100%", userSelect: "none", border: "2px solid #ddd", borderRadius: "8px", overflow: "hidden", cursor: isDragging ? "copy" : "default", marginBottom: "24px" }}
        onMouseMove={(e) => moveMapDrag(schoolMapRef, e.clientX, e.clientY)}
        onMouseUp={endMapDrag}
        onMouseLeave={endMapDrag}
        onTouchMove={(e) => { const t = e.touches[0]; moveMapDrag(schoolMapRef, t.clientX, t.clientY); }}
        onTouchEnd={endMapDrag}
      >
        <img src="/map.png" alt="校舎マップ" style={{ width: "100%", display: "block" }} draggable={false} />
        {schoolClassPins.map((l) => (
          <div key={l.class_code}
            onMouseDown={(e) => { e.preventDefault(); startMapDrag(schoolMapRef, l.class_code, "class", l.x, l.y, e.clientX, e.clientY); }}
            onTouchStart={(e) => { const t = e.touches[0]; startMapDrag(schoolMapRef, l.class_code, "class", l.x, l.y, t.clientX, t.clientY); }}
            onClick={() => setSelected(l.class_code)}
            style={{ ...pinStyle(l.class_code, selected === l.class_code, "#e10102"), left: `${l.x}%`, top: `${l.y}%` }}>
            {l.class_code}
          </div>
        ))}
        {schoolVenuePins.map((v) => (
          <div key={v.venue_key}
            onMouseDown={(e) => { e.preventDefault(); startMapDrag(schoolMapRef, v.venue_key, "venue", v.x, v.y, e.clientX, e.clientY); }}
            onTouchStart={(e) => { const t = e.touches[0]; startMapDrag(schoolMapRef, v.venue_key, "venue", v.x, v.y, t.clientX, t.clientY); }}
            style={{ ...pinStyle(v.venue_key, selected === v.venue_key, "#1976d2"), left: `${v.x}%`, top: `${v.y}%` }}>
            {v.label}
          </div>
        ))}
      </div>

      {/* ── 全体図 ── */}
      <p style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "6px", color: "#333" }}>🏫 校内全体図</p>
      <div ref={allMapRef}
        style={{ position: "relative", width: "100%", userSelect: "none", border: "2px solid #ddd", borderRadius: "8px", overflow: "hidden", cursor: isDragging ? "copy" : "default", marginBottom: "24px" }}
        onMouseMove={(e) => moveMapDrag(allMapRef, e.clientX, e.clientY)}
        onMouseUp={endMapDrag}
        onMouseLeave={endMapDrag}
        onTouchMove={(e) => { const t = e.touches[0]; moveMapDrag(allMapRef, t.clientX, t.clientY); }}
        onTouchEnd={endMapDrag}
      >
        <img src="/venue-map-all.png" alt="校内全体図" style={{ width: "100%", display: "block" }} draggable={false} />
        {allVenuePins.map((v) => (
          <div key={v.venue_key}
            onMouseDown={(e) => { e.preventDefault(); startMapDrag(allMapRef, v.venue_key, "venue", v.x, v.y, e.clientX, e.clientY); }}
            onTouchStart={(e) => { const t = e.touches[0]; startMapDrag(allMapRef, v.venue_key, "venue", v.x, v.y, t.clientX, t.clientY); }}
            style={{ ...pinStyle(v.venue_key, selected === v.venue_key, "#1976d2"), left: `${v.x}%`, top: `${v.y}%` }}>
            {v.label}
          </div>
        ))}
      </div>

      {/* ── 蛟龍館マップ ── */}
      <p style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "6px", color: "#333" }}>🏢 蛟龍館</p>
      <div ref={koryoMapRef}
        style={{ position: "relative", width: "100%", userSelect: "none", border: "2px solid #ddd", borderRadius: "8px", overflow: "hidden", cursor: isDragging ? "copy" : "default", marginBottom: "24px" }}
        onMouseMove={(e) => moveMapDrag(koryoMapRef, e.clientX, e.clientY)}
        onMouseUp={endMapDrag}
        onMouseLeave={endMapDrag}
        onTouchMove={(e) => { const t = e.touches[0]; moveMapDrag(koryoMapRef, t.clientX, t.clientY); }}
        onTouchEnd={endMapDrag}
      >
        <img src="/venue-map-koryokan.png" alt="蛟龍館マップ" style={{ width: "100%", display: "block" }} draggable={false} />
        {koryoVenuePins.map((v) => (
          <div key={v.venue_key}
            onMouseDown={(e) => { e.preventDefault(); startMapDrag(koryoMapRef, v.venue_key, "venue", v.x, v.y, e.clientX, e.clientY); }}
            onTouchStart={(e) => { const t = e.touches[0]; startMapDrag(koryoMapRef, v.venue_key, "venue", v.x, v.y, t.clientX, t.clientY); }}
            style={{ ...pinStyle(v.venue_key, selected === v.venue_key, "#1976d2"), left: `${v.x}%`, top: `${v.y}%` }}>
            {v.label}
          </div>
        ))}
        {koryoClassPins.map((l) => (
          <div key={l.class_code}
            onMouseDown={(e) => { e.preventDefault(); startMapDrag(koryoMapRef, l.class_code, "class", l.x, l.y, e.clientX, e.clientY); }}
            onTouchStart={(e) => { const t = e.touches[0]; startMapDrag(koryoMapRef, l.class_code, "class", l.x, l.y, t.clientX, t.clientY); }}
            onClick={() => setSelected(l.class_code)}
            style={{ ...pinStyle(l.class_code, selected === l.class_code, "#e10102"), left: `${l.x}%`, top: `${l.y}%` }}>
            {l.class_code}
          </div>
        ))}
      </div>

      {/* ── 選択中クラスの設定 ── */}
      {selectedItem && (
        <div style={{ marginBottom: "24px", padding: "16px", border: "2px solid #1976d2", borderRadius: "10px", backgroundColor: "#f8f9ff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "16px", color: "#1976d2", margin: 0 }}>
              ⚙️ {selectedItem.class_code}（{selectedItem.label}）の設定
            </h2>
            <button
              onClick={() => {
                setLayouts((prev) => prev.map((l) => l.class_code === selectedItem.class_code ? { ...l, x: -1, y: -1 } : l));
                setSelected(null);
              }}
              style={{ padding: "4px 12px", fontSize: "12px", cursor: "pointer", backgroundColor: "#f5f5f5", color: "#888", border: "1px solid #ddd", borderRadius: "8px" }}>
              ✕ 配置を外す
            </button>
          </div>
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

      <button onClick={handleSave} disabled={saving}
        style={{ width: "100%", padding: "14px", fontSize: "16px", fontWeight: "bold", cursor: saving ? "not-allowed" : "pointer", backgroundColor: saved ? "#4caf50" : "#e10102", color: "white", border: "none", borderRadius: "8px" }}>
        {saving ? "保存中..." : saved ? "✅ 保存しました" : "配置・設定を保存する"}
      </button>

      {/* ドラッグ中のゴースト */}
      {ghostPos && draggingRef.current?.fromList && (() => {
        const drag  = draggingRef.current!;
        const label = drag.kind === "class"
          ? layouts.find((l) => l.class_code === drag.key)?.class_code ?? drag.key
          : venueLayouts.find((v) => v.venue_key === drag.key)?.label ?? drag.key;
        const color = drag.kind === "class" ? "#e10102" : "#7b1fa2";
        return (
          <div style={{
            position: "fixed", left: ghostPos.x, top: ghostPos.y,
            transform: "translate(-50%, -50%)",
            backgroundColor: color, color: "white", borderRadius: "20px",
            padding: "4px 12px", fontSize: "12px", fontWeight: "bold",
            pointerEvents: "none", zIndex: 9999, opacity: 0.85,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)", whiteSpace: "nowrap",
          }}>
            {label}
          </div>
        );
      })()}
    </main>
  );
}
