import React from 'react';
    import { Navigate, useLocation } from 'react-router-dom';
    import { useAuth } from '@/contexts/AuthContext';
    
    const ProtectedRoute = ({ children, allowedRoles }) => {
      const { user } = useAuth();
      const location = useLocation();
    
      if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
      }
    
      if (allowedRoles && !allowedRoles.includes(user.perfil)) {
        return <Navigate to="/unauthorized" replace />;
      }
    
      return children;
    };
    
    export default ProtectedRoute;