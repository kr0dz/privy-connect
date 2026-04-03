import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import useWallet from '@/hooks/useWallet';

const PRESET_TIPS = [5, 10, 25, 50, 100];

interface TipModalProps {
  open: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  fanId: string;
}

const TipModal = ({ open, onClose, creatorId, creatorName, fanId }: TipModalProps) => {
  const [amount, setAmount] = useState<number>(10);
  const [custom, setCustom] = useState('');
  const [sending, setSending] = useState(false);
  const { balance, deductCoins, refreshBalance } = useWallet();

  const finalAmount = custom !== '' ? Number(custom) : amount;

  const handleSend = async () => {
    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      toast.error('Ingresa un monto valido.');
      return;
    }

    if (finalAmount > balance) {
      toast.error(`Saldo insuficiente. Tienes ${Math.floor(balance)} monedas.`);
      return;
    }

    setSending(true);
    const { data, error } = await supabase.rpc('send_tip', {
      p_fan_id: fanId,
      p_creator_id: creatorId,
      p_amount: finalAmount,
    });

    setSending(false);

    if (error) {
      toast.error(error.message || 'No se pudo enviar el tip.');
      return;
    }

    const result = data as { ok: boolean; error?: string };
    if (!result.ok) {
      toast.error(result.error ?? 'No se pudo enviar el tip.');
      return;
    }

    deductCoins(finalAmount);
    void refreshBalance();
    toast.success(`¡Enviaste ${finalAmount} monedas a ${creatorName}! 💎`);
    setCustom('');
    setAmount(10);
    onClose();
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
            className="w-full max-w-sm bg-card border border-primary/30 rounded-2xl p-6 shadow-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <Gem className="w-5 h-5 text-primary" /> Enviar propina
              </h3>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Apoya a <span className="text-foreground font-medium">{creatorName}</span> con monedas.<br />
              Tu saldo actual: <span className="text-primary font-semibold">{Math.floor(balance)} monedas</span>
            </p>

            {/* Preset amounts */}
            <div className="flex flex-wrap gap-2 mb-4">
              {PRESET_TIPS.map((tip) => (
                <button
                  key={tip}
                  onClick={() => { setAmount(tip); setCustom(''); }}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    amount === tip && custom === ''
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {tip} 💎
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="mb-5">
              <label className="block text-xs text-muted-foreground mb-1">Monto personalizado</label>
              <input
                type="number"
                min="1"
                placeholder="Ej: 75"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <Button
              variant="gold"
              className="w-full"
              disabled={sending || finalAmount <= 0 || finalAmount > balance}
              onClick={() => void handleSend()}
            >
              {sending ? 'Enviando...' : `Enviar ${finalAmount > 0 ? finalAmount : '?'} 💎 a ${creatorName}`}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TipModal;
