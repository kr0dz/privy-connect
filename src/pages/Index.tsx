import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, Sparkles, Users, MessageCircle, Crown, Star } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CreatorCard from '@/components/CreatorCard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface FeaturedCreator {
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
}

interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role?: string;
}

const fallbackTestimonials: Testimonial[] = [
  {
    id: 't1',
    quote: 'En dos semanas triplique ingresos usando respuestas IA y unlocks desde el chat.',
    author: 'Luna Noir',
    role: 'Creadora',
  },
  {
    id: 't2',
    quote: 'La experiencia se siente personal. Realmente recuerda lo que le cuento.',
    author: 'Marco V',
    role: 'Fan premium',
  },
  {
    id: 't3',
    quote: 'Por fin una plataforma donde monetizo conversacion y contenido en el mismo flujo.',
    author: 'Kai Storm',
    role: 'Creador',
  },
];

const gradientPalette = [
  'linear-gradient(135deg, hsl(280 60% 20%), hsl(320 50% 15%))',
  'linear-gradient(135deg, hsl(15 70% 20%), hsl(38 60% 15%))',
  'linear-gradient(135deg, hsl(200 50% 15%), hsl(230 40% 20%))',
  'linear-gradient(135deg, hsl(160 40% 15%), hsl(180 50% 10%))',
  'linear-gradient(135deg, hsl(340 50% 18%), hsl(360 40% 15%))',
  'linear-gradient(135deg, hsl(38 50% 15%), hsl(50 40% 10%))',
];

const Index = () => {
  const [featuredCreators, setFeaturedCreators] = useState<FeaturedCreator[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(fallbackTestimonials);
  const [loadingCreators, setLoadingCreators] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const { data: creators } = await supabase
          .from('profiles')
          .select('id, name, bio, avatar_url')
          .eq('role', 'creator')
          .limit(8);

        if (active && creators) {
          const mapped = creators.map((creator, index) => ({
            id: String(creator.id),
            name: String(creator.name || `Creator ${index + 1}`),
            category: String((creator.bio || 'Exclusive creator').split('·')[0]?.trim() || 'Lifestyle'),
            avatar: String(creator.avatar_url || ''),
            coverColor: gradientPalette[index % gradientPalette.length] ?? gradientPalette[0],
            rating: 4.6 + ((index % 4) * 0.1),
            subscribers: 3200 + index * 1370,
            isOnline: index % 2 === 0,
            statusBadge: index % 3 === 0 ? 'Responds fast' : 'Active now',
            previewLocked: index % 4 === 0,
          }));
          setFeaturedCreators(mapped);
        }

        const { data: dbTestimonials } = await supabase
          .from('testimonials')
          .select('id, quote, author, role')
          .order('created_at', { ascending: false })
          .limit(3);

        if (active && dbTestimonials && dbTestimonials.length > 0) {
          setTestimonials(dbTestimonials.map(item => ({
            id: String(item.id),
            quote: String(item.quote),
            author: String(item.author),
            role: item.role ? String(item.role) : undefined,
          })));
        }
      } finally {
        if (active) {
          setLoadingCreators(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const creatorCards = useMemo(() => featuredCreators.slice(0, 4), [featuredCreators]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="relative min-h-[88vh] flex items-center bg-gradient-hero overflow-hidden">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.14, 0.08] }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute -top-20 -left-20 w-[28rem] h-[28rem] bg-primary rounded-full blur-[140px]"
          />
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.1, 0.06] }}
            transition={{ duration: 10, repeat: Infinity, delay: 1.5 }}
            className="absolute -bottom-20 -right-20 w-[24rem] h-[24rem] bg-primary rounded-full blur-[120px]"
          />

          <div className="container relative z-10 pt-24">
            <div className="max-w-4xl mx-auto text-center">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.05] text-foreground"
              >
                El nuevo estandar de
                <span className="text-gradient-gold"> conexion premium </span>
                creador-fan
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mt-6"
              >
                Gemelo IA, memoria de fan y monetizacion en chat en una experiencia fluida y exclusiva.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-4 justify-center mt-10"
              >
                <Button variant="gold" size="lg" asChild className="glow-gold text-base px-8">
                  <Link to="/signup">Get Started <ArrowRight className="w-4 h-4 ml-1" /></Link>
                </Button>
                <Button variant="gold-outline" size="lg" asChild className="text-base px-8">
                  <Link to="/discover"><Lock className="w-4 h-4 mr-1" /> Discover Creators</Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                Como <span className="text-gradient-gold">funciona</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: <Sparkles className="w-5 h-5 text-primary" />,
                  title: 'Gemelo digital autenticado',
                  desc: 'La IA replica tono, estilo y memoria para conversaciones naturales.',
                },
                {
                  icon: <MessageCircle className="w-5 h-5 text-primary" />,
                  title: 'Atencion personalizada',
                  desc: 'Cada fan recibe respuestas adaptadas a su historial y preferencias.',
                },
                {
                  icon: <Crown className="w-5 h-5 text-primary" />,
                  title: 'Monetizacion integrada',
                  desc: 'Unlocks, requests premium y pagos directos desde el chat.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl bg-gradient-card border border-border/50 p-6 shadow-card">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                    {item.icon}
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-surface-elevated">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                Creadores <span className="text-gradient-gold">destacados</span>
              </h2>
              <Button variant="outline" asChild>
                <Link to="/discover">Ver todos</Link>
              </Button>
            </div>

            {loadingCreators ? (
              <div className="text-muted-foreground">Cargando creadores...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {creatorCards.map((creator, index) => (
                  <CreatorCard key={creator.id} {...creator} delay={index * 0.08} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="py-20">
          <div className="container">
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                Testimonios <span className="text-gradient-gold">reales</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((item) => (
                <div key={item.id} className="rounded-xl border border-primary/20 bg-surface-glass p-6 shadow-card">
                  <Star className="w-4 h-4 text-primary mb-3" />
                  <p className="text-sm text-foreground leading-relaxed">"{item.quote}"</p>
                  <div className="mt-4 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{item.author}</span>
                    {item.role ? ` · ${item.role}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container">
            <div className="rounded-2xl border border-primary/20 bg-gradient-card p-10 text-center shadow-elevated">
              <h3 className="font-display text-3xl font-bold text-foreground mb-3">Empieza hoy en PrivyLoop</h3>
              <p className="text-muted-foreground mb-6">Convierte conversaciones en comunidad e ingresos sostenibles.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="gold" asChild className="glow-gold">
                  <Link to="/signup"><Users className="w-4 h-4 mr-1" /> Crear cuenta</Link>
                </Button>
                <Button variant="gold-outline" asChild>
                  <Link to="/discover">Explorar creadores</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
