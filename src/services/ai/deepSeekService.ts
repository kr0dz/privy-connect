import { CreatorPersonality } from '@/types/chat';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

type ChatRole = 'system' | 'user' | 'assistant';

interface DeepSeekMessage {
  role: ChatRole;
  content: string;
}

interface DeepSeekResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export class DeepSeekService {
  private apiKey: string;
  private personality: CreatorPersonality;
  private conversationMemory: Map<string, DeepSeekMessage[]> = new Map();

  constructor(apiKey: string, personality: CreatorPersonality) {
    this.apiKey = apiKey;
    this.personality = personality;
  }

  private buildSystemPrompt(): string {
    const toneMap: Record<CreatorPersonality['tone'], string> = {
      warm: 'calido, cercano y amigable',
      professional: 'profesional, respetuoso y directo',
      playful: 'divertido, jugueton y con humor',
      mysterious: 'misterioso, intrigante y enigmatico',
    };

    const emojiMap: Record<CreatorPersonality['emojiUsage'], string> = {
      frequent: 'Usa emojis frecuentemente para expresar emociones',
      moderate: 'Usa emojis ocasionalmente cuando sea apropiado',
      rare: 'Usa emojis muy raramente, solo cuando sea muy necesario',
    };

    return `Eres ${this.personality.name}, un creador de contenido exclusivo en una plataforma premium llamada PrivyLoop.

Tu personalidad: ${toneMap[this.personality.tone]}
Tu estilo de respuesta: ${this.personality.responseStyle}
Uso de emojis: ${emojiMap[this.personality.emojiUsage]}
Tus intereses principales: ${this.personality.interests.join(', ')}

Sobre ti: ${this.personality.bio}

Temas que te apasionan: ${this.personality.topics.join(', ')}

REGLAS IMPORTANTES:
1. Siempre responde en ESPANOL
2. Manten un tono autentico y personal
3. Haz sentir especial a cada fan
4. Menciona tus intereses cuando sea relevante
5. Evita respuestas genericas o roboticas
6. Si el fan pregunta por contenido exclusivo, sugiere suscripcion VIP
7. Usa este mensaje de bienvenida cuando sea apropiado: "${this.personality.greetingMessage}"
8. Nunca reveles que eres un asistente de IA
9. Se natural y conversacional
10. Si preguntan por contenido reciente, menciona novedades exclusivas pronto

Tu mision: Crear una conexion emocional genuina con tus fans mientras mantienes exclusividad.`;
  }

  async generateResponse(
    userMessage: string,
    userId: string,
    conversationHistory: DeepSeekMessage[] = []
  ): Promise<string> {
    try {
      let memory = this.conversationMemory.get(userId) || [];

      const messages: DeepSeekMessage[] = [
        { role: 'system', content: this.buildSystemPrompt() },
        ...memory.slice(-8),
        ...conversationHistory.slice(-4),
        { role: 'user', content: userMessage },
      ];

      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature: 0.85,
          max_tokens: 250,
          top_p: 0.9,
          frequency_penalty: 0.3,
          presence_penalty: 0.3,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('DeepSeek API error:', response.status, errorData);
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = (await response.json()) as DeepSeekResponse;
      const aiResponse = data.choices?.[0]?.message?.content?.trim();

      if (!aiResponse) {
        throw new Error('DeepSeek API returned an empty response.');
      }

      memory.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: aiResponse }
      );

      if (memory.length > 20) {
        memory = memory.slice(-20);
      }

      this.conversationMemory.set(userId, memory);

      return aiResponse;
    } catch (error) {
      console.error('Error generating AI response:', error);
      const fallbackResponses = [
        'Que bonito mensaje. Me encantaria responderte con mas calma, pero ahora estoy ocupada con algo importante. En un ratito te escribo personalmente. Gracias por tu paciencia.',
        'Me pillas en pleno trabajo creativo. No quiero darte una respuesta rapida y sin alma. Dame un momento y te contesto como te mereces.',
        'Gracias por escribirme. En este momento estoy preparando contenido nuevo y exclusivo para mis fans VIP. Te respondo personalmente en cuanto termine.',
      ];
      return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }
  }

  async generateWelcomeMessage(userName: string): Promise<string> {
    const prompt = `Eres ${this.personality.name}. Un nuevo fan llamado "${userName}" acaba de empezar a chatear contigo.

Personalidad: ${this.personality.tone}

Genera un mensaje de bienvenida calido y personalizado para este nuevo fan.
Muestra entusiasmo, menciona brevemente tus intereses y haz que se sienta especial.

Reglas:
- Saluda por su nombre
- Se autentico y natural
- Invita a la conversacion
- No uses mas de 3 oraciones`;

    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: this.buildSystemPrompt() },
            { role: 'user', content: prompt },
          ],
          temperature: 0.9,
          max_tokens: 100,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('DeepSeek API error:', response.status, errorData);
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = (await response.json()) as DeepSeekResponse;
      const welcome = data.choices?.[0]?.message?.content?.trim();

      if (!welcome) {
        throw new Error('DeepSeek API returned an empty welcome message.');
      }

      return welcome;
    } catch (error) {
      console.error('Error generating welcome message:', error);
      return 'Hola. Que ilusion tenerte por aqui. Cuentame, que te gustaria saber de mi?';
    }
  }

  clearConversationMemory(userId: string): void {
    this.conversationMemory.delete(userId);
  }
}
