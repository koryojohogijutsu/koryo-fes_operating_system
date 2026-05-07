"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useRouter } from "next/navigation";

export default function StaffPage() {
  const router = useRouter();
  const scannerRef   = useRef<Html5Qrcode | null>(null);
  const startedRef   = useRef(false);
  const scanningRef  = useRef(false);
  const lastScanRef  = useRef<{ visitorId: string; time: number } | null>(null); // 10秒制限

  const [classCode,  setClassCode]  = useState<string | null>(null);
  const [classLabel, setClassLabel] = useState<string | null>(null);
  const [message,    setMessage]    = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    const code  = document.cookie.split("; ").find((row) => row.startsWith("staff_class_code="))?.split("=")[1];
    const label = document.cookie.split("; ").find((row) => row.startsWith("staff_class_label="))?.split("=")[1];
    if (!code) { router.push("/staff/settings"); return; }
    setClassCode(code);
    setClassLabel(label ? decodeURIComponent(label) : null);
  }, [router]);

  const handleScan = async (visitorId: string) => {
    if (scanningRef.current) return;

    // 10秒以内に同じvisitor_idのスキャンを排除
    const now = Date.now();
    if (lastScanRef.current && lastScanRef.current.visitorId === visitorId && now - lastScanRef.current.time < 10000) {
      return;
    }
    lastScanRef.current = { visitorId, time: now };
    scanningRef.current = true;
    setMessage(null);

    try {
      const res  = await fetch("/api/enter-class", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, classCode }),
      });
      const data = await res.json();
      if (res.ok) { setMessage({ text: "✅ 入場記録完了！", ok: true }); }
      else        { setMessage({ text: `❌ エラー: ${data.error || "不明"}`, ok: false }); }
    } catch {
      setMessage({ text: "❌ 通信エラーが発生しました", ok: false });
    }

    setTimeout(() => { scanningRef.current = false; setMessage(null); }, 2000);
  };

  useEffect(() => {
    if (!classCode || startedRef.current) return;
    startedRef.current = true;
    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;
    scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, handleScan, () => {})
      .catch(() => setMessage({ text: "カメラを起動できませんでした", ok: false }));
    return () => {
      if (scannerRef.current) { scannerRef.current.stop().catch(() => {}); scannerRef.current.clear(); scannerRef.current = null; }
    };
  }, [classCode]);

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>入場スキャン</h1>
      {classCode && (
        <p style={{ fontSize: "15px", color: "#333" }}>
          クラス: <strong>{classLabel ? `${classCode}（${classLabel}）` : classCode}</strong>
          　<a href="/staff/settings" style={{ fontSize: "12px", color: "#888" }}>変更</a>
        </p>
      )}
      <div id="reader" style={{ width: "300px", margin: "20px auto" }} />
      {message && (
        <div style={{ marginTop: "20px", padding: "14px 20px", borderRadius: "8px", backgroundColor: message.ok ? "#4caf50" : "#f44336", color: "white", fontSize: "18px" }}>
          {message.text}
        </div>
      )}
    </div>
  );
}
