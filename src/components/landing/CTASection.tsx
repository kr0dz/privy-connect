import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const CTASection = () => (
  <section id="creators" className="py-24">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="relative rounded-2xl overflow-hidden bg-gradient-card border border-primary/20 p-12 md:p-16 text-center glow-gold"
      >
        <div className="relative z-10">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
            Ready to <span className="text-gradient-gold">Monetize</span> Your Influence?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8 text-lg">
            Join thousands of creators earning on their own terms. Set your price. Own your audience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="gold" size="lg" asChild>
              <Link to="/signup">Start as Creator</Link>
            </Button>
            <Button variant="gold-outline" size="lg" asChild>
              <Link to="/discover">Explore Creators</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default CTASection;
