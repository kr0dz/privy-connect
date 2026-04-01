import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Eye } from "lucide-react";

const HeroSection = () => (
  <section className="relative min-h-[90vh] flex items-center bg-gradient-hero overflow-hidden">
    {/* Animated glow orbs */}
    <motion.div
      animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }}
      transition={{ duration: 6, repeat: Infinity }}
      className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary rounded-full blur-[120px]"
    />
    <motion.div
      animate={{ scale: [1, 1.3, 1], opacity: [0.03, 0.08, 0.03] }}
      transition={{ duration: 8, repeat: Infinity, delay: 2 }}
      className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary rounded-full blur-[100px]"
    />

    <div className="container relative z-10 pt-24">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 mb-8"
          >
            <Eye className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary">Invite-only · 18+ · Exclusive access</span>
          </motion.div>

          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1] mb-6">
            Private access to creators
            <br />
            <span className="text-gradient-gold">you can't reach anywhere else</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Some things aren't meant for everyone. Unlock exclusive content,
            private conversations, and experiences reserved for the inner circle.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Button variant="gold" size="lg" className="text-base px-8 glow-gold" asChild>
                <Link to="/discover">
                  <Lock className="w-4 h-4 mr-2" /> Unlock Creators
                </Link>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Button variant="gold-outline" size="lg" className="text-base px-8" asChild>
                <Link to="/discover">Start Private Chat <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 grid grid-cols-3 gap-8 max-w-md mx-auto"
        >
          {[
            { value: "10K+", label: "Creators" },
            { value: "$2M+", label: "Earned" },
            { value: "50K+", label: "Unlocks Today" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-2xl font-bold text-gradient-gold">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  </section>
);

export default HeroSection;
