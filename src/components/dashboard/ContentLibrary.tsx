import { FormEvent, useEffect, useState } from 'react';
import { Upload, CalendarDays, DollarSign, Edit3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';

type ContentType = 'image' | 'video' | 'audio';

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  type: ContentType;
  url: string;
  price: number;
  scheduled_for: string | null;
  created_at: string;
}

interface ContentLibraryProps {
  creatorId: string;
}

const ContentLibrary = ({ creatorId }: ContentLibraryProps) => {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(9.99);
  const [type, setType] = useState<ContentType>('image');
  const [scheduledFor, setScheduledFor] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const loadContent = async () => {
    const { data, error } = await supabase
      .from('creator_content')
      .select('id, title, description, type, url, price, scheduled_for, created_at')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      toast.error('No se pudo cargar tu biblioteca de contenido.');
      setLoading(false);
      return;
    }

    setItems((data || []) as ContentItem[]);
    setLoading(false);
  };

  useEffect(() => {
    void loadContent();
  }, [creatorId]);

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast.error('Selecciona un archivo para subir.');
      return;
    }

    setSubmitting(true);
    try {
      const extension = file.name.split('.').pop() || 'bin';
      const path = `${creatorId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

      const uploadResult = await supabase.storage
        .from('creator-content')
        .upload(path, file, { upsert: false });

      if (uploadResult.error) {
        throw uploadResult.error;
      }

      const { data: publicData } = supabase.storage.from('creator-content').getPublicUrl(path);

      const { error: insertError } = await supabase
        .from('creator_content')
        .insert({
          creator_id: creatorId,
          title,
          description: description || null,
          type,
          url: publicData.publicUrl,
          price,
          scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        });

      if (insertError) {
        throw insertError;
      }

      toast.success('Contenido subido correctamente.');
      setTitle('');
      setDescription('');
      setPrice(9.99);
      setScheduledFor('');
      setFile(null);
      await loadContent();
    } catch (error) {
      console.error(error);
      toast.error('No se pudo subir el contenido. Verifica bucket y tabla.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-surface-glass border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            Nuevo contenido premium
          </CardTitle>
          <CardDescription>Sube, categoriza, define precio y agenda publicaciones.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleUpload}>
            <div className="space-y-2">
              <Label htmlFor="content-title">Titulo</Label>
              <Input id="content-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content-type">Tipo</Label>
              <select
                id="content-type"
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value as ContentType)}
              >
                <option value="image">Imagen</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="content-description">Descripcion</Label>
              <Input id="content-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content-price">Precio (USD)</Label>
              <Input id="content-price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(Number(e.target.value || 0))} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content-schedule">Programar para</Label>
              <Input id="content-schedule" type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="content-file">Archivo</Label>
              <Input id="content-file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" variant="gold" disabled={submitting}>
                {submitting ? 'Subiendo...' : 'Subir contenido'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-surface-glass border-primary/20">
        <CardHeader>
          <CardTitle>Biblioteca</CardTitle>
          <CardDescription>Tus ultimas piezas publicadas o programadas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-sm text-muted-foreground">Cargando contenido...</p> : null}
          {!loading && items.length === 0 ? <p className="text-sm text-muted-foreground">Aun no subiste contenido.</p> : null}
          {!loading && items.map((item) => (
            <div key={item.id} className="rounded-xl border border-border/50 bg-card p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-semibold text-foreground">{item.title}</h4>
                <span className="text-xs uppercase text-primary">{item.type}</span>
              </div>
              {item.description ? <p className="text-sm text-muted-foreground">{item.description}</p> : null}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><DollarSign className="w-3 h-3" /> {Number(item.price).toFixed(2)}</span>
                <span className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {item.scheduled_for ? new Date(item.scheduled_for).toLocaleString() : 'Sin programar'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" asChild>
                  <a href={item.url} target="_blank" rel="noreferrer">Ver archivo</a>
                </Button>
                <Button size="sm" variant="outline" disabled>
                  <Edit3 className="w-3 h-3 mr-1" /> Editar
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentLibrary;
