import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-soft-gradient">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.perfil)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (!user.aceite_termos && location.pathname !== '/termos-aceite') {
    return <Navigate to="/termos-aceite" replace />;
  }

  return children;
};

export default ProtectedRoute;