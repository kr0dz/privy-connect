import { supabase } from '@/lib/supabase-extended';
import { Message, CreatorPersonality } from '@/types/chat';
import { DeepSeekService } from './DeepSeekService';

interface ChatServiceConfig {
  creatorId: string;
  userId: string;
  apiKey: string;
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

export class ChatService {
  private creatorId: string;
  private userId: string;
  private deepSeek: DeepSeekService | null = null;
  private isCreatorOnline = false;
  private statusIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(config: ChatServiceConfig) {
    this.creatorId = config.creatorId;
    this.userId = config.userId;
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
    try {
      const newMessage: Omit<Message, 'id' | 'timestamp'> = {
        senderId: this.userId,
        receiverId: this.creatorId,
        content,
        type,
        isAI: false,
        read: false,
      };

      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: newMessage.senderId,
          receiver_id: newMessage.receiverId,
          content: newMessage.content,
          type: newMessage.type,
          is_ai: newMessage.isAI,
          read: newMessage.read,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      const message: Message = {
        id: data.id,
        senderId: data.sender_id,
        receiverId: data.receiver_id,
        content: data.content,
        type: data.type,
        mediaUrl: data.media_url,
        isAI: data.is_ai,
        timestamp: new Date(data.created_at),
        read: data.read,
        paid: data.paid,
        price: data.price,
      };

      if (!this.isCreatorOnline && this.deepSeek) {
        void this.generateAIResponse(message);
      }

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }

  private async generateAIResponse(userMessage: Message) {
    if (!this.deepSeek) {
      return;
    }

    try {
      const { data: history } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${this.userId},receiver_id.eq.${this.creatorId}),and(sender_id.eq.${this.creatorId},receiver_id.eq.${this.userId})`)
        .order('created_at', { ascending: false })
        .limit(10);

      const conversationHistory = (history || []).reverse().map(msg => {
        const role: 'user' | 'assistant' = msg.sender_id === this.userId ? 'user' : 'assistant';
        return {
          role,
          content: msg.content,
        };
      });

      const aiResponseContent = await this.deepSeek.generateResponse(
        userMessage.content,
        this.userId,
        conversationHistory
      );

      await supabase.from('messages').insert({
        sender_id: this.creatorId,
        receiver_id: this.userId,
        content: aiResponseContent,
        type: 'text',
        is_ai: true,
        read: false,
      });
    } catch (error) {
      console.error('Error generating AI response:', error);
    }
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

      return (data || []).map(msg => ({
        id: msg.id,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        content: msg.content,
        type: msg.type,
        mediaUrl: msg.media_url,
        isAI: msg.is_ai,
        timestamp: new Date(msg.created_at),
        read: msg.read,
        paid: msg.paid,
        price: msg.price,
      }));
    } catch (error) {
      console.error('Error getting conversation:', error);
      return [];
    }
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
