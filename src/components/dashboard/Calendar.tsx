import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Plus, CheckCircle2, Clock3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';
import AddSlotModal from '@/components/dashboard/AddSlotModal';

type VideoCallStatus = 'available' | 'booked' | 'completed' | 'cancelled';

interface VideoCall {
  id: string;
  creator_id: string;
  fan_id: string | null;
  start_time: string;
  duration: number;
  status: VideoCallStatus;
  created_at: string;
}

interface CalendarProps {
  creatorId: string;
}

const statusClassMap: Record<VideoCallStatus, string> = {
  available: 'border-emerald-500/40 bg-emerald-500/10',
  booked: 'border-primary/40 bg-primary/10',
  completed: 'border-blue-500/40 bg-blue-500/10',
  cancelled: 'border-destructive/40 bg-destructive/10',
};

const Calendar = ({ creatorId }: CalendarProps) => {
  const [slots, setSlots] = useState<VideoCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  const loadSlots = async () => {
    const { data, error } = await supabase
      .from('video_calls')
      .select('id, creator_id, fan_id, start_time, duration, status, created_at')
      .eq('creator_id', creatorId)
      .order('start_time', { ascending: true })
      .limit(100);

    if (error) {
      toast.error('No se pudo cargar el calendario de videollamadas.');
      setLoading(false);
      return;
    }

    setSlots((data || []) as VideoCall[]);
    setLoading(false);
  };

  useEffect(() => {
    void loadSlots();
  }, [creatorId]);

  const createSlot = async ({ startTime, duration }: { startTime: string; duration: number }) => {
    const { error } = await supabase.from('video_calls').insert({
      creator_id: creatorId,
      fan_id: null,
      start_time: new Date(startTime).toISOString(),
      duration,
      status: 'available',
    });

    if (error) {
      toast.error('No se pudo crear el slot. Revisa migracion y RLS.');
      return;
    }

    toast.success('Slot creado correctamente.');
    await loadSlots();
  };

  const groupedByDay = useMemo(() => {
    const groups = new Map<string, VideoCall[]>();
    for (const slot of slots) {
      const dayKey = new Date(slot.start_time).toLocaleDateString();
      const existing = groups.get(dayKey) || [];
      existing.push(slot);
      groups.set(dayKey, existing);
    }
    return Array.from(groups.entries());
  }, [slots]);

  const upcoming = slots.filter((slot) => new Date(slot.start_time) > new Date()).length;
  const completed = slots.filter((slot) => slot.status === 'completed').length;

  return (
    <div className="space-y-6">
      <Card className="bg-surface-glass border-primary/20">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-primary" />
                Calendar de videollamadas
              </CardTitle>
              <CardDescription>Gestiona tus horarios disponibles y llamadas agendadas.</CardDescription>
            </div>
            <Button variant="gold" onClick={() => setOpenModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Time Slot
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-xs uppercase text-muted-foreground mb-1">Proximos slots</p>
            <p className="text-3xl font-bold text-foreground">{upcoming}</p>
            <p className="text-xs text-muted-foreground mt-2">Disponibles y reservados en el futuro</p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-xs uppercase text-muted-foreground mb-1">Llamadas completadas</p>
            <p className="text-3xl font-bold text-foreground">{completed}</p>
            <p className="text-xs text-muted-foreground mt-2">Historico de sesiones cerradas</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-surface-glass border-primary/20">
        <CardHeader>
          <CardTitle>Agenda</CardTitle>
          <CardDescription>Vista por dia con estado de cada slot.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <p className="text-sm text-muted-foreground">Cargando calendario...</p> : null}
          {!loading && groupedByDay.length === 0 ? <p className="text-sm text-muted-foreground">Aun no tienes slots creados.</p> : null}

          {!loading && groupedByDay.map(([day, daySlots]) => (
            <div key={day} className="rounded-xl border border-border/50 p-4 space-y-3">
              <h4 className="font-semibold text-foreground">{day}</h4>
              <div className="space-y-2">
                {daySlots.map((slot) => (
                  <div key={slot.id} className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${statusClassMap[slot.status]}`}>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {slot.duration} min
                      </p>
                      <p className="text-xs text-muted-foreground">Estado: {slot.status}</p>
                    </div>
                    {slot.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-blue-300" /> : <Clock3 className="w-4 h-4 text-muted-foreground" />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <AddSlotModal open={openModal} onOpenChange={setOpenModal} onCreate={createSlot} />
    </div>
  );
};

export default Calendar;
