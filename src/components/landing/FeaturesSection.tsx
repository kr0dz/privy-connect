import { Lock, Star, Crown, Users, Sparkles, MessageCircle, Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

const FeatureCard = ({ icon, title, description, delay = 0 }: FeatureCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="bg-gradient-card rounded-xl p-6 border border-border/50 hover:border-primary/20 transition-colors group shadow-card"
  >
    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
      {icon}
    </div>
    <h3 className="font-display text-lg font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
  </motion.div>
);

const features = [
  { icon: <Lock className="w-5 h-5 text-primary" />, title: "Exclusive Access", description: "Unlock content and experiences reserved for your most dedicated fans." },
  { icon: <MessageCircle className="w-5 h-5 text-primary" />, title: "AI-Enhanced Chat", description: "AI clone trained on your style keeps fans engaged even when you're away." },
  { icon: <Crown className="w-5 h-5 text-primary" />, title: "Tiered Subscriptions", description: "Multiple subscription layers for different levels of access and intimacy." },
  { icon: <Sparkles className="w-5 h-5 text-primary" />, title: "Gamified Engagement", description: "Badges, leaderboards, and levels that keep fans coming back for more." },
  { icon: <Shield className="w-5 h-5 text-primary" />, title: "Privacy & Safety", description: "Age verification, content moderation, and robust safety systems built in." },
  { icon: <Zap className="w-5 h-5 text-primary" />, title: "Instant Monetization", description: "Tips, pay-per-message, custom requests, and paid polls. Multiple revenue streams." },
];

const FeaturesSection = () => (
  <section className="py-24">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
          Built for <span className="text-gradient-gold">Premium</span> Experiences
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Every feature designed to maximize creator revenue and fan engagement.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <FeatureCard key={f.title} {...f} delay={i * 0.1} />
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
