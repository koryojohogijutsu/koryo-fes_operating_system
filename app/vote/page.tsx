"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Class = { code: string; label: string };

type Selections = {
  grade1:     string;
  grade2:     string;
  grade3:     string;
  decoration: string;
};

const CATEGORIES = [
  { key: "grade1",     label: "1年 最優秀賞", grade: 1 },
  { key: "grade2",     label: "2年 最優秀賞", grade: 2 },
  { key: "grade3",     label: "3年 最優秀賞", grade: 3 },
  { key: "decoration", label: "装飾賞（全学年）", grade: null },
] as const;

export default function VotePage() {
  const router = useRouter();
  const [enteredClasses, setEnteredClasses] = useState<string[]>([]);
  const [allClasses,     setAllClasses]     = useState<Class[]>([]);
  const [selections,     setSelections]     = useState<Selections>({ grade1: "", grade2: "", grade3: "", decoration: "" });
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    const visitorId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("visitor_id="))
      ?.split("=")[1];
    if (!visitorId) { router.push("/register"); return; }

    const load = async () => {
      const { data: visits } = await supabase
        .from("visits").select("class_code").eq("visitor_id", visitorId);
      setEnteredClasses([...new Set((visits ?? []).map((v) => v.class_code))] as string[]);

      const { data: classes } = await supabase
        .from("classes").select("code, label").order("code");
      setAllClasses(classes ?? []);
      setLoading(false);
    };
    load();
  }, [router]);

  const getClassesForCategory = (grade: number | null) =>
    allClasses.filter((c) => {
      if (!enteredClasses.includes(c.code)) return false;
      if (grade === null) return true;
      return c.code.startsWith(`${grade}-`);
    });

  const handleSelect = (key: keyof Selections, code: string) =>
    setSelections((prev) => ({ ...prev, [key]: prev[key] === code ? "" : code }));

  const handleNext = () => {
    const params = new URLSearchParams();
    Object.entries(selections).forEach(([k, v]) => { if (v) params.set(k, v); });
    router.push(`/vote/class/confirm?${params.toString()}`);
  };

  const hasAnySelection = Object.values(selections).some((v) => v !== "");

  if (loading) return <main style={{ padding: "40px", textAlign: "center" }}><p style={{ color: "#aaa" }}>読み込み中...</p></main>;

  return (
    <main style={{ padding: "24px 20px", maxWidth: "480px", margin: "0 auto" }}>
      <a href="/" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "20px" }}>
        ← ホームに戻る
      </a>
      <h1 style={{ fontSize: "20px", marginBottom: "6px" }}>🏫 クラス企画投票</h1>
      <p style={{ color: "#888", fontSize: "13px", marginBottom: "28px" }}>入場したクラスのみ投票できます</p>

      {CATEGORIES.map((cat) => {
        const classes = getClassesForCategory(cat.grade);
        return (
          <section key={cat.key} style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "10px", borderBottom: "2px solid #e10102", paddingBottom: "6px" }}>
              {cat.label}
            </h2>
            {classes.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: "13px" }}>
                {cat.grade !== null ? `${cat.grade}年のクラスにまだ入場していません` : "まだクラスに入場していません"}
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {classes.map((c) => {
                  const selected = selections[cat.key] === c.code;
                  return (
                    <div
                      key={c.code}
                      onClick={() => handleSelect(cat.key, c.code)}
                      style={{
                        padding: "12px 16px", borderRadius: "8px",
                        border: selected ? "2px solid #e10102" : "1px solid #ddd",
                        backgroundColor: selected ? "#fff5f5" : "white",
                        cursor: "pointer",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: "bold", marginRight: "8px" }}>{c.code}</span>
                        <span style={{ color: "#555" }}>{c.label}</span>
                      </div>
                      {selected && <span style={{ color: "#e10102", fontSize: "18px" }}>✔</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      <button
        onClick={handleNext}
        disabled={!hasAnySelection}
        style={{
          width: "100%", padding: "14px", fontSize: "16px",
          cursor: hasAnySelection ? "pointer" : "not-allowed",
          backgroundColor: hasAnySelection ? "#e10102" : "#ccc",
          color: "white", border: "none", borderRadius: "8px", marginTop: "8px",
        }}
      >
        確認画面へ
      </button>
    </main>
  );
}
