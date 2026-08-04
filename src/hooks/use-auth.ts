"use client";

import { useEffect, useState } from "react";

interface BloomUser {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface AuthState {
  loading: boolean;
  user: BloomUser | null;
  login?: (email?: string, password?: string, name?: string) => Promise<BloomUser>;
  logout?: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ loading: true, user: null });

  useEffect(() => {
    const check = () => {
      const auth = (window as unknown as { __bloomAuth?: AuthState }).__bloomAuth;
      if (auth) {
        setState(auth);
      }
    };
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);

  return state;
}
