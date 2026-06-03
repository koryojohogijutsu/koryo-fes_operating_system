"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const ENTRY_CATEGORIES = [
  { key: "nodojiman-1",        label: "🎤 のど自慢（1日目）",         hasMembers: false, defaultDay: "day1" as const },
  { key: "nodojiman-2",        label: "🎤 のど自慢（2日目①）",        hasMembers: false, defaultDay: "day2" as const },
  { key: "nodojiman-3",        label: "🎤 のど自慢（2日目②）",        hasMembers: false, defaultDay: "day2" as const },
  { key: "coscon_performance", label: "👗 コスコン（パフォーマンス）", hasMembers: true,  defaultDay: "both" as const },
  { key: "coscon_runway",      label: "🏃 コスコン（ランウェイ）",     hasMembers: true,  defaultDay: "both" as const },
  { key: "m1",                 label: "🎭 M1",                        hasMembers: false, defaultDay: "both" as const },
  { key: "live",               label: "🎵 ライブ",                    hasMembers: false, defaultDay: "both" as const },
];

const PROGRAM_VENUES = [
  { key: "gym",      label: "🏟️ 体育館" },
  { key: "kinenkan", label: "🏛️ 記念館" },
  { key: "koryokan", label: "🎵 ライブ会場" },
];

const VENUE_KEYS = [
  { key: "gym",      label: "🏟️ 体育館" },
  { key: "kinenkan", label: "🏛️ 記念館" },
  { key: "library",  label: "📚 図書館" },
  { key: "nakaniwa",  label: "🌿 中庭（中庭）" },
];

type FestivalDay = "day1" | "day2" | "both";
type Settings = { day1_date: string; day2_date: string };
type Entry = { id: string; name: string; description: string; comment: string; datetime: string | null; image_url: string | null; members: string | null; festival_day: string; order_num: number };
type VenueEvent = { id: string; venue_key: string; title: string; description: string; datetime?: string; order_num: number };
type VenueProgram = { id: string; venue_key: string; name: string; datetime: string; comment: string; festival_day: string; order_num: number };

// ドラッグ並び替えフック
function useDragSort<T extends { id: string; order_num: number }>(
  items: T[],
  onSave: (sorted: T[]) => Promise<void>
) {
  const [list,       setList]       = useState<T[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [snapshot,   setSnapshot]   = useState<T[]>([]);
  const [dirty,      setDirty]      = useState(false);
  const [saving,     setSaving]     = useState(false);

  // refでdraggingIdを追跡（useCallbackの古いクロージャ問題を回避）
  const draggingIdRef = useRef<string | null>(null);

  useEffect(() => { setList(items); setSnapshot(items); setDirty(false); }, [items]);

  const onDragStart = useCallback((id: string) => {
    draggingIdRef.current = id;
    setDraggingId(id);
    setSnapshot((prev) => [...prev]);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent, overId: string) => {
    e.preventDefault();
    const dragId = draggingIdRef.current;
    if (!dragId || dragId === overId) return;
    setList((prev) => {
      const from = prev.findIndex((i) => i.id === dragId);
      const to   = prev.findIndex((i) => i.id === overId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setDirty(true);
  }, []);

  const onDragEnd = useCallback(() => {
    draggingIdRef.current = null;
    setDraggingId(null);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    // 保存直前のlistをスナップショットにも反映
    setList((current) => {
      const withOrder = current.map((item, i) => ({ ...item, order_num: i * 10 }));
      onSave(withOrder).then(() => {
        setSnapshot(withOrder);
        setDirty(false);
        setSaving(false);
      });
      return withOrder;
    });
  };

  const handleReset = () => {
    setList(snapshot);
    setDirty(false);
  };

  return { list, draggingId, dirty, saving, onDragStart, onDragOver, onDragEnd, handleSave, handleReset };
}

export default function EventAdminPage() {
  const router = useRouter();
  const [authed,   setAuthed]   = useState(false);
  const [mainTab,  setMainTab]  = useState<"entries" | "programs" | "venue">("entries");
  const [settings, setSettings] = useState<Settings>({ day1_date: "1日目", day2_date: "2日目" });

  // 出場者管理
  const [entryCategory, setEntryCategory] = useState("nodojiman-1");
  const [entries,       setEntries]       = useState<Entry[]>([]);
  const [eName,         setEName]         = useState("");
  const [eDesc,         setEDesc]         = useState("");
  const [eComment,      setEComment]      = useState("");
  const [eDatetime,     setEDatetime]     = useState("");
  const [eMembers,      setEMembers]      = useState("");
  const [eFestivalDay,  setEFestivalDay]  = useState<FestivalDay>("day1");
  const [eImage,        setEImage]        = useState<File | null>(null);
  const [eSubmitting,   setESubmitting]   = useState(false);
  const [editingId,     setEditingId]     = useState<string | null>(null);
  const [editComment,   setEditComment]   = useState("");
  // 1日目/2日目フィルタ（並び替えタブ）
  const [sortDay,       setSortDay]       = useState<"day1" | "day2" | "both">("day1");

  // 部活動企画管理
  const [progVenueKey, setProgVenueKey] = useState("gym");
  const [programs,     setPrograms]     = useState<VenueProgram[]>([]);
  const [mergedEntries, setMergedEntries] = useState<Entry[]>([]); // 会場対応のevent_entries
  const [pName,        setPName]        = useState("");
  const [pDatetime,    setPDatetime]    = useState("");
  const [pComment,     setPComment]     = useState("");
  const [pFestivalDay, setPFestivalDay] = useState<FestivalDay>("day1");
  const [pSaving,      setPSaving]      = useState(false);
  const [pSortDay,     setPSortDay]     = useState<"day1" | "day2" | "both">("day1");

  // 会場イベント管理
  const [venueKey,     setVenueKey]     = useState("gym");
  const [venueEvents,  setVenueEvents]  = useState<VenueEvent[]>([]);
  const [vTitle,       setVTitle]       = useState("");
  const [vDescription, setVDescription] = useState("");
  const [vDatetime,    setVDatetime]    = useState("");
  const [vSubmitting,  setVSubmitting]  = useState(false);

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") { router.push("/admin/login"); return; }
    setAuthed(true);
    fetch("/api/festival-settings", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      if (d.settings) setSettings({ day1_date: d.settings.day1_date || "1日目", day2_date: d.settings.day2_date || "2日目" });
    });
  }, [router]);

  useEffect(() => { if (authed && mainTab === "entries")  loadEntries(); },  [entryCategory, authed, mainTab]);
  useEffect(() => { if (authed && mainTab === "programs") loadPrograms(); }, [progVenueKey,  authed, mainTab]);
  useEffect(() => { if (authed && mainTab === "venue")    loadVenueEvents(); }, [venueKey, authed, mainTab]);

  // カテゴリ変更時にeFestivalDayをデフォルト値にリセット
  useEffect(() => {
    const cat = ENTRY_CATEGORIES.find((c) => c.key === entryCategory);
    if (cat) setEFestivalDay(cat.defaultDay);
  }, [entryCategory]);

  const loadEntries = async () => {
    const res = await fetch(`/api/event-entries?category=${entryCategory}`, { cache: "no-store" });
    setEntries((await res.json()).entries ?? []);
  };
  // 会場→対応するevent_entriesカテゴリのマッピング
  const VENUE_ENTRY_CATEGORIES: Record<string, string[]> = {
    gym:      ["nodojiman-1", "nodojiman-2", "nodojiman-3", "coscon_performance", "coscon_runway"],
    kinenkan: ["m1"],
    koryokan: ["live"],
  };

  const loadPrograms = async () => {
    const cats = VENUE_ENTRY_CATEGORIES[progVenueKey] ?? [];
    const [progRes, ...entryResults] = await Promise.all([
      fetch(`/api/venue-programs?venueKey=${progVenueKey}`, { cache: "no-store" }).then((r) => r.json()),
      ...cats.map((cat) => fetch(`/api/event-entries?category=${cat}`, { cache: "no-store" }).then((r) => r.json())),
    ]);
    setPrograms(progRes.programs ?? []);
    const allEntries = entryResults.flatMap((r) => r.entries ?? []);
    setMergedEntries(allEntries);
  };
  const loadVenueEvents = async () => {
    const res = await fetch(`/api/venue-events?venueKey=${venueKey}`, { cache: "no-store" });
    setVenueEvents((await res.json()).events ?? []);
  };

  const addEntry = async () => {
    if (!eName) { alert("名前を入力してください"); return; }
    setESubmitting(true);
    let imageUrl: string | null = null;
    if (eImage) {
      const fd = new FormData();
      fd.append("file", eImage); fd.append("bucket", "event-entries");
      fd.append("path", `${entryCategory}/${Date.now()}.${eImage.name.split(".").pop()}`);
      imageUrl = (await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json())).url ?? null;
    }
    const res = await fetch("/api/event-entries/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: entryCategory, name: eName, description: eDesc, comment: eComment,
        datetime: eDatetime || null, imageUrl, members: eMembers || null,
        festivalDay: eFestivalDay, orderNum: Date.now(),
      }),
    });
    if (res.ok) {
      setEName(""); setEDesc(""); setEComment(""); setEDatetime("");
      setEMembers(""); setEImage(null);
      loadEntries();
    } else { alert("エラー: " + (await res.json()).error); }
    setESubmitting(false);
  };

  const saveComment = async (id: string) => {
    await fetch("/api/event-entries/register", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, comment: editComment }) });
    setEditingId(null); loadEntries();
  };

  const deleteEntry = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch("/api/event-entries/register", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadEntries();
  };

  const saveEntryOrder = async (sorted: Entry[]) => {
    await fetch("/api/event-entries/order", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: sorted.map((e, i) => ({ id: e.id, order_num: i * 10 })) }),
    });
    await loadEntries();
  };

  const saveProgramOrder = async (sorted: Array<{ id: string; order_num: number; _kind: "program" | "entry" }>) => {
    const progItems   = sorted.filter((i) => i._kind === "program");
    const entryItems  = sorted.filter((i) => i._kind === "entry");
    await Promise.all([
      progItems.length > 0 && fetch("/api/venue-programs/order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: progItems.map((p, i) => ({ id: p.id, order_num: i * 10 })) }),
      }),
      entryItems.length > 0 && fetch("/api/event-entries/order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: entryItems.map((e, i) => ({ id: e.id, order_num: i * 10 })) }),
      }),
    ].filter(Boolean));
    await loadPrograms();
  };

  const addProgram = async () => {
    if (!pName) { alert("部活名を入力してください"); return; }
    setPSaving(true);
    const res = await fetch("/api/venue-programs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueKey: progVenueKey, name: pName, datetime: pDatetime, comment: pComment, festivalDay: pFestivalDay }),
    });
    if (res.ok) { setPName(""); setPDatetime(""); setPComment(""); setPFestivalDay("day1"); loadPrograms(); }
    else { alert("エラー: " + (await res.json()).error); }
    setPSaving(false);
  };

  const deleteProgram = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch("/api/venue-programs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadPrograms();
  };

  const addVenueEvent = async () => {
    if (!vTitle) { alert("タイトルを入力してください"); return; }
    setVSubmitting(true);
    const res = await fetch("/api/venue-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueKey, title: vTitle, description: vDescription, datetime: vDatetime || null }),
    });
    const data = await res.json();
    if (res.ok) {
      setVTitle(""); setVDescription(""); loadVenueEvents();
    } else {
      alert("エラー: " + (data.error ?? "不明") + (data.hint ? `\nヒント: ${data.hint}` : ""));
    }
    setVSubmitting(false);
  };

  const deleteVenueEvent = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch("/api/venue-events", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadVenueEvents();
  };

  const DAY_OPTIONS: { value: FestivalDay; label: string }[] = [
    { value: "day1", label: `1日目（${settings.day1_date}）` },
    { value: "day2", label: `2日目（${settings.day2_date}）` },
    { value: "both", label: "両日" },
  ];

  const dayBadge = (fd: string) => {
    const map: Record<string, { text: string; color: string }> = {
      day1: { text: "1日目", color: "#1976d2" },
      day2: { text: "2日目", color: "#e10102" },
      both: { text: "両日",  color: "#4caf50" },
    };
    const m = map[fd] ?? map["both"];
    return <span style={{ fontSize: "11px", fontWeight: "bold", color: "white", backgroundColor: m.color, borderRadius: "10px", padding: "2px 8px", marginLeft: "6px" }}>{m.text}</span>;
  };

  const currentCategory = ENTRY_CATEGORIES.find((c) => c.key === entryCategory);
  if (!authed) return null;

  const tabStyle = (t: string): React.CSSProperties => ({
    flex: 1, padding: "10px", fontSize: "13px", cursor: "pointer", borderRadius: "8px",
    border: "2px solid", borderColor: mainTab === t ? "#e10102" : "#ddd",
    backgroundColor: mainTab === t ? "#fff5f5" : "white",
    color: mainTab === t ? "#e10102" : "#555", fontWeight: mainTab === t ? "bold" : "normal",
  });
  const subBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 12px", fontSize: "12px", borderRadius: "16px", border: "2px solid",
    borderColor: active ? "#e10102" : "#ddd", backgroundColor: active ? "#fff5f5" : "white",
    color: active ? "#e10102" : "#555", cursor: "pointer", fontWeight: active ? "bold" : "normal",
  });
  const dayBtnStyle = (active: boolean, color = "#1976d2"): React.CSSProperties => ({
    padding: "6px 14px", fontSize: "12px", borderRadius: "12px", border: "2px solid",
    borderColor: active ? color : "#ddd", backgroundColor: active ? `${color}15` : "white",
    color: active ? color : "#888", cursor: "pointer", fontWeight: active ? "bold" : "normal",
  });
  const selectStyle: React.CSSProperties = { padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", width: "100%" };
  const inputStyle: React.CSSProperties  = { padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", width: "100%", boxSizing: "border-box" as const };

  // ドラッグ並び替え用コンポーネント（インライン定義）
  function DragList<T extends { id: string; order_num: number; festival_day?: string; _kind?: string }>({
    all, filterDay, onSave, renderItem,
  }: {
    all: T[];
    filterDay: "day1" | "day2" | "both";
    onSave: (sorted: T[]) => Promise<void>;
    renderItem: (item: T, isDragging: boolean) => React.ReactNode;
  }) {
    const filtered = filterDay === "both"
      ? all
      : all.filter((i) => (i.festival_day ?? "both") === filterDay || (i.festival_day ?? "both") === "both");
    const { list, draggingId, dirty, saving, onDragStart, onDragOver, onDragEnd, handleSave, handleReset } = useDragSort(filtered, onSave);

    return (
      <div>
        {dirty && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: "8px 20px", fontSize: "13px", cursor: saving ? "not-allowed" : "pointer", backgroundColor: saving ? "#ccc" : "#4caf50", color: "white", border: "none", borderRadius: "6px" }}>
              {saving ? "保存中..." : "✅ 並び順を保存"}
            </button>
            <button onClick={handleReset}
              style={{ padding: "8px 16px", fontSize: "13px", cursor: "pointer", backgroundColor: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: "6px" }}>
              ↩ 元に戻す
            </button>
          </div>
        )}
        {list.length === 0 ? (
          <p style={{ color: "#aaa", fontSize: "13px" }}>この日程の登録がありません</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {list.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => onDragStart(item.id)}
                onDragOver={(e) => onDragOver(e, item.id)}
                onDragEnd={onDragEnd}
                style={{
                  opacity: draggingId === item.id ? 0.4 : 1,
                  cursor: "grab",
                  borderRadius: "8px",
                  border: "1px solid #eee",
                  backgroundColor: draggingId === item.id ? "#f0f0f0" : "white",
                  transition: "opacity 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px" }}>
                  <span style={{ color: "#ccc", fontSize: "18px", userSelect: "none", flexShrink: 0 }}>⠿</span>
                  <div style={{ flex: 1 }}>{renderItem(item, draggingId === item.id)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <main style={{ padding: "24px 20px", maxWidth: "560px", margin: "0 auto" }}>
      <a href="/admin" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "20px" }}>← 管理者メニューに戻る</a>
      <h1 style={{ fontSize: "20px", marginBottom: "20px" }}>🎤 イベント管理</h1>

      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        <button onClick={() => setMainTab("entries")}  style={tabStyle("entries")}>出場者管理</button>
        <button onClick={() => setMainTab("programs")} style={tabStyle("programs")}>部活動企画</button>
        <button onClick={() => setMainTab("venue")}    style={tabStyle("venue")}>会場イベント</button>
      </div>

      {/* ── 出場者管理 ── */}
      {mainTab === "entries" && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" }}>
            {ENTRY_CATEGORIES.map((c) => (
              <button key={c.key} onClick={() => setEntryCategory(c.key)} style={subBtnStyle(entryCategory === c.key)}>{c.label}</button>
            ))}
          </div>
          {/* 追加フォーム */}
          <div style={{ padding: "16px", border: "1px solid #eee", borderRadius: "10px", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <input placeholder="名前 *" value={eName} onChange={(e) => setEName(e.target.value)} style={inputStyle} />
            <input placeholder="出場内容（任意）" value={eDesc} onChange={(e) => setEDesc(e.target.value)} style={inputStyle} />
            <input placeholder="時刻（任意）例: 14:00〜" value={eDatetime} onChange={(e) => setEDatetime(e.target.value)} style={inputStyle} />
            <label style={{ fontSize: "13px", color: "#555" }}>
              出演日
              <select value={eFestivalDay} onChange={(e) => setEFestivalDay(e.target.value as FestivalDay)} style={{ ...selectStyle, marginTop: "4px" }}>
                {DAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <textarea placeholder="一言コメント（任意・改行可）" value={eComment} onChange={(e) => setEComment(e.target.value)} rows={2}
              style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", resize: "vertical", fontFamily: "sans-serif" }} />
            {currentCategory?.hasMembers && (
              <textarea placeholder="参加者氏名（任意・改行区切り）" value={eMembers} onChange={(e) => setEMembers(e.target.value)} rows={3}
                style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", resize: "vertical", fontFamily: "sans-serif" }} />
            )}
            <div>
              <p style={{ fontSize: "13px", color: "#555", marginBottom: "4px" }}>画像（任意）</p>
              <input type="file" accept="image/*" onChange={(e) => setEImage(e.target.files?.[0] ?? null)} style={{ fontSize: "13px" }} />
            </div>
            <button onClick={addEntry} disabled={eSubmitting}
              style={{ padding: "10px", fontSize: "14px", cursor: eSubmitting ? "not-allowed" : "pointer", backgroundColor: eSubmitting ? "#ccc" : "#e10102", color: "white", border: "none", borderRadius: "6px" }}>
              {eSubmitting ? "追加中..." : "追加"}
            </button>
          </div>

          {/* 並び替え */}
          <div style={{ marginBottom: "12px" }}>
            <h2 style={{ fontSize: "15px", marginBottom: "8px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>
              {currentCategory?.label} — 並び替え・一覧
            </h2>
            {/* 会場グループボタン */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", color: "#aaa", alignSelf: "center" }}>会場：</span>
              <button onClick={() => setEntryCategory("nodojiman-1")} style={subBtnStyle(entryCategory === "nodojiman-1")}>🏟のど自慢(1日目)</button>
              <button onClick={() => setEntryCategory("nodojiman-2")} style={subBtnStyle(entryCategory === "nodojiman-2")}>🏟のど自慢(2日目①)</button>
              <button onClick={() => setEntryCategory("nodojiman-3")} style={subBtnStyle(entryCategory === "nodojiman-3")}>🏟のど自慢(2日目②)</button>
              <button onClick={() => setEntryCategory("coscon_performance")} style={subBtnStyle(entryCategory === "coscon_performance")}>🏟コスコン(P)</button>
              <button onClick={() => setEntryCategory("coscon_runway")} style={subBtnStyle(entryCategory === "coscon_runway")}>🏟コスコン(R)</button>
              <button onClick={() => setEntryCategory("m1")} style={subBtnStyle(entryCategory === "m1")}>🏛M1</button>
              <button onClick={() => setEntryCategory("live")} style={subBtnStyle(entryCategory === "live")}>🎵ライブ</button>
            </div>
            <p style={{ fontSize: "11px", color: "#aaa", marginBottom: "10px" }}>⠿ をドラッグして順番を変更。「保存」で確定、「元に戻す」で直前の状態に戻せます。</p>
            <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
              <button onClick={() => setSortDay("day1")} style={dayBtnStyle(sortDay === "day1", "#1976d2")}>1日目</button>
              <button onClick={() => setSortDay("day2")} style={dayBtnStyle(sortDay === "day2", "#e10102")}>2日目</button>
              <button onClick={() => setSortDay("both")} style={dayBtnStyle(sortDay === "both", "#4caf50")}>全て</button>
            </div>
            <DragList
              all={entries}
              filterDay={sortDay}
              onSave={saveEntryOrder}
              renderItem={(entry) => (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: "bold", fontSize: "14px" }}>{entry.name}</span>
                      {dayBadge(entry.festival_day)}
                      {entry.datetime && <span style={{ fontSize: "12px", color: "#1976d2", marginLeft: "6px" }}>🕐 {entry.datetime}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0, marginLeft: "8px" }}>
                      <span style={{ fontSize: "11px", color: "#aaa" }}>順</span>
                      <input
                        type="number"
                        defaultValue={entry.order_num}
                        onBlur={async (ev) => {
                          const val = parseInt(ev.target.value, 10);
                          if (!isNaN(val) && val !== entry.order_num) {
                            await fetch("/api/event-entries/order", {
                              method: "POST", headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ items: [{ id: entry.id, order_num: val }] }),
                            });
                            loadEntries();
                          }
                        }}
                        style={{ width: "52px", padding: "3px 5px", fontSize: "12px", border: "1px solid #ddd", borderRadius: "4px", textAlign: "center" }}
                      />
                    </div>
                    <button onClick={() => deleteEntry(entry.id)} style={{ color: "#f44336", background: "none", border: "none", cursor: "pointer", fontSize: "12px", flexShrink: 0, marginLeft: "4px" }}>削除</button>
                  </div>
                  {entry.description && <p style={{ fontSize: "12px", color: "#888", margin: "2px 0 0" }}>{entry.description}</p>}
                  {editingId === entry.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                      <textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} rows={2}
                        style={{ padding: "8px", fontSize: "13px", borderRadius: "6px", border: "1px solid #ccc", resize: "vertical", fontFamily: "sans-serif" }} />
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => saveComment(entry.id)} style={{ padding: "4px 14px", fontSize: "12px", cursor: "pointer", backgroundColor: "#e10102", color: "white", border: "none", borderRadius: "6px" }}>保存</button>
                        <button onClick={() => setEditingId(null)} style={{ padding: "4px 14px", fontSize: "12px", cursor: "pointer", backgroundColor: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: "6px" }}>ｷｬﾝｾﾙ</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                      <p style={{ fontSize: "12px", color: entry.comment ? "#666" : "#ccc", margin: 0, flex: 1, whiteSpace: "pre-line" }}>💬 {entry.comment || "一言未設定"}</p>
                      <button onClick={() => { setEditingId(entry.id); setEditComment(entry.comment ?? ""); }}
                        style={{ fontSize: "11px", color: "#1976d2", background: "none", border: "1px solid #1976d2", borderRadius: "4px", padding: "2px 8px", cursor: "pointer", flexShrink: 0, marginLeft: "6px" }}>編集</button>
                    </div>
                  )}
                </div>
              )}
            />
          </div>
        </>
      )}

      {/* ── 部活動企画管理 ── */}
      {mainTab === "programs" && (
        <>
          <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
            {PROGRAM_VENUES.map((v) => (
              <button key={v.key} onClick={() => setProgVenueKey(v.key)} style={{ ...subBtnStyle(progVenueKey === v.key), flex: 1 }}>{v.label}</button>
            ))}
          </div>
          <div style={{ padding: "16px", border: "1px solid #eee", borderRadius: "10px", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <input placeholder="部活名 *" value={pName} onChange={(e) => setPName(e.target.value)} style={inputStyle} />
            <input placeholder="時刻（任意）例: 10:00〜11:00" value={pDatetime} onChange={(e) => setPDatetime(e.target.value)} style={inputStyle} />
            <label style={{ fontSize: "13px", color: "#555" }}>
              実施日
              <select value={pFestivalDay} onChange={(e) => setPFestivalDay(e.target.value as FestivalDay)} style={{ ...selectStyle, marginTop: "4px" }}>
                {DAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <textarea placeholder="一言（任意・改行可）" value={pComment} onChange={(e) => setPComment(e.target.value)} rows={2}
              style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", resize: "vertical", fontFamily: "sans-serif" }} />
            <button onClick={addProgram} disabled={pSaving}
              style={{ padding: "10px", fontSize: "14px", cursor: pSaving ? "not-allowed" : "pointer", backgroundColor: pSaving ? "#ccc" : "#e10102", color: "white", border: "none", borderRadius: "6px" }}>
              {pSaving ? "追加中..." : "追加"}
            </button>
          </div>

          {/* 部活動企画＋イベント出場者を混在で並び替え */}
          {(() => {
            const CATEGORY_LABELS_ADM: Record<string, string> = {
              "nodojiman-1": "🎤 のど自慢（1日目）", "nodojiman-2": "🎤 のど自慢（2日目①）",
              "nodojiman-3": "🎤 のど自慢（2日目②）", "coscon_performance": "👗 コスコン（P）",
              "coscon_runway": "🏃 コスコン（R）", "m1": "🎭 M1", "live": "🎵 ライブ",
            };
            // programs と mergedEntries を _kind フラグ付きで統合
            type MergedRow = { id: string; order_num: number; festival_day: string; _kind: "program" | "entry"; name?: string; datetime?: string | null; comment?: string; category?: string };
            const mergedAll: MergedRow[] = [
              ...programs.map((p) => ({ ...p, _kind: "program" as const, festival_day: p.festival_day ?? "both" })),
              ...mergedEntries.map((e) => ({ ...e, _kind: "entry" as const, festival_day: e.festival_day ?? "both", name: e.name })),
            ].sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0));

            return (
              <>
                <h2 style={{ fontSize: "15px", marginBottom: "8px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>
                  {PROGRAM_VENUES.find((v) => v.key === progVenueKey)?.label} — 部活動企画＋イベント 並び替え
                </h2>
                <p style={{ fontSize: "11px", color: "#aaa", marginBottom: "10px" }}>⠿ をドラッグして順番を変更。部活動企画（白）とイベント出場者（赤枠）を混在して並べられます。</p>
                <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
                  <button onClick={() => setPSortDay("day1")} style={dayBtnStyle(pSortDay === "day1", "#1976d2")}>1日目</button>
                  <button onClick={() => setPSortDay("day2")} style={dayBtnStyle(pSortDay === "day2", "#e10102")}>2日目</button>
                  <button onClick={() => setPSortDay("both")} style={dayBtnStyle(pSortDay === "both", "#4caf50")}>全て</button>
                </div>
                <DragList
                  all={mergedAll}
                  filterDay={pSortDay}
                  onSave={(sorted) => saveProgramOrder(sorted as Array<{ id: string; order_num: number; _kind: "program" | "entry" }>)}
                  renderItem={(item) => {
                    const row = item as MergedRow;
                    const isEntry = row._kind === "entry";
                    return (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                        backgroundColor: isEntry ? "#fff5f5" : "transparent",
                        border: isEntry ? "1px solid #ffd0d0" : "none",
                        borderRadius: isEntry ? "6px" : "0", padding: isEntry ? "4px 8px" : "0" }}>
                        <div>
                          <span style={{ fontWeight: "bold", fontSize: "14px", color: isEntry ? "#c62828" : "#222" }}>
                            {isEntry ? (CATEGORY_LABELS_ADM[row.category ?? ""] ?? row.category) : row.name}
                          </span>
                          {dayBadge(row.festival_day)}
                          {!isEntry && row.datetime && <p style={{ fontSize: "12px", color: "#1976d2", margin: "2px 0 0" }}>🕐 {row.datetime}</p>}
                          {!isEntry && row.comment   && <p style={{ fontSize: "12px", color: "#666", margin: "2px 0 0", whiteSpace: "pre-line" }}>{row.comment}</p>}
                          {isEntry && <p style={{ fontSize: "11px", color: "#aaa", margin: "1px 0 0" }}>イベント出場者（詳細は出場者管理で設定）</p>}
                        </div>
                        {!isEntry && (
                          <button onClick={() => deleteProgram(row.id)} style={{ color: "#f44336", background: "none", border: "none", cursor: "pointer", fontSize: "12px", flexShrink: 0, marginLeft: "8px" }}>削除</button>
                        )}
                      </div>
                    );
                  }}
                />
              </>
            );
          })()}
        </>
      )}

      {/* ── 会場イベント管理（図書館含む） ── */}
      {mainTab === "venue" && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" }}>
            {VENUE_KEYS.map((v) => (
              <button key={v.key} onClick={() => setVenueKey(v.key)} style={subBtnStyle(venueKey === v.key)}>{v.label}</button>
            ))}
          </div>
          <div style={{ padding: "16px", border: "1px solid #eee", borderRadius: "10px", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <input placeholder="イベントタイトル *" value={vTitle} onChange={(e) => setVTitle(e.target.value)} style={inputStyle} />
            <input placeholder="時刻（任意）例: 10:00〜11:30" value={vDatetime} onChange={(e) => setVDatetime(e.target.value)} style={inputStyle} />
            <textarea placeholder="一言・説明（任意・改行可）" value={vDescription} onChange={(e) => setVDescription(e.target.value)} rows={2}
              style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", resize: "vertical", fontFamily: "sans-serif" }} />
            <button onClick={addVenueEvent} disabled={vSubmitting}
              style={{ padding: "10px", fontSize: "14px", cursor: vSubmitting ? "not-allowed" : "pointer", backgroundColor: vSubmitting ? "#ccc" : "#1976d2", color: "white", border: "none", borderRadius: "6px" }}>
              {vSubmitting ? "追加中..." : "追加"}
            </button>
          </div>
          <h2 style={{ fontSize: "15px", marginBottom: "12px", borderBottom: "2px solid #1976d2", paddingBottom: "6px" }}>
            {VENUE_KEYS.find((v) => v.key === venueKey)?.label} イベント一覧
          </h2>
          {venueEvents.length === 0 ? <p style={{ color: "#aaa", fontSize: "13px" }}>まだ登録がありません</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {venueEvents.map((ev) => (
                <div key={ev.id} style={{ padding: "12px 16px", border: "1px solid #eee", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontWeight: "bold", fontSize: "14px", margin: 0 }}>{ev.title}</p>
                    {ev.datetime && <p style={{ fontSize: "12px", color: "#1976d2", margin: "2px 0 0" }}>🕐 {ev.datetime}</p>}
                    {ev.description && <p style={{ fontSize: "13px", color: "#666", margin: "4px 0 0", whiteSpace: "pre-line" }}>{ev.description}</p>}
                  </div>
                  <button onClick={() => deleteVenueEvent(ev.id)} style={{ color: "#f44336", background: "none", border: "none", cursor: "pointer", fontSize: "13px", flexShrink: 0, marginLeft: "8px" }}>削除</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
