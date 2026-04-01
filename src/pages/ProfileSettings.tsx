import { FormEvent, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackButton from '@/components/BackButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authService, type UserRole } from '@/services/auth/authService';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/sonner';

interface ProfileSettingsForm {
  name: string;
  bio: string;
  avatar_url: string;
  instagram_url: string;
  twitter_url: string;
}

const defaultForm: ProfileSettingsForm = {
  name: '',
  bio: '',
  avatar_url: '',
  instagram_url: '',
  twitter_url: '',
};

const ProfileSettings = () => {
  const [role, setRole] = useState<UserRole | null | undefined>(undefined);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileSettingsForm>(defaultForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [session, currentRole] = await Promise.all([
          authService.getSession(),
          authService.getRole(),
        ]);

        if (!mounted) {
          return;
        }

        setRole(currentRole);
        setProfileId(session?.user.id ?? null);

        if (!session?.user.id) {
          return;
        }

        const { data } = await supabase
          .from('profiles')
          .select('name, bio, avatar_url, instagram_url, twitter_url')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!mounted || !data) {
          return;
        }

        const row = data as Partial<ProfileSettingsForm>;
        setForm({
          name: row.name || '',
          bio: row.bio || '',
          avatar_url: row.avatar_url || '',
          instagram_url: row.instagram_url || '',
          twitter_url: row.twitter_url || '',
        });
      } catch {
        if (mounted) {
          toast.error('No se pudieron cargar tus datos de perfil.');
        }
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profileId) {
      return;
    }

    setIsSaving(true);
    try {
      const { error, data } = await supabase
        .from('profiles')
        .update({
          name: form.name,
          bio: form.bio,
          avatar_url: form.avatar_url,
          instagram_url: form.instagram_url || null,
          twitter_url: form.twitter_url || null,
        })
        .select('id')
        .eq('id', profileId);

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No fue posible actualizar el perfil. Verifica permisos RLS en profiles.');
      }

      toast.success('Perfil actualizado correctamente.');
      window.dispatchEvent(new CustomEvent('profile:updated'));
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || role === undefined) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Cargando perfil...</div>;
  }

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-24 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <BackButton fallbackTo="/dashboard" />
        </div>

        <Card className="max-w-3xl mx-auto bg-surface-glass border-primary/20 shadow-elevated">
          <CardHeader>
            <CardTitle className="font-display text-3xl">Profile Settings</CardTitle>
            <CardDescription>Gestiona tu informacion publica y enlaces sociales.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" className="min-h-28" value={form.bio} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar">Avatar URL</Label>
                <Input id="avatar" value={form.avatar_url} onChange={(e) => setForm((prev) => ({ ...prev, avatar_url: e.target.value }))} />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input id="instagram" placeholder="https://instagram.com/tuusuario" value={form.instagram_url} onChange={(e) => setForm((prev) => ({ ...prev, instagram_url: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter">X / Twitter</Label>
                  <Input id="twitter" placeholder="https://x.com/tuusuario" value={form.twitter_url} onChange={(e) => setForm((prev) => ({ ...prev, twitter_url: e.target.value }))} />
                </div>
              </div>

              <Button type="submit" variant="gold" disabled={isSaving}>
                {isSaving ? 'Guardando...' : 'Guardar perfil'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default ProfileSettings;
