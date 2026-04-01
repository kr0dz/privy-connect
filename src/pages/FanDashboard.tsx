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

const FanDashboard = () => {
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

  if (role === "creator") {
    return <Navigate to="/dashboard/creator" replace />;
  }

  if (role === "admin") {
    return <Navigate to="/dashboard/admin" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-24 space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-primary">Fan Dashboard</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold">Bienvenido</h1>
            <p className="text-muted-foreground mt-2">
              {email ? `Sesión activa como ${email}` : "Gestiona tu actividad como fan."}
            </p>
          </div>

          <Button variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? "Cerrando sesión..." : "Cerrar sesión"}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Creadores desbloqueados</CardTitle>
              <CardDescription>Accesos y perfiles premium</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-muted-foreground mt-2">
                Aquí podrás ver a quién ya desbloqueaste.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Chats activos</CardTitle>
              <CardDescription>Conversaciones recientes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-muted-foreground mt-2">
                Luego conectamos esto con mensajes reales.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Suscripción</CardTitle>
              <CardDescription>Tu plan actual</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">Free</p>
              <p className="text-sm text-muted-foreground mt-2">
                Puedes subir esto a premium o VIP más adelante.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Wallet</CardTitle>
              <CardDescription>Saldo e historial</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">$0</p>
              <p className="text-sm text-muted-foreground mt-2">
                Aquí irá tu balance o créditos.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Acciones rápidas</CardTitle>
              <CardDescription>Lo más útil para el fan</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button asChild variant="gold">
                <Link to="/discover">Explorar creadores</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard/fan">Ver mis desbloqueos</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard/fan">Ver mis pagos</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Próximas secciones</CardTitle>
              <CardDescription>Base para expandir después</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Historial de compras y unlocks</p>
              <p>• Conversaciones y favoritos</p>
              <p>• Gestión de métodos de pago</p>
              <p>• Configuración de cuenta</p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FanDashboard;