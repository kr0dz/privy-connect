import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authService, type UserRole } from "@/services/auth/authService";
import { supabase } from "@/lib/supabase";
import VideoCall from "@/components/video/VideoCall";

interface UpcomingCall {
  id: string;
  creator_id: string;
  start_time: string;
  duration: number;
  status: 'booked' | 'completed' | 'cancelled' | 'available';
  stream_call_id: string | null;
}

const FanDashboard = () => {
  const [role, setRole] = useState<UserRole | null | undefined>(undefined);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [calls, setCalls] = useState<UpcomingCall[]>([]);
  const [openCallId, setOpenCallId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    authService
      .getSession()
      .then((session) => {
        if (!mounted) return;
        setEmail(session?.user.email ?? null);
        setUserId(session?.user.id ?? null);
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

  useEffect(() => {
    if (!userId) {
      return;
    }

    let mounted = true;
    const loadCalls = async () => {
      const { data } = await supabase
        .from('video_calls')
        .select('id, creator_id, start_time, duration, status, stream_call_id')
        .eq('fan_id', userId)
        .in('status', ['booked', 'completed'])
        .order('start_time', { ascending: true })
        .limit(20);

      if (!mounted) {
        return;
      }

      setCalls((data || []) as UpcomingCall[]);
    };

    void loadCalls();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const canJoin = (row: UpcomingCall) => {
    if (row.status !== 'booked' || !row.stream_call_id) {
      return false;
    }
    const start = new Date(row.start_time).getTime();
    return Date.now() >= start - 10 * 60 * 1000;
  };

  const callPhase = (row: UpcomingCall): 'upcoming' | 'live' | 'ended' => {
    const start = new Date(row.start_time).getTime();
    const end = start + row.duration * 60 * 1000;
    const now = Date.now();
    if (now < start) return 'upcoming';
    if (now <= end) return 'live';
    return 'ended';
  };

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
              <CardTitle>Mis videollamadas</CardTitle>
              <CardDescription>Llamadas reservadas con creadores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {calls.length === 0 ? <p className="text-sm text-muted-foreground">Aun no tienes videollamadas reservadas.</p> : null}
              {calls.map((row) => (
                <div key={row.id} className="rounded-lg border border-border/50 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{new Date(row.start_time).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Duracion: {row.duration} min · Estado: {row.status} · {callPhase(row)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="gold"
                    disabled={!canJoin(row)}
                    onClick={() => setOpenCallId(row.stream_call_id)}
                  >
                    Join Call
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Dialog open={Boolean(openCallId)} onOpenChange={(next) => !next && setOpenCallId(null)}>
          <DialogContent className="max-w-6xl border-primary/20 bg-background">
            <DialogHeader>
              <DialogTitle>Videollamada</DialogTitle>
            </DialogHeader>
            {openCallId && userId ? <VideoCall callId={openCallId} userId={userId} /> : null}
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
};

export default FanDashboard;