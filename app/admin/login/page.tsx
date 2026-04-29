"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!adminId || !password) {
      setError("IDとパスワードを入力してください");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminId, password }),
    });

    const data = await res.json();

    if (res.ok) {
      router.push("/admin");
    } else {
      setError(data.error || "ログインに失敗しました");
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") login();
  };

  return (
    <div style={{ padding: "60px 20px", maxWidth: "360px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "20px", marginBottom: "24px", textAlign: "center" }}>
        管理者ログイン
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <input
          placeholder="ID"
          value={adminId}
          onChange={(e) => setAdminId(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ padding: "12px", fontSize: "15px", borderRadius: "6px", border: "1px solid #ccc" }}
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ padding: "12px", fontSize: "15px", borderRadius: "6px", border: "1px solid #ccc" }}
        />
        <button
          onClick={login}
          disabled={loading}
          style={{
            padding: "12px",
            fontSize: "15px",
            cursor: loading ? "not-allowed" : "pointer",
            backgroundColor: loading ? "#ccc" : "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "6px",
          }}
        >
          {loading ? "ログイン中..." : "ログイン"}
        </button>
      </div>

      {error && (
        <p style={{ color: "#f44336", marginTop: "12px", fontSize: "14px", textAlign: "center" }}>
          {error}
        </p>
      )}
    </div>
  );
}
