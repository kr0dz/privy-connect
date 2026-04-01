import { useEffect, useMemo, useState } from 'react';
import { Call, CallControls, SpeakerLayout, StreamCall, StreamTheme, StreamVideo, StreamVideoClient } from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { StreamService } from '@/services/video/StreamService';

interface VideoCallProps {
  callId: string;
  userId: string;
  userName?: string;
}

const VideoCall = ({ callId, userId, userName }: VideoCallProps) => {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadToken = async () => {
      try {
        const nextToken = await StreamService.generateToken(userId, callId);
        if (mounted) {
          setToken(nextToken);
        }
      } catch (tokenError) {
        if (mounted) {
          const message = tokenError instanceof Error ? tokenError.message : 'No se pudo abrir la videollamada.';
          setError(message);
        }
      }
    };

    void loadToken();
    return () => {
      mounted = false;
    };
  }, [userId, callId]);

  const client = useMemo(() => {
    if (!token || !import.meta.env.VITE_STREAM_API_KEY) {
      return null;
    }

    return new StreamVideoClient({
      apiKey: import.meta.env.VITE_STREAM_API_KEY,
      user: {
        id: userId,
        name: userName || 'PrivyLoop User',
      },
      token,
    });
  }, [token, userId, userName]);

  const call = useMemo(() => {
    if (!client) {
      return null;
    }

    return client.call('default', callId);
  }, [client, callId]);

  useEffect(() => {
    if (!call) {
      return;
    }

    let active = true;
    void call.join({ create: false });

    return () => {
      if (active) {
        active = false;
        void call.leave();
      }
      if (client) {
        void client.disconnectUser();
      }
    };
  }, [call, client]);

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  if (!call || !client) {
    return <div className="text-sm text-muted-foreground">Conectando videollamada...</div>;
  }

  return (
    <div className="w-full h-[72vh] rounded-xl overflow-hidden border border-border/50 bg-black">
      <StreamVideo client={client}>
        <StreamCall call={call}>
          <StreamTheme>
            <div className="w-full h-full flex flex-col">
              <div className="flex-1">
                <SpeakerLayout />
              </div>
              <CallControls />
            </div>
          </StreamTheme>
        </StreamCall>
      </StreamVideo>
    </div>
  );
};

export default VideoCall;
