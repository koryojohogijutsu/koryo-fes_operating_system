"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ClassesAdminPage() {
  const [classes, setClasses] = useState<{ id: string; code: string; label: string }[]>([]);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");

  const load = async () => {
    const { data } = await supabase.from("classes").select("*").order("code");
    setClasses(data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const addClass = async () => {
    if (!code || !label) {
      alert("コードと表示名を入力してください");
      return;
    }
    const { error } = await supabase.from("classes").insert({ code, label });
    if (error) {
      alert("エラー: " + error.message);
      return;
    }
    setCode("");
    setLabel("");
    load();
  };

  const deleteClass = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await supabase.from("classes").delete().eq("id", id);
    load();
  };

  return (
    <div style={{ padding: "20px", maxWidth: "500px" }}>
      <a href="/admin" style={{ fontSize: "13px", color: "#888", textDecoration: "none" }}>← 入場一覧に戻る</a>
      <h1>クラス管理</h1>

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <input
          placeholder="コード（例: 2-4）"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{ padding: "8px", fontSize: "15px", flex: 1 }}
        />
        <input
          placeholder="表示名（例: お化け屋敷）"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={{ padding: "8px", fontSize: "15px", flex: 2 }}
        />
        <button
          onClick={addClass}
          style={{ padding: "8px 16px", fontSize: "15px", cursor: "pointer" }}
        >
          追加
        </button>
      </div>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {classes.map((c) => (
          <li
            key={c.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 12px",
              borderBottom: "1px solid #eee",
            }}
          >
            <span>
              <strong>{c.code}</strong>　{c.label}
            </span>
            <button
              onClick={() => deleteClass(c.id)}
              style={{ color: "#f44336", background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}
            >
              削除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
