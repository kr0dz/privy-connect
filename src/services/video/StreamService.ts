import { supabase } from '@/lib/supabase';

interface StreamCallResponse {
  callId: string;
}

interface StreamTokenResponse {
  token: string;
}

export class StreamService {
  static async createCall(slotId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke<StreamCallResponse>('stream-create-call', {
      body: { slotId },
    });

    if (error) {
      throw new Error(error.message || 'No se pudo crear la sala de videollamada.');
    }

    if (!data?.callId) {
      throw new Error('La Edge Function no devolvio callId.');
    }

    return data.callId;
  }

  static async generateToken(userId: string, callId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke<StreamTokenResponse>('stream-token', {
      body: { userId, callId },
    });

    if (error) {
      throw new Error(error.message || 'No se pudo generar token de videollamada.');
    }

    if (!data?.token) {
      throw new Error('La Edge Function no devolvio token.');
    }

    return data.token;
  }
}

export default StreamService;
