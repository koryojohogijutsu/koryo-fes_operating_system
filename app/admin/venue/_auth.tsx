"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// 会場管理ページ共通の認証チェックhook
export function useVenueAuth() {
  const router  = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const auth = document.cookie.split("; ").find((r) => r.startsWith("admin_auth="))?.split("=")[1];
    if (auth !== "1") {
      router.push("/admin/login");
      return;
    }
    setAuthed(true);
  }, [router]);

  return authed;
}
