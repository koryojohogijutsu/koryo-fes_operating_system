"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

type Notice = { id: string; title: string; body: string; image_url?: string; created_at: string };
type Lost   = { id: string; time: string; place: string; memo: string; image_url?: string; created_at: string };

export default function AdminInfoPage() {
  const router = useRouter();
  const [notices,    setNotices]    = useState<Notice[]>([]);
  const [lost,       setLost]       = useState<Lost[]>([]);
  const [tab,        setTab]        = useState<"notice" | "lost">("notice");
  const [authed,     setAuthed]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const lastNoticeRef = useRef<number>(0);
  const lastLostRef   = useRef<number>(0);
  const [nTitle,  setNTitle]  = useState("");
  const [nBody,   setNBody]   = useState("");
  const [nImage,  setNImage]  = useState<File | null>(null); // お知らせ画像
  const [lTime,   setLTime]   = useState("");
  const [lPlace,  setLPlace]  = useState("");
  const [lMemo,   setLMemo]   = useState("");
  const [lImage,  setLImage]  = useState<File | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/info?_t=${Date.now()}`, { cache: "no-store" });
    const d   = await res.json();
    setNotices(d.notices ?? []);
    setLost(d.lost ?? []);
  }, []);

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") { router.push("/admin/login"); return; }
    setAuthed(true);
    load();
  }, [router, load]);

  const uploadImage = async (id: string, file: File, type: "notice" | "lost") => {
    setUploadingId(id);
    const form = new FormData();
    form.append("file", file);
    if (type === "notice") form.append("noticeId", id);
    else                   form.append("lostId",   id);
    await fetch("/api/info/manage", { method: "POST", body: form });
    setUploadingId(null);
  };

  const addNotice = async () => {
    if (!nTitle || !nBody) { alert("タイトルと本文を入力してください"); return; }
    const now = Date.now();
    if (now - lastNoticeRef.current < 5000) { alert("操作が早すぎます"); return; }
    lastNoticeRef.current = now;
    setSubmitting(true);
    const res = await fetch("/api/info/manage", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "notice", title: nTitle, body: nBody }),
    });
    if (res.ok) {
      const d = await res.json();
      if (nImage && d.id) await uploadImage(d.id, nImage, "notice");
      setNTitle(""); setNBody(""); setNImage(null);
      await load();
    } else { const d = await res.json(); alert("エラー: " + d.error); }
    setSubmitting(false);
  };

  const addLost = async () => {
    if (!lTime || !lPlace || !lMemo) { alert("すべての項目を入力してください"); return; }
    const now = Date.now();
    if (now - lastLostRef.current < 5000) { alert("操作が早すぎます"); return; }
    lastLostRef.current = now;
    setSubmitting(true);
    const res = await fetch("/api/info/manage", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "lost", time: lTime, place: lPlace, memo: lMemo }),
    });
    if (res.ok) {
      const d = await res.json();
      if (lImage && d.id) await uploadImage(d.id, lImage, "lost");
      setLTime(""); setLPlace(""); setLMemo(""); setLImage(null);
      await load();
    } else { const d = await res.json(); alert("エラー: " + d.error); }
    setSubmitting(false);
  };

  const deleteItem = async (type: "notice" | "lost", id: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch("/api/info/manage", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id }),
    });
    await load();
  };

  if (!authed) return null;

  const inputStyle: React.CSSProperties = { padding: "10px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", width: "100%", boxSizing: "border-box" as const };
  const tabStyle = (t: string): React.CSSProperties => ({
    flex: 1, padding: "10px", fontSize: "14px", cursor: "pointer",
    border: "2px solid", borderColor: tab === t ? "#e10102" : "#ddd",
    backgroundColor: tab === t ? "#fff5f5" : "white",
    color: tab === t ? "#e10102" : "#555", fontWeight: tab === t ? "bold" : "normal",
    borderRadius: "8px",
  });

  return (
    <main style={{ padding: "20px", maxWidth: "560px", margin: "0 auto" }}>
      <a href="/admin" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "16px" }}>← 管理者メニュー</a>
      <h1 style={{ fontSize: "20px", marginBottom: "20px" }}>ℹ️ インフォメーション管理</h1>

      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        <button onClick={() => setTab("notice")} style={tabStyle("notice")}>📢 お知らせ</button>
        <button onClick={() => setTab("lost")}   style={tabStyle("lost")}>🎒 落とし物</button>
      </div>

      {/* お知らせタブ */}
      {tab === "notice" && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "16px", border: "1px solid #eee", borderRadius: "10px", marginBottom: "24px" }}>
            <input placeholder="タイトル *" value={nTitle} onChange={(e) => setNTitle(e.target.value)} style={inputStyle} />
            <textarea placeholder="本文 *（改行可）" value={nBody} onChange={(e) => setNBody(e.target.value)} rows={3}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "sans-serif" }} />
            <div>
              <p style={{ fontSize: "13px", color: "#555", marginBottom: "4px" }}>画像（任意）</p>
              <input type="file" accept="image/*" onChange={(e) => setNImage(e.target.files?.[0] ?? null)} style={{ fontSize: "13px" }} />
            </div>
            <button onClick={addNotice} disabled={submitting}
              style={{ padding: "10px", fontSize: "14px", cursor: "pointer", backgroundColor: submitting ? "#ccc" : "#e10102", color: "white", border: "none", borderRadius: "6px" }}>
              {submitting ? "追加中..." : "お知らせを追加"}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {notices.length === 0 && <p style={{ color: "#aaa", fontSize: "14px" }}>お知らせはありません</p>}
            {notices.map((n) => (
              <div key={n.id} style={{ padding: "14px 16px", border: "1px solid #eee", borderRadius: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontWeight: "bold", fontSize: "14px" }}>{n.title}</span>
                  <button onClick={() => deleteItem("notice", n.id)} style={{ color: "#f44336", background: "none", border: "none", cursor: "pointer", fontSize: "13px" }}>削除</button>
                </div>
                <p style={{ fontSize: "13px", color: "#444", whiteSpace: "pre-line", margin: "0 0 8px" }}>{n.body}</p>
                {/* 画像：全景表示 */}
                {n.image_url && (
                  <img src={n.image_url} alt="お知らせ画像"
                    style={{ width: "100%", borderRadius: "8px", display: "block", objectFit: "contain", backgroundColor: "#f5f5f5" }} />
                )}
                {/* 後から画像追加 */}
                {!n.image_url && (
                  <div style={{ marginTop: "6px" }}>
                    <input type="file" accept="image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        const input = e.target;
                        if (f) { await uploadImage(n.id, f, "notice"); input.value = ""; await load(); }
                      }}
                      style={{ fontSize: "12px" }} />
                    {uploadingId === n.id && <span style={{ fontSize: "12px", color: "#aaa" }}>アップロード中...</span>}
                  </div>
                )}
                <p style={{ fontSize: "11px", color: "#aaa", margin: "8px 0 0" }}>
                  {new Date(n.created_at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 落とし物タブ */}
      {tab === "lost" && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "16px", border: "1px solid #eee", borderRadius: "10px", marginBottom: "24px" }}>
            <input placeholder="時刻 *（例: 13:30頃）" value={lTime} onChange={(e) => setLTime(e.target.value)} style={inputStyle} />
            <input placeholder="場所 *（例: 体育館入口付近）" value={lPlace} onChange={(e) => setLPlace(e.target.value)} style={inputStyle} />
            <textarea placeholder="内容 *（例: 黒いリュック）" value={lMemo} onChange={(e) => setLMemo(e.target.value)} rows={2}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "sans-serif" }} />
            <div>
              <p style={{ fontSize: "13px", color: "#555", marginBottom: "4px" }}>写真（任意）</p>
              <input type="file" accept="image/*" onChange={(e) => setLImage(e.target.files?.[0] ?? null)} style={{ fontSize: "13px" }} />
            </div>
            <button onClick={addLost} disabled={submitting}
              style={{ padding: "10px", fontSize: "14px", cursor: "pointer", backgroundColor: submitting ? "#ccc" : "#e10102", color: "white", border: "none", borderRadius: "6px" }}>
              {submitting ? "追加中..." : "落とし物を追加"}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {lost.length === 0 && <p style={{ color: "#aaa", fontSize: "14px" }}>落とし物の情報はありません</p>}
            {lost.map((l) => (
              <div key={l.id} style={{ padding: "14px 16px", border: "1px solid #eee", borderRadius: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <div style={{ display: "flex", gap: "12px", fontSize: "13px", color: "#888" }}>
                    <span>🕐 {l.time}</span>
                    <span>📍 {l.place}</span>
                  </div>
                  <button onClick={() => deleteItem("lost", l.id)} style={{ color: "#f44336", background: "none", border: "none", cursor: "pointer", fontSize: "13px" }}>削除</button>
                </div>
                <p style={{ fontSize: "14px", color: "#444", margin: "0 0 8px", whiteSpace: "pre-line" }}>{l.memo}</p>
                {/* 写真：全景表示 */}
                {l.image_url ? (
                  <img src={l.image_url} alt="落とし物写真"
                    style={{ width: "100%", borderRadius: "8px", display: "block", objectFit: "contain", backgroundColor: "#f5f5f5" }} />
                ) : (
                  <div style={{ marginTop: "4px" }}>
                    <input type="file" accept="image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        const input = e.target;
                        if (f) { await uploadImage(l.id, f, "lost"); input.value = ""; await load(); }
                      }}
                      style={{ fontSize: "12px" }} />
                    {uploadingId === l.id && <span style={{ fontSize: "12px", color: "#aaa" }}>アップロード中...</span>}
                  </div>
                )}
                <p style={{ fontSize: "11px", color: "#aaa", margin: "8px 0 0" }}>
                  {new Date(l.created_at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
