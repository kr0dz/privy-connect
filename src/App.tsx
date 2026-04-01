import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ModalProvider } from "@/contexts/ModalContext";
import ActivityPopup from "@/components/ActivityPopup";
import Onboarding from "@/components/Onboarding";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Discover from "./pages/Discover.tsx";
import CreatorProfile from "./pages/CreatorProfile.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import FanDashboard from "./pages/FanDashboard.tsx";
import CreatorDashboard from "./pages/CreatorDashboard.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import CreatorSettings from "./pages/CreatorSettings.tsx";
import ProfileSettings from "./pages/ProfileSettings.tsx";
import NotFound from "./pages/NotFound.tsx";
import { authService, type UserRole } from "@/services/auth/authService";
import { supabase } from "@/lib/supabase";

const queryClient = new QueryClient();

const App = () => {
  usePushNotifications();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingRole, setOnboardingRole] = useState<UserRole>('fan');
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadOnboarding = async () => {
      try {
        const [session, role] = await Promise.all([
          authService.getSession(),
          authService.getRole(),
        ]);

        if (!mounted || !session?.user.id) {
          return;
        }

        setOnboardingRole(role || 'fan');
        setProfileId(session.user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!mounted) {
          return;
        }

        setOnboardingOpen(!Boolean(profile?.onboarding_completed));
      } catch {
        if (mounted) {
          setOnboardingOpen(false);
        }
      }
    };

    void loadOnboarding();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let expoCleanup: (() => void) | null = null;

    const setupNotificationListener = async () => {
      try {
        const expoModuleName = 'expo-notifications';
        const maybeExpo = await import(/* @vite-ignore */ expoModuleName).catch(() => null);
        if (maybeExpo?.addNotificationReceivedListener) {
          const subscription = maybeExpo.addNotificationReceivedListener((notification: { request?: { content?: { title?: string; body?: string } } }) => {
            const title = notification?.request?.content?.title || 'Nueva notificacion';
            const body = notification?.request?.content?.body || 'Tienes actividad reciente en PrivyLoop';
            window.dispatchEvent(new CustomEvent('push:received', { detail: { title, body } }));
          });

          expoCleanup = () => maybeExpo.removeNotificationSubscription(subscription);
        }
      } catch {
        // Web fallback only.
      }
    };

    void setupNotificationListener();

    const onPushReceived = (event: Event) => {
      const custom = event as CustomEvent<{ title?: string; body?: string }>;
      const title = custom.detail?.title || 'Nueva notificacion';
      const body = custom.detail?.body || 'Tienes actividad reciente en PrivyLoop';
      toast.success(title, { description: body });
    };

    window.addEventListener('push:received', onPushReceived as EventListener);
    return () => {
      window.removeEventListener('push:received', onPushReceived as EventListener);
      if (expoCleanup) {
        expoCleanup();
      }
    };
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (!profileId) {
      setOnboardingOpen(false);
      return;
    }

    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', profileId);

    setOnboardingOpen(false);
  }, [profileId]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ModalProvider>
            <ActivityPopup />
            <Onboarding
              open={onboardingOpen}
              role={onboardingRole}
              onComplete={completeOnboarding}
              onDontShowAgain={completeOnboarding}
            />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/creator/:id" element={<CreatorProfile />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/fan" element={<ProtectedRoute><FanDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/creator" element={<ProtectedRoute><CreatorDashboard /></ProtectedRoute>} />
              <Route path="/creator/settings" element={<ProtectedRoute requiredRole="creator"><CreatorSettings /></ProtectedRoute>} />
              <Route path="/profile-settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
              <Route path="/dashboard/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ModalProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
