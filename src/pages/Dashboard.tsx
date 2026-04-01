import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { authService, type UserRole } from "@/services/auth/authService";

const Dashboard = () => {
  const [role, setRole] = useState<UserRole | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    authService
      .getRole()
      .then((value) => {
        if (mounted) setRole(value);
      })
      .catch(() => {
        if (mounted) setRole(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (role === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <p className="text-muted-foreground">Cargando dashboard...</p>
      </div>
    );
  }

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (role === "admin") {
    return <Navigate to="/dashboard/admin" replace />;
  }

  if (role === "creator") {
    return <Navigate to="/dashboard/creator" replace />;
  }

  return <Navigate to="/dashboard/fan" replace />;
};

export default Dashboard;