import { useState, useEffect, useCallback } from 'react';
import { Message, ChatState } from '@/types/chat';

export const useChat = (creatorId: string | null, userId: string | null) => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isTyping: false,
    isAIResponding: false,
    creatorOnline: false,
    currentCreatorId: creatorId,
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
  };
};
