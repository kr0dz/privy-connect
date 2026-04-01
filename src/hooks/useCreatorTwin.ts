import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type TwinTone = 'warm' | 'professional' | 'playful' | 'mysterious';
export type TwinEmojiUsage = 'frequent' | 'moderate' | 'rare';

export interface CreatorTwinForm {
  tone: TwinTone;
  interests: string[];
  bio: string;
  greeting_message: string;
  response_style: string;
  emoji_usage: TwinEmojiUsage;
  topics: string[];
  price_ai: number;
  price_real: number;
  trigger_keywords: string[];
  draft_mode: boolean;
  auto_send: boolean;
}

const defaultForm: CreatorTwinForm = {
  tone: 'warm',
  interests: [],
  bio: '',
  greeting_message: '',
  response_style: '',
  emoji_usage: 'moderate',
  topics: [],
  price_ai: 3,
  price_real: 10,
  trigger_keywords: [],
  draft_mode: false,
  auto_send: true,
};

function safeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }
  return input.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean);
}

export const useCreatorTwin = () => {
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [form, setForm] = useState<CreatorTwinForm>(defaultForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadTwin = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw authError ?? new Error('No hay usuario autenticado.');
      }

      const nextCreatorId = authData.user.id;
      setCreatorId(nextCreatorId);

      const { data, error: twinError } = await supabase
        .from('creator_twins')
        .select('*')
        .eq('creator_id', nextCreatorId)
        .maybeSingle();

      if (twinError) {
        throw twinError;
      }

      if (!data) {
        setForm(defaultForm);
        return;
      }

      setForm({
        tone: (data.tone as TwinTone) || 'warm',
        interests: safeStringArray(data.interests),
        bio: typeof data.bio === 'string' ? data.bio : '',
        greeting_message: typeof data.greeting_message === 'string' ? data.greeting_message : '',
        response_style: typeof data.response_style === 'string' ? data.response_style : '',
        emoji_usage: (data.emoji_usage as TwinEmojiUsage) || 'moderate',
        topics: safeStringArray(data.topics),
        price_ai: typeof data.price_ai === 'number' ? data.price_ai : 3,
        price_real: typeof data.price_real === 'number' ? data.price_real : 10,
        trigger_keywords: safeStringArray(data.trigger_keywords),
        draft_mode: Boolean(data.draft_mode),
        auto_send: typeof data.auto_send === 'boolean' ? data.auto_send : true,
      });
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'No se pudo cargar la configuracion del gemelo.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTwin();
  }, [loadTwin]);

  const updateTwin = useCallback(async (next: CreatorTwinForm): Promise<boolean> => {
    if (!creatorId) {
      setError('No hay creador autenticado para guardar cambios.');
      return false;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        creator_id: creatorId,
        tone: next.tone,
        interests: next.interests,
        bio: next.bio,
        greeting_message: next.greeting_message,
        response_style: next.response_style,
        emoji_usage: next.emoji_usage,
        topics: next.topics,
        price_ai: next.price_ai,
        price_real: next.price_real,
        trigger_keywords: next.trigger_keywords,
        draft_mode: next.draft_mode,
        auto_send: next.auto_send,
        draft_mode_enabled: next.draft_mode,
        auto_send_enabled: next.auto_send,
        active: true,
      };

      const { error: saveError } = await supabase
        .from('creator_twins')
        .upsert(payload, { onConflict: 'creator_id' });

      if (saveError) {
        throw saveError;
      }

      setForm(next);
      setSuccess('Configuracion guardada correctamente.');
      return true;
    } catch (saveErr) {
      const message = saveErr instanceof Error ? saveErr.message : 'No se pudieron guardar los cambios.';
      setError(message);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [creatorId]);

  return {
    creatorId,
    form,
    setForm,
    isLoading,
    isSaving,
    error,
    success,
    updateTwin,
    reload: loadTwin,
  };
};
