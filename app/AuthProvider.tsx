"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

// ------------------------------------------------------------
// Who can open what:
//   Public (no login)  : /login, /order (customer QR page), /menu (redirects to /order)
//   Owner + Staff      : /  (POS billing, kitchen, tables)
//   Owner only         : /inventory, /reports
// The REAL protection is in the database (see supabase/02-lockdown.sql).
// This file only decides what the screen shows.
// ------------------------------------------------------------

export type Role = "owner" | "staff" | "pending";

interface AuthState {
  loading: boolean;
  session: Session | null;
  role: Role | null;
  fullName: string;
  isOwner: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  loading: true,
  session: null,
  role: null,
  fullName: "",
  isOwner: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const PUBLIC_PATHS = ["/login", "/order", "/menu"];
const OWNER_ONLY_PATHS = ["/inventory", "/reports"];

const matches = (pathname: string, list: string[]) =>
  list.some((p) => pathname === p || pathname.startsWith(p + "/"));

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState<boolean>(true);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [fullName, setFullName] = useState<string>("");

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setRole(null);
      setFullName("");
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", s.user.id)
      .maybeSingle();

    setRole(data ? (data.role as Role) : null);
    setFullName(data?.full_name || s.user.email || "");
  }, []);

  // Read the saved login when the app opens, and listen for login / logout.
  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      await loadProfile(data.session);
      if (!cancelled) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      // Do the database call outside this callback (recommended by Supabase)
      setTimeout(() => {
        loadProfile(newSession).finally(() => setLoading(false));
      }, 0);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const isPublic = matches(pathname, PUBLIC_PATHS);
  const isOwner = role === "owner";
  const isActiveStaff = role === "owner" || role === "staff";

  // Send people to the right place
  useEffect(() => {
    if (loading) return;
    if (!session && !isPublic) {
      router.replace("/login");
    } else if (session && isActiveStaff && pathname === "/login") {
      router.replace("/");
    } else if (session && role === "staff" && matches(pathname, OWNER_ONLY_PATHS)) {
      router.replace("/");
    }
  }, [loading, session, role, isActiveStaff, isPublic, pathname, router]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  }, [router]);

  const value: AuthState = { loading, session, role, fullName, isOwner, signOut };

  // ---------- What to show ----------
  // Customer pages and the login page are always shown.
  if (isPublic) {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  if (loading || !session) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-slate-400 text-sm">
        Loading...
      </div>
    );
  }

  // Logged in, but the owner has not approved this account yet (or no profile exists)
  if (!isActiveStaff) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 p-6">
        <div className="max-w-sm text-center bg-slate-950 border border-slate-800 rounded-3xl p-8">
          <h1 className="text-lg font-black text-white">Waiting for approval</h1>
          <p className="text-sm text-slate-400 mt-2">
            Your account is created but the owner has not given you access yet. Please ask the owner
            to approve your account, then sign in again.
          </p>
          <button
            onClick={signOut}
            className="mt-5 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // Staff trying to open an owner-only page: show nothing while they are redirected
  if (role === "staff" && matches(pathname, OWNER_ONLY_PATHS)) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
