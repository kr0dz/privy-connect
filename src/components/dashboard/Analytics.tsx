import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

interface AnalyticsProps {
  creatorId: string;
}

interface TxRow {
  amount: number;
  created_at: string;
  metadata: { fan_user_id?: string; content_type?: string } | null;
}

const PIE_COLORS = ['hsl(var(--primary))', '#f9d56e', '#fff2c2', '#d7c285', '#8a7a4e'];

type RangeKey = '7d' | '30d' | 'month';

const Analytics = ({ creatorId }: AnalyticsProps) => {
  const [range, setRange] = useState<RangeKey>('30d');
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [messagesSent, setMessagesSent] = useState(0);
  const [messagesReceived, setMessagesReceived] = useState(0);

  const sinceDate = useMemo(() => {
    const now = new Date();
    if (range === '7d') {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    if (range === 'month') {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }, [range]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const sinceIso = sinceDate.toISOString();
      const [txRes, sentRes, recvRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('amount, created_at, metadata')
          .eq('user_id', creatorId)
          .eq('status', 'succeeded')
          .eq('type', 'credit')
          .gte('created_at', sinceIso),
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('sender_id', creatorId)
          .gte('created_at', sinceIso),
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', creatorId)
          .gte('created_at', sinceIso),
      ]);

      if (!mounted) {
        return;
      }

      setTransactions((txRes.data || []) as TxRow[]);
      setMessagesSent(Number(sentRes.count || 0));
      setMessagesReceived(Number(recvRes.count || 0));
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [creatorId, sinceDate]);

  const earningsByDay = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const tx of transactions) {
      const day = new Date(tx.created_at).toLocaleDateString();
      grouped.set(day, (grouped.get(day) || 0) + Number(tx.amount || 0));
    }
    return Array.from(grouped.entries()).map(([day, earnings]) => ({ day, earnings }));
  }, [transactions]);

  const revenueByType = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const tx of transactions) {
      const type = tx.metadata?.content_type || 'chat_unlock';
      grouped.set(type, (grouped.get(type) || 0) + Number(tx.amount || 0));
    }
    return Array.from(grouped.entries()).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const topFans = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const tx of transactions) {
      const fanId = tx.metadata?.fan_user_id;
      if (!fanId) continue;
      grouped.set(fanId, (grouped.get(fanId) || 0) + Number(tx.amount || 0));
    }
    return Array.from(grouped.entries())
      .map(([fanId, total]) => ({ fanId, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [transactions]);

  const totals = useMemo(() => {
    const totalEarnings = transactions.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
    const totalTransactions = transactions.length;
    const averageOrderValue = totalTransactions ? totalEarnings / totalTransactions : 0;
    const engagementRate = messagesReceived ? (messagesSent / messagesReceived) * 100 : 0;
    return {
      totalEarnings,
      totalTransactions,
      averageOrderValue,
      engagementRate,
    };
  }, [transactions, messagesSent, messagesReceived]);

  return (
    <div className="space-y-6">
      <Card className="bg-surface-glass border-primary/20">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Advanced Analytics</CardTitle>
              <CardDescription>Tendencias de ingresos, engagement y revenue mix.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setRange('7d')} className={`px-3 py-1 rounded-md text-xs border ${range === '7d' ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}>7d</button>
              <button type="button" onClick={() => setRange('30d')} className={`px-3 py-1 rounded-md text-xs border ${range === '30d' ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}>30d</button>
              <button type="button" onClick={() => setRange('month')} className={`px-3 py-1 rounded-md text-xs border ${range === 'month' ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}>This month</button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-xs uppercase text-muted-foreground">Total earnings</p>
            <p className="text-2xl font-bold text-foreground">${totals.totalEarnings.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-xs uppercase text-muted-foreground">Transactions</p>
            <p className="text-2xl font-bold text-foreground">{totals.totalTransactions}</p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-xs uppercase text-muted-foreground">Average order</p>
            <p className="text-2xl font-bold text-foreground">${totals.averageOrderValue.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-xs uppercase text-muted-foreground">Engagement rate</p>
            <p className="text-2xl font-bold text-foreground">{totals.engagementRate.toFixed(1)}%</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-surface-glass border-primary/20">
          <CardHeader>
            <CardTitle>Earnings over time</CardTitle>
            <CardDescription>Ingreso acumulado por dia</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={earningsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" hide />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Line dataKey="earnings" type="monotone" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-surface-glass border-primary/20">
          <CardHeader>
            <CardTitle>Revenue by content type</CardTitle>
            <CardDescription>Distribucion por contenido premium</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueByType} dataKey="value" nameKey="name" outerRadius={110} label>
                  {revenueByType.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-surface-glass border-primary/20">
          <CardHeader>
            <CardTitle>Top fans by spending</CardTitle>
            <CardDescription>Top 5 en el periodo seleccionado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topFans.length === 0 ? <p className="text-sm text-muted-foreground">No hay datos para este periodo.</p> : null}
            {topFans.map((fan) => (
              <div key={fan.fanId} className="rounded-lg border border-border/50 p-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{fan.fanId.slice(0, 8)}...</span>
                <span className="font-semibold text-foreground">${fan.total.toFixed(2)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-surface-glass border-primary/20">
          <CardHeader>
            <CardTitle>Revenue intensity</CardTitle>
            <CardDescription>Comparativa visual de ingresos por dia</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={earningsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" hide />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Bar dataKey="earnings" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
