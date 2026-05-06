import type { Session, User } from "@supabase/supabase-js";
import React from "react";

import { supabase } from "@/lib/supabase";

type AuthContextValue = {
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  isOwner: boolean;
  refreshOwnerStatus: () => Promise<void>;
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
  const [isOwner, setIsOwner] = React.useState(false);

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

  const refreshOwnerStatus = React.useCallback(async () => {
    if (!session?.user?.id) {
      setIsOwner(false);
      return;
    }

    const { data } = await supabase
      .from("users")
      .select("is_owner")
      .eq("id", session.user.id)
      .single();

    if (data) {
      setIsOwner(data.is_owner ?? false);
    }
  }, [session?.user?.id]);

  // Fetch is_owner from the users table when session changes
  React.useEffect(() => {
    let isMounted = true;

    const load = async () => {
      await refreshOwnerStatus();
    };

    if (isMounted) {
      load();
    }

    return () => {
      isMounted = false;
    };
  }, [refreshOwnerStatus]);

  const signOut = React.useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message ?? null };
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      isLoading,
      session,
      user: session?.user ?? null,
      isOwner,
      refreshOwnerStatus,
      signOut,
    }),
    [isLoading, isOwner, refreshOwnerStatus, session, signOut],
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
