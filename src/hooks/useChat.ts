import { useState, useEffect, useCallback } from 'react';
import { Message, ChatState } from '@/types/chat';

interface FanMemoryItem {
  key: string;
  value: string;
  importance: number;
  source: 'message' | 'manual' | 'system';
  createdAt: Date;
}

interface PaymentStatus {
  inProgress: boolean;
  error: string | null;
  lastTransactionId: string | null;
}

interface CheckoutRequest {
  amount: number;
  currency?: string;
  description: string;
  messageId?: string;
}

const stripePublishableKey =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_STRIPE_PUBLISHABLE_KEY ?? '';

export const useChat = (creatorId: string | null, userId: string | null) => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isTyping: false,
    isAIResponding: false,
    creatorOnline: false,
    currentCreatorId: creatorId,
  });
  const [fanMemories, setFanMemories] = useState<FanMemoryItem[]>([]);
  const [payment, setPayment] = useState<PaymentStatus>({
    inProgress: false,
    error: null,
    lastTransactionId: null,
  });

  useEffect(() => {
    setState(prev => ({
      ...prev,
      currentCreatorId: creatorId,
    }));
  }, [creatorId]);

  useEffect(() => {
    setState(prev => ({
      ...prev,
      messages: [],
    }));
    setFanMemories([]);
    setPayment({ inProgress: false, error: null, lastTransactionId: null });
  }, [creatorId, userId]);

  const addMessage = useCallback((message: Message) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  }, []);

  const updateMessageReadStatus = useCallback((messageId: string, read: boolean) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg => (msg.id === messageId ? { ...msg, read } : msg)),
    }));
  }, []);

  const setTyping = useCallback((isTyping: boolean) => {
    setState(prev => ({ ...prev, isTyping }));
  }, []);

  const setAIResponding = useCallback((isAIResponding: boolean) => {
    setState(prev => ({ ...prev, isAIResponding }));
  }, []);

  const setCreatorOnline = useCallback((online: boolean) => {
    setState(prev => ({ ...prev, creatorOnline: online }));
  }, []);

  const clearMessages = useCallback(() => {
    setState(prev => ({ ...prev, messages: [] }));
  }, []);

  const addFanMemory = useCallback((memory: Omit<FanMemoryItem, 'createdAt'>) => {
    setFanMemories(prev => [
      {
        ...memory,
        createdAt: new Date(),
      },
      ...prev,
    ].slice(0, 50));
  }, []);

  const inferMemoryFromText = useCallback((text: string) => {
    const cleaned = text.trim();
    if (cleaned.length < 6) {
      return;
    }

    const likeMatch = /me gusta(?:n)?\s+([^,.!?]{3,80})/i.exec(cleaned);
    if (likeMatch?.[1]) {
      addFanMemory({
        key: 'gustos',
        value: likeMatch[1].trim(),
        importance: 0.8,
        source: 'message',
      });
    }
  }, [addFanMemory]);

  const addMessageWithMemory = useCallback((message: Message) => {
    addMessage(message);
    if (!message.isAI && message.senderId === userId) {
      inferMemoryFromText(message.content);
    }
  }, [addMessage, inferMemoryFromText, userId]);

  const unlockMessage = useCallback((messageId: string) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg => (msg.id === messageId ? { ...msg, locked: false, paid: true } : msg)),
    }));
  }, []);

  const startCheckout = useCallback(async (request: CheckoutRequest): Promise<{ ok: boolean; checkoutUrl?: string }> => {
    if (!stripePublishableKey) {
      setPayment({ inProgress: false, error: 'Falta VITE_STRIPE_PUBLISHABLE_KEY para pagos en modo prueba.', lastTransactionId: null });
      return { ok: false };
    }

    setPayment(prev => ({ ...prev, inProgress: true, error: null }));

    try {
      const response = await fetch('/api/stripe/create-test-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          userId,
          amount: request.amount,
          currency: request.currency ?? 'usd',
          description: request.description,
          messageId: request.messageId,
        }),
      });

      if (!response.ok) {
        const reason = await response.text();
        throw new Error(reason || 'No se pudo crear la sesion de checkout.');
      }

      const data = (await response.json()) as { checkoutUrl?: string; transactionId?: string };
      setPayment({
        inProgress: false,
        error: null,
        lastTransactionId: data.transactionId ?? null,
      });

      return { ok: Boolean(data.checkoutUrl), checkoutUrl: data.checkoutUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error inesperado iniciando pago.';
      setPayment({ inProgress: false, error: message, lastTransactionId: null });
      return { ok: false };
    }
  }, [creatorId, userId]);

  const clearPaymentError = useCallback(() => {
    setPayment(prev => ({ ...prev, error: null }));
  }, []);

  return {
    messages: state.messages,
    isTyping: state.isTyping,
    isAIResponding: state.isAIResponding,
    creatorOnline: state.creatorOnline,
    addMessage,
    updateMessageReadStatus,
    setTyping,
    setAIResponding,
    setCreatorOnline,
    clearMessages,
    addMessageWithMemory,
    fanMemories,
    addFanMemory,
    payment,
    startCheckout,
    clearPaymentError,
    unlockMessage,
  };
};
