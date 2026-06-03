"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PIN_INFO_VENUES = [
  { key: "science", label: "🔬 科学物理部" },
  { key: "tetsudo", label: "🚃 鉄道研究部" },
  { key: "quiz",    label: "❓ クイズ研究会" },
  { key: "tea",     label: "🍵 茶道部" },
  { key: "shogi",   label: "♟️ 将棋部" },
  { key: "igo",     label: "⚫ 囲碁部" },
  { key: "kyudo",   label: "🏹 弓道部" },
  { key: "kyukei",  label: "🛋️ 休憩所" },
  { key: "nakatei", label: "🌿 中庭" },
];

// ★修正: サンデリカを追加
const MENU_VENUES = [
  { key: "tontonhiroba", label: "🏕️ とんとん広場" },
  { key: "football",     label: "⚽ サッカー部" },
  { key: "mockstore",    label: "🛒 模擬店" },
  { key: "sundelica",    label: "🍱 サンデリカ" },
];

type LibClub    = { id: string; name: string; comment: string };
type MenuItem   = { id: string; venue_key: string; title: string; description: string; image_url: string | null; price: number | null };
type VenueInfo  = { venue_key: string; title: string; description: string };

export default function PinContentPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [tab,    setTab]    = useState<"pin" | "doso" | "library" | "menu">("pin");

  // ピン情報
  const [pinVenueKey, setPinVenueKey] = useState(PIN_INFO_VENUES[0].key);
  const [pinDatetime, setPinDatetime] = useState("");
  const [pinContent,  setPinContent]  = useState("");
  const [pinSaving,   setPinSaving]   = useState(false);
  const [pinSaved,    setPinSaved]    = useState(false);

  // 同窓会
  const [dosoTitle,    setDosoTitle]    = useState("");
  const [dosoDatetime, setDosoDatetime] = useState("");
  const [dosoContent,  setDosoContent]  = useState("");
  const [dosoSaving,   setDosoSaving]   = useState(false);
  const [dosoSaved,    setDosoSaved]    = useState(false);

  // 図書館
  const [libClubs,   setLibClubs]   = useState<LibClub[]>([]);
  const [libName,    setLibName]    = useState("");
  const [libComment, setLibComment] = useState("");
  const [libSaving,  setLibSaving]  = useState(false);

  // メニュー
  const [menuVenueKey,   setMenuVenueKey]   = useState(MENU_VENUES[0].key);
  const [menuItems,      setMenuItems]      = useState<MenuItem[]>([]);
  const [venueInfos,     setVenueInfos]     = useState<Record<string, VenueInfo>>({});
  const [mTitle,         setMTitle]         = useState("");
  const [mDescription,   setMDescription]   = useState("");
  const [mPrice,         setMPrice]         = useState("");
  const [mImage,         setMImage]         = useState<File | null>(null);
  const [mSaving,        setMSaving]        = useState(false);
  const [vInfoTitle,     setVInfoTitle]     = useState("");
  const [vInfoDesc,      setVInfoDesc]      = useState("");
  const [vInfoSaving,    setVInfoSaving]    = useState(false);
  const [vInfoSaved,     setVInfoSaved]     = useState(false);
  const menuFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") { router.push("/admin/login"); return; }
    setAuthed(true);
  }, [router]);

  useEffect(() => {
    if (!authed || tab !== "pin") return;
    fetch(`/api/pin-info?venueKey=${pinVenueKey}`, { cache: "no-store" })
      .then((r) => r.json()).then((d) => {
        const item = d.items?.[0];
        setPinDatetime(item?.datetime ?? "");
        setPinContent(item?.content  ?? "");
      });
  }, [authed, tab, pinVenueKey]);

  useEffect(() => {
    if (!authed || tab !== "doso") return;
    fetch("/api/doso-info", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      setDosoTitle(d.info?.title    ?? "");
      setDosoDatetime(d.info?.datetime ?? "");
      setDosoContent(d.info?.content  ?? "");
    });
  }, [authed, tab]);

  useEffect(() => {
    if (!authed || tab !== "library") return;
    fetch("/api/library-clubs", { cache: "no-store" }).then((r) => r.json()).then((d) => setLibClubs(d.clubs ?? []));
  }, [authed, tab]);

  useEffect(() => {
    if (!authed || tab !== "menu") return;
    loadMenuData();
  }, [authed, tab, menuVenueKey]);

  const loadMenuData = async () => {
    const [itemsRes, infoRes] = await Promise.all([
      fetch(`/api/menu-items?venueKey=${menuVenueKey}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/menu-items?type=info&venueKey=${menuVenueKey}`, { cache: "no-store" }).then((r) => r.json()),
    ]);
    setMenuItems(itemsRes.items ?? []);
    const info: VenueInfo | undefined = (infoRes.infos ?? [])[0];
    setVInfoTitle(info?.title       ?? "");
    setVInfoDesc(info?.description  ?? "");
  };

  const savePinInfo = async () => {
    setPinSaving(true);
    await fetch("/api/pin-info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ venueKey: pinVenueKey, datetime: pinDatetime, content: pinContent }) });
    setPinSaving(false); setPinSaved(true); setTimeout(() => setPinSaved(false), 2000);
  };

  const saveDoso = async () => {
    setDosoSaving(true);
    await fetch("/api/doso-info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: dosoTitle, datetime: dosoDatetime, content: dosoContent }) });
    setDosoSaving(false); setDosoSaved(true); setTimeout(() => setDosoSaved(false), 2000);
  };

  const addLibClub = async () => {
    if (!libName) { alert("部活名を入力してください"); return; }
    setLibSaving(true);
    await fetch("/api/library-clubs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: libName, comment: libComment }) });
    setLibName(""); setLibComment("");
    const d = await fetch("/api/library-clubs", { cache: "no-store" }).then((r) => r.json());
    setLibClubs(d.clubs ?? []);
    setLibSaving(false);
  };

  const deleteLibClub = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch("/api/library-clubs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setLibClubs((prev) => prev.filter((c) => c.id !== id));
  };

  const saveVenueInfo = async () => {
    setVInfoSaving(true);
    await fetch("/api/menu-items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "info", venueKey: menuVenueKey, title: vInfoTitle, description: vInfoDesc }) });
    setVInfoSaving(false); setVInfoSaved(true); setTimeout(() => setVInfoSaved(false), 2000);
  };

  const addMenuItem = async () => {
    if (!mTitle) { alert("タイトルを入力してください"); return; }
    setMSaving(true);
    let imageUrl: string | null = null;
    if (mImage) {
      const fd = new FormData();
      fd.append("file", mImage); fd.append("bucket", "menu-items");
      fd.append("path", `${menuVenueKey}/${Date.now()}.${mImage.name.split(".").pop()}`);
      imageUrl = (await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json())).url ?? null;
    }
    const res = await fetch("/api/menu-items", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueKey: menuVenueKey, title: mTitle, description: mDescription, imageUrl, price: mPrice ? Number(mPrice) : null })
    });
    if (res.ok) {
      setMTitle(""); setMDescription(""); setMPrice(""); setMImage(null);
      // refを使わずonChangeで処理するのが基本だが、ここはprops経由でファイルリセットが必要なため許容
      if (menuFileRef.current) menuFileRef.current.value = "";
      await loadMenuData();
    } else { alert("エラー: " + (await res.json()).error); }
    setMSaving(false);
  };

  const deleteMenuItem = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch("/api/menu-items", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setMenuItems((prev) => prev.filter((m) => m.id !== id));
  };

  if (!authed) return null;

  const tabStyle = (t: string): React.CSSProperties => ({
    flex: 1, padding: "10px", fontSize: "13px", cursor: "pointer", borderRadius: "8px",
    border: "2px solid", borderColor: tab === t ? "#e10102" : "#ddd",
    backgroundColor: tab === t ? "#fff5f5" : "white",
    color: tab === t ? "#e10102" : "#555", fontWeight: tab === t ? "bold" : "normal",
  });
  const inputStyle: React.CSSProperties = { display: "block", width: "100%", marginTop: "4px", padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" };
  const textareaStyle: React.CSSProperties = { ...inputStyle, resize: "vertical", fontFamily: "sans-serif" };

  return (
    <main style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <Link href="/admin" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "16px" }}>← 管理者メニュー</Link>
      <h1 style={{ fontSize: "20px", marginBottom: "20px" }}>📌 ピン情報管理</h1>

      <div style={{ display: "flex", gap: "6px", marginBottom: "24px", flexWrap: "wrap" }}>
        <button onClick={() => setTab("pin")}     style={tabStyle("pin")}>部活・企画</button>
        <button onClick={() => setTab("doso")}    style={tabStyle("doso")}>同窓会</button>
        <button onClick={() => setTab("library")} style={tabStyle("library")}>図書館</button>
        <button onClick={() => setTab("menu")}    style={tabStyle("menu")}>メニュー</button>
      </div>

      {/* 部活・企画 */}
      {tab === "pin" && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
            {PIN_INFO_VENUES.map((v) => (
              <button key={v.key} onClick={() => setPinVenueKey(v.key)}
                style={{ padding: "7px 14px", fontSize: "13px", borderRadius: "20px", border: "2px solid", borderColor: pinVenueKey === v.key ? "#e10102" : "#ddd", backgroundColor: pinVenueKey === v.key ? "#fff5f5" : "white", color: pinVenueKey === v.key ? "#e10102" : "#555", cursor: "pointer" }}>
                {v.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
            <label style={{ fontSize: "13px", color: "#555" }}>日時<input value={pinDatetime} onChange={(e) => setPinDatetime(e.target.value)} placeholder="例: 9月15日 10:00〜12:00" style={inputStyle} /></label>
            <label style={{ fontSize: "13px", color: "#555" }}>内容<textarea value={pinContent} onChange={(e) => setPinContent(e.target.value)} rows={4} placeholder="企画・展示の内容や説明" style={textareaStyle} /></label>
          </div>
          <button onClick={savePinInfo} disabled={pinSaving}
            style={{ width: "100%", padding: "12px", fontSize: "14px", cursor: "pointer", backgroundColor: pinSaved ? "#4caf50" : "#e10102", color: "white", border: "none", borderRadius: "8px" }}>
            {pinSaving ? "保存中..." : pinSaved ? "✅ 保存しました" : "保存する"}
          </button>
        </>
      )}

      {/* 同窓会 */}
      {tab === "doso" && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
            <label style={{ fontSize: "13px", color: "#555" }}>タイトル<input value={dosoTitle} onChange={(e) => setDosoTitle(e.target.value)} placeholder="例: 第60回 蛟龍祭 同窓会" style={inputStyle} /></label>
            <label style={{ fontSize: "13px", color: "#555" }}>日時<input value={dosoDatetime} onChange={(e) => setDosoDatetime(e.target.value)} placeholder="例: 9月15日 13:00〜15:00" style={inputStyle} /></label>
            <label style={{ fontSize: "13px", color: "#555" }}>内容<textarea value={dosoContent} onChange={(e) => setDosoContent(e.target.value)} rows={4} placeholder="同窓会の内容・案内" style={textareaStyle} /></label>
          </div>
          <button onClick={saveDoso} disabled={dosoSaving}
            style={{ width: "100%", padding: "12px", fontSize: "14px", cursor: "pointer", backgroundColor: dosoSaved ? "#4caf50" : "#e10102", color: "white", border: "none", borderRadius: "8px" }}>
            {dosoSaving ? "保存中..." : dosoSaved ? "✅ 保存しました" : "保存する"}
          </button>
        </>
      )}

      {/* 図書館 */}
      {tab === "library" && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "16px", border: "1px solid #eee", borderRadius: "10px", marginBottom: "20px" }}>
            <input value={libName} onChange={(e) => setLibName(e.target.value)} placeholder="部活名 *" style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }} />
            <input value={libComment} onChange={(e) => setLibComment(e.target.value)} placeholder="一言（任意）" style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }} />
            <button onClick={addLibClub} disabled={libSaving}
              style={{ padding: "10px", fontSize: "14px", cursor: "pointer", backgroundColor: "#e10102", color: "white", border: "none", borderRadius: "6px" }}>
              {libSaving ? "追加中..." : "追加"}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {libClubs.length === 0 && <p style={{ color: "#aaa", fontSize: "13px" }}>まだ登録がありません</p>}
            {libClubs.map((c) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", border: "1px solid #eee", borderRadius: "8px" }}>
                <div>
                  <span style={{ fontWeight: "bold", fontSize: "14px" }}>{c.name}</span>
                  {c.comment && <span style={{ color: "#888", fontSize: "13px", marginLeft: "8px" }}>{c.comment}</span>}
                </div>
                <button onClick={() => deleteLibClub(c.id)} style={{ color: "#f44336", background: "none", border: "none", cursor: "pointer", fontSize: "13px" }}>削除</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* メニュー（サンデリカ含む） */}
      {tab === "menu" && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" }}>
            {MENU_VENUES.map((v) => (
              <button key={v.key} onClick={() => setMenuVenueKey(v.key)}
                style={{ padding: "8px 12px", fontSize: "13px", borderRadius: "8px", border: "2px solid", borderColor: menuVenueKey === v.key ? "#e10102" : "#ddd", backgroundColor: menuVenueKey === v.key ? "#fff5f5" : "white", color: menuVenueKey === v.key ? "#e10102" : "#555", cursor: "pointer" }}>
                {v.label}
              </button>
            ))}
          </div>

          {/* 会場タイトル・紹介文 */}
          <div style={{ padding: "16px", border: "2px solid #1976d2", borderRadius: "10px", marginBottom: "20px", backgroundColor: "#f8f9ff" }}>
            <h2 style={{ fontSize: "14px", color: "#1976d2", margin: "0 0 12px" }}>会場タイトル・紹介文</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input value={vInfoTitle} onChange={(e) => setVInfoTitle(e.target.value)} placeholder="タイトル（任意）"
                style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }} />
              <textarea value={vInfoDesc} onChange={(e) => setVInfoDesc(e.target.value)} rows={2} placeholder="紹介文（任意）"
                style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", resize: "vertical", fontFamily: "sans-serif" }} />
              <button onClick={saveVenueInfo} disabled={vInfoSaving}
                style={{ padding: "10px", fontSize: "14px", cursor: "pointer", backgroundColor: vInfoSaved ? "#4caf50" : "#1976d2", color: "white", border: "none", borderRadius: "6px" }}>
                {vInfoSaving ? "保存中..." : vInfoSaved ? "✅ 保存しました" : "タイトル・紹介文を保存"}
              </button>
            </div>
          </div>

          {/* メニューアイテム追加 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "16px", border: "1px solid #eee", borderRadius: "10px", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "14px", color: "#555", margin: "0 0 4px" }}>メニューアイテム追加</h2>
            <input value={mTitle} onChange={(e) => setMTitle(e.target.value)} placeholder="メニュー名 *" style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }} />
            <input value={mDescription} onChange={(e) => setMDescription(e.target.value)} placeholder="紹介文（任意）" style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }} />
            <input value={mPrice} onChange={(e) => setMPrice(e.target.value)} placeholder="値段（円）" type="number" min={0} style={{ padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc" }} />
            <div>
              <p style={{ fontSize: "13px", color: "#555", marginBottom: "4px" }}>画像（任意）</p>
              <input ref={menuFileRef} type="file" accept="image/*" onChange={(e) => setMImage(e.target.files?.[0] ?? null)} style={{ fontSize: "13px" }} />
            </div>
            <button onClick={addMenuItem} disabled={mSaving}
              style={{ padding: "10px", fontSize: "14px", cursor: "pointer", backgroundColor: mSaving ? "#ccc" : "#e10102", color: "white", border: "none", borderRadius: "6px" }}>
              {mSaving ? "追加中..." : "追加"}
            </button>
          </div>

          {/* メニューアイテム一覧 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {menuItems.length === 0 && <p style={{ color: "#aaa", fontSize: "13px" }}>まだ登録がありません</p>}
            {menuItems.map((m) => (
              <div key={m.id} style={{ padding: "14px 16px", border: "1px solid #eee", borderRadius: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                  <div>
                    <span style={{ fontWeight: "bold", fontSize: "15px" }}>{m.title}</span>
                    {m.price !== null && <span style={{ color: "#e10102", fontWeight: "bold", fontSize: "14px", marginLeft: "8px" }}>¥{m.price}</span>}
                  </div>
                  <button onClick={() => deleteMenuItem(m.id)} style={{ color: "#f44336", background: "none", border: "none", cursor: "pointer", fontSize: "13px" }}>削除</button>
                </div>
                {m.description && <p style={{ fontSize: "13px", color: "#666", margin: "0 0 6px" }}>{m.description}</p>}
                {m.image_url && <img src={m.image_url} alt={m.title} style={{ width: "100%", maxHeight: "160px", objectFit: "cover", borderRadius: "8px" }} />}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
