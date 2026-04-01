import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import UnlockModal from "@/components/modals/UnlockModal";
import WaitlistModal from "@/components/modals/WaitlistModal";
import ChatModal from "@/components/modals/ChatModal";

type ModalType = "unlock" | "waitlist" | "chat" | null;

interface UnlockData {
  title: string;
  price: string;
  description?: string;
}

interface ChatData {
  creatorId?: string;
  creatorName: string;
  creatorInitial: string;
}

interface ModalContextType {
  openUnlock: (data: UnlockData) => void;
  openWaitlist: () => void;
  openChat: (data: ChatData) => void;
  close: () => void;
  trackClick: (action: string) => void;
  clickLog: { action: string; timestamp: number }[];
}

const ModalContext = createContext<ModalContextType | null>(null);

export const useModals = () => {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModals must be used within ModalProvider");
  return ctx;
};

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [unlockData, setUnlockData] = useState<UnlockData>({ title: "", price: "" });
  const [chatData, setChatData] = useState<ChatData>({ creatorId: undefined, creatorName: "", creatorInitial: "" });
  const [clickLog, setClickLog] = useState<{ action: string; timestamp: number }[]>([]);

  const trackClick = useCallback((action: string) => {
    setClickLog((prev) => [...prev, { action, timestamp: Date.now() }]);
  }, []);

  const openUnlock = useCallback((data: UnlockData) => {
    setUnlockData(data);
    setActiveModal("unlock");
    trackClick(`unlock_view:${data.title}`);
  }, [trackClick]);

  const openWaitlist = useCallback(() => {
    setActiveModal("waitlist");
    trackClick("waitlist_open");
  }, [trackClick]);

  const openChat = useCallback((data: ChatData) => {
    setChatData(data);
    setActiveModal("chat");
    trackClick(`chat_open:${data.creatorName}`);
  }, [trackClick]);

  const close = useCallback(() => setActiveModal(null), []);

  return (
    <ModalContext.Provider value={{ openUnlock, openWaitlist, openChat, close, trackClick, clickLog }}>
      {children}
      <UnlockModal
        open={activeModal === "unlock"}
        onClose={close}
        onUnlock={() => {
          trackClick(`unlock_attempt:${unlockData.title}`);
          close();
          setTimeout(() => openWaitlist(), 200);
        }}
        {...unlockData}
      />
      <WaitlistModal open={activeModal === "waitlist"} onClose={close} />
      <ChatModal
        open={activeModal === "chat"}
        onClose={close}
        {...chatData}
      />
    </ModalContext.Provider>
  );
};
