import { supabase } from '@/lib/supabase';
import { authService } from '@/services/auth/authService';

export interface ContentItem {
  id: string;
  creator_id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  title: string;
  description: string | null;
  price: number;
  price_coins: number | null;
  adult_only: boolean;
  scheduled_for: string | null;
  created_at: string;
  unlocked?: boolean;
}

export interface UnlockResult {
  ok: boolean;
  alreadyUnlocked?: boolean;
  free?: boolean;
  coinsSpent?: number;
  error?: string;
}

const ContentService = {
  async getCreatorContent(creatorId: string, fanId?: string): Promise<ContentItem[]> {
    const { data: items, error } = await supabase
      .from('creator_content')
      .select('id, creator_id, type, url, title, description, price, price_coins, adult_only, scheduled_for, created_at')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .limit(60);

    if (error || !items) {
      return [];
    }

    if (!fanId || items.length === 0) {
      return items as ContentItem[];
    }

    const lockedIds = items
      .filter((c) => typeof c.price_coins === 'number' && (c.price_coins as number) > 0)
      .map((c) => c.id);

    if (lockedIds.length === 0) {
      return items.map((c) => ({ ...c, unlocked: true })) as ContentItem[];
    }

    const { data: unlocks } = await supabase
      .from('content_unlocks')
      .select('content_id')
      .eq('fan_id', fanId)
      .in('content_id', lockedIds);

    const unlockedSet = new Set((unlocks ?? []).map((u) => u.content_id));

    return items.map((c) => ({
      ...c,
      unlocked: !c.price_coins || (c.price_coins as number) <= 0 || unlockedSet.has(c.id),
    })) as ContentItem[];
  },

  async unlockContent(contentId: string): Promise<UnlockResult> {
    const session = await authService.getSession().catch(() => null);
    if (!session?.user.id) {
      return { ok: false, error: 'Debes iniciar sesion para desbloquear contenido.' };
    }

    const { data, error } = await supabase.rpc('unlock_content_coins', {
      p_fan_id: session.user.id,
      p_content_id: contentId,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    const result = data as { ok: boolean; error?: string; already_unlocked?: boolean; free?: boolean; coins_spent?: number };
    if (!result.ok) {
      return { ok: false, error: result.error ?? 'No se pudo desbloquear el contenido.' };
    }

    return {
      ok: true,
      alreadyUnlocked: result.already_unlocked,
      free: result.free,
      coinsSpent: result.coins_spent,
    };
  },
};

export default ContentService;
