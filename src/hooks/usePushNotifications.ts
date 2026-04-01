import { useEffect } from 'react';
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

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const saved = window.localStorage.getItem('privyloop:expoPushToken');
  if (saved) {
    return saved;
  }

  try {
    const expoModuleName = 'expo-notifications';
    const maybeExpo = await import(/* @vite-ignore */ expoModuleName).catch(() => null);
    if (maybeExpo?.getExpoPushTokenAsync) {
      const tokenResponse = await maybeExpo.getExpoPushTokenAsync();
      const token = tokenResponse?.data ? String(tokenResponse.data) : null;
      if (token) {
        window.localStorage.setItem('privyloop:expoPushToken', token);
        return token;
      }
    }
  } catch {
    // Fallback a token web sintetico.
  }

  const notificationApi = (window as Window & { Notification?: { permission: NotificationPermission; requestPermission: () => Promise<NotificationPermission> } }).Notification;
  if (notificationApi && notificationApi.permission === 'default') {
    await notificationApi.requestPermission();
  }

  const syntheticToken = `ExpoPushToken[web-${crypto.randomUUID()}]`;
  window.localStorage.setItem('privyloop:expoPushToken', syntheticToken);
  return syntheticToken;
}

export const usePushNotifications = () => {
  useEffect(() => {
    let mounted = true;
    let unsubscribeAuth: (() => void) | null = null;

    const init = async () => {
      try {
        const syncToken = async () => {
          const { data: authData } = await supabase.auth.getUser();
          const user = authData.user;
          if (!mounted || !user) {
            return;
          }

          const token = await registerForPushNotificationsAsync();
          if (token) {
            await persistPushToken(user.id, { token, device: 'web' });
          }
        };

        await syncToken();

        const { data: authSubscription } = supabase.auth.onAuthStateChange(() => {
          void syncToken();
        });
        unsubscribeAuth = () => authSubscription.subscription.unsubscribe();

        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
          navigator.serviceWorker.addEventListener('message', (event) => {
            const title = String(event.data?.title || 'Nueva notificacion');
            const body = String(event.data?.body || 'Tienes una actualizacion en PrivyLoop');
            window.dispatchEvent(new CustomEvent('push:received', { detail: { title, body } }));
          });
        }
      } catch {
        // Silent fallback to avoid breaking the app when notifications are unavailable.
      }
    };

    void init();
    return () => {
      mounted = false;
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, []);
};
