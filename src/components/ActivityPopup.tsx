import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

const names = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Quinn", "Avery"];
const actions = [
  "just unlocked exclusive content",
  "joined VIP access",
  "sent a tip",
  "unlocked a private chat",
  "requested custom content",
  "subscribed to Premium",
];

const ActivityPopup = () => {
  const [notification, setNotification] = useState<{ name: string; action: string } | null>(null);

  useEffect(() => {
    const showNotification = () => {
      const name = names[Math.floor(Math.random() * names.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      setNotification({ name, action });
      setTimeout(() => setNotification(null), 3500);
    };

    // First one after 8s, then random 12-25s
    const firstTimeout = setTimeout(showNotification, 8000);
    const interval = setInterval(showNotification, 12000 + Math.random() * 13000);

    return () => {
      clearTimeout(firstTimeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="fixed bottom-6 left-6 z-[90]">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, x: -30, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -30, y: 10 }}
            className="flex items-center gap-3 bg-card border border-primary/20 rounded-xl px-4 py-3 shadow-elevated max-w-xs"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="text-sm text-foreground font-medium">{notification.name}</span>
              <span className="text-sm text-muted-foreground"> {notification.action}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActivityPopup;
