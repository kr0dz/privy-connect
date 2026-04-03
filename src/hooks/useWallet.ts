import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/auth/authService';

interface BuyCoinsResult {
  ok: boolean;
  checkoutUrl?: string;
  error?: string;
}

export const useWallet = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshBalance = useCallback(async () => {
    if (!userId) {
      setBalance(0);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      setBalance(Number(data.wallet_balance || 0));
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const session = await authService.getSession().catch(() => null);
      if (!mounted) {
        return;
      }
      setUserId(session?.user.id ?? null);
    };

    void init();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    void refreshBalance();
  }, [refreshBalance]);

  const buyCoins = useCallback(async (coins: number, priceUsd?: number): Promise<BuyCoinsResult> => {
    if (!userId) {
      return { ok: false, error: 'Debes iniciar sesion para comprar monedas.' };
    }

    const body: Record<string, unknown> = { userId, coins };
    if (priceUsd !== undefined) {
      body.price_usd = priceUsd;
    }

    const { data, error } = await supabase.functions.invoke<{ url?: string }>('stripe-buy-coins', {
      body,
    });

    if (error) {
      return { ok: false, error: error.message || 'No se pudo iniciar checkout de monedas.' };
    }

    if (!data?.url) {
      return { ok: false, error: 'Checkout URL no disponible.' };
    }

    return { ok: true, checkoutUrl: data.url };
  }, [userId]);

  const deductCoins = useCallback((amount: number) => {
    setBalance((prev) => Math.max(0, prev - amount));
  }, []);

  return {
    userId,
    balance,
    loading,
    refreshBalance,
    buyCoins,
    deductCoins,
  };
};

export default useWallet;
