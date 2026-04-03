import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, Eye, Lock, MessageCircle, Crown, Heart, Image, Video, Headphones, Users, Clock, Sparkles, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useModals } from "@/contexts/ModalContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authService, type UserRole } from "@/services/auth/authService";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/sonner";
import StreamService from "@/services/video/StreamService";
import AgeVerificationModal from "@/components/modals/AgeVerificationModal";
import ContentCard from "@/components/feed/ContentCard";
import ContentService, { type ContentItem } from "@/services/content/ContentService";

const AGE_VERIFIED_KEY = 'privy_age_verified';

const tiers = [
  { name: "Basic", price: "$9.99/mo", features: ["Access to public content", "Like & comment", "Basic feed"] },
  { name: "Premium", price: "$24.99/mo", features: ["All Basic perks", "Exclusive content", "Direct messaging", "Polls & decisions"], popular: true },
  { name: "VIP", price: "$49.99/mo", features: ["All Premium perks", "Priority replies", "Custom content requests", "Private rooms", "AI chat access"] },
];

const typeIcon = {
  image: <Image className="w-5 h-5" />,
  video: <Video className="w-5 h-5" />,
  audio: <Headphones className="w-5 h-5" />,
};

interface VideoCallSlot {
  id: string;
  start_time: string;
  duration: number;
  status: 'available' | 'booked' | 'completed' | 'cancelled';
  stream_call_id?: string | null;
}

const CreatorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"content" | "about">("content");
  const [role, setRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [slots, setSlots] = useState<VideoCallSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [adultContent, setAdultContent] = useState(false);
  const [ageVerified, setAgeVerified] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(AGE_VERIFIED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);
  const { openUnlock, openChat } = useModals();

  const loadSlots = async (creatorId: string) => {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('video_calls')
      .select('id, start_time, duration, status, stream_call_id')
      .eq('creator_id', creatorId)
      .eq('status', 'available')
      .gte('start_time', nowIso)
      .order('start_time', { ascending: true })
      .limit(20);

    if (error) {
      toast.error('No se pudieron cargar los horarios de videollamada.');
      setLoadingSlots(false);
      return;
    }

    setSlots((data || []) as VideoCallSlot[]);
    setLoadingSlots(false);
  };

  const loadCreatorContent = async (creatorId: string, fanId?: string) => {
    setLoadingContent(true);
    const items = await ContentService.getCreatorContent(creatorId, fanId);
    setContentItems(items);
    setLoadingContent(false);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const [session, nextRole] = await Promise.all([
        authService.getSession(),
        authService.getRole(),
      ]);

      if (!mounted) {
        return;
      }

      setRole(nextRole);
      const fanId = session?.user.id ?? undefined;
      setUserId(fanId ?? null);

      if (id) {
        // Load creator twin for adult_content flag
        const { data: twin } = await supabase
          .from('creator_twins')
          .select('adult_content')
          .eq('creator_id', id)
          .maybeSingle();

        if (!mounted) return;

        const isAdult = Boolean(twin?.adult_content);
        setAdultContent(isAdult);

        // If adult and not yet verified, show modal
        if (isAdult) {
          const verified = (() => {
            try { return sessionStorage.getItem(AGE_VERIFIED_KEY) === '1'; } catch { return false; }
          })();
          if (!verified) {
            setShowAgeModal(true);
          }
        }

        await Promise.all([
          loadSlots(id),
          loadCreatorContent(id, fanId),
        ]);
      }
    };

    void init();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleAgeConfirm = () => {
    try { sessionStorage.setItem(AGE_VERIFIED_KEY, '1'); } catch { /* ignore */ }
    setAgeVerified(true);
    setShowAgeModal(false);
  };

  const handleAgeDeny = () => {
    setShowAgeModal(false);
    navigate('/discover');
  };

  const handleContentUnlocked = (contentId: string) => {
    setContentItems((prev) =>
      prev.map((c) => (c.id === contentId ? { ...c, unlocked: true } : c)),
    );
  };

  const bookSlot = async (slotId: string) => {
    if (!id || !userId) {
      toast.error('Debes iniciar sesion para reservar.');
      return;
    }

    if (role !== 'fan') {
      toast.error('Solo los fans pueden reservar videollamadas.');
      return;
    }

    setBookingId(slotId);
    try {
      const { data, error } = await supabase
        .from('video_calls')
        .update({ fan_id: userId, status: 'booked' })
        .eq('id', slotId)
        .eq('status', 'available')
        .is('fan_id', null)
        .select('id');

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('El horario ya no esta disponible.');
      }

      await supabase.from('analytics_events').insert({
        user_id: userId,
        creator_id: id,
        event_type: 'booking',
        metadata: {
          video_call_id: slotId,
          source: 'creator_profile',
        },
      });

      try {
        await StreamService.createCall(slotId);
      } catch (roomError) {
        console.error(roomError);
        toast.error('Se reservo el horario, pero no se pudo crear la sala de video automaticamente.');
      }

      toast.success('Videollamada reservada correctamente.');
      await loadSlots(id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo reservar el horario.');
    } finally {
      setBookingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AgeVerificationModal
        open={showAgeModal}
        onConfirm={handleAgeConfirm}
        onDeny={handleAgeDeny}
      />
      <main className="pt-16">
        {/* Cover */}
        <div className="h-48 md:h-64" style={{ background: "linear-gradient(135deg, hsl(280 60% 20%), hsl(320 50% 15%))" }} />

        <div className="container -mt-16 relative z-10">
          {/* Profile header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row gap-6 items-start"
          >
            <div className="w-28 h-28 rounded-2xl bg-muted border-4 border-background flex items-center justify-center text-3xl font-display font-bold text-primary shadow-elevated">
              L
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Luna Noir</h1>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  <Crown className="w-3 h-3" /> Top Creator
                </div>
                {adultContent && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 text-xs font-medium">
                    <ShieldAlert className="w-3 h-3" /> +18
                  </div>
                )}
              </div>
              <p className="text-muted-foreground mb-3">Lifestyle · Art · Exclusive experiences</p>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Star className="w-4 h-4 text-primary" /> 4.9</span>
                <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> 12.4K fans</span>
                <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> 89K likes</span>
              </div>
            </div>
            <div className="flex gap-3">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="gold"
                  className="gap-2 glow-gold"
                  onClick={() => {
                    if (adultContent && !ageVerified) {
                      setShowAgeModal(true);
                      return;
                    }
                    openChat({ creatorId: id, creatorName: "Luna Noir", creatorInitial: "L" });
                  }}
                >
                  <MessageCircle className="w-4 h-4" /> Start Private Chat
                </Button>
              </motion.div>
              <Button variant="gold-outline">
                <Heart className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-6 mt-8 border-b border-border/50">
            {(["content", "about"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 ${
                  activeTab === tab ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="py-8">
            {activeTab === "content" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Content grid */}
                <div className="lg:col-span-2">
                  {adultContent && !ageVerified ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                      <ShieldAlert className="w-12 h-12 text-amber-400" />
                      <p className="text-muted-foreground">Debes verificar tu edad para ver este contenido.</p>
                      <Button variant="gold" onClick={() => setShowAgeModal(true)}>Verificar edad</Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {loadingContent ? (
                        <p className="col-span-3 text-sm text-muted-foreground">Cargando contenido...</p>
                      ) : contentItems.length === 0 ? (
                        <p className="col-span-3 text-sm text-muted-foreground">Este creador aun no tiene contenido publicado.</p>
                      ) : (
                        contentItems.map((item, i) => (
                          <ContentCard
                            key={item.id}
                            item={item}
                            index={i}
                            ageVerified={ageVerified}
                            onUnlocked={handleContentUnlocked}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Subscription tiers */}
                <div className="space-y-4">
                  <h3 className="font-display text-lg font-semibold text-foreground">Get Access</h3>
                  {tiers.map((tier) => (
                    <motion.div
                      key={tier.name}
                      whileHover={{ scale: 1.02 }}
                      className={`rounded-xl p-5 border transition-colors cursor-pointer ${
                        tier.popular
                          ? "border-primary/40 bg-primary/5 glow-gold"
                          : "border-border/50 bg-gradient-card"
                      }`}
                    >
                      {tier.popular && (
                        <span className="text-xs font-medium text-primary mb-2 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Most Popular
                        </span>
                      )}
                      <div className="flex items-baseline justify-between mb-3">
                        <h4 className="font-display font-semibold text-foreground">{tier.name}</h4>
                        <span className="text-sm font-semibold text-gradient-gold">{tier.price}</span>
                      </div>
                      <ul className="space-y-1.5 mb-4">
                        {tier.features.map((f) => (
                          <li key={f} className="text-xs text-muted-foreground flex items-center gap-2">
                            <Star className="w-3 h-3 text-primary shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant={tier.popular ? "gold" : "gold-outline"}
                        size="sm"
                        className="w-full"
                        onClick={() => openUnlock({ title: `${tier.name} Access`, price: tier.price, description: `Full ${tier.name} tier access to Luna Noir` })}
                      >
                        Get Access
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "about" && (
              <div className="max-w-2xl">
                <p className="text-muted-foreground leading-relaxed">
                  Welcome to my exclusive space. I create premium lifestyle and art content
                  that you won't find anywhere else. Subscribe to get closer, unlock exclusive
                  experiences, and become part of my inner circle.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-gradient-card rounded-xl p-4 border border-border/50">
                    <div className="text-2xl font-display font-bold text-gradient-gold">342</div>
                    <div className="text-xs text-muted-foreground">Posts</div>
                  </div>
                  <div className="bg-gradient-card rounded-xl p-4 border border-border/50">
                    <div className="text-2xl font-display font-bold text-gradient-gold">2.1K</div>
                    <div className="text-xs text-muted-foreground">Subscribers</div>
                  </div>
                </div>
              </div>
            )}

            <Card className="mt-8 border-primary/20 bg-surface-glass">
              <CardHeader>
                <CardTitle>Book a video call</CardTitle>
                <CardDescription>Reserva un horario disponible para una sesion privada.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingSlots ? <p className="text-sm text-muted-foreground">Cargando horarios...</p> : null}
                {!loadingSlots && slots.length === 0 ? <p className="text-sm text-muted-foreground">No hay horarios disponibles por ahora.</p> : null}
                {!loadingSlots && slots.map((slot) => (
                  <div key={slot.id} className="rounded-lg border border-border/50 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{new Date(slot.start_time).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Duracion: {slot.duration} minutos</p>
                    </div>
                    <Button
                      size="sm"
                      variant="gold"
                      disabled={role !== 'fan' || bookingId === slot.id}
                      onClick={() => void bookSlot(slot.id)}
                    >
                      {bookingId === slot.id ? 'Reservando...' : 'Reservar'}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CreatorProfile;
