import { Crown } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border/50 bg-card">
    <div className="container py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <Link to="/" className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-primary" />
            <span className="font-display text-lg font-bold text-foreground">PrivyLoop</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            Exclusive digital experiences. Personalized attention. Premium connections.
          </p>
        </div>
        <div>
          <h4 className="font-display font-semibold text-foreground mb-3">Platform</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/discover" className="hover:text-primary transition-colors">Discover Creators</Link></li>
            <li><Link to="/#how-it-works" className="hover:text-primary transition-colors">How It Works</Link></li>
            <li><Link to="/#creators" className="hover:text-primary transition-colors">Become a Creator</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-semibold text-foreground mb-3">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
            <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            <li><Link to="/guidelines" className="hover:text-primary transition-colors">Content Guidelines</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-semibold text-foreground mb-3">Support</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/help" className="hover:text-primary transition-colors">Help Center</Link></li>
            <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
            <li><Link to="/safety" className="hover:text-primary transition-colors">Safety</Link></li>
          </ul>
        </div>
      </div>
      <div className="mt-8 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
        © 2026 PrivyLoop. All rights reserved. 18+ only.
      </div>
    </div>
  </footer>
);

export default Footer;
