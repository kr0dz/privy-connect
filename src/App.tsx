import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ModalProvider } from "@/contexts/ModalContext";
import ActivityPopup from "@/components/ActivityPopup";
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
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ModalProvider>
          <ActivityPopup />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/creator/:id" element={<CreatorProfile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/fan" element={<FanDashboard />} />
            <Route path="/dashboard/creator" element={<CreatorDashboard />} />
            <Route path="/creator/settings" element={<CreatorSettings />} />
            <Route path="/dashboard/admin" element={<AdminDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ModalProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;