import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { authService } from '@/services/authService';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const fetchProfile = async (email) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (!data) return null;
    const { password: _, ...safe } = data;
    return safe;
  };

  // Restaura sessão ao montar
  useEffect(() => {
    const restore = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          const profile = await fetchProfile(session.user.email);
          if (profile) { setUser(profile); localStorage.setItem('agil_user', JSON.stringify(profile)); return; }
        }
        // Fallback: restaura do localStorage para usuários não migrados ao Supabase Auth
        const saved = localStorage.getItem('agil_user');
        if (saved) {
          try { setUser(JSON.parse(saved)); } catch { localStorage.removeItem('agil_user'); }
        }
      } catch (e) {
        console.error('[Auth] Erro ao restaurar sessão:', e);
      } finally {
        setAuthLoading(false);
      }
    };

    restore();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (session?.user?.email && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        const profile = await fetchProfile(session.user.email);
        if (profile) setUser(profile);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    // 1. Tenta Supabase Auth primeiro
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (!authError) {
      const profile = await fetchProfile(email);
      if (!profile) throw new Error('Usuário não encontrado.');
      setUser(profile);
      localStorage.setItem('agil_user', JSON.stringify(profile));
      return profile;
    }

    // 2. Supabase Auth falhou — tenta bcrypt (usuário ainda não migrado)
    const userData = await authService.loginUser(email, password); // lança se errado

    // 3. Auto-migração: cria conta no Supabase Auth silenciosamente
    try {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (!signUpError) {
        await supabase.auth.signInWithPassword({ email, password });
      }
    } catch {
      // Não crítico — app continua funcionando com bcrypt
    }

    const { password: _, ...safeUser } = userData;
    setUser(safeUser);
    localStorage.setItem('agil_user', JSON.stringify(safeUser));
    return safeUser;
  };

  const logout = async () => {
    try { await supabase.auth.signOut(); } catch { /* ignora */ }
    localStorage.removeItem('agil_user');
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('agil_user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{
      user,
      authLoading,
      login,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
