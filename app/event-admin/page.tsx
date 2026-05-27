"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ENTRY_CATEGORIES = [
  { key: "nodojiman-1",        label: "🎤 のど自慢（1日目）",           hasMembers: false },
  { key: "nodojiman-2",        label: "🎤 のど自慢（2日目①）",          hasMembers: false },
  { key: "nodojiman-3",        label: "🎤 のど自慢（2日目②）",          hasMembers: false },
  { key: "coscon_performance", label: "👗 コスコン（パフォーマンス）",   hasMembers: true  },
  { key: "coscon_runway",      label: "🏃 コスコン（ランウェイ）",       hasMembers: true  },
  { key: "m1",                 label: "🎭 M1",                          hasMembers: false },
  { key: "live",               label: "🎵 ライブ",                      hasMembers: false },
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
];

type FestivalDay  = "day1" | "day2" | "both";
type Settings     = { day1_date: string; day2_date: string };
type Entry        = { id: string; name: string; description: string; comment: string; datetime: string | null; image_url: string | null; members: string | null; festival_day: string; order_num: number };
type VenueEvent   = { id: string; venue_key: string; title: string; description: string; order_num: number };
type VenueProgram = { id: string; venue_key: string; name: string; datetime: string; comment: string; festival_day: string };

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
  const [eFestivalDay,  setEFestivalDay]  = useState<FestivalDay>("both");
  const [eImage,        setEImage]        = useState<File | null>(null);
  const [eSubmitting,   setESubmitting]   = useState(false);
  const [editingId,     setEditingId]     = useState<string | null>(null);
  const [editComment,   setEditComment]   = useState("");
  const entryFileRef = useRef<HTMLInputElement>(null);

  // 部活動企画管理
  const [progVenueKey, setProgVenueKey] = useState("gym");
  const [programs,     setPrograms]     = useState<VenueProgram[]>([]);
  const [pName,        setPName]        = useState("");
  const [pDatetime,    setPDatetime]    = useState("");
  const [pComment,     setPComment]     = useState("");
  const [pFestivalDay, setPFestivalDay] = useState<FestivalDay>("both");
  const [pSaving,      setPSaving]      = useState(false);

  // 会場イベント管理
  const [venueKey,     setVenueKey]     = useState("gym");
  const [venueEvents,  setVenueEvents]  = useState<VenueEvent[]>([]);
  const [vTitle,       setVTitle]       = useState("");
  const [vDescription, setVDescription] = useState("");
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

  const loadEntries = async () => {
    const res = await fetch(`/api/event-entries?category=${entryCategory}`, { cache: "no-store" });
    setEntries((await res.json()).entries ?? []);
  };
  const loadPrograms = async () => {
    const res = await fetch(`/api/venue-programs?venueKey=${progVenueKey}`, { cache: "no-store" });
    setPrograms((await res.json()).programs ?? []);
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
      body: JSON.stringify({ category: entryCategory, name: eName, description: eDesc, comment: eComment, datetime: eDatetime || null, imageUrl, members: eMembers || null, festivalDay: eFestivalDay }),
    });
    if (res.ok) {
      setEName(""); setEDesc(""); setEComment(""); setEDatetime(""); setEMembers(""); setEImage(null); setEFestivalDay("both");
      if (entryFileRef.current) entryFileRef.current.value = "";
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

  const addProgram = async () => {
    if (!pName) { alert("部活名を入力してください"); return; }
    setPSaving(true);
    const res = await fetch("/api/venue-programs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueKey: progVenueKey, name: pName, datetime: pDatetime, comment: pComment, festivalDay: pFestivalDay }),
    });
    if (res.ok) { setPName(""); setPDatetime(""); setPComment(""); setPFestivalDay("both"); loadPrograms(); }
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
    const res = await fetch("/api/venue-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ venueKey, title: vTitle, description: vDescription }) });
    if (res.ok) { setVTitle(""); setVDescription(""); loadVenueEvents(); }
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
      day1: { text: `1日目(${settings.day1_date})`, color: "#1976d2" },
      day2: { text: `2日目(${settings.day2_date})`, color: "#e10102" },
      both: { text: "両日",                          color: "#4caf50" },
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
  const selectStyle: React.CSSProperties = { padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", width: "100%" };

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
          <div style={{ padding: "16px", border: "1px solid #eee", borderRadius: "10px", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <input placeholder="名前 *" value={eName} onChange={(e) => setEName(e.target.value)} style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }} />
            <input placeholder="出場内容（任意）" value={eDesc} onChange={(e) => setEDesc(e.target.value)} style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }} />
            <input placeholder="時刻（任意）例: 14:00〜" value={eDatetime} onChange={(e) => setEDatetime(e.target.value)} style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }} />
            <label style={{ fontSize: "13px", color: "#555" }}>
              出演日
              <select value={eFestivalDay} onChange={(e) => setEFestivalDay(e.target.value as FestivalDay)} style={{ ...selectStyle, marginTop: "4px" }}>
                {DAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <textarea placeholder="一言コメント（任意）" value={eComment} onChange={(e) => setEComment(e.target.value)} rows={2}
              style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", resize: "vertical", fontFamily: "sans-serif" }} />
            {currentCategory?.hasMembers && (
              <textarea placeholder="参加者氏名（任意・改行区切り）" value={eMembers} onChange={(e) => setEMembers(e.target.value)} rows={3}
                style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", resize: "vertical", fontFamily: "sans-serif" }} />
            )}
            <div>
              <p style={{ fontSize: "13px", color: "#555", marginBottom: "4px" }}>画像（任意）</p>
              <input ref={entryFileRef} type="file" accept="image/*" onChange={(e) => setEImage(e.target.files?.[0] ?? null)} style={{ fontSize: "13px" }} />
            </div>
            <button onClick={addEntry} disabled={eSubmitting}
              style={{ padding: "10px", fontSize: "14px", cursor: eSubmitting ? "not-allowed" : "pointer", backgroundColor: eSubmitting ? "#ccc" : "#e10102", color: "white", border: "none", borderRadius: "6px" }}>
              {eSubmitting ? "追加中..." : "追加"}
            </button>
          </div>
          <h2 style={{ fontSize: "15px", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>{currentCategory?.label} 出場者一覧</h2>
          {entries.length === 0 ? <p style={{ color: "#aaa", fontSize: "13px" }}>まだ登録がありません</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {entries.map((entry) => (
                <div key={entry.id} style={{ padding: "14px 16px", border: "1px solid #eee", borderRadius: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <span style={{ fontWeight: "bold", fontSize: "15px" }}>{entry.name}</span>
                      {dayBadge(entry.festival_day)}
                      {entry.description && <span style={{ color: "#888", fontSize: "13px", marginLeft: "8px" }}>{entry.description}</span>}
                      {entry.datetime && <p style={{ fontSize: "12px", color: "#1976d2", margin: "2px 0 0" }}>🕐 {entry.datetime}</p>}
                      {entry.members  && <p style={{ fontSize: "12px", color: "#555",    margin: "2px 0 0" }}>👥 {entry.members.split("\n").join("、")}</p>}
                    </div>
                    <button onClick={() => deleteEntry(entry.id)} style={{ color: "#f44336", background: "none", border: "none", cursor: "pointer", fontSize: "13px" }}>削除</button>
                  </div>
                  {entry.image_url && <img src={entry.image_url} alt={entry.name} style={{ width: "100%", maxHeight: "160px", objectFit: "cover", borderRadius: "8px", marginBottom: "8px" }} />}
                  {editingId === entry.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} rows={2}
                        style={{ padding: "8px", fontSize: "13px", borderRadius: "6px", border: "1px solid #ccc", resize: "vertical", fontFamily: "sans-serif" }} />
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => saveComment(entry.id)} style={{ padding: "6px 16px", fontSize: "13px", cursor: "pointer", backgroundColor: "#e10102", color: "white", border: "none", borderRadius: "6px" }}>保存</button>
                        <button onClick={() => setEditingId(null)} style={{ padding: "6px 16px", fontSize: "13px", cursor: "pointer", backgroundColor: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: "6px" }}>キャンセル</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <p style={{ fontSize: "13px", color: entry.comment ? "#444" : "#bbb", margin: 0, flex: 1 }}>💬 {entry.comment || "一言未設定"}</p>
                      <button onClick={() => { setEditingId(entry.id); setEditComment(entry.comment); }} style={{ fontSize: "12px", color: "#1976d2", background: "none", border: "1px solid #1976d2", borderRadius: "6px", padding: "3px 10px", cursor: "pointer", flexShrink: 0 }}>編集</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
            <input placeholder="部活名 *" value={pName} onChange={(e) => setPName(e.target.value)} style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }} />
            <input placeholder="時刻（任意）例: 10:00〜11:00" value={pDatetime} onChange={(e) => setPDatetime(e.target.value)} style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }} />
            <label style={{ fontSize: "13px", color: "#555" }}>
              実施日
              <select value={pFestivalDay} onChange={(e) => setPFestivalDay(e.target.value as FestivalDay)} style={{ ...selectStyle, marginTop: "4px" }}>
                {DAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <textarea placeholder="一言（任意）" value={pComment} onChange={(e) => setPComment(e.target.value)} rows={2}
              style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", resize: "vertical", fontFamily: "sans-serif" }} />
            <button onClick={addProgram} disabled={pSaving}
              style={{ padding: "10px", fontSize: "14px", cursor: pSaving ? "not-allowed" : "pointer", backgroundColor: pSaving ? "#ccc" : "#e10102", color: "white", border: "none", borderRadius: "6px" }}>
              {pSaving ? "追加中..." : "追加"}
            </button>
          </div>
          <h2 style={{ fontSize: "15px", marginBottom: "12px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>
            {PROGRAM_VENUES.find((v) => v.key === progVenueKey)?.label} 部活動企画一覧
          </h2>
          {programs.length === 0 ? <p style={{ color: "#aaa", fontSize: "13px" }}>まだ登録がありません</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {programs.map((p) => (
                <div key={p.id} style={{ padding: "12px 16px", border: "1px solid #eee", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontWeight: "bold", fontSize: "14px", margin: 0 }}>{p.name}{dayBadge(p.festival_day)}</p>
                    {p.datetime && <p style={{ fontSize: "12px", color: "#1976d2", margin: "2px 0 0" }}>🕐 {p.datetime}</p>}
                    {p.comment  && <p style={{ fontSize: "13px", color: "#666",    margin: "4px 0 0" }}>{p.comment}</p>}
                  </div>
                  <button onClick={() => deleteProgram(p.id)} style={{ color: "#f44336", background: "none", border: "none", cursor: "pointer", fontSize: "13px", flexShrink: 0, marginLeft: "8px" }}>削除</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── 会場イベント管理 ── */}
      {mainTab === "venue" && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" }}>
            {VENUE_KEYS.map((v) => (
              <button key={v.key} onClick={() => setVenueKey(v.key)} style={subBtnStyle(venueKey === v.key)}>{v.label}</button>
            ))}
          </div>
          <div style={{ padding: "16px", border: "1px solid #eee", borderRadius: "10px", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <input placeholder="イベントタイトル *" value={vTitle} onChange={(e) => setVTitle(e.target.value)} style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }} />
            <textarea placeholder="一言・説明（任意）" value={vDescription} onChange={(e) => setVDescription(e.target.value)} rows={2}
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
                    {ev.description && <p style={{ fontSize: "13px", color: "#666", margin: "4px 0 0" }}>{ev.description}</p>}
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
