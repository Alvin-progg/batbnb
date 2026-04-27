import type { Session, User } from "@supabase/supabase-js";
import React from "react";

import { supabase } from "@/lib/supabase";

type AuthContextValue = {
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  signOut: () => Promise<{ error: string | null }>;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(
  undefined,
);

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    const initializeAuthState = async () => {
      const { data } = await supabase.auth.getSession();
      if (isMounted) {
        setSession(data.session ?? null);
        setIsLoading(false);
      }
    };

    initializeAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = React.useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message ?? null };
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      isLoading,
      session,
      user: session?.user ?? null,
      signOut,
    }),
    [isLoading, session, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
