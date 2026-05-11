"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";

export default function PuzzleRedeemPage() {
  const router = useRouter();
  const scannerRef  = useRef<Html5Qrcode | null>(null);
  const startedRef  = useRef(false);
  const scanningRef = useRef(false);
  const lastScanRef = useRef<{ id: string; time: number } | null>(null);
  const [authed,  setAuthed]  = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") { router.push("/admin/login"); return; }
    setAuthed(true);
  }, [router]);

  const handleScan = async (visitorId: string) => {
    if (scanningRef.current) return;

    const now = Date.now();
    if (lastScanRef.current && lastScanRef.current.id === visitorId && now - lastScanRef.current.time < 10000) return;
    lastScanRef.current = { id: visitorId, time: now };
    scanningRef.current = true;
    setMessage(null);

    const res  = await fetch("/api/puzzle-redeem", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ visitorId }),
    });
    const data = await res.json();

    if (res.ok) {
      setMessage({ text: "✅ 景品引換完了！", ok: true });
    } else if (res.status === 409) {
      setMessage({ text: "❌ すでに引き換え済みです", ok: false });
      alert("このQRはすでに引き換え済みです。");
    } else {
      setMessage({ text: `❌ ${data.error || "エラーが発生しました"}`, ok: false });
    }

    setTimeout(() => { scanningRef.current = false; setMessage(null); }, 3000);
  };

  useEffect(() => {
    if (!authed || startedRef.current) return;
    startedRef.current = true;

    const scanner = new Html5Qrcode("puzzle-reader");
    scannerRef.current = scanner;
    scanner
      .start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, handleScan, () => {})
      .catch(() => setMessage({ text: "カメラを起動できませんでした", ok: false }));

    return () => {
      if (scannerRef.current) { scannerRef.current.stop().catch(() => {}); scannerRef.current.clear(); }
    };
  }, [authed]);

  if (!authed) return null;

  return (
    <main style={{ padding: "24px 20px", maxWidth: "480px", margin: "0 auto", textAlign: "center" }}>
      <a href="/admin" style={{ fontSize: "13px", color: "#888", textDecoration: "none", display: "block", marginBottom: "20px", textAlign: "left" }}>
        ← 管理者メニューに戻る
      </a>
      <h1 style={{ fontSize: "20px", marginBottom: "6px" }}>🎁 景品引換スキャン</h1>
      <p style={{ color: "#888", fontSize: "13px", marginBottom: "20px" }}>
        来場者の景品引換QRをスキャンしてください
      </p>

      <div id="puzzle-reader" style={{ width: "300px", margin: "0 auto 20px" }} />

      {message && (
        <div style={{
          padding: "14px 20px", borderRadius: "8px", fontSize: "16px", fontWeight: "bold",
          backgroundColor: message.ok ? "#4caf50" : "#f44336", color: "white",
        }}>
          {message.text}
        </div>
      )}
    </main>
  );
}
