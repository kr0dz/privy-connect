import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authService, type UserRole } from "@/services/auth/authService";

const AdminDashboard = () => {
  const [role, setRole] = useState<UserRole | null | undefined>(undefined);
  const [email, setEmail] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    authService
      .getSession()
      .then((session) => {
        if (!mounted) return;
        setEmail(session?.user.email ?? null);
      })
      .catch(() => {
        if (mounted) setEmail(null);
      });

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

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await authService.signOut();
      window.location.href = "/login";
    } finally {
      setIsSigningOut(false);
    }
  };

  if (role === undefined) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Cargando...</div>;
  }

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-24 space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-primary">Webmaster Dashboard</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold">Panel de administración</h1>
            <p className="text-muted-foreground mt-2">
              {email ? `Acceso maestro como ${email}` : "Configuración global de la plataforma."}
            </p>
          </div>

          <Button variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? "Cerrando sesión..." : "Cerrar sesión"}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Usuarios</CardTitle>
              <CardDescription>Fans y creadores</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-muted-foreground mt-2">
                Base para listar, editar y moderar usuarios.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Creadores</CardTitle>
              <CardDescription>Estado y aprobaciones</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-muted-foreground mt-2">
                Aquí irá aprobación, bloqueo y revisión.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Ingresos globales</CardTitle>
              <CardDescription>Vista general de la plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">$0</p>
              <p className="text-sm text-muted-foreground mt-2">
                Métricas generales del negocio.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Configuración</CardTitle>
              <CardDescription>Sistema y permisos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">Root</p>
              <p className="text-sm text-muted-foreground mt-2">
                Solo el webmaster debe ver esta área.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Acciones maestras</CardTitle>
              <CardDescription>Acceso global de plataforma</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button asChild variant="gold">
                <Link to="/dashboard/admin">Configuración general</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard/admin">Gestionar usuarios</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard/admin">Gestionar creadores</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard/admin">Métricas globales</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Módulos recomendados</CardTitle>
              <CardDescription>Los siguientes pasos más importantes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Gestión de roles y permisos</p>
              <p>• Aprobación o bloqueo de creadores</p>
              <p>• Configuración de comisiones</p>
              <p>• Ajustes de pricing y planes</p>
              <p>• Panel de métricas y moderación</p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;