"use client";

import { useEffect, useState } from "react";

export default function VotePage() {
  const [classes, setClasses] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  // Cookieからvisitor_idを取得
  const getVisitorId = () =>
    typeof document !== "undefined"
      ? document.cookie
          .split("; ")
          .find((row) => row.startsWith("visitor_id="))
          ?.split("=")[1]
      : null;

  // コンポーネントマウント時にクラス一覧を取得
useEffect(() => {
  const fetchClasses = async () => {
    const visitorId = getVisitorId();
    if (!visitorId) return;

    try {
      const res = await fetch("/api/get-entered-classes", {
        headers: { "x-visitor-id": visitorId },
      });
      const data = await res.json();

      // 重複削除
      const uniqueClasses = [...new Set(data.classCodes || [])];

      setClasses(uniqueClasses);
    } catch (error) {
      console.error("データの取得に失敗しました", error);
    }
  };

  fetchClasses();
}, []);

  const handleVote = async () => {
    if (!selected) {
      alert("クラスを選択してください");
      return;
    }

    const visitorId = getVisitorId();
    if (!visitorId) {
      alert("エラー：セッション情報が見つかりません");
      return;
    }

    const res = await fetch("/api/vote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-visitor-id": visitorId,
      },
      body: JSON.stringify({ classCode: selected }),
    });

    if (res.ok) {
      alert("投票完了：" + selected);
    } else {
      const data = await res.json();
      alert("エラー：" + data.error);
    }
  };

  return (
    <main style={{ padding: 20, textAlign: "center" }}>
      <h1>投票</h1>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
        {classes.length > 0 ? (
          classes.map((cls) => (
            <div
              key={cls}
              onClick={() => setSelected(cls)}
              style={{
                width: "200px",
                padding: "15px",
                border: selected === cls ? "3px solid blue" : "1px solid gray",
                borderRadius: "8px",
                cursor: "pointer",
                backgroundColor: selected === cls ? "#eef" : "white",
              }}
            >
              {cls}
            </div>
          ))
        ) : (
          <p>読み込み中、または表示できるクラスがありません。</p>
        )}
      </div>

      <br />
      <button 
        onClick={handleVote}
        style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer" }}
      >
        送信
      </button>
    </main>
  );
}
