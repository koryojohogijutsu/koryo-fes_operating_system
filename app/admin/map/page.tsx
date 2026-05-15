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

const CROWD_LABELS = ["混雑なし", "やや混雑", "混雑", "大変混雑"];

export default function AdminMapPage() {
  const router  = useRouter();
  const mapRef  = useRef<HTMLDivElement>(null);

  const [authed,   setAuthed]   = useState(false);
  const [layouts,  setLayouts]  = useState<LayoutItem[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const dragOffset = useRef({ ox: 0, oy: 0 });

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") { router.push("/admin/login"); return; }
    setAuthed(true);

    Promise.all([
      fetch("/api/classes",    { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/map-layout", { cache: "no-store" }).then((r) => r.json()),
    ]).then(([classData, layoutData]) => {
      const cls: Class[]       = classData.classes  ?? [];
      const saved: LayoutItem[] = layoutData.layouts ?? [];
      const merged = cls.map((c) => {
        const existing = saved.find((l) => l.class_code === c.code);
        return existing
          ? { ...existing, label: c.label }
          : { class_code: c.code, label: c.label, x: -1, y: -1, capacity: 30, stay_minutes: 60, thresh_mid: 50, thresh_high: 75, thresh_full: 90 };
      });
      setLayouts(merged);
    });
  }, [router]);

  // ── ドラッグ（マウス） ──
  const handleMouseDown = (e: React.MouseEvent, code: string) => {
    e.preventDefault();
    setDragging(code);
    setSelected(code);
    const rect = mapRef.current!.getBoundingClientRect();
    const item = layouts.find((l) => l.class_code === code)!;
    dragOffset.current = {
      ox: e.clientX - rect.left - (item.x / 100) * rect.width,
      oy: e.clientY - rect.top  - (item.y / 100) * rect.height,
    };
  };

  const handleTouchStart = (e: React.TouchEvent, code: string) => {
    setDragging(code);
    setSelected(code);
    const rect  = mapRef.current!.getBoundingClientRect();
    const item  = layouts.find((l) => l.class_code === code)!;
    const touch = e.touches[0];
    dragOffset.current = {
      ox: touch.clientX - rect.left - (item.x / 100) * rect.width,
      oy: touch.clientY - rect.top  - (item.y / 100) * rect.height,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left - dragOffset.current.ox) / rect.width)  * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top  - dragOffset.current.oy) / rect.height) * 100));
    setLayouts((prev) => prev.map((l) => l.class_code === dragging ? { ...l, x, y } : l));
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging || !mapRef.current) return;
    const rect  = mapRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left - dragOffset.current.ox) / rect.width)  * 100));
    const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top  - dragOffset.current.oy) / rect.height) * 100));
    setLayouts((prev) => prev.map((l) => l.class_code === dragging ? { ...l, x, y } : l));
  };

  const handleDragEnd = () => setDragging(null);

  const updateSelected = (key: keyof LayoutItem, value: number) => {
    if (!selected) return;
    setLayouts((prev) => prev.map((l) => l.class_code === selected ? { ...l, [key]: value } : l));
  };

  const handleSave = async () => {
    setSaving(true);
    const toSave = layouts.filter((l) => l.x >= 0 && l.y >= 0);
    const res = await fetch("/api/map-layout", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ layouts: toSave }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  const selectedItem    = layouts.find((l) => l.class_code === selected);
  const placedLayouts   = layouts.filter((l) => l.x >= 0 && l.y >= 0);
  const unplacedLayouts = layouts.filter((l) => l.x  < 0 || l.y  < 0);

  if (!authed) return null;

  return (
    <main style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <Link href="/admin" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "16px" }}>← 管理者メニュー</Link>
      <h1 style={{ fontSize: "20px", marginBottom: "8px" }}>🗺️ 混雑マップ設定（クラス）</h1>
      <p style={{ color: "#888", fontSize: "13px", marginBottom: "20px" }}>クラスのアイコンをマップ上にドラッグして配置し、定員・滞在時間・閾値を設定してください</p>

      {/* 未配置クラス */}
      {unplacedLayouts.length > 0 && (
        <div style={{ marginBottom: "16px", padding: "12px", backgroundColor: "#fff8e1", borderRadius: "8px", border: "1px solid #ffe082" }}>
          <p style={{ fontSize: "12px", color: "#b8860b", marginBottom: "8px", fontWeight: "bold" }}>未配置のクラス（マップ上にドラッグして配置）</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {unplacedLayouts.map((l) => (
              <div key={l.class_code}
                style={{ padding: "6px 12px", backgroundColor: "#e10102", color: "white", borderRadius: "20px", fontSize: "13px", fontWeight: "bold", cursor: "grab" }}
                onMouseDown={(e) => {
                  setLayouts((prev) => prev.map((item) => item.class_code === l.class_code ? { ...item, x: 50, y: 50 } : item));
                  setTimeout(() => handleMouseDown(e, l.class_code), 0);
                }}>
                {l.class_code}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* マップエリア */}
      <div
        ref={mapRef}
        style={{ position: "relative", width: "100%", userSelect: "none", border: "2px solid #ddd", borderRadius: "8px", overflow: "hidden", cursor: dragging ? "grabbing" : "default" }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleDragEnd}
      >
        <img src="/map.png" alt="マップ" style={{ width: "100%", display: "block" }} draggable={false} />
        {placedLayouts.map((l) => (
          <div key={l.class_code}
            onMouseDown={(e) => handleMouseDown(e, l.class_code)}
            onTouchStart={(e) => handleTouchStart(e, l.class_code)}
            style={{
              position: "absolute",
              left: `${l.x}%`, top: `${l.y}%`,
              transform: "translate(-50%, -50%)",
              backgroundColor: selected === l.class_code ? "#1976d2" : "#e10102",
              color: "white", borderRadius: "20px", padding: "4px 10px",
              fontSize: "12px", fontWeight: "bold", cursor: "grab",
              boxShadow: selected === l.class_code ? "0 0 0 3px #90caf9" : "0 2px 6px rgba(0,0,0,0.3)",
              whiteSpace: "nowrap", zIndex: selected === l.class_code ? 10 : 1, touchAction: "none",
            }}>
            {l.class_code}
          </div>
        ))}
      </div>

      {/* 選択中クラスの設定 */}
      {selectedItem && (
        <div style={{ marginTop: "20px", padding: "16px", border: "2px solid #1976d2", borderRadius: "10px", backgroundColor: "#f8f9ff" }}>
          <h2 style={{ fontSize: "16px", marginBottom: "16px", color: "#1976d2" }}>
            ⚙️ {selectedItem.class_code}（{selectedItem.label}）の設定
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <label style={labelStyle}>
              <span>定員（人）</span>
              <input type="number" min={1} value={selectedItem.capacity}
                onChange={(e) => updateSelected("capacity", Number(e.target.value))}
                style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span>滞在時間（分）</span>
              <input type="number" min={1} max={300} value={selectedItem.stay_minutes}
                onChange={(e) => updateSelected("stay_minutes", Number(e.target.value))}
                style={inputStyle} />
              <span style={{ fontSize: "11px", color: "#888" }}>入場から何分後に混雑人数から除外するか</span>
            </label>
            <label style={labelStyle}>
              <span>やや混雑の閾値（%）</span>
              <input type="number" min={1} max={100} value={selectedItem.thresh_mid}
                onChange={(e) => updateSelected("thresh_mid", Number(e.target.value))}
                style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span>混雑の閾値（%）</span>
              <input type="number" min={1} max={100} value={selectedItem.thresh_high}
                onChange={(e) => updateSelected("thresh_high", Number(e.target.value))}
                style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span>大変混雑の閾値（%）</span>
              <input type="number" min={1} max={100} value={selectedItem.thresh_full}
                onChange={(e) => updateSelected("thresh_full", Number(e.target.value))}
                style={inputStyle} />
            </label>
          </div>
          <p style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>
            ※ 閾値は「在場人数 ÷ 定員 × 100」の値です。入場記録自体は削除されません。
          </p>
        </div>
      )}

      <button onClick={handleSave} disabled={saving}
        style={{ marginTop: "20px", width: "100%", padding: "14px", fontSize: "16px", fontWeight: "bold", cursor: saving ? "not-allowed" : "pointer", backgroundColor: saved ? "#4caf50" : "#e10102", color: "white", border: "none", borderRadius: "8px" }}>
        {saving ? "保存中..." : saved ? "✅ 保存しました" : "配置・設定を保存する"}
      </button>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", color: "#555",
};
const inputStyle: React.CSSProperties = {
  padding: "8px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", width: "100%", boxSizing: "border-box",
};
