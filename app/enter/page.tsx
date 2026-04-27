"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// アニメーション用CSS（グローバルに1回だけ注入）
const STYLE = `
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes pulse-ring {
    0%   { transform: scale(0.85); opacity: 0.6; }
    50%  { transform: scale(1.08); opacity: 0.15; }
    100% { transform: scale(0.85); opacity: 0.6; }
  }
  @keyframes scan-line {
    0%   { top: 8%; opacity: 0.9; }
    50%  { top: 88%; opacity: 0.7; }
    100% { top: 8%; opacity: 0.9; }
  }
  @keyframes corner-blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }
  @keyframes fade-in {
    from { opacity: 0; transform: scale(0.9); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes notify-in {
    from { opacity: 0; transform: scale(0.8); }
    to   { opacity: 1; transform: scale(1); }
  }
  .qr-wrapper {
    position: relative;
    width: 280px;
    height: 280px;
    margin: 0 auto;
    animation: fade-in 0.4s ease;
  }
  .qr-ring {
    position: absolute;
    inset: -18px;
    border-radius: 50%;
    border: 3px solid rgba(225, 1, 2, 0.35);
    animation: pulse-ring 2.4s ease-in-out infinite;
    pointer-events: none;
  }
  .qr-ring-2 {
    position: absolute;
    inset: -32px;
    border-radius: 50%;
    border: 1.5px solid rgba(225, 1, 2, 0.15);
    animation: pulse-ring 2.4s ease-in-out infinite 0.6s;
    pointer-events: none;
  }
  .qr-spinner {
    position: absolute;
    inset: -26px;
    border-radius: 50%;
    border: 2px solid transparent;
    border-top-color: #e10102;
    border-right-color: rgba(225,1,2,0.3);
    animation: rotate 2s linear infinite;
    pointer-events: none;
  }
  .qr-scan-line {
    position: absolute;
    left: 4px;
    right: 4px;
    height: 2px;
    background: linear-gradient(90deg, transparent, #e10102, transparent);
    animation: scan-line 2s ease-in-out infinite;
    pointer-events: none;
    border-radius: 1px;
  }
  .qr-corner {
    position: absolute;
    width: 20px;
    height: 20px;
    animation: corner-blink 1.6s ease-in-out infinite;
    pointer-events: none;
  }
  .qr-corner-tl { top: 0;  left: 0;  border-top: 3px solid #e10102; border-left: 3px solid #e10102; }
  .qr-corner-tr { top: 0;  right: 0; border-top: 3px solid #e10102; border-right: 3px solid #e10102; animation-delay: 0.4s; }
  .qr-corner-bl { bottom: 0; left: 0;  border-bottom: 3px solid #e10102; border-left: 3px solid #e10102; animation-delay: 0.8s; }
  .qr-corner-br { bottom: 0; right: 0; border-bottom: 3px solid #e10102; border-right: 3px solid #e10102; animation-delay: 1.2s; }
  .notify-box {
    animation: notify-in 0.3s ease;
  }
`;

export default function MyQRPage() {
  const router = useRouter();
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ classCode: string } | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const id = document.cookie
      .split("; ")
      .find((row) => row.startsWith("visitor_id="))
      ?.split("=")[1];

    if (!id) {
      router.push("/register");
      return;
    }

    setVisitorId(id);

    // QRコード生成（赤色）
    QRCode.toDataURL(id, {
      width: 280,
      margin: 2,
      color: {
        dark: "#e10102",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(console.error);

    // Supabase Realtime
    const channel = supabase
      .channel(`visits:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "visits",
          filter: `visitor_id=eq.${id}`,
        },
        (payload) => {
          setNotification({ classCode: payload.new.class_code });
          setTimeout(() => setNotification(null), 5000);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [router]);

  return (
    <>
      <style>{STYLE}</style>

      <main style={{ padding: "30px 20px", textAlign: "center", userSelect: "none" }}>
        <h1 style={{ fontSize: "20px", marginBottom: "6px" }}>あなたのQRコード</h1>
        <p style={{ color: "#777", fontSize: "13px", marginBottom: "32px" }}>
          係員に向けてこの画面を見せてください
        </p>

        {qrDataUrl ? (
          <div className="qr-wrapper">
            {/* パルスリング */}
            <div className="qr-ring" />
            <div className="qr-ring-2" />
            {/* スピナー */}
            <div className="qr-spinner" />
            {/* スキャンライン */}
            <div className="qr-scan-line" />
            {/* コーナー */}
            <div className="qr-corner qr-corner-tl" />
            <div className="qr-corner qr-corner-tr" />
            <div className="qr-corner qr-corner-bl" />
            <div className="qr-corner qr-corner-br" />
            {/* QR本体 */}
            <img
              src={qrDataUrl}
              alt="QRコード"
              style={{ width: "280px", height: "280px", display: "block", borderRadius: "4px" }}
              draggable={false}
            />
          </div>
        ) : (
          <div style={{ width: "280px", height: "280px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa" }}>
            生成中...
          </div>
        )}

        <p style={{ fontSize: "11px", color: "#ccc", marginTop: "40px" }}>
          {visitorId?.slice(0, 8)}...
        </p>

        <button
          onClick={() => router.push("/")}
          style={{
            marginTop: "16px",
            padding: "10px 24px",
            fontSize: "15px",
            cursor: "pointer",
            backgroundColor: "white",
            color: "#555",
            border: "1px solid #ddd",
            borderRadius: "6px",
          }}
        >
          ホームに戻る
        </button>
      </main>

      {/* 読み取り通知オーバーレイ */}
      {notification && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setNotification(null)}
        >
          <div
            className="notify-box"
            style={{
              backgroundColor: "white",
              borderRadius: "20px",
              padding: "40px 32px",
              textAlign: "center",
              maxWidth: "300px",
              width: "88%",
              boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ fontSize: "56px", marginBottom: "12px" }}>✅</div>
            <div style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "8px" }}>
              読み取られました！
            </div>
            <div style={{ fontSize: "15px", color: "#555" }}>
              クラス: <strong>{notification.classCode}</strong>
            </div>
            <div style={{ fontSize: "12px", color: "#aaa", marginTop: "20px" }}>
              タップで閉じる
            </div>
          </div>
        </div>
      )}
    </>
  );
}
