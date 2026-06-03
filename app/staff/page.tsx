"use client";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useRouter } from "next/navigation";

export default function StaffPage() {
  const router = useRouter();
  const scannerRef  = useRef<Html5Qrcode | null>(null);
  const startedRef  = useRef(false);
  const scanningRef = useRef(false);
  const lastScanRef = useRef<{ visitorId: string; time: number } | null>(null);

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

  // スキャン結果からvisitor_idを抽出
  // パターン1: 通常のvisitor_id（UUID等）
  // パターン2: https://venue.koryo-fes.com/?id=xxx,cd=yyy（URLの場合）
  const extractVisitorId = (scanned: string): string | null => {
    // URLの場合（koryo-fes.comドメインを含む）
    if (scanned.includes("koryo-fes.com") || scanned.includes("venue.koryo-fes.com")) {
      try {
        // ?以降のクエリ部分を取得
        const queryPart = scanned.split("?")[1];
        if (!queryPart) return null;

        // カンマ区切り形式: id=xxx,cd=yyy または id=xxx,cd=yyyyyy
        if (queryPart.includes(",cd=")) {
          const cdPart = queryPart.split(",cd=")[1];
          if (!cdPart) return null;
          // m$（前高生）またはそのままvisitor_idとして使用
          // m$を除いたハッシュ値がvisitor_id
          const visitorId = cdPart.endsWith("m$") ? cdPart.slice(0, -2) : cdPart;
          return visitorId || null;
        }

        // 通常の&区切り形式: ?id=xxx&cd=yyy
        const params = new URLSearchParams(queryPart);
        const cd = params.get("cd");
        if (cd) {
          return cd.endsWith("m$") ? cd.slice(0, -2) : cd;
        }
      } catch {
        return null;
      }
    }

    // URLでない場合はそのままvisitor_idとして使用
    return scanned.trim();
  };

  const handleScan = async (raw: string) => {
    if (scanningRef.current) return;

    const visitorId = extractVisitorId(raw);
    if (!visitorId) {
      setMessage({ text: "❌ 無効なQRコードです", ok: false });
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    // 10秒以内に同じvisitor_idのスキャンを排除
    const now = Date.now();
    if (lastScanRef.current?.visitorId === visitorId && now - lastScanRef.current.time < 10000) return;
    lastScanRef.current = { visitorId, time: now };
    scanningRef.current = true;
    setMessage(null);

    try {
      const res  = await fetch("/api/enter-class", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, classCode }),
      });
      const data = await res.json();
      if (res.ok) setMessage({ text: "✅ 入場記録完了！", ok: true });
      else        setMessage({ text: `❌ エラー: ${data.error || "不明"}`, ok: false });
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
      .catch(() => {
        setMessage({ text: "カメラを起動できませんでした", ok: false });
        // カメラ失敗時はホームに戻れるよう明示
        setTimeout(() => {
          if (typeof window !== "undefined") {
            window.location.href = "/";
          }
        }, 3000);
      });
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
        scannerRef.current = null;
      }
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
      <div style={{ marginBottom: "8px" }}>
        <a href="/" style={{ fontSize: "13px", color: "#888", textDecoration: "none" }}>← ホームに戻る</a>
      </div>
      <div id="reader" style={{ width: "300px", margin: "20px auto" }} />
      {message && (
        <div style={{ marginTop: "20px", padding: "14px 20px", borderRadius: "8px", backgroundColor: message.ok ? "#4caf50" : "#f44336", color: "white", fontSize: "18px" }}>
          {message.text}
        </div>
      )}
    </div>
  );
}
