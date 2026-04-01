import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, ChatState } from '@/types/chat';
import {
  ChatService,
  type ChatWithMemoryResult,
} from '@/services/chat/ChatService';

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
  metadata?: Record<string, string>;
  successUrl?: string;
  cancelUrl?: string;
}

interface UnlockResult {
  ok: boolean;
  requiresCheckout: boolean;
  amount?: number;
  message?: string;
}

const stripePublishableKey =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_STRIPE_PUBLISHABLE_KEY ?? '';
const deepSeekApiKey =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_DEEPSEEK_API_KEY ?? '';
const supabaseUrl =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_SUPABASE_ANON_KEY ?? '';

function sortByTimestamp(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function upsertMessage(messages: Message[], next: Message): Message[] {
  const idx = messages.findIndex(msg => msg.id === next.id);
  if (idx === -1) {
    return sortByTimestamp([...messages, next]);
  }

  const updated = [...messages];
  updated[idx] = { ...updated[idx], ...next };
  return sortByTimestamp(updated);
}

export const useChat = (creatorId: string | null, userId: string | null) => {
  const chatServiceRef = useRef<ChatService | null>(null);
  const unsubscribeRealtimeRef = useRef<(() => void) | null>(null);
  const serviceKeyRef = useRef<string | null>(null);

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
    const key = creatorId && userId ? `${creatorId}:${userId}` : null;

    if (!key || !deepSeekApiKey) {
      return;
    }

    if (serviceKeyRef.current === key && chatServiceRef.current) {
      return;
    }

    unsubscribeRealtimeRef.current?.();
    unsubscribeRealtimeRef.current = null;
    chatServiceRef.current?.dispose();

    chatServiceRef.current = new ChatService({
      creatorId,
      userId,
      apiKey: deepSeekApiKey,
    });
    serviceKeyRef.current = key;

    return () => {
      unsubscribeRealtimeRef.current?.();
      unsubscribeRealtimeRef.current = null;
      chatServiceRef.current?.dispose();
      chatServiceRef.current = null;
      serviceKeyRef.current = null;
    };
  }, [creatorId, userId]);

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
      messages: upsertMessage(prev.messages, message),
    }));
  }, []);

  const replaceMessages = useCallback((messages: Message[]) => {
    setState(prev => ({
      ...prev,
      messages: sortByTimestamp(messages),
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

  const loadConversation = useCallback(async (limit = 50): Promise<Message[]> => {
    if (!chatServiceRef.current) {
      return [];
    }

    const conversation = await chatServiceRef.current.getConversation(limit);
    replaceMessages(conversation);
    return conversation;
  }, [replaceMessages]);

  const subscribeToConversation = useCallback((): (() => void) => {
    if (!chatServiceRef.current) {
      return () => undefined;
    }

    unsubscribeRealtimeRef.current?.();
    const unsubscribe = chatServiceRef.current.subscribeToMessages((message) => {
      setState(prev => ({
        ...prev,
        messages: upsertMessage(prev.messages, message),
      }));
    });
    unsubscribeRealtimeRef.current = unsubscribe;
    return unsubscribe;
  }, []);

  const sendMessageWithMemory = useCallback(async (
    content: string,
    type: Message['type'] = 'text'
  ): Promise<ChatWithMemoryResult> => {
    if (!chatServiceRef.current || !creatorId || !userId) {
      return { userMessage: null, aiMessage: null, trigger: null, draftMode: false };
    }

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      senderId: userId,
      receiverId: creatorId,
      content,
      type,
      isAI: false,
      timestamp: new Date(),
      read: false,
    };

    addMessage(optimistic);

    const result = await chatServiceRef.current.sendMessageWithMemory({ content, type });

    if (!result.userMessage) {
      setState(prev => ({
        ...prev,
        messages: prev.messages.filter(msg => msg.id !== tempId),
      }));
      return result;
    }

    setState(prev => ({
      ...prev,
      messages: sortByTimestamp(
        prev.messages
          .filter(msg => msg.id !== tempId)
          .concat(result.userMessage)
      ),
    }));

    if (result.aiMessage) {
      addMessage(result.aiMessage);
    }

    return result;
  }, [addMessage, creatorId, userId]);

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

  const unlockMessage = useCallback(async (messageId: string, fallbackPrice?: number): Promise<UnlockResult> => {
    const target = state.messages.find(msg => msg.id === messageId);

    if (!target) {
      return { ok: false, requiresCheckout: false, message: 'Mensaje no encontrado.' };
    }

    if (!target.locked || target.paid) {
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg => (msg.id === messageId ? { ...msg, locked: false, paid: true } : msg)),
      }));
      return { ok: true, requiresCheckout: false };
    }

    const amount = typeof target.price === 'number' ? target.price : fallbackPrice ?? 0;
    if (amount > 0) {
      return {
        ok: true,
        requiresCheckout: true,
        amount,
      };
    }

    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg => (msg.id === messageId ? { ...msg, locked: false, paid: true } : msg)),
    }));

    return { ok: true, requiresCheckout: false };
  }, [state.messages]);

  const confirmMessageUnlocked = useCallback((messageId: string) => {
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

    if (!supabaseUrl || !supabaseAnonKey) {
      setPayment({ inProgress: false, error: 'Falta configurar Supabase para iniciar checkout.', lastTransactionId: null });
      return { ok: false };
    }

    setPayment(prev => ({ ...prev, inProgress: true, error: null }));

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/stripe-create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          creatorId,
          userId,
          amount: request.amount,
          currency: request.currency ?? 'usd',
          metadata: {
            ...(request.metadata ?? {}),
            description: request.description,
            messageId: request.messageId ?? '',
          },
          successUrl: request.successUrl,
          cancelUrl: request.cancelUrl,
        }),
      });

      if (!response.ok) {
        const reason = await response.text();
        throw new Error(reason || 'No se pudo crear la sesion de checkout.');
      }

      const data = (await response.json()) as { url?: string; sessionId?: string; transactionId?: string };
      setPayment({
        inProgress: false,
        error: null,
        lastTransactionId: data.transactionId ?? data.sessionId ?? null,
      });

      return { ok: Boolean(data.url), checkoutUrl: data.url };
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
    loadConversation,
    replaceMessages,
    subscribeToConversation,
    sendMessageWithMemory,
    payment,
    paymentState: payment,
    startCheckout,
    clearPaymentError,
    unlockMessage,
    confirmMessageUnlocked,
  };
};
