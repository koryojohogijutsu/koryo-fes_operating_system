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

  // スキャン結果から visitor_id と visitor_type を抽出
  // QR形式: https://venue.koryo-fes.com/?tk=<番号>&cd=<hash>[suffix]
  // suffix: なし=一般, m$=前高生, t%=教員
  const extractTicketInfo = (scanned: string): { visitorId: string; visitorType: string } | null => {
    if (scanned.includes("koryo-fes.com")) {
      try {
        const queryPart = scanned.split("?")[1];
        if (!queryPart) return null;

        let cd: string | null = null;

        // カンマ区切り旧形式: id=xxx,cd=yyy
        if (queryPart.includes(",cd=")) {
          cd = queryPart.split(",cd=")[1] ?? null;
        } else {
          // 通常の&区切り形式: ?tk=xxx&cd=yyy または ?id=xxx&cd=yyy
          const params = new URLSearchParams(queryPart);
          cd = params.get("cd");
        }

        if (!cd) return null;

        // サフィックスで区分判定
        let visitorType: string;
        let visitorId: string;
        if (cd.endsWith("t%")) {
          visitorType = "teacher";
          visitorId   = cd.slice(0, -2);
        } else if (cd.endsWith("m$")) {
          visitorType = "student";
          visitorId   = cd.slice(0, -2);
        } else {
          visitorType = "paper";
          visitorId   = cd;
        }

        return visitorId ? { visitorId, visitorType } : null;
      } catch {
        return null;
      }
    }

    // URLでない場合はそのままvisitor_id（スマホ来場者のQR）
    const trimmed = scanned.trim();
    return trimmed ? { visitorId: trimmed, visitorType: "smartphone" } : null;
  };

  const handleScan = async (raw: string) => {
    if (scanningRef.current) return;

    const ticketInfo = extractTicketInfo(raw);
    if (!ticketInfo) {
      setMessage({ text: "❌ 無効なQRコードです", ok: false });
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    const { visitorId, visitorType } = ticketInfo;

    // 10秒以内に同じvisitor_idのスキャンを排除
    const now = Date.now();
    if (lastScanRef.current?.visitorId === visitorId && now - lastScanRef.current.time < 10000) return;
    lastScanRef.current = { visitorId, time: now };
    scanningRef.current = true;
    setMessage(null);

    try {
      const res  = await fetch("/api/enter-class", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, classCode, visitorType }),
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
        setMessage({ text: "カメラを起動できませんでした。許可設定を確認してください。", ok: false });
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
      <div id="reader" style={{ width: "300px", margin: "20px auto" }} />
      {message && (
        <div style={{ marginTop: "20px", padding: "14px 20px", borderRadius: "8px", backgroundColor: message.ok ? "#4caf50" : "#f44336", color: "white", fontSize: "18px" }}>
          {message.text}
        </div>
      )}
    </div>
  );
}
