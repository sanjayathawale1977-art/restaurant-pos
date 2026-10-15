"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, LogIn } from "lucide-react";
import { supabase } from "../supabaseClient";
import { APP_NAME, RESTAURANT } from "../restaurantConfig";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError("Wrong email or password. Please try again.");
      setLoading(false);
      return;
    }

    router.replace("/");
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-slate-900 p-4 font-sans text-slate-100 antialiased">
      <div className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="font-black text-xl text-white">{APP_NAME}</h1>
          <p className="text-xs text-slate-400 mt-1">{RESTAURANT.name}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-slate-900 border border-slate-800 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="w-full bg-slate-900 border border-slate-800 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 transition shadow-lg shadow-orange-500/20"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? "Signing in..." : "Sign in"}</span>
          </button>
        </form>

        <p className="text-[11px] text-slate-500 text-center mt-5">
          No account? Ask the restaurant owner to create one for you.
        </p>
      </div>
    </div>
  );
}
