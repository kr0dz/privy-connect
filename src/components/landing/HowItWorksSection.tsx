import { motion } from "framer-motion";

const steps = [
  { step: "01", title: "Create Your Profile", description: "Set up your persona, pricing tiers, and content strategy in minutes." },
  { step: "02", title: "Share Exclusive Content", description: "Upload images, videos, audio, and text. Set what's free and what's premium." },
  { step: "03", title: "Engage & Monetize", description: "Chat, respond to requests, and let your AI clone handle the rest. Watch your earnings grow." },
];

const HowItWorksSection = () => (
  <section id="how-it-works" className="py-24 bg-surface-elevated">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
          How It <span className="text-gradient-gold">Works</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Start earning in three simple steps.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {steps.map((s, i) => (
          <motion.div
            key={s.step}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            className="text-center"
          >
            <div className="text-5xl font-display font-bold text-gradient-gold mb-4">{s.step}</div>
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
