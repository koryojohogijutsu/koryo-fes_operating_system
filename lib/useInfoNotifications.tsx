"use client";
import { useEffect, useRef, useState, useCallback } from "react";

type NoticeItem = { id: string; title: string; body: string; created_at: string };
type LostItem   = { id: string; time: string; place: string; memo: string; created_at: string };
type BannerItem = { id: string; type: "notice" | "lost"; title: string; body: string };

async function requestPushPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const perm = await Notification.requestPermission();
  return perm === "granted";
}

function sendPush(title: string, body: string) {
  if (typeof window !== "undefined" && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  }
}

export function useInfoNotifications() {
  const [banners,      setBanners]      = useState<BannerItem[]>([]);
  const knownNoticeIds = useRef<Set<string>>(new Set());
  const knownLostIds   = useRef<Set<string>>(new Set());
  const initialized    = useRef(false);

  const dismissBanner = useCallback((id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  }, []);

  useEffect(() => {
    requestPushPermission();

    const check = async () => {
      try {
        const res  = await fetch("/api/info", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();

        const notices: NoticeItem[] = data.notices ?? [];
        const losts:   LostItem[]   = data.lost    ?? [];

        if (!initialized.current) {
          notices.forEach((n) => knownNoticeIds.current.add(n.id));
          losts.forEach((l)   => knownLostIds.current.add(l.id));
          initialized.current = true;
          return;
        }

        // 新着お知らせ
        const newNotices = notices.filter((n) => !knownNoticeIds.current.has(n.id));
        newNotices.forEach((n) => {
          knownNoticeIds.current.add(n.id);
          const banner: BannerItem = {
            id:    `notice-${n.id}`,
            type:  "notice",
            title: `📢 新着お知らせ: ${n.title}`,
            body:  n.body,
          };
          setBanners((prev) => [banner, ...prev]);
          sendPush("📢 新着お知らせ", n.title);
          setTimeout(() => dismissBanner(banner.id), 10000);
        });

        // 新着落とし物
        const newLosts = losts.filter((l) => !knownLostIds.current.has(l.id));
        newLosts.forEach((l) => {
          knownLostIds.current.add(l.id);
          const banner: BannerItem = {
            id:    `lost-${l.id}`,
            type:  "lost",
            title: "🔍 新着落とし物情報",
            body:  `${l.place} / ${l.memo}`,
          };
          setBanners((prev) => [banner, ...prev]);
          sendPush("🔍 新着落とし物情報", `${l.place}: ${l.memo}`);
          setTimeout(() => dismissBanner(banner.id), 10000);
        });
      } catch {}
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [dismissBanner]);

  return { banners, dismissBanner };
}

export function NotificationBanners({
  banners,
  dismiss,
}: {
  banners: BannerItem[];
  dismiss: (id: string) => void;
}) {
  if (banners.length === 0) return null;
  return (
    <div style={{
      position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, display: "flex", flexDirection: "column", gap: "8px",
      width: "calc(100% - 32px)", maxWidth: "440px",
    }}>
      {banners.map((b) => (
        <div key={b.id} style={{
          backgroundColor: b.type === "notice" ? "#1565c0" : "#6a1b9a",
          color: "white", borderRadius: "12px", padding: "12px 16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px",
          animation: "slideDown 0.3s ease",
        }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: "bold", fontSize: "14px" }}>{b.title}</p>
            {b.body && (
              <p style={{ margin: "4px 0 0", fontSize: "12px", opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {b.body}
              </p>
            )}
          </div>
          <button onClick={() => dismiss(b.id)}
            style={{ background: "none", border: "none", color: "white", fontSize: "18px", cursor: "pointer", padding: 0, lineHeight: 1, opacity: 0.7, flexShrink: 0 }}>
            ×
          </button>
        </div>
      ))}
      <style>{`@keyframes slideDown { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
