import { FormEvent, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackButton from '@/components/BackButton';
import { Button } from '@/components/ui/button';
import { authService, type UserRole } from '@/services/auth/authService';
import { useCreatorTwin, type CreatorTwinForm } from '@/hooks/useCreatorTwin';
import { useEffect, useState } from 'react';

function toTags(value: string): string[] {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function fromTags(values: string[]): string {
  return values.join(', ');
}

const CreatorSettings = () => {
  const [role, setRole] = useState<UserRole | null | undefined>(undefined);
  const [localForm, setLocalForm] = useState<CreatorTwinForm | null>(null);
  const { form, setForm, isLoading, isSaving, error, success, updateTwin } = useCreatorTwin();

  useEffect(() => {
    let mounted = true;
    authService
      .getRole()
      .then(value => {
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
    setLocalForm(form);
  }, [form]);

  const validationError = useMemo(() => {
    if (!localForm) {
      return null;
    }

    if (!localForm.bio.trim()) {
      return 'El campo bio es obligatorio.';
    }

    if (!localForm.greeting_message.trim()) {
      return 'El saludo inicial es obligatorio.';
    }

    if (!localForm.response_style.trim()) {
      return 'El estilo de respuesta es obligatorio.';
    }

    if (localForm.price_ai <= 0 || localForm.price_real <= 0) {
      return 'Los precios deben ser mayores a cero.';
    }

    return null;
  }, [localForm]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!localForm || validationError) {
      return;
    }

    await updateTwin(localForm);
    setForm(localForm);
  };

  if (role === undefined || isLoading || !localForm) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Cargando configuracion...</div>;
  }

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'creator' && role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-24">
        <div className="max-w-3xl mx-auto mb-4">
          <BackButton fallbackTo="/dashboard" />
        </div>
        <div className="max-w-3xl mx-auto bg-surface-glass border border-primary/20 rounded-2xl p-6 md:p-8 shadow-elevated">
          <h1 className="font-display text-3xl font-bold text-foreground">Configuracion del gemelo digital</h1>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            Ajusta personalidad, precios y triggers de intervencion. Si agregas campos nuevos en DB,
            manten el tipado sincronizado en src/lib/supabase.ts.
          </p>

          <form className="space-y-5" onSubmit={submit}>
            <div>
              <label className="block text-sm mb-1">Tone</label>
              <select
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2"
                value={localForm.tone}
                onChange={(e) => setLocalForm(prev => prev ? { ...prev, tone: e.target.value as CreatorTwinForm['tone'] } : prev)}
              >
                <option value="warm">warm</option>
                <option value="professional">professional</option>
                <option value="playful">playful</option>
                <option value="mysterious">mysterious</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Interests (coma separado)</label>
              <input
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2"
                value={fromTags(localForm.interests)}
                onChange={(e) => setLocalForm(prev => prev ? { ...prev, interests: toTags(e.target.value) } : prev)}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Bio</label>
              <textarea
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2 min-h-24"
                value={localForm.bio}
                onChange={(e) => setLocalForm(prev => prev ? { ...prev, bio: e.target.value } : prev)}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Greeting message</label>
              <input
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2"
                value={localForm.greeting_message}
                onChange={(e) => setLocalForm(prev => prev ? { ...prev, greeting_message: e.target.value } : prev)}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Response style</label>
              <textarea
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2 min-h-24"
                value={localForm.response_style}
                onChange={(e) => setLocalForm(prev => prev ? { ...prev, response_style: e.target.value } : prev)}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Emoji usage</label>
              <select
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2"
                value={localForm.emoji_usage}
                onChange={(e) => setLocalForm(prev => prev ? { ...prev, emoji_usage: e.target.value as CreatorTwinForm['emoji_usage'] } : prev)}
              >
                <option value="frequent">frequent</option>
                <option value="moderate">moderate</option>
                <option value="rare">rare</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Topics (coma separado)</label>
              <input
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2"
                value={fromTags(localForm.topics)}
                onChange={(e) => setLocalForm(prev => prev ? { ...prev, topics: toTags(e.target.value) } : prev)}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">price_ai</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2"
                  value={localForm.price_ai}
                  onChange={(e) => setLocalForm(prev => prev ? { ...prev, price_ai: Number(e.target.value || 0) } : prev)}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">price_real</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2"
                  value={localForm.price_real}
                  onChange={(e) => setLocalForm(prev => prev ? { ...prev, price_real: Number(e.target.value || 0) } : prev)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">trigger_keywords (coma separado)</label>
              <input
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2"
                value={fromTags(localForm.trigger_keywords)}
                onChange={(e) => setLocalForm(prev => prev ? { ...prev, trigger_keywords: toTags(e.target.value) } : prev)}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={localForm.draft_mode}
                  onChange={(e) => setLocalForm(prev => prev ? { ...prev, draft_mode: e.target.checked } : prev)}
                />
                Draft mode
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={localForm.auto_send}
                  onChange={(e) => setLocalForm(prev => prev ? { ...prev, auto_send: e.target.checked } : prev)}
                />
                Auto send
              </label>
            </div>

            {validationError ? <p className="text-sm text-destructive">{validationError}</p> : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {success ? <p className="text-sm text-green-500">{success}</p> : null}

            <Button type="submit" variant="gold" disabled={Boolean(validationError) || isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CreatorSettings;
