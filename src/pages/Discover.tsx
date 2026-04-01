import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CreatorCard from "@/components/CreatorCard";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

const categories = ["All", "Lifestyle", "Fitness", "Art", "Music", "Entertainment", "Fashion", "Gaming"];

const mockCreators = [
  { id: "1", name: "Luna Noir", category: "Lifestyle", avatar: "", coverColor: "linear-gradient(135deg, hsl(280 60% 20%), hsl(320 50% 15%))", rating: 4.9, subscribers: 12400, isOnline: true, statusBadge: "Responds fast" },
  { id: "2", name: "Alex Flame", category: "Fitness", avatar: "", coverColor: "linear-gradient(135deg, hsl(15 70% 20%), hsl(38 60% 15%))", rating: 4.8, subscribers: 8900, isOnline: false, statusBadge: "New content today" },
  { id: "3", name: "Mira Silk", category: "Art", avatar: "", coverColor: "linear-gradient(135deg, hsl(200 50% 15%), hsl(230 40% 20%))", rating: 4.7, subscribers: 6200, isOnline: true, previewLocked: true },
  { id: "4", name: "Kai Storm", category: "Music", avatar: "", coverColor: "linear-gradient(135deg, hsl(160 40% 15%), hsl(180 50% 10%))", rating: 4.9, subscribers: 15300, isOnline: true, statusBadge: "Active now" },
  { id: "5", name: "Zara Velvet", category: "Entertainment", avatar: "", coverColor: "linear-gradient(135deg, hsl(340 50% 18%), hsl(360 40% 15%))", rating: 4.6, subscribers: 4800, isOnline: false, previewLocked: true, statusBadge: "New content today" },
  { id: "6", name: "Dante Cruz", category: "Fashion", avatar: "", coverColor: "linear-gradient(135deg, hsl(38 50% 15%), hsl(50 40% 10%))", rating: 4.8, subscribers: 9100, isOnline: true, statusBadge: "Responds fast" },
  { id: "7", name: "Nova Ray", category: "Gaming", avatar: "", coverColor: "linear-gradient(135deg, hsl(260 50% 18%), hsl(280 40% 12%))", rating: 4.5, subscribers: 7600, isOnline: false },
  { id: "8", name: "Ivy Moon", category: "Lifestyle", avatar: "", coverColor: "linear-gradient(135deg, hsl(120 30% 12%), hsl(150 40% 8%))", rating: 4.9, subscribers: 18200, isOnline: true, statusBadge: "Active now" },
];

const Discover = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = mockCreators.filter((c) => {
    const matchCat = activeCategory === "All" || c.category === activeCategory;
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Unlock <span className="text-gradient-gold">Creators</span>
            </h1>
            <p className="text-muted-foreground">Private profiles. Exclusive content. Your access starts here.</p>
          </motion.div>

          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search creators..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? "gold" : "secondary"}
                size="sm"
                onClick={() => setActiveCategory(cat)}
                className="whitespace-nowrap"
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((creator, i) => (
              <CreatorCard key={creator.id} {...creator} delay={i * 0.05} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              No creators found. Try a different search or category.
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Discover;
