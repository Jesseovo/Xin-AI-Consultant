"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";

export type UserRole = "student" | "teacher" | "admin";

export interface AuthUser {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  department?: string;
  major?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => void;
}

const STORAGE_KEY = "xin-auth";

interface StoredAuth {
  accessToken: string;
  user: AuthUser;
}

export interface RegisterPayload {
  username: string;
  password: string;
  display_name: string;
  role: "student" | "teacher";
  department: string;
  major: string;
}

interface LoginResponse {
  access_token?: string;
  token?: string;
  user?: AuthUser;
}

interface RegisterResponse {
  access_token?: string;
  token?: string;
  user?: AuthUser;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStored(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (parsed?.accessToken && parsed?.user?.id) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function saveStored(data: StoredAuth | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!data) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

const DEMO_USER: AuthUser = {
  id: "demo",
  username: "demo_admin",
  display_name: "验收演示",
  role: "admin",
  department: "计算机与控制工程学院",
  major: "软件工程",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = loadStored();
    if (s) {
      setUser(s.user);
      setAccessToken(s.accessToken);
      api.setToken(s.accessToken);
    } else if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      setUser(DEMO_USER);
      setAccessToken("demo-token");
    }
    setReady(true);
  }, []);

  const persist = useCallback((u: AuthUser | null, token: string | null) => {
    setUser(u);
    setAccessToken(token);
    if (token) api.setToken(token);
    else api.clearToken();
    if (u && token) saveStored({ user: u, accessToken: token });
    else saveStored(null);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await api.post<LoginResponse>("/auth/login", { username, password });
      const token = res.access_token ?? res.token;
      const u = res.user;
      if (!token || !u) {
        throw new Error("登录响应无效");
      }
      persist(u, token);
      return u;
    },
    [persist]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const res = await api.post<RegisterResponse>("/auth/register", payload);
      const token = res.access_token ?? res.token;
      const u = res.user;
      if (!token || !u) {
        throw new Error("注册响应无效");
      }
      persist(u, token);
      return u;
    },
    [persist]
  );

  const logout = useCallback(() => {
    persist(null, null);
  }, [persist]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      ready,
      login,
      register,
      logout,
    }),
    [user, accessToken, ready, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function getDashboardPath(role: UserRole): string {
  if (role === "admin") return "/admin";
  if (role === "teacher") return "/teacher/dashboard";
  return "/chat";
}
