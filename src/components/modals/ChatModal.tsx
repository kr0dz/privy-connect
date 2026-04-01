import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useModals } from "@/contexts/ModalContext";
import { useChat } from "@/hooks/useChat";
import { authService } from "@/services/auth/authService";

interface ChatModalProps {
  open: boolean;
  onClose: () => void;
  creatorId?: string;
  creatorName: string;
  creatorInitial: string;
}

interface Message {
  id: string;
  sender: "creator" | "user" | "system";
  text: string;
  timestamp: string;
  locked?: boolean;
  paid?: boolean;
  price?: number;
}

const initialMessages: Message[] = [
  { id: "1", sender: "creator", text: "Hey… I saw you checking my profile 👀", timestamp: "just now" },
];

const followUpMessages: Message[] = [
  { id: "10", sender: "creator", text: "I don't show this to everyone…", timestamp: "now" },
  { id: "11", sender: "creator", text: "Want to see something special? 🔥", timestamp: "now", locked: true, price: 3 },
];

const ChatModal = ({ open, onClose, creatorId, creatorName, creatorInitial }: ChatModalProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [paywallHit, setPaywallHit] = useState(false);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { openUnlock, trackClick } = useModals();
  const {
    paymentState,
    startCheckout,
    unlockMessage,
    clearPaymentError,
    confirmMessageUnlocked,
  } = useChat(creatorId ?? null, userId);

  useEffect(() => {
    let mounted = true;
    authService.getSession()
      .then((session) => {
        if (mounted) {
          setUserId(session?.user.id ?? null);
        }
      })
      .catch(() => {
        if (mounted) {
          setUserId(null);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Reset on open
  useEffect(() => {
    if (open) {
      setMessages([]);
      setInput("");
      setPaywallHit(false);
      setUserMessageCount(0);
      clearPaymentError();

      // Simulate initial message with delay
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages([initialMessages[0]]);
        }, 1500);
      }, 500);
    }
  }, [open, clearPaymentError]);

  useEffect(() => {
    if (!open || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const success = params.get("stripe_success");
    const messageId = params.get("message_id");

    if (success === "1" && messageId) {
      confirmMessageUnlocked(messageId);
      setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, locked: false, paid: true } : msg)));
      window.location.reload();
    }
  }, [open, confirmMessageUnlocked]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim() || paywallHit) return;

    const userMsg: Message = {
      id: String(Date.now()),
      sender: "user",
      text: input,
      timestamp: "now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    trackClick("chat_message_sent");
    const newCount = userMessageCount + 1;
    setUserMessageCount(newCount);

    if (newCount >= 2) {
      // Hit paywall after 2 messages
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setPaywallHit(true);
        setMessages((prev) => [
          ...prev,
            {
              id: String(Date.now() + 1),
              sender: "system",
              text: "🔒 Unlock this conversation to continue chatting",
              timestamp: "now",
              locked: true,
              price: 3,
              paid: false,
            },
        ]);
      }, 1000);
    } else {
      // Simulate creator follow-up
      setIsTyping(true);
      const followUp = followUpMessages[newCount - 1] || followUpMessages[0];
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [...prev, { ...followUp, id: String(Date.now() + 1) }]);
      }, 1500 + Math.random() * 1000);
    }
  };

  const handleUnlock = async (message: Message) => {
    if (!message.locked) {
      return;
    }

    const unlockResult = await unlockMessage(message.id, message.price ?? 0);
    if (!unlockResult.ok) {
      return;
    }

    if (!unlockResult.requiresCheckout) {
      setMessages((prev) => prev.map((msg) => (msg.id === message.id ? { ...msg, locked: false, paid: true } : msg)));
      return;
    }

    const currentUrl = typeof window !== "undefined" ? window.location.href : "";
    const checkoutResult = await startCheckout({
      amount: unlockResult.amount ?? message.price ?? 0,
      currency: "usd",
      description: `Unlock de mensaje con ${creatorName}`,
      messageId: message.id,
      metadata: {
        messageId: message.id,
        creatorName,
      },
      successUrl: `${currentUrl.split("?")[0]}?stripe_success=1&message_id=${encodeURIComponent(message.id)}`,
      cancelUrl: `${currentUrl.split("?")[0]}?stripe_canceled=1`,
    });

    if (checkoutResult.ok && checkoutResult.checkoutUrl) {
      window.open(checkoutResult.checkoutUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full sm:max-w-md h-[85vh] sm:h-[600px] bg-card border border-border/50 sm:rounded-2xl flex flex-col shadow-elevated overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted border-2 border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {creatorInitial}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{creatorName}</h4>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">Active now</span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.sender === "system" ? (
                    <div className="w-full bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                      <Lock className="w-5 h-5 text-primary mx-auto mb-2" />
                      <p className="text-sm text-foreground mb-3">{msg.text}</p>
                      <div className="flex flex-col gap-2">
                        {msg.locked ? (
                          <Button
                            variant="gold"
                            size="sm"
                            onClick={() => void handleUnlock(msg)}
                            disabled={paymentState.inProgress}
                          >
                            <Lock className="w-3.5 h-3.5 mr-1" />
                            {paymentState.inProgress ? "Procesando pago..." : `Unlock Reply — $${msg.price ?? 3}`}
                          </Button>
                        ) : null}
                        <Button
                          variant="gold-outline"
                          size="sm"
                          onClick={() => {
                            onClose();
                            setTimeout(() => openUnlock({ title: "Custom Request", price: "$10", description: `Request something personal from ${creatorName}` }), 200);
                          }}
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1" /> Request Something — $10
                        </Button>
                        {paymentState.error ? (
                          <p className="text-xs text-destructive mt-1">{paymentState.error}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.sender === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-secondary text-foreground rounded-bl-md"
                      }`}
                    >
                      {msg.text}
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-1 px-4 py-2.5 bg-secondary rounded-2xl rounded-bl-md w-fit"
                >
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-muted-foreground"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border/50">
              {paywallHit ? (
                <div className="text-center text-sm text-muted-foreground py-2">
                  <Lock className="w-4 h-4 inline mr-1" /> Unlock to continue chatting
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Type a message…"
                    className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                  <Button variant="gold" size="icon" onClick={handleSend} className="shrink-0 rounded-xl">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatModal;
