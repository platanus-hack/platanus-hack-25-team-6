import { useState, useRef, useCallback, useEffect } from 'react';
import { authUtils } from '../utils/auth';

export const useRealtimeConnection = (onTranscript, onAnalysis, onError) => {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [recordingId, setRecordingId] = useState(null);
  const wsRef = useRef(null);
  const isConnectedRef = useRef(false); // Ref for checking in callbacks

  const connect = useCallback(() => {
    const wsUrl = `ws://localhost:8000/api/v1/realtime/ws`;

    try {
      console.log('[WebSocket] Connecting to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] ✅ Connected successfully');
        isConnectedRef.current = true;
        setIsConnected(true);

        // Send user_id for impersonation alerts
        const userData = authUtils.getUserData();
        if (userData && userData.user_id) {
          ws.send(JSON.stringify({
            type: 'init',
            user_id: userData.user_id
          }));
          console.log('[WebSocket] Sent user_id:', userData.user_id);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] ← Received:', data.type, data);

          switch (data.type) {
            case 'session.started':
              setSessionId(data.session_id);
              setRecordingId(data.recording_id);
              break;

            case 'transcript.update':
              if (onTranscript) {
                onTranscript(data.role, data.text);
              }
              break;

            case 'analysis.delta':
              // Partial analysis - could show loading state
              break;

            case 'analysis.complete':
              if (onAnalysis) {
                onAnalysis({
                  risk_level: data.risk_level,
                  indicators: data.indicators,
                  text: data.text,
                });
              }
              break;

            case 'error':
              console.error('Server error:', data.message);
              if (onError) {
                onError(data.message);
              }
              break;

            case 'session.stopped':
              isConnectedRef.current = false;
              setIsConnected(false);
              break;

            default:
              console.log('Unhandled message type:', data.type);
          }
        } catch (err) {
          console.error('Error parsing message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] ❌ Error:', error);
        if (onError) {
          onError('WebSocket connection error');
        }
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] 🔌 Closed - Code:', event.code, 'Reason:', event.reason);
        isConnectedRef.current = false;
        setIsConnected(false);
        setSessionId(null);
      };
    } catch (err) {
      console.error('[WebSocket] ❌ Failed to connect:', err);
      if (onError) {
        onError('Failed to establish connection');
      }
    }
  }, [onTranscript, onAnalysis, onError]);

  const disconnect = useCallback(() => {
    if (wsRef.current && isConnectedRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
      wsRef.current.close();
      isConnectedRef.current = false;
      setIsConnected(false);
      setSessionId(null);
    }
  }, []);

  const sendAudio = useCallback((audioData) => {
    if (wsRef.current && isConnectedRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(audioData);
      } catch (err) {
        console.error('[WebSocket] ❌ Error sending audio:', err);
      }
    }
  }, []);

  const requestAnalysis = useCallback(() => {
    if (wsRef.current && isConnectedRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'analyze' }));
    }
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    isConnected,
    isConnectedRef,
    sessionId,
    recordingId,
    connect,
    disconnect,
    sendAudio,
    requestAnalysis,
  };
};
