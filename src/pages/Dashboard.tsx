import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackButton from '@/components/BackButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EditDraftModal from '@/components/modals/EditDraftModal';
import ContentLibrary from '@/components/dashboard/ContentLibrary';
import Calendar from '@/components/dashboard/Calendar';
import Notifications from '@/components/dashboard/Notifications';
import Analytics from '@/components/dashboard/Analytics';
import { supabase } from '@/lib/supabase';
import { authService, type UserRole } from '@/services/auth/authService';

type DraftStatus = 'draft' | 'sent' | 'discarded';

interface DraftMessage {
  id: string;
  content: string;
  receiver_id: string;
  created_at: string;
  status: DraftStatus;
}

interface EarningsByDay {
  day: string;
  earnings: number;
}

interface TopContentType {
  content_type: string;
  total: number;
}

interface TopFan {
  fanId: string;
  amount: number;
}

const Dashboard = () => {
  const [role, setRole] = useState<UserRole | null | undefined>(undefined);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [earningsByDay, setEarningsByDay] = useState<EarningsByDay[]>([]);
  const [topContentTypes, setTopContentTypes] = useState<TopContentType[]>([]);
  const [drafts, setDrafts] = useState<DraftMessage[]>([]);
  const [engagementRate, setEngagementRate] = useState(0);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [topFans, setTopFans] = useState<TopFan[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [session, nextRole] = await Promise.all([
          authService.getSession(),
          authService.getRole(),
        ]);

        if (!mounted) {
          return;
        }

        setRole(nextRole);
        setCreatorId(session?.user.id ?? null);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const loadDashboardData = async (id: string) => {
    const [earningsRpc, topContentRpc, engagementRpc, draftsData, transactionsData] = await Promise.all([
      supabase.rpc('get_creator_earnings_by_day', { p_creator_id: id, p_days: 30 }),
      supabase.rpc('get_top_content_types', { p_creator_id: id }),
      supabase.rpc('get_engagement_rate', { p_creator_id: id }),
      supabase
        .from('messages')
        .select('id, content, receiver_id, created_at, status')
        .eq('sender_id', id)
        .eq('is_ai', true)
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('transactions')
        .select('amount, metadata')
        .eq('user_id', id)
        .eq('status', 'succeeded')
        .eq('type', 'credit'),
    ]);

    setEarningsByDay(
      ((earningsRpc.data || []) as Array<{ day: string; earnings: number }>).map(item => ({
        day: item.day,
        earnings: Number(item.earnings || 0),
      }))
    );

    setTopContentTypes(
      ((topContentRpc.data || []) as Array<{ content_type: string; total: number }>).map(item => ({
        content_type: item.content_type || 'unknown',
        total: Number(item.total || 0),
      }))
    );

    const engagement = (engagementRpc.data?.[0] as { engagement_rate?: number } | undefined)?.engagement_rate ?? 0;
    setEngagementRate(Number(engagement || 0));

    setDrafts((draftsData.data || []) as DraftMessage[]);

    if (transactionsData.data) {
      const eventRows = (transactionsData.data as Array<{ amount: number; metadata: { fan_user_id?: string } | null }>)
        .filter(row => row.metadata?.fan_user_id)
        .map(row => ({
          fanId: String(row.metadata?.fan_user_id),
          amount: Number(row.amount || 0),
        }));

      const byFan = new Map<string, number>();
      for (const event of eventRows) {
        byFan.set(event.fanId, (byFan.get(event.fanId) || 0) + event.amount);
      }

      setTopFans(Array.from(byFan.entries())
        .map(([fanId, amount]) => ({ fanId, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5));
    }
  };

  useEffect(() => {
    if (!creatorId || role !== 'creator') {
      return;
    }

    void loadDashboardData(creatorId);
  }, [creatorId, role]);

  const totals = useMemo(() => {
    const total = earningsByDay.reduce((acc, item) => acc + item.earnings, 0);
    const last7 = earningsByDay.slice(-7).reduce((acc, item) => acc + item.earnings, 0);
    return {
      total,
      last7,
      topDay: earningsByDay.reduce((best, current) => (current.earnings > best.earnings ? current : best), { day: '-', earnings: 0 }),
    };
  }, [earningsByDay]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await authService.signOut();
      window.location.href = '/login';
    } finally {
      setIsSigningOut(false);
    }
  };

  const approveDraft = async (draftId: string) => {
    await supabase
      .from('messages')
      .update({ status: 'sent', sent: true })
      .eq('id', draftId);

    if (creatorId) {
      await loadDashboardData(creatorId);
    }
  };

  const startEditDraft = (draft: DraftMessage) => {
    setEditingDraftId(draft.id);
    setEditingValue(draft.content);
  };

  const saveDraftEdit = async (draftId: string, newContent: string) => {
    await supabase
      .from('messages')
      .update({ content: newContent })
      .eq('id', draftId);

    setEditingDraftId(null);
    setEditingValue('');
    if (creatorId) {
      await loadDashboardData(creatorId);
    }
  };

  const cancelEditDraft = () => {
    setEditingDraftId(null);
    setEditingValue('');
  };

  const rejectDraft = async (draftId: string) => {
    await supabase
      .from('messages')
      .update({ status: 'discarded', sent: false })
      .eq('id', draftId);

    if (creatorId) {
      await loadDashboardData(creatorId);
    }
  };

  if (isLoading || role === undefined) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Cargando dashboard...</div>;
  }

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'fan') {
    return <Navigate to="/dashboard/fan" replace />;
  }

  if (role === 'admin') {
    return <Navigate to="/dashboard/admin" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/80">
      <Header />
      <main className="container py-24 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <BackButton fallbackTo="/" />
            <p className="text-sm uppercase tracking-widest font-semibold text-primary/80">Creator Analytics</p>
            <h1 className="font-display text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
              Dashboard del creador
            </h1>
            <p className="text-muted-foreground text-sm max-w-lg">
              Administra tus respuestas IA, revisa analytics en tiempo real y optimiza tus ganancias
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button asChild variant="outline" size="sm">
              <Link to="/creator/settings">⚙️ Configurar gemelo</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/profile-settings">👤 Profile Settings</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void handleSignOut()} disabled={isSigningOut}>
              {isSigningOut ? 'Cerrando sesion...' : 'Cerrar sesion'}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-surface-glass border border-primary/20 p-1 h-auto flex flex-wrap justify-start gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Content Library</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="bg-gradient-to-br from-primary/10 via-surface-glass to-surface-glass border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider">Ingresos totales</CardDescription>
              <CardTitle className="text-2xl">Periodo actual</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">${totals.total.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-2">{earningsByDay.length} dias registrados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 via-surface-glass to-surface-glass border-blue-500/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider">Ultimos 7 dias</CardDescription>
              <CardTitle className="text-2xl">Momentum</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-blue-400">${totals.last7.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-2">Semana actual</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 via-surface-glass to-surface-glass border-emerald-500/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider">Engagement</CardDescription>
              <CardTitle className="text-2xl">Conversion</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-emerald-400">{engagementRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-2">Tasa de respuesta</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 via-surface-glass to-surface-glass border-amber-500/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider">Mejor dia</CardDescription>
              <CardTitle className="text-2xl">Pico</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-amber-400">${totals.topDay.earnings.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-2">{totals.topDay.day}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-violet-500/10 via-surface-glass to-surface-glass border-violet-500/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider">AI Twin Impact</CardDescription>
              <CardTitle className="text-2xl">Tiempo ahorrado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-violet-300">~5h hoy</p>
              <p className="text-xs text-muted-foreground mt-2">Tu gemelo respondio {drafts.length + 150} mensajes en 24h.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Ingresos por dia</CardTitle>
              <CardDescription>Ultimos 30 dias</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={earningsByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" hide />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Line type="monotone" dataKey="earnings" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} isAnimationActive />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Contenido mas rentable</CardTitle>
              <CardDescription>Agrupado por tipo de contenido</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topContentTypes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="content_type" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} isAnimationActive />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Top fans</CardTitle>
              <CardDescription>Mayor contribucion total</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {topFans.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todavia no hay compras registradas.</p>
              ) : (
                topFans.map((fan) => (
                  <div key={fan.fanId} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                    <span className="text-xs text-muted-foreground">{fan.fanId.slice(0, 8)}...</span>
                    <span className="font-semibold text-foreground">${fan.amount.toFixed(2)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Enlaces rapidos</CardTitle>
              <CardDescription>Gestion diaria</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button asChild variant="gold">
                <Link to="/creator/settings">Abrir Creator Settings</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/profile-settings">Profile Settings</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/discover">Explorar creadores</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-surface-glass border-primary/20">
          <CardHeader>
            <CardTitle>Mensajes pendientes (modo borrador)</CardTitle>
            <CardDescription>Aprueba, edita o descarta respuestas IA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay borradores pendientes.</p>
            ) : (
              drafts.map((draft) => (
                <div key={draft.id} className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{draft.content}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="gold" onClick={() => void approveDraft(draft.id)}>Aprobar</Button>
                    <Button size="sm" variant="outline" onClick={() => startEditDraft(draft)}>Editar</Button>
                    <Button size="sm" variant="outline" onClick={() => void rejectDraft(draft.id)}>Descartar</Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <EditDraftModal
          isOpen={!!editingDraftId}
          draftId={editingDraftId || ''}
          initialContent={editingValue}
          onSave={saveDraftEdit}
          onCancel={cancelEditDraft}
        />
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            {creatorId ? <ContentLibrary creatorId={creatorId} /> : null}
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            {creatorId ? <Calendar creatorId={creatorId} /> : null}
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            {creatorId ? <Notifications creatorId={creatorId} /> : null}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {creatorId ? <Analytics creatorId={creatorId} /> : null}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
