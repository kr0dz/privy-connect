import { Lock, Star, Heart, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

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
  delay?: number;
}

const CreatorCard = ({
  id, name, category, coverColor, rating, subscribers, isOnline, previewLocked, delay = 0
}: CreatorCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
  >
    <Link to={`/creator/${id}`} className="block group">
      <div className="bg-gradient-card rounded-xl overflow-hidden border border-border/50 hover:border-primary/20 transition-all shadow-card hover:shadow-gold">
        {/* Cover */}
        <div className="h-36 relative" style={{ background: coverColor }}>
          {previewLocked && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm">
              <Lock className="w-6 h-6 text-primary" />
            </div>
          )}
          {isOnline && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/70 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-foreground">Online</span>
            </div>
          )}
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
        </div>
      </div>
    </Link>
  </motion.div>
);

export default CreatorCard;
