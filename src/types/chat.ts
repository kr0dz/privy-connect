export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'voice' | 'image' | 'video';
  mediaUrl?: string;
  isAI: boolean;
  timestamp: Date;
  read: boolean;
  paid?: boolean;
  price?: number;
  locked?: boolean;
  status?: 'draft' | 'sent' | 'discarded' | string;
  sent?: boolean;
}

export interface CreatorPersonality {
  id: string;
  name: string;
  tone: 'warm' | 'professional' | 'playful' | 'mysterious';
  interests: string[];
  bio: string;
  greetingMessage: string;
  responseStyle: string;
  emojiUsage: 'frequent' | 'moderate' | 'rare';
  topics: string[];
}

export interface ChatState {
  messages: Message[];
  isTyping: boolean;
  isAIResponding: boolean;
  creatorOnline: boolean;
  currentCreatorId: string | null;
}

export interface Wallet {
  balance: number;
  currency: string;
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  timestamp: Date;
}
