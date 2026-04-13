import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase';
import { authService } from '@/services/authService';

const AuthContext = createContext({});

const SESSION_VERSION = '3';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [empresasMatriz, setEmpresasMatriz] = useState([]);

  useEffect(() => {
    // Invalida sessões antigas de versões anteriores
    const storedVersion = localStorage.getItem('session_version');
    if (storedVersion !== SESSION_VERSION) {
      localStorage.removeItem('user');
      localStorage.setItem('session_version', SESSION_VERSION);
    }

    // Check for logged in user in localStorage on mount
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Error parsing saved user', e);
        localStorage.removeItem('user');
      }
    }
    setAuthLoading(false);

    // Fetch initial data from Supabase
    const loadInitialData = async () => {
      try {
        // Fetch users
        const { data: usersData } = await supabaseClient.from('users').select('*');
        if (usersData) setUsers(usersData);

        // Fetch empresas matriz
        const { data: empresasData } = await supabaseClient
          .from('empresas')
          .select('*')
          .eq('tipo', 'MATRIZ');
        if (empresasData) setEmpresasMatriz(empresasData);

      } catch (error) {
        console.error("Error loading auth context data:", error);
      }
    };

    loadInitialData();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await authService.loginUser(email, password);
      if (!data) return null;

      // Remove password from session object
      const { password: _, ...userSafe } = data;

      setUser(userSafe);
      localStorage.setItem("user", JSON.stringify(userSafe));
      return userSafe;
    } catch (error) {
      console.error("Login error:", error);
      return null;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{
      user,
      authLoading,
      login,
      logout,
      users,
      setUsers,
      empresasMatriz,
      setEmpresasMatriz,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);