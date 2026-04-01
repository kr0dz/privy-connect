import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CreatorCard from '@/components/CreatorCard';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

const categories = ['All', 'Lifestyle', 'Fitness', 'Art', 'Music', 'Entertainment', 'Fashion', 'Gaming'];

const gradientPalette = [
  'linear-gradient(135deg, hsl(280 60% 20%), hsl(320 50% 15%))',
  'linear-gradient(135deg, hsl(15 70% 20%), hsl(38 60% 15%))',
  'linear-gradient(135deg, hsl(200 50% 15%), hsl(230 40% 20%))',
  'linear-gradient(135deg, hsl(160 40% 15%), hsl(180 50% 10%))',
  'linear-gradient(135deg, hsl(340 50% 18%), hsl(360 40% 15%))',
  'linear-gradient(135deg, hsl(38 50% 15%), hsl(50 40% 10%))',
  'linear-gradient(135deg, hsl(260 50% 18%), hsl(280 40% 12%))',
  'linear-gradient(135deg, hsl(120 30% 12%), hsl(150 40% 8%))',
];

interface Creator {
  id: string;
  name: string;
  category: string;
  avatar: string;
  coverColor: string;
  rating: number;
  subscribers: number;
  isOnline: boolean;
  statusBadge?: string;
  previewLocked?: boolean;
}

const Discover = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const { data: dbCreators } = await supabase
          .from('profiles')
          .select('id, name, bio, avatar_url')
          .eq('role', 'creator')
          .limit(48);

        if (active && dbCreators) {
          const mapped = (dbCreators as Array<{ id: string; name: string | null; bio: string | null; avatar_url: string | null }>).map((creator, index) => ({
            id: String(creator.id),
            name: String(creator.name || `Creator ${index + 1}`),
            category: String((creator.bio || 'Exclusive').split('·')[0]?.trim() || 'Lifestyle'),
            avatar: String(creator.avatar_url || ''),
            coverColor: gradientPalette[index % gradientPalette.length] ?? gradientPalette[0],
            rating: 4.5 + ((index % 5) * 0.1),
            subscribers: 3000 + index * 500,
            isOnline: index % 2 === 0,
            statusBadge: index % 3 === 0 ? 'Responds fast' : 'Active now',
            previewLocked: index % 5 === 0,
          }));
          setCreators(mapped);
        }
      } catch (error) {
        console.error('Error loading creators:', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => { active = false; };
  }, []);

  const filtered = creators.filter((c) => {
    const matchCat = activeCategory === 'All' || c.category === activeCategory;
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchRating = c.rating >= minRating;
    return matchCat && matchSearch && matchRating;
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
                placeholder="Busca creadores..."
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
                variant={activeCategory === cat ? 'gold' : 'secondary'}
                size="sm"
                onClick={() => setActiveCategory(cat)}
                className="whitespace-nowrap"
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8 items-center">
            <label className="text-sm font-medium text-foreground">Min rating:</label>
            <select
              value={String(minRating)}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="bg-secondary border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
            >
              <option value="0">All ratings</option>
              <option value="4.5">4.5+ stars</option>
              <option value="4.7">4.7+ stars</option>
              <option value="4.9">4.9+ stars</option>
            </select>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="text-center py-20 text-muted-foreground">Cargando creadores...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((creator, i) => (
                <CreatorCard key={creator.id} {...creator} delay={i * 0.05} />
              ))}
            </div>
          )}

          {filtered.length === 0 && !loading && (
            <div className="text-center py-20 text-muted-foreground">
              No se encontraron creadores. Intenta otra búsqueda o categoría.
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Discover;
