'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";

const PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "Forges@7644"; // Valeur fallback

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (password === PASSWORD) {
      localStorage.setItem("isAdmin", "true");
      router.push("/");
    } else {
      alert("Mot de passe incorrect.");
    }
  };
  
    <input
    type="password"
    placeholder="Mot de passe"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    onKeyDown={(e) => {
        if (e.key === "Enter") {
        handleLogin();
        }
    }}
    className="border rounded px-4 py-2"
    />

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <h1 className="text-2xl font-bold">Connexion Admin</h1>
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border rounded px-4 py-2"
      />
      <button onClick={handleLogin} className="bg-blue-600 text-white px-4 py-2 rounded">
        Se connecter
      </button>
    </div>
  );
}

