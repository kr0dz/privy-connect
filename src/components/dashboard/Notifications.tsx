import { useEffect, useMemo, useState } from 'react';
import { Bell, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase, type Json } from '@/lib/supabase';

interface NotificationEvent {
  id: string;
  event_type: string;
  metadata: Json | null;
  created_at: string;
}

interface DraftRow {
  id: string;
  content: string;
  created_at: string;
}

interface NotificationsProps {
  creatorId: string;
}

const eventToMessage = (eventType: string, metadata: Json | null): string => {
  const data = (metadata && typeof metadata === 'object' && !Array.isArray(metadata))
    ? metadata as Record<string, unknown>
    : {};

  if (eventType === 'payment') {
    const amount = Number(data.amount || 0).toFixed(2);
    const contentType = String(data.content_type || 'contenido premium');
    return `Nuevo pago de $${amount} por ${contentType}.`;
  }

  if (eventType === 'unlock') {
    return 'Un fan desbloqueo contenido premium.';
  }

  if (eventType === 'message_sent') {
    return 'Se envio un nuevo mensaje en el chat.';
  }

  if (eventType === 'ai_response_sent') {
    return 'Tu gemelo IA envio una respuesta automaticamente.';
  }

  if (eventType === 'booking') {
    return 'Un fan reservo una videollamada en tu calendario.';
  }

  return `Evento reciente: ${eventType}`;
};

const Notifications = ({ creatorId }: NotificationsProps) => {
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [aiSentToday, setAiSentToday] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [eventsRes, draftsRes, aiRes] = await Promise.all([
        supabase
          .from('analytics_events')
          .select('id, event_type, metadata, created_at')
          .eq('creator_id', creatorId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('messages')
          .select('id, content, created_at')
          .eq('sender_id', creatorId)
          .eq('status', 'draft')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('sender_id', creatorId)
          .eq('is_ai', true)
          .eq('status', 'sent')
          .gte('created_at', dayAgo),
      ]);

      if (!mounted) {
        return;
      }

      setEvents((eventsRes.data || []) as NotificationEvent[]);
      setDrafts((draftsRes.data || []) as DraftRow[]);
      setAiSentToday(Number(aiRes.count || 0));
      setLoading(false);
    };

    void load();

    const onPush = () => {
      void load();
    };
    window.addEventListener('push:received', onPush);

    return () => {
      window.removeEventListener('push:received', onPush);
      mounted = false;
    };
  }, [creatorId]);

  const estimatedHoursSaved = useMemo(() => (aiSentToday * 2) / 60, [aiSentToday]);

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-violet-500/10 via-surface-glass to-surface-glass border-violet-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-300" />
            Actividad AI Twin
          </CardTitle>
          <CardDescription>Impacto diario automatico de tu asistente IA.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-violet-200">{aiSentToday} respuestas hoy</p>
          <p className="text-sm text-muted-foreground mt-2">
            Tiempo estimado ahorrado: {estimatedHoursSaved.toFixed(1)} horas.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-surface-glass border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                Notificaciones recientes
              </CardTitle>
              <CardDescription>Compras, unlocks, eventos y actividad operativa.</CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard">View all</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-sm text-muted-foreground">Cargando notificaciones...</p> : null}
          {!loading && events.length === 0 ? <p className="text-sm text-muted-foreground">Sin eventos recientes.</p> : null}
          {!loading && events.map((event) => (
            <div key={event.id} className="rounded-lg border border-border/50 p-3">
              <p className="text-sm text-foreground">{eventToMessage(event.event_type, event.metadata)}</p>
              <p className="text-xs text-muted-foreground mt-1">{new Date(event.created_at).toLocaleString()}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-surface-glass border-primary/20">
        <CardHeader>
          <CardTitle>Drafts pendientes</CardTitle>
          <CardDescription>Mensajes IA esperando aprobacion manual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!loading && drafts.length === 0 ? <p className="text-sm text-muted-foreground">No hay borradores pendientes.</p> : null}
          {!loading && drafts.map((draft) => (
            <div key={draft.id} className="rounded-lg border border-border/50 p-3">
              <p className="text-sm text-foreground line-clamp-2">Draft awaiting approval: {draft.content}</p>
              <div className="flex items-center justify-between mt-2 gap-2">
                <p className="text-xs text-muted-foreground">{new Date(draft.created_at).toLocaleString()}</p>
                <Button asChild size="sm" variant="outline">
                  <Link to="/dashboard">Revisar draft</Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;
