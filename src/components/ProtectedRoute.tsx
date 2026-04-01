import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '@/services/auth/authService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'creator' | 'admin' | ('creator' | 'admin')[];
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const [role, setRole] = useState<string | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const [session, userRole] = await Promise.all([
          authService.getSession(),
          authService.getRole(),
        ]);

        if (!mounted) {
          return;
        }

        setRole(userRole);

        if (!session) {
          setRole(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void check();
    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Verificando acceso...</div>;
  }

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowedRoles.includes(role as any)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
