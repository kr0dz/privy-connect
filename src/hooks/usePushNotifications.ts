import { useEffect } from 'react';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/lib/supabase';

interface PushTokenPayload {
  token: string;
  device?: string;
}

async function persistPushToken(userId: string, payload: PushTokenPayload): Promise<void> {
  if (!payload.token) {
    return;
  }

  await supabase
    .from('push_tokens')
    .upsert(
      {
        user_id: userId,
        token: payload.token,
        device: payload.device ?? 'web',
      },
      { onConflict: 'token' }
    );
}

export const usePushNotifications = () => {
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;
        if (!mounted || !user) {
          return;
        }

        const maybeToken = typeof window !== 'undefined'
          ? window.localStorage.getItem('privyloop:expoPushToken')
          : null;

        if (maybeToken) {
          await persistPushToken(user.id, { token: maybeToken, device: 'web' });
        }

        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
          navigator.serviceWorker.addEventListener('message', (event) => {
            const title = String(event.data?.title || 'Nueva notificacion');
            const body = String(event.data?.body || 'Tienes una actualizacion en PrivyLoop');
            toast.success(title, { description: body });
          });
        }
      } catch {
        // Silent fallback to avoid breaking the app when notifications are unavailable.
      }
    };

    void init();
    return () => {
      mounted = false;
    };
  }, []);
};
