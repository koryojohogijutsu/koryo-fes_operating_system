"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      router.push("/admin");
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "360px", margin: "0 auto" }}>
      <h1>管理者ログイン</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "20px" }}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: "10px", fontSize: "15px" }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: "10px", fontSize: "15px" }}
        />
        <button
          onClick={login}
          style={{ padding: "10px", fontSize: "15px", cursor: "pointer", backgroundColor: "#1976d2", color: "white", border: "none", borderRadius: "6px" }}
        >
          ログイン
        </button>
      </div>

      {error && <p style={{ color: "#f44336", marginTop: "12px" }}>{error}</p>}
    </div>
  );
}
