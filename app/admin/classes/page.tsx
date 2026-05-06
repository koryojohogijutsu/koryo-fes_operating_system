"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ClassesAdminPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<{ id: string; code: string; label: string }[]>([]);
  const [code,    setCode]    = useState("");
  const [label,   setLabel]   = useState("");
  const [authed,  setAuthed]  = useState(false);

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") { router.push("/admin/login"); return; }
    setAuthed(true);
    load();
  }, [router]);

  const load = async () => {
    const { data } = await supabase.from("classes").select("*").order("code");
    setClasses(data ?? []);
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
    if (res.ok) { load(); }
    else { const d = await res.json(); alert("エラー: " + d.error); }
  };

  if (!authed) return null;

  return (
    <div style={{ padding: "20px", maxWidth: "500px" }}>
      <a href="/admin" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "16px" }}>← 管理者メニューに戻る</a>
      <h1>クラス管理</h1>

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        <input placeholder="コード（例: 2-4）" value={code} onChange={(e) => setCode(e.target.value)}
          style={{ padding: "8px", fontSize: "15px", flex: 1, minWidth: "100px" }} />
        <input placeholder="表示名（例: お化け屋敷）" value={label} onChange={(e) => setLabel(e.target.value)}
          style={{ padding: "8px", fontSize: "15px", flex: 2, minWidth: "140px" }} />
        <button onClick={addClass} style={{ padding: "8px 16px", fontSize: "15px", cursor: "pointer" }}>追加</button>
      </div>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {classes.map((c) => (
          <li key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #eee" }}>
            <span><strong>{c.code}</strong>　{c.label}</span>
            <button onClick={() => deleteClass(c.id)}
              style={{ color: "#f44336", background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}>
              削除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
