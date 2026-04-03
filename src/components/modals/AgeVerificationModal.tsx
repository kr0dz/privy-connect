import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AgeVerificationModalProps {
  open: boolean;
  onConfirm: () => void;
  onDeny: () => void;
}

const AgeVerificationModal = ({ open, onConfirm, onDeny }: AgeVerificationModalProps) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-sm bg-card border border-amber-400/40 rounded-2xl p-8 shadow-elevated text-center"
          >
            <div className="w-16 h-16 rounded-full bg-amber-400/10 border-2 border-amber-400/40 flex items-center justify-center mx-auto mb-5">
              <ShieldAlert className="w-8 h-8 text-amber-400" />
            </div>

            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Contenido +18</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Este perfil contiene contenido exclusivo para adultos. Debes tener <strong className="text-foreground">18 anos o mas</strong> para continuar.
            </p>

            <div className="space-y-3">
              <Button variant="gold" className="w-full" onClick={onConfirm}>
                Tengo 18 anos o mas — Continuar
              </Button>
              <Button variant="outline" className="w-full" onClick={onDeny}>
                Soy menor de edad — Salir
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Al hacer clic en Continuar confirmas que tienes la edad legal en tu pais para acceder a contenido para adultos.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AgeVerificationModal;
