"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffSettingsPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<{ code: string; label: string }[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 既存のcookieから設定を読み込む
    const stored = document.cookie
      .split("; ")
      .find((row) => row.startsWith("staff_class_code="))
      ?.split("=")[1];
    if (stored) setSelected(stored);

    // クラス一覧を取得
    fetch("/api/classes", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setClasses(data.classes ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = () => {
    if (!selected) {
      alert("クラスを選択してください");
      return;
    }
    const cls = classes.find((c) => c.code === selected);

    // cookieに保存（1年間有効）
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = `staff_class_code=${selected}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
    document.cookie = `staff_class_label=${encodeURIComponent(cls?.label ?? "")}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;

    router.push("/staff");
  };

  return (
    <main style={{ padding: "30px 20px", maxWidth: "400px", margin: "0 auto" }}>
      <h1>クラス設定</h1>
      <p style={{ color: "#666", fontSize: "14px" }}>
        この端末で入場受付するクラスを選択してください
      </p>

      {loading ? (
        <p>読み込み中...</p>
      ) : classes.length === 0 ? (
        <p style={{ color: "#f44336" }}>
          クラスが登録されていません。
          <br />
          管理者に登録を依頼してください。
        </p>
      ) : (
        <div style={{ margin: "20px 0", display: "flex", flexDirection: "column", gap: "10px" }}>
          {classes.map((cls) => (
            <div
              key={cls.code}
              onClick={() => setSelected(cls.code)}
              style={{
                padding: "14px 20px",
                borderRadius: "8px",
                border: selected === cls.code ? "3px solid #1976d2" : "1px solid #ccc",
                backgroundColor: selected === cls.code ? "#e3f2fd" : "white",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              <strong>{cls.code}</strong>　{cls.label}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={!selected}
        style={{
          marginTop: "10px",
          padding: "14px",
          fontSize: "16px",
          cursor: selected ? "pointer" : "not-allowed",
          backgroundColor: selected ? "#1976d2" : "#ccc",
          color: "white",
          border: "none",
          borderRadius: "8px",
          width: "100%",
        }}
      >
        この設定で始める
      </button>
    </main>
  );
}
