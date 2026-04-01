import { createClient } from '@supabase/supabase-js';

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;

const supabaseUrl = env?.VITE_SUPABASE_URL;
const supabaseAnonKey = env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Falta configurar VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Tables = {
  profiles: {
    id: string;
    email: string;
    role: 'fan' | 'creator' | 'admin';
    name: string;
    avatar_url: string;
    bio: string;
    subscription_tier: 'free' | 'premium' | 'vip';
    wallet_balance: number;
    created_at: string;
  };
  messages: {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    type: string;
    media_url: string | null;
    is_ai: boolean;
    paid: boolean;
    price: number | null;
    read: boolean;
    created_at: string;
  };
  creator_personalities: {
    id: string;
    creator_id: string;
    tone: string;
    interests: string[];
    bio: string;
    greeting_message: string;
    response_style: string;
    emoji_usage: string;
    topics: string[];
    updated_at: string;
  };
};
