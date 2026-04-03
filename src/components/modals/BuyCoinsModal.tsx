import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, X, Tag, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import useWallet from '@/hooks/useWallet';

export interface CoinPack {
  coins: number;
  price_usd: number;
  label: string;
  popular?: boolean;
}

export const COIN_PACKS: CoinPack[] = [
  { coins: 100, price_usd: 5, label: 'Starter' },
  { coins: 250, price_usd: 12, label: 'Popular', popular: true },
  { coins: 500, price_usd: 22, label: 'Pro' },
];

interface BuyCoinsModalProps {
  open: boolean;
  onClose: () => void;
}

const BuyCoinsModal = ({ open, onClose }: BuyCoinsModalProps) => {
  const [selected, setSelected] = useState<CoinPack>(COIN_PACKS[1]);
  const [promoCode, setPromoCode] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [buying, setBuying] = useState(false);
  const { balance, buyCoins, refreshBalance } = useWallet();
  const [promoResult, setPromoResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleBuy = async () => {
    setBuying(true);
    const result = await buyCoins(selected.coins, selected.price_usd);
    setBuying(false);

    if (!result.ok || !result.checkoutUrl) {
      toast.error(result.error || 'No se pudo iniciar la compra.');
      return;
    }

    window.open(result.checkoutUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setApplyingPromo(true);
    setPromoResult(null);

    // Import supabase inline to avoid circular deps at module level
    const { supabase } = await import('@/lib/supabase');
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setPromoResult({ ok: false, message: 'Debes iniciar sesion.' });
      setApplyingPromo(false);
      return;
    }

    const { data, error } = await supabase.rpc('apply_promo_code', {
      p_user_id: authData.user.id,
      p_code: promoCode.trim(),
    });

    setApplyingPromo(false);

    if (error) {
      setPromoResult({ ok: false, message: error.message });
      return;
    }

    const result = data as { ok: boolean; error?: string; bonus_coins?: number };
    if (!result.ok) {
      setPromoResult({ ok: false, message: result.error ?? 'Codigo no valido.' });
      return;
    }

    setPromoResult({ ok: true, message: `¡Codigo aplicado! +${result.bonus_coins ?? 0} monedas` });
    setPromoCode('');
    void refreshBalance();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-card border border-primary/30 rounded-2xl p-6 shadow-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                <Coins className="w-5 h-5 text-primary" /> Comprar PrivyCoins
              </h3>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Saldo actual: <span className="text-primary font-semibold">{Math.floor(balance)} monedas</span>
            </p>

            {/* Packs */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {COIN_PACKS.map((pack) => (
                <button
                  key={pack.coins}
                  onClick={() => setSelected(pack)}
                  className={`relative rounded-xl border p-4 text-center transition-all ${
                    selected.coins === pack.coins
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {pack.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                      Mas popular
                    </span>
                  )}
                  <div className="text-2xl font-display font-bold text-foreground">{pack.coins}</div>
                  <div className="text-xs text-muted-foreground mb-1">monedas</div>
                  <div className="text-sm font-semibold text-primary">${pack.price_usd}</div>
                  <div className="text-[10px] text-muted-foreground">{pack.label}</div>
                  {selected.coins === pack.coins && (
                    <Check className="w-4 h-4 text-primary absolute bottom-2 right-2" />
                  )}
                </button>
              ))}
            </div>

            {/* Price per coin indicator */}
            <p className="text-xs text-muted-foreground text-center mb-5">
              {selected.coins / selected.price_usd} monedas por dolar · {selected.coins} monedas por ${selected.price_usd}
            </p>

            {/* Promo code */}
            <div className="mb-5">
              <label className="block text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Codigo de promocion (opcional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej: WELCOME50"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={applyingPromo || !promoCode.trim()}
                  onClick={() => void handleApplyPromo()}
                >
                  {applyingPromo ? '...' : 'Aplicar'}
                </Button>
              </div>
              {promoResult && (
                <p className={`text-xs mt-1.5 ${promoResult.ok ? 'text-green-500' : 'text-destructive'}`}>
                  {promoResult.message}
                </p>
              )}
            </div>

            <Button
              variant="gold"
              className="w-full"
              disabled={buying}
              onClick={() => void handleBuy()}
            >
              {buying ? 'Redirigiendo...' : `Comprar ${selected.coins} monedas — $${selected.price_usd}`}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-3">
              Pago seguro via Stripe. Las monedas se acreditan inmediatamente tras el pago.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BuyCoinsModal;
