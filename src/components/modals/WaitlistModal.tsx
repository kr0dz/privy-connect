import { motion, AnimatePresence } from "framer-motion";
import { X, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface WaitlistModalProps {
  open: boolean;
  onClose: () => void;
}

const WaitlistModal = ({ open, onClose }: WaitlistModalProps) => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setEmail("");
      onClose();
    }, 2500);
  };

  return (
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
            className="w-full max-w-sm bg-gradient-card border border-primary/20 rounded-2xl p-6 shadow-elevated relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>

            {!submitted ? (
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Rocket className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-1">Coming Soon</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  This feature launches soon. Join early access to be first in line.
                </p>

                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors mb-4"
                />

                <Button variant="gold" className="w-full" size="lg" onClick={handleSubmit}>
                  Join Early Access
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 15 }}
                  className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
                >
                  <span className="text-3xl">🎉</span>
                </motion.div>
                <h3 className="font-display text-xl font-bold text-foreground mb-1">You're In!</h3>
                <p className="text-sm text-muted-foreground">We'll notify you when this goes live.</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WaitlistModal;
