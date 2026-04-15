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
          if (profile) setUser(profile);
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
      // Sucesso — perfil será carregado via onAuthStateChange
      const profile = await fetchProfile(email);
      if (!profile) throw new Error('Usuário não encontrado.');
      setUser(profile);
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
    return safeUser;
  };

  const logout = async () => {
    try { await supabase.auth.signOut(); } catch { /* ignora */ }
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
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
