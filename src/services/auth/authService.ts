import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const SUPABASE_URL = env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env?.VITE_SUPABASE_ANON_KEY;
const STORAGE_SECRET = env?.VITE_AUTH_STORAGE_SECRET;

const SESSION_STORAGE_KEY = 'privy-connect:auth:session';
const MIN_CREATOR_AGE = 18;

export type UserRole = 'fan' | 'creator' | 'admin';

export interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface SignUpInput {
  email: string;
  password: string;
  role: UserRole;
  dateOfBirth?: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface OAuthInput {
  idToken: string;
  nonce?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: {
    id: string;
    email: string | null;
    role: UserRole;
  };
}

interface PersistedSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const webAsyncStorage: AsyncStorageLike = {
  async getItem(key) {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem(key);
  },
  async setItem(key, value) {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.removeItem(key);
  },
};

function ensureSupabaseConfigured() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Falta configurar VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY');
  }
}

function resolveRole(user: User | null): UserRole {
  const role = (user?.user_metadata?.role || user?.app_metadata?.role || 'fan') as UserRole;
  if (role === 'fan' || role === 'creator' || role === 'admin') {
    return role;
  }
  return 'fan';
}

function isCreatorOldEnough(dateOfBirth: string): boolean {
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) {
    return false;
  }

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hasNotHadBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());

  if (hasNotHadBirthday) {
    age -= 1;
  }

  return age >= MIN_CREATOR_AGE;
}

function encodePayload(raw: string): string {
  if (!STORAGE_SECRET) {
    return raw;
  }
  return btoa(`${STORAGE_SECRET}:${raw}`);
}

function decodePayload(encoded: string): string {
  if (!STORAGE_SECRET) {
    return encoded;
  }

  try {
    const decoded = atob(encoded);
    if (!decoded.startsWith(`${STORAGE_SECRET}:`)) {
      throw new Error('Firma invalida para sesion local.');
    }
    return decoded.slice(STORAGE_SECRET.length + 1);
  } catch {
    throw new Error('No se pudo leer la sesion local protegida.');
  }
}

function mapSession(session: Session): AuthSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? 0,
    user: {
      id: session.user.id,
      email: session.user.email ?? null,
      role: resolveRole(session.user),
    },
  };
}

async function persistSession(storage: AsyncStorageLike, session: Session | null): Promise<void> {
  if (!session) {
    await storage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  const payload: PersistedSession = {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? 0,
  };

  await storage.setItem(SESSION_STORAGE_KEY, encodePayload(JSON.stringify(payload)));
}

async function readPersistedSession(storage: AsyncStorageLike): Promise<PersistedSession | null> {
  const raw = await storage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(decodePayload(raw)) as PersistedSession;
  } catch {
    await storage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function getClient(externalClient?: SupabaseClient): SupabaseClient {
  if (externalClient) {
    return externalClient;
  }

  ensureSupabaseConfigured();
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

export interface AuthService {
  signUp(input: SignUpInput): Promise<AuthSession | null>;
  signIn(input: SignInInput): Promise<AuthSession>;
  signInWithGoogle(input: OAuthInput): Promise<AuthSession>;
  signInWithApple(input: OAuthInput): Promise<AuthSession>;
  refreshSession(): Promise<AuthSession | null>;
  getSession(): Promise<AuthSession | null>;
  getRole(): Promise<UserRole | null>;
  updateRole(role: UserRole): Promise<UserRole>;
  signOut(): Promise<void>;
}

export function createAuthService(options?: {
  storage?: AsyncStorageLike;
  supabaseClient?: SupabaseClient;
}): AuthService {
  const storage = options?.storage ?? webAsyncStorage;
  const supabase = getClient(options?.supabaseClient);

  return {
    async signUp(input) {
      if (input.role === 'creator') {
        if (!input.dateOfBirth) {
          throw new Error('Los creadores deben proporcionar fecha de nacimiento.');
        }
        if (!isCreatorOldEnough(input.dateOfBirth)) {
          throw new Error(`Debes tener al menos ${MIN_CREATOR_AGE} anos para registrarte como creador.`);
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            role: input.role,
            dateOfBirth: input.dateOfBirth,
          },
        },
      });

      if (error) {
        throw error;
      }

      await persistSession(storage, data.session);
      return data.session ? mapSession(data.session) : null;
    },

    async signIn(input) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });

      if (error || !data.session) {
        throw error ?? new Error('No se pudo iniciar sesion.');
      }

      await persistSession(storage, data.session);
      return mapSession(data.session);
    },

    async signInWithGoogle(input) {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: input.idToken,
        nonce: input.nonce,
      });

      if (error || !data.session) {
        throw error ?? new Error('No se pudo autenticar con Google.');
      }

      await persistSession(storage, data.session);
      return mapSession(data.session);
    },

    async signInWithApple(input) {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: input.idToken,
        nonce: input.nonce,
      });

      if (error || !data.session) {
        throw error ?? new Error('No se pudo autenticar con Apple.');
      }

      await persistSession(storage, data.session);
      return mapSession(data.session);
    },

    async refreshSession() {
      const localSession = await readPersistedSession(storage);
      if (!localSession?.refreshToken) {
        return null;
      }

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: localSession.refreshToken,
      });

      if (error) {
        await storage.removeItem(SESSION_STORAGE_KEY);
        throw error;
      }

      await persistSession(storage, data.session);
      return data.session ? mapSession(data.session) : null;
    },

    async getSession() {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }

      if (data.session) {
        await persistSession(storage, data.session);
        return mapSession(data.session);
      }

      const localSession = await readPersistedSession(storage);
      if (!localSession) {
        return null;
      }

      return this.refreshSession();
    },

    async getRole() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        return null;
      }
      return resolveRole(data.user);
    },

    async updateRole(role) {
      const { data, error } = await supabase.auth.updateUser({
        data: { role },
      });

      if (error || !data.user) {
        throw error ?? new Error('No se pudo actualizar el rol.');
      }

      return resolveRole(data.user);
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();
      await storage.removeItem(SESSION_STORAGE_KEY);
      if (error) {
        throw error;
      }
    },
  };
}

export const authService = createAuthService();
