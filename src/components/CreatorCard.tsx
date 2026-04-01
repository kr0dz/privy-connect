import { Lock, Star, Eye, Zap, MessageCircle, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface CreatorCardProps {
  id: string;
  name: string;
  category: string;
  avatar: string;
  coverColor: string;
  rating: number;
  subscribers: number;
  isOnline: boolean;
  previewLocked?: boolean;
  statusBadge?: string;
  delay?: number;
}

const badgeIcons: Record<string, React.ReactNode> = {
  "Active now": <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />,
  "Responds fast": <Zap className="w-3 h-3 text-primary" />,
  "New content today": <Flame className="w-3 h-3 text-primary" />,
};

const CreatorCard = ({
  id, name, category, coverColor, rating, subscribers, isOnline, previewLocked, statusBadge, delay = 0
}: CreatorCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    whileHover={{ y: -4 }}
  >
    <Link to={`/creator/${id}`} className="block group">
      <div className="bg-gradient-card rounded-xl overflow-hidden border border-border/50 hover:border-primary/30 transition-all shadow-card hover:shadow-gold">
        {/* Cover */}
        <div className="h-36 relative overflow-hidden" style={{ background: coverColor }}>
          {/* Hover shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer transition-opacity" style={{ backgroundSize: "200% 100%" }} />

          {previewLocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-md gap-1">
              <Lock className="w-6 h-6 text-primary" />
              <span className="text-xs text-primary font-medium">Limited access</span>
              <span className="text-[10px] text-muted-foreground">12 people unlocked this today</span>
            </div>
          )}

          {/* Status badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
            {isOnline && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/70 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-foreground">Online</span>
              </div>
            )}
            {statusBadge && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/70 backdrop-blur-sm">
                {badgeIcons[statusBadge]}
                <span className="text-xs text-foreground">{statusBadge}</span>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-full bg-muted border-2 border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
              {name[0]}
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{name}</h3>
              <span className="text-xs text-muted-foreground">{category}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Star className="w-3 h-3 text-primary" /> {rating}</span>
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {subscribers.toLocaleString()}</span>
          </div>

          {/* CTA */}
          <Button variant="gold-outline" size="sm" className="w-full mt-3 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Lock className="w-3 h-3" /> Enter Private Profile
          </Button>
        </div>
      </div>
    </Link>
  </motion.div>
);

export default CreatorCard;
