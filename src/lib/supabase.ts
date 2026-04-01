import { createClient } from '@supabase/supabase-js';

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;

const supabaseUrl = env?.VITE_SUPABASE_URL;
const supabaseAnonKey = env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Falta configurar VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

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
    onboarding_completed: boolean;
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
    requires_payment: boolean | null;
    trigger_type: 'unlock' | 'tip' | 'custom_request' | 'subscription' | null;
    status: 'draft' | 'sent' | 'discarded' | string;
    sent: boolean;
    metadata: Json | null;
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
  creator_twins: {
    id: string;
    creator_id: string;
    display_name: string | null;
    system_prompt: string | null;
    style_overrides: Json | null;
    tone: 'warm' | 'professional' | 'playful' | 'mysterious' | null;
    interests: string[] | null;
    bio: string | null;
    greeting_message: string | null;
    response_style: string | null;
    emoji_usage: 'frequent' | 'moderate' | 'rare' | null;
    topics: string[] | null;
    price_ai: number | null;
    price_real: number | null;
    trigger_keywords: string[] | null;
    draft_mode: boolean | null;
    auto_send: boolean | null;
    draft_mode_enabled: boolean;
    auto_send_enabled: boolean;
    active: boolean;
    created_at: string;
    updated_at: string;
  };
  fan_memories: {
    id: string;
    creator_id: string;
    fan_id: string;
    key: string;
    value: string;
    importance: number;
    source_message_id: string | null;
    metadata: Json | null;
    created_at: string;
    updated_at: string;
  };
  wallets: {
    id: string;
    user_id: string;
    currency: string;
    balance: number;
    stripe_customer_id: string | null;
    created_at: string;
    updated_at: string;
  };
  transactions: {
    id: string;
    wallet_id: string;
    user_id: string;
    amount: number;
    currency: string;
    status: 'pending' | 'succeeded' | 'failed' | 'canceled';
    type: 'debit' | 'credit';
    provider: 'stripe' | 'manual' | 'promo';
    provider_ref: string | null;
    metadata: Json | null;
    created_at: string;
    updated_at: string;
  };
  testimonials: {
    id: string;
    quote: string;
    author: string;
    role: string | null;
    avatar_url: string | null;
    created_at: string;
  };
  push_tokens: {
    id: string;
    user_id: string;
    token: string;
    device: string | null;
    created_at: string;
  };
  analytics_events: {
    id: string;
    user_id: string | null;
    creator_id: string | null;
    event_type: string;
    metadata: Json | null;
    created_at: string;
  };
  ai_response_cache: {
    id: string;
    query_hash: string;
    response: string;
    creator_id: string;
    created_at: string;
    expires_at: string | null;
  };
};
