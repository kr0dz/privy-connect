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

const CreatorDashboard = () => {
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

  if (role === "fan") {
    return <Navigate to="/dashboard/fan" replace />;
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
            <p className="text-sm uppercase tracking-wide text-primary">Creator Dashboard</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold">Panel del creador</h1>
            <p className="text-muted-foreground mt-2">
              {email ? `Sesión activa como ${email}` : "Gestiona tu perfil, mensajes e ingresos."}
            </p>
          </div>

          <Button variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? "Cerrando sesión..." : "Cerrar sesión"}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Ingresos</CardTitle>
              <CardDescription>Resumen del periodo</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">$0</p>
              <p className="text-sm text-muted-foreground mt-2">
                Aquí conectaremos ventas, unlocks y suscripciones.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Fans activos</CardTitle>
              <CardDescription>Usuarios con interacción reciente</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-muted-foreground mt-2">
                Más adelante se calcula desde mensajes y pagos.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Mensajes</CardTitle>
              <CardDescription>Bandeja y respuesta AI</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-muted-foreground mt-2">
                Ideal para conectar luego con tu tabla de mensajes.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Estado del perfil</CardTitle>
              <CardDescription>Visibilidad y setup</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">Draft</p>
              <p className="text-sm text-muted-foreground mt-2">
                Puedes cambiar esto cuando armemos la edición real.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Acciones rápidas</CardTitle>
              <CardDescription>Lo principal del creador</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button asChild variant="gold">
                <Link to="/dashboard/creator">Editar perfil</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard/creator">Configurar personalidad AI</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard/creator">Ver mensajes</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard/creator">Ver ingresos</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Próximas secciones</CardTitle>
              <CardDescription>Lo que conviene construir después</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Configuración de pricing y unlocks</p>
              <p>• Métricas de conversiones</p>
              <p>• Bandeja de mensajes</p>
              <p>• Configuración de personalidad del chat AI</p>
              <p>• Balance y retiros</p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CreatorDashboard;