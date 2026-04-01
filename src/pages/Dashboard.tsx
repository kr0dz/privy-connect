import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

  const saveDraftEdit = async () => {
    if (!editingDraftId) {
      return;
    }

    await supabase
      .from('messages')
      .update({ content: editingValue })
      .eq('id', editingDraftId);

    setEditingDraftId(null);
    setEditingValue('');
    if (creatorId) {
      await loadDashboardData(creatorId);
    }
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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-24 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-primary">Creator Analytics</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">Dashboard del creador</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link to="/creator/settings">Configurar gemelo</Link>
            </Button>
            <Button variant="outline" onClick={() => void handleSignOut()} disabled={isSigningOut}>
              {isSigningOut ? 'Cerrando sesion...' : 'Cerrar sesion'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Ingresos totales</CardTitle>
              <CardDescription>Periodo actual</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">${totals.total.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Ultimos 7 dias</CardTitle>
              <CardDescription>Momentum semanal</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">${totals.last7.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Engagement</CardTitle>
              <CardDescription>Conversion sobre mensajes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{engagementRate.toFixed(1)}%</p>
            </CardContent>
          </Card>

          <Card className="bg-surface-glass border-primary/20">
            <CardHeader>
              <CardTitle>Mejor dia</CardTitle>
              <CardDescription>Pico de ingresos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">${totals.topDay.earnings.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-2">{totals.topDay.day}</p>
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
                  <Line type="monotone" dataKey="earnings" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
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
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
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
                <Link to="/discover">Explorar creadores</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard/creator">Vista legacy creator</Link>
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

        {editingDraftId ? (
          <div className="fixed inset-0 z-[110] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-xl border border-primary/20 bg-surface-glass p-4">
              <h3 className="font-display text-xl text-foreground mb-2">Editar borrador</h3>
              <textarea
                className="w-full min-h-40 rounded-lg bg-secondary border border-border p-3 text-sm"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
              />
              <div className="flex items-center justify-end gap-2 mt-3">
                <Button variant="outline" onClick={() => setEditingDraftId(null)}>Cancelar</Button>
                <Button variant="gold" onClick={() => void saveDraftEdit()}>Guardar</Button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
