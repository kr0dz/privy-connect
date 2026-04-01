import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

type UserRole = 'fan' | 'creator' | 'admin';

interface Step {
  title: string;
  body: string;
}

const fanSteps: Step[] = [
  {
    title: 'Descubre creadores',
    body: 'Explora perfiles, desbloquea contenido premium y encuentra experiencias privadas.',
  },
  {
    title: 'Chat personalizado',
    body: 'Habla con el gemelo IA del creador con memoria de tus gustos y conversaciones previas.',
  },
  {
    title: 'Pagos seamless',
    body: 'Desbloquea contenido en segundos y recíbelo al instante en el chat.',
  },
];

const creatorSteps: Step[] = [
  {
    title: 'Configura tu gemelo',
    body: 'Ajusta tono, estilo y temas desde Creator Settings para mantener tu identidad.',
  },
  {
    title: 'Monetiza interacciones',
    body: 'Gestiona unlocks, mensajes premium y revisa métricas de ingresos en el dashboard.',
  },
  {
    title: 'Modo borrador',
    body: 'Aprueba, edita o descarta respuestas IA antes de enviarlas a tus fans.',
  },
];

const adminSteps: Step[] = [
  {
    title: 'Supervisión global',
    body: 'Monitorea métricas y estados de plataforma desde el panel de administración.',
  },
  {
    title: 'Control de calidad',
    body: 'Audita experiencias y verifica que el flujo creator-fan funcione correctamente.',
  },
];

const Onboarding = () => {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [role, setRole] = useState<UserRole>('fan');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const steps = useMemo(() => {
    if (role === 'creator') {
      return creatorSteps;
    }
    if (role === 'admin') {
      return adminSteps;
    }
    return fanSteps;
  }, [role]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;
        if (!mounted || !user) {
          return;
        }

        const userRole = ((user.user_metadata?.role || user.app_metadata?.role || 'fan') as UserRole);
        setRole(userRole);

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();

        if (!mounted) {
          return;
        }

        setProfileId(user.id);
        if (!profile?.onboarding_completed) {
          setOpen(true);
        }
      } catch {
        if (mounted) {
          setOpen(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const complete = async () => {
    if (!profileId) {
      setOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', profileId);
    } finally {
      setIsSaving(false);
      setOpen(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16 }}
            className="w-full max-w-lg rounded-2xl border border-primary/20 bg-surface-glass shadow-elevated p-6"
          >
            <p className="text-xs uppercase tracking-wider text-primary mb-2">Onboarding</p>
            <h3 className="font-display text-2xl font-bold text-foreground mb-2">{steps[index]?.title}</h3>
            <p className="text-sm text-muted-foreground min-h-16">{steps[index]?.body}</p>

            <div className="flex items-center gap-2 my-4">
              {steps.map((_, stepIndex) => (
                <div
                  key={stepIndex}
                  className={`h-1.5 rounded-full flex-1 ${stepIndex <= index ? 'bg-primary' : 'bg-secondary'}`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                disabled={index === 0 || isSaving}
                onClick={() => setIndex(prev => Math.max(prev - 1, 0))}
              >
                Anterior
              </Button>

              {index < steps.length - 1 ? (
                <Button
                  variant="gold"
                  disabled={isSaving}
                  onClick={() => setIndex(prev => Math.min(prev + 1, steps.length - 1))}
                >
                  Siguiente
                </Button>
              ) : (
                <Button variant="gold" disabled={isSaving} onClick={() => void complete()}>
                  {isSaving ? 'Guardando...' : 'Finalizar'}
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default Onboarding;
