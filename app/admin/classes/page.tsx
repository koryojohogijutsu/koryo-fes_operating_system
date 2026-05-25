"use client";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ClassRow = { id: string; code: string; label: string; comment: string };

export default function ClassesAdminPage() {
  const router = useRouter();
  const [classes,        setClasses]        = useState<ClassRow[]>([]);
  const [code,           setCode]           = useState("");
  const [label,          setLabel]          = useState("");
  const [authed,         setAuthed]         = useState(false);
  const [editingComment, setEditingComment] = useState<{ id: string; value: string } | null>(null);
  const [savingComment,  setSavingComment]  = useState(false);

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") { router.push("/admin/login"); return; }
    setAuthed(true);
    load();
  }, [router]);

  const load = async () => {
    const { data } = await supabase.from("classes").select("*").order("code");
    const rows = (data ?? []) as unknown as ClassRow[];
    setClasses(rows.map((c) => ({ ...c, comment: c.comment ?? "" })));
  };

  const addClass = async () => {
    if (!code || !label) { alert("コードと表示名を入力してください"); return; }
    const res = await fetch("/api/classes/manage", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, label }),
    });
    if (res.ok) { setCode(""); setLabel(""); load(); }
    else { const d = await res.json(); alert("エラー: " + d.error); }
  };

  const deleteClass = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    const res = await fetch("/api/classes/manage", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
    else { const d = await res.json(); alert("エラー: " + d.error); }
  };

  const saveComment = async () => {
    if (!editingComment) return;
    setSavingComment(true);
    const { error } = await (supabase
      .from("classes") as any)
      .update({ comment: editingComment.value })
      .eq("id", editingComment.id);
    if (error) alert("エラー: " + (error as any).message);
    else {
      setClasses((prev) => prev.map((c) => c.id === editingComment.id ? { ...c, comment: editingComment.value } : c));
      setEditingComment(null);
    }
    setSavingComment(false);
  };

  if (!authed) return null;

  return (
    <div style={{ padding: "20px", maxWidth: "600px" }}>
      <a href="/admin" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "16px" }}>← 管理者メニューに戻る</a>
      <h1 style={{ marginBottom: "20px" }}>クラス管理</h1>
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
        <input placeholder="コード（例: 2-4）" value={code} onChange={(e) => setCode(e.target.value)}
          style={{ padding: "8px", fontSize: "15px", flex: 1, minWidth: "100px", borderRadius: "6px", border: "1px solid #ccc" }} />
        <input placeholder="表示名（例: お化け屋敷）" value={label} onChange={(e) => setLabel(e.target.value)}
          style={{ padding: "8px", fontSize: "15px", flex: 2, minWidth: "140px", borderRadius: "6px", border: "1px solid #ccc" }} />
        <button onClick={addClass}
          style={{ padding: "8px 16px", fontSize: "15px", cursor: "pointer", backgroundColor: "#e10102", color: "white", border: "none", borderRadius: "6px" }}>
          追加
        </button>
      </div>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {classes.map((c) => (
          <li key={c.id} style={{ padding: "12px", borderBottom: "1px solid #eee" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span><strong>{c.code}</strong>　{c.label}</span>
              <button onClick={() => deleteClass(c.id)}
                style={{ color: "#f44336", background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}>
                削除
              </button>
            </div>
            {editingComment?.id === c.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <textarea
                  value={editingComment.value}
                  onChange={(e) => setEditingComment({ ...editingComment, value: e.target.value })}
                  placeholder="混雑マップに表示するコメント（50〜100文字程度）"
                  rows={3}
                  style={{ padding: "8px", fontSize: "13px", borderRadius: "6px", border: "1px solid #ccc", resize: "vertical", fontFamily: "sans-serif" }}
                />
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={saveComment} disabled={savingComment}
                    style={{ padding: "6px 16px", fontSize: "13px", cursor: "pointer", backgroundColor: "#e10102", color: "white", border: "none", borderRadius: "6px" }}>
                    {savingComment ? "保存中..." : "保存"}
                  </button>
                  <button onClick={() => setEditingComment(null)}
                    style={{ padding: "6px 16px", fontSize: "13px", cursor: "pointer", backgroundColor: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: "6px" }}>
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                <p style={{ fontSize: "13px", color: c.comment ? "#444" : "#bbb", margin: 0, flex: 1 }}>
                  {c.comment || "コメント未設定"}
                </p>
                <button onClick={() => setEditingComment({ id: c.id, value: c.comment })}
                  style={{ fontSize: "12px", color: "#1976d2", background: "none", border: "1px solid #1976d2", borderRadius: "6px", padding: "3px 10px", cursor: "pointer", flexShrink: 0 }}>
                  編集
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
