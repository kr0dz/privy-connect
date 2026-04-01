import { motion, AnimatePresence } from "framer-motion";
import { Lock, X, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UnlockModalProps {
  open: boolean;
  onClose: () => void;
  onUnlock: () => void;
  title: string;
  price: string;
  description?: string;
}

const UnlockModal = ({ open, onClose, onUnlock, title, price, description }: UnlockModalProps) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-sm bg-gradient-card border border-primary/20 rounded-2xl p-6 shadow-elevated glow-gold relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>

          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-display text-xl font-bold text-foreground mb-1">{title}</h3>
            {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}

            <div className="bg-secondary/50 rounded-xl p-4 mb-4 border border-border/50">
              <div className="text-3xl font-display font-bold text-gradient-gold mb-1">{price}</div>
              <div className="text-xs text-muted-foreground">One-time unlock</div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-5">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>{Math.floor(Math.random() * 20 + 5)} people unlocked this today</span>
            </div>

            <Button variant="gold" className="w-full gap-2" size="lg" onClick={onUnlock}>
              <Sparkles className="w-4 h-4" /> Unlock Now
            </Button>
            <p className="text-[10px] text-muted-foreground mt-3">Secure payment · Instant access</p>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default UnlockModal;
