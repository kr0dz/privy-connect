import { supabase } from '@/lib/supabase-extended';
import { Message, CreatorPersonality } from '@/types/chat';
import {
  DeepSeekService,
  type DeepSeekMessage,
  type DeepSeekGenerationContext,
  type StyleOverrides,
} from './DeepSeekService';

interface ChatServiceConfig {
  creatorId: string;
  userId: string;
  apiKey: string;
}

interface FanMemoryRecord {
  id: string;
  key: string;
  value: string;
  importance: number;
  updated_at: string;
}

interface CreatorTwinRecord {
  id: string;
  display_name: string | null;
  system_prompt: string | null;
  style_overrides: unknown;
  draft_mode_enabled: boolean;
  auto_send_enabled: boolean;
}

interface PaymentTrigger {
  type: 'unlock' | 'tip' | 'custom_request' | 'subscription';
  amount: number;
  reason: string;
}

export interface ChatWithMemoryOptions {
  content: string;
  type?: Message['type'];
}

export interface ChatWithMemoryResult {
  userMessage: Message | null;
  aiMessage: Message | null;
  trigger: PaymentTrigger | null;
  draftMode: boolean;
}

type PersonalityTone = CreatorPersonality['tone'];
type PersonalityEmojiUsage = CreatorPersonality['emojiUsage'];

function toTone(value: string | undefined): PersonalityTone {
  if (value === 'warm' || value === 'professional' || value === 'playful' || value === 'mysterious') {
    return value;
  }
  return 'warm';
}

function toEmojiUsage(value: string | undefined): PersonalityEmojiUsage {
  if (value === 'frequent' || value === 'moderate' || value === 'rare') {
    return value;
  }
  return 'moderate';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toDeepSeekMessage(history: Array<{ sender_id: string; content: string }>, userId: string): DeepSeekMessage[] {
  return history.map(msg => ({
    role: msg.sender_id === userId ? 'user' : 'assistant',
    content: msg.content,
  }));
}

export class ChatService {
  private creatorId: string;
  private userId: string;
  private deepSeek: DeepSeekService | null = null;
  private isCreatorOnline = false;
  private statusIntervalId: ReturnType<typeof setInterval> | null = null;
  private creatorTwinCache: CreatorTwinRecord | null = null;
  private realtimeChannelName: string;

  constructor(config: ChatServiceConfig) {
    this.creatorId = config.creatorId;
    this.userId = config.userId;
    this.realtimeChannelName = `chat:${this.creatorId}:${this.userId}`;
    void this.initDeepSeek(config.apiKey);
    void this.checkCreatorStatus();
  }

  private async initDeepSeek(apiKey: string) {
    try {
      const { data: personalityData, error } = await supabase
        .from('creator_personalities')
        .select('*')
        .eq('creator_id', this.creatorId)
        .single();

      if (error || !personalityData) {
        console.error('Error loading creator personality:', error);
        const defaultPersonality: CreatorPersonality = {
          id: this.creatorId,
          name: 'Creador',
          tone: 'warm',
          interests: ['arte', 'musica', 'conexion con fans'],
          bio: 'Soy un creador apasionado por compartir momentos especiales con mis fans.',
          greetingMessage: 'Que emocion tenerte por aqui!',
          responseStyle: 'conversacional y cercano',
          emojiUsage: 'moderate',
          topics: ['creatividad', 'inspiracion', 'vida diaria'],
        };
        this.deepSeek = new DeepSeekService(apiKey, defaultPersonality);
        return;
      }

      const personality: CreatorPersonality = {
        id: personalityData.creator_id,
        name: personalityData.name || 'Creador',
        tone: toTone(personalityData.tone),
        interests: personalityData.interests || [],
        bio: personalityData.bio || '',
        greetingMessage: personalityData.greeting_message || 'Hola! Encantado de conocerte',
        responseStyle: personalityData.response_style || 'calido y autentico',
        emojiUsage: toEmojiUsage(personalityData.emoji_usage),
        topics: personalityData.topics || [],
      };

      this.deepSeek = new DeepSeekService(apiKey, personality);
    } catch (error) {
      console.error('Failed to initialize DeepSeek:', error);
    }
  }

  private async checkCreatorStatus() {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', this.creatorId)
        .single();

      this.isCreatorOnline = profile?.status === 'online';

      if (this.statusIntervalId) {
        clearInterval(this.statusIntervalId);
      }

      this.statusIntervalId = setInterval(async () => {
        const { data: updated } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', this.creatorId)
          .single();
        this.isCreatorOnline = updated?.status === 'online';
      }, 30000);
    } catch (error) {
      console.error('Error checking creator status:', error);
      this.isCreatorOnline = false;
    }
  }

  async sendMessage(content: string, type: Message['type'] = 'text'): Promise<Message | null> {
    const result = await this.sendMessageWithMemory({ content, type });
    return result.userMessage;
  }

  async sendMessageWithMemory(options: ChatWithMemoryOptions): Promise<ChatWithMemoryResult> {
    const type = options.type ?? 'text';

    try {
      const trigger = this.detectPaymentTrigger(options.content);

      const newMessage: Omit<Message, 'id' | 'timestamp'> = {
        senderId: this.userId,
        receiverId: this.creatorId,
        content: options.content,
        type,
        isAI: false,
        read: false,
      };

      const { data, error } = await this.insertMessageWithFallback(
        {
          sender_id: newMessage.senderId,
          receiver_id: newMessage.receiverId,
          content: newMessage.content,
          type: newMessage.type,
          is_ai: newMessage.isAI,
          read: newMessage.read,
          trigger_type: trigger?.type ?? null,
          metadata: trigger ? { trigger_reason: trigger.reason, trigger_amount: trigger.amount } : null,
          requires_payment: false,
        },
        {
          sender_id: newMessage.senderId,
          receiver_id: newMessage.receiverId,
          content: newMessage.content,
          type: newMessage.type,
          is_ai: newMessage.isAI,
          read: newMessage.read,
        }
      );

      if (error) {
        throw error;
      }

      const message = this.mapMessageRow(data);
      await this.rememberFromMessage(message.content, message.id);

      let aiMessage: Message | null = null;
      const twin = await this.getCreatorTwin();
      const shouldAutoRespond = !this.isCreatorOnline || twin?.auto_send_enabled;

      if (shouldAutoRespond && this.deepSeek) {
        aiMessage = await this.generateAIResponse(message, trigger, twin?.draft_mode_enabled ?? false);
      }

      return {
        userMessage: message,
        aiMessage,
        trigger,
        draftMode: twin?.draft_mode_enabled ?? false,
      };
    } catch (error) {
      console.error('Error sending message:', error);
      return {
        userMessage: null,
        aiMessage: null,
        trigger: null,
        draftMode: false,
      };
    }
  }

  private async generateAIResponse(
    userMessage: Message,
    trigger: PaymentTrigger | null,
    draftMode: boolean
  ): Promise<Message | null> {
    if (!this.deepSeek) {
      return null;
    }

    try {
      const { data: history } = await supabase
        .from('messages')
        .select('sender_id, content')
        .or(`and(sender_id.eq.${this.userId},receiver_id.eq.${this.creatorId}),and(sender_id.eq.${this.creatorId},receiver_id.eq.${this.userId})`)
        .order('created_at', { ascending: false })
        .limit(16);

      const conversationHistory = toDeepSeekMessage((history || []).reverse(), this.userId);
      const context = await this.buildDeepSeekContext(conversationHistory);

      const aiResponseContent = await this.deepSeek.generateResponse(
        userMessage.content,
        this.userId,
        context
      );

      const requiresPayment = Boolean(trigger);
      const aiInsert = await this.insertMessageWithFallback(
        {
          sender_id: this.creatorId,
          receiver_id: this.userId,
          content: aiResponseContent,
          type: 'text',
          is_ai: true,
          read: false,
          price: trigger?.amount ?? null,
          paid: !requiresPayment,
          requires_payment: requiresPayment,
          trigger_type: trigger?.type ?? null,
          metadata: {
            draft_mode: draftMode,
            draft_pending_approval: draftMode,
            trigger_reason: trigger?.reason ?? null,
          },
        },
        {
          sender_id: this.creatorId,
          receiver_id: this.userId,
          content: aiResponseContent,
          type: 'text',
          is_ai: true,
          read: false,
        }
      );

      if (aiInsert.error || !aiInsert.data) {
        throw aiInsert.error ?? new Error('No se pudo guardar la respuesta IA.');
      }

      return this.mapMessageRow(aiInsert.data);
    } catch (error) {
      console.error('Error generating AI response:', error);
      return null;
    }
  }

  private async insertMessageWithFallback(
    payload: Record<string, unknown>,
    fallbackPayload: Record<string, unknown>
  ) {
    const primary = await supabase.from('messages').insert(payload).select().single();
    if (!primary.error) {
      return primary;
    }

    const details = String(primary.error.message || '').toLowerCase();
    const shouldFallback = details.includes('column') || details.includes('schema') || details.includes('trigger_type');
    if (!shouldFallback) {
      return primary;
    }

    return supabase.from('messages').insert(fallbackPayload).select().single();
  }

  private mapMessageRow(data: Record<string, unknown>): Message {
    return {
      id: String(data.id),
      senderId: String(data.sender_id),
      receiverId: String(data.receiver_id),
      content: String(data.content ?? ''),
      type: (typeof data.type === 'string' ? data.type : 'text') as Message['type'],
      mediaUrl: typeof data.media_url === 'string' ? data.media_url : undefined,
      isAI: Boolean(data.is_ai),
      timestamp: new Date(String(data.created_at ?? new Date().toISOString())),
      read: Boolean(data.read),
      paid: typeof data.paid === 'boolean' ? data.paid : undefined,
      price: typeof data.price === 'number' ? data.price : undefined,
      locked: typeof data.requires_payment === 'boolean' ? data.requires_payment : undefined,
    };
  }

  private detectPaymentTrigger(content: string): PaymentTrigger | null {
    const message = content.toLowerCase();

    if (/(foto|video|audio|nota de voz|contenido exclusivo)/.test(message)) {
      return { type: 'unlock', amount: 3, reason: 'Solicitud de contenido premium' };
    }

    if (/(custom|personalizado|peticion|pedido)/.test(message)) {
      return { type: 'custom_request', amount: 10, reason: 'Solicitud personalizada' };
    }

    if (/(vip|suscripcion|premium mensual)/.test(message)) {
      return { type: 'subscription', amount: 15, reason: 'Interes en plan recurrente' };
    }

    if (/(tip|propina|apoyarte)/.test(message)) {
      return { type: 'tip', amount: 2, reason: 'Fan desea dejar propina' };
    }

    return null;
  }

  private async rememberFromMessage(content: string, sourceMessageId: string): Promise<void> {
    const cleaned = content.trim();
    if (!cleaned || cleaned.length < 8) {
      return;
    }

    const extracted = this.extractFanMemories(cleaned);
    if (extracted.length === 0) {
      return;
    }

    for (const memory of extracted) {
      const payload = {
        creator_id: this.creatorId,
        fan_id: this.userId,
        key: memory.key,
        value: memory.value,
        importance: memory.importance,
        source_message_id: sourceMessageId,
      };

      const { error } = await supabase.from('fan_memories').insert(payload);
      if (error) {
        console.error('No se pudo guardar memoria del fan:', error);
      }
    }
  }

  private extractFanMemories(content: string): Array<{ key: string; value: string; importance: number }> {
    const memories: Array<{ key: string; value: string; importance: number }> = [];
    const lower = content.toLowerCase();

    const meGusta = /me gusta(?:n)?\s+([^,.!?]{3,80})/i.exec(content);
    if (meGusta?.[1]) {
      memories.push({ key: 'gustos', value: meGusta[1].trim(), importance: 0.8 });
    }

    const soyDe = /soy de\s+([^,.!?]{2,60})/i.exec(content);
    if (soyDe?.[1]) {
      memories.push({ key: 'origen', value: soyDe[1].trim(), importance: 0.75 });
    }

    const cumple = /(cumpleanos|cumple)\s*(es)?\s*([^,.!?]{2,40})/i.exec(content);
    if (cumple?.[3]) {
      memories.push({ key: 'cumpleanos', value: cumple[3].trim(), importance: 0.9 });
    }

    if (/(ansioso|triste|feliz|emocionado|estresado)/.test(lower)) {
      memories.push({ key: 'estado_animo', value: content.slice(0, 120), importance: 0.7 });
    }

    return memories.slice(0, 3);
  }

  private async getCreatorTwin(): Promise<CreatorTwinRecord | null> {
    if (this.creatorTwinCache) {
      return this.creatorTwinCache;
    }

    const { data, error } = await supabase
      .from('creator_twins')
      .select('id, display_name, system_prompt, style_overrides, draft_mode_enabled, auto_send_enabled')
      .eq('creator_id', this.creatorId)
      .eq('active', true)
      .maybeSingle();

    if (error) {
      console.error('Error loading creator twin config:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    const twin: CreatorTwinRecord = {
      id: String(data.id),
      display_name: typeof data.display_name === 'string' ? data.display_name : null,
      system_prompt: typeof data.system_prompt === 'string' ? data.system_prompt : null,
      style_overrides: data.style_overrides,
      draft_mode_enabled: Boolean(data.draft_mode_enabled),
      auto_send_enabled: Boolean(data.auto_send_enabled),
    };

    this.creatorTwinCache = twin;
    return twin;
  }

  private async getFanMemories(): Promise<FanMemoryRecord[]> {
    const { data, error } = await supabase
      .from('fan_memories')
      .select('id, key, value, importance, updated_at')
      .eq('creator_id', this.creatorId)
      .eq('fan_id', this.userId)
      .order('importance', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error loading fan memories:', error);
      return [];
    }

    return (data ?? []).map(memory => ({
      id: String(memory.id),
      key: String(memory.key),
      value: String(memory.value),
      importance: Number(memory.importance ?? 0.5),
      updated_at: String(memory.updated_at ?? new Date().toISOString()),
    }));
  }

  private parseStyleOverrides(raw: unknown): StyleOverrides | undefined {
    if (!isRecord(raw)) {
      return undefined;
    }

    const signaturePhrases = Array.isArray(raw.signaturePhrases)
      ? raw.signaturePhrases.filter((item): item is string => typeof item === 'string')
      : undefined;

    const avoidTopics = Array.isArray(raw.avoidTopics)
      ? raw.avoidTopics.filter((item): item is string => typeof item === 'string')
      : undefined;

    const typoProbability = typeof raw.typoProbability === 'number' ? raw.typoProbability : undefined;
    const pauseStyle =
      raw.pauseStyle === 'short' || raw.pauseStyle === 'mixed' || raw.pauseStyle === 'expressive'
        ? raw.pauseStyle
        : undefined;

    return {
      customPrompt: typeof raw.customPrompt === 'string' ? raw.customPrompt : undefined,
      signaturePhrases,
      avoidTopics,
      typoProbability,
      pauseStyle,
    };
  }

  private async buildDeepSeekContext(conversationHistory: DeepSeekMessage[]): Promise<DeepSeekGenerationContext> {
    const [memories, twin] = await Promise.all([this.getFanMemories(), this.getCreatorTwin()]);

    return {
      conversationHistory,
      fan: {
        memoryHighlights: memories.slice(0, 8).map(item => `${item.key}: ${item.value}`),
        recentTopics: memories.slice(0, 6).map(item => item.key),
        moodHints: memories.filter(item => item.key === 'estado_animo').slice(0, 3).map(item => item.value),
      },
      style: {
        customPrompt: twin?.system_prompt ?? undefined,
        ...this.parseStyleOverrides(twin?.style_overrides),
      },
    };
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      await supabase.from('messages').update({ read: true }).eq('id', messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  async getConversation(limit = 50): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${this.userId},receiver_id.eq.${this.creatorId}),and(sender_id.eq.${this.creatorId},receiver_id.eq.${this.userId})`)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        throw error;
      }

      return (data || []).map(msg => this.mapMessageRow(msg as unknown as Record<string, unknown>));
    } catch (error) {
      console.error('Error getting conversation:', error);
      return [];
    }
  }

  subscribeToMessages(onChange: (message: Message, event: 'INSERT' | 'UPDATE') => void): () => void {
    const channel = supabase
      .channel(this.realtimeChannelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const raw = payload.new as Record<string, unknown>;
          if (!this.belongsToConversation(raw)) {
            return;
          }
          onChange(this.mapMessageRow(raw), 'INSERT');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const raw = payload.new as Record<string, unknown>;
          if (!this.belongsToConversation(raw)) {
            return;
          }
          onChange(this.mapMessageRow(raw), 'UPDATE');
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Chat realtime channel error');
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }

  private belongsToConversation(row: Record<string, unknown>): boolean {
    const senderId = String(row.sender_id ?? '');
    const receiverId = String(row.receiver_id ?? '');

    const isUserToCreator = senderId === this.userId && receiverId === this.creatorId;
    const isCreatorToUser = senderId === this.creatorId && receiverId === this.userId;
    return isUserToCreator || isCreatorToUser;
  }

  getCreatorOnlineStatus(): boolean {
    return this.isCreatorOnline;
  }

  dispose(): void {
    if (this.statusIntervalId) {
      clearInterval(this.statusIntervalId);
      this.statusIntervalId = null;
    }
  }
}
