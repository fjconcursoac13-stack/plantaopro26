import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'user' | 'master';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  userRole: UserRole | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isMaster: boolean;
  masterSession: string | null;
  setMasterSession: (username: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [masterSession, setMasterSessionState] = useState<string | null>(() => {
    // Check sessionStorage on init
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('masterSession');
    }
    return null;
  });

  const setMasterSession = (username: string | null) => {
    if (username) {
      sessionStorage.setItem('masterSession', username);
    } else {
      sessionStorage.removeItem('masterSession');
    }
    setMasterSessionState(username);
  };

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user role:', error);
        return;
      }
      
      if (data) {
        setUserRole(data.role as UserRole);
      }
    } catch (err) {
      console.error('Error in fetchUserRole:', err);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
        }
        
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Check rate limit
      const { data: canAttempt } = await supabase.rpc('check_rate_limit', {
        p_identifier: email,
        p_max_attempts: 5,
        p_window_minutes: 15
      });

      if (!canAttempt) {
        return { error: new Error('Muitas tentativas de login. Tente novamente em 15 minutos.') };
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      // Record attempt
      await supabase.rpc('record_login_attempt', {
        p_identifier: email,
        p_success: !error,
        p_ip: null
      });

      if (error) {
        return { error };
      }
      
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });
      
      if (error) {
        return { error };
      }
      
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setMasterSession(null);
  };

  const isAdmin = userRole === 'admin' || userRole === 'master' || !!masterSession;
  const isMaster = userRole === 'master' || !!masterSession;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      userRole,
      signIn,
      signUp,
      signOut,
      isAdmin,
      isMaster,
      masterSession,
      setMasterSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
