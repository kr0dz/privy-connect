import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Image, Video, Headphones, Coins, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ContentService, { type ContentItem } from '@/services/content/ContentService';
import useWallet from '@/hooks/useWallet';

const typeIcon: Record<string, React.ReactNode> = {
  image: <Image className="w-5 h-5" />,
  video: <Video className="w-5 h-5" />,
  audio: <Headphones className="w-5 h-5" />,
};

interface ContentCardProps {
  item: ContentItem;
  index?: number;
  ageVerified: boolean;
  onUnlocked: (contentId: string) => void;
}

const ContentCard = ({ item, index = 0, ageVerified, onUnlocked }: ContentCardProps) => {
  const [unlocking, setUnlocking] = useState(false);
  const { balance, deductCoins, refreshBalance } = useWallet();

  const isLocked = Boolean(item.price_coins && item.price_coins > 0 && !item.unlocked);
  const requiresAge = item.adult_only && !ageVerified;

  const handleUnlock = async () => {
    if (requiresAge) {
      toast.error('Debes verificar tu edad para ver este contenido.');
      return;
    }

    if (!item.price_coins) {
      return;
    }

    if (balance < item.price_coins) {
      toast.error(`Necesitas ${item.price_coins} monedas. Tienes ${Math.floor(balance)}.`, {
        description: 'Compra monedas para desbloquear este contenido.',
      });
      return;
    }

    setUnlocking(true);
    const result = await ContentService.unlockContent(item.id);
    setUnlocking(false);

    if (!result.ok) {
      toast.error(result.error ?? 'No se pudo desbloquear el contenido.');
      return;
    }

    if (result.coinsSpent && result.coinsSpent > 0) {
      deductCoins(result.coinsSpent);
      void refreshBalance();
    }

    toast.success(`¡Contenido desbloqueado! (−${item.price_coins} monedas)`);
    onUnlocked(item.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04 }}
      className="aspect-square rounded-xl bg-gradient-card border border-border/50 relative overflow-hidden group cursor-pointer hover:border-primary/20 transition-all"
    >
      {/* Unlocked: show preview */}
      {!isLocked && !requiresAge ? (
        <a href={item.url} target="_blank" rel="noreferrer" className="block w-full h-full">
          {item.type === 'image' ? (
            <img
              src={item.url}
              alt={item.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
              {typeIcon[item.type]}
              <span className="text-xs text-center px-2">{item.title}</span>
            </div>
          )}
          {item.adult_only ? (
            <div className="absolute top-1 right-1 bg-amber-500/80 rounded px-1.5 py-0.5 text-xs text-black font-bold flex items-center gap-0.5">
              <ShieldAlert className="w-3 h-3" /> +18
            </div>
          ) : null}
        </a>
      ) : (
        /* Locked overlay */
        <div className="absolute inset-0 bg-background/70 backdrop-blur-lg flex flex-col items-center justify-center gap-2 p-3">
          {requiresAge ? (
            <>
              <ShieldAlert className="w-6 h-6 text-amber-400" />
              <span className="text-xs text-amber-400 font-semibold text-center">Contenido +18</span>
              <span className="text-xs text-muted-foreground text-center">Verifica tu edad para ver este contenido.</span>
            </>
          ) : (
            <>
              <Lock className="w-6 h-6 text-primary" />
              <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                <Coins className="w-4 h-4" />
                {item.price_coins} monedas
              </div>
              <span className="text-xs text-muted-foreground text-center line-clamp-1">{item.title}</span>
              <Button
                size="sm"
                variant="gold"
                disabled={unlocking}
                onClick={handleUnlock}
              >
                {unlocking ? 'Desbloqueando...' : 'Desbloquear'}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Type badge */}
      <div className="absolute bottom-1 left-1 bg-background/60 rounded px-1.5 py-0.5 text-xs text-muted-foreground flex items-center gap-1">
        {typeIcon[item.type]}
      </div>
    </motion.div>
  );
};

export default ContentCard;
