import { useState, useRef, useEffect } from 'react';
import { useRealtimeConnection } from '../hooks/useRealtimeConnection';
import { AudioVisualizer } from './AudioVisualizer';
import { Mic, Square, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import './RealtimeRecorder.css';

export const RealtimeRecorder = ({ onScamDetected }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const analyserRef = useRef(null);
  const timerRef = useRef(null);
  const analysisIntervalRef = useRef(null);

  const [analyser, setAnalyser] = useState(null);

  const handleTranscript = (role, text) => {
    setTranscript((prev) => [...prev, { role, text, timestamp: new Date() }]);
  };

  const handleAnalysis = (analysis) => {
    setCurrentAnalysis(analysis);

    // Add analysis to transcript for history
    if (analysis.text) {
      setTranscript((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: analysis.text,
          timestamp: new Date()
        }
      ]);
    }

    // Show browser notification for medium, high, or critical risk
    if (analysis.risk_level === 'medium' || analysis.risk_level === 'high' || analysis.risk_level === 'critical') {
      showRiskNotification(analysis);
    }

    // Trigger callback for high risk
    if (
      (analysis.risk_level === 'high' || analysis.risk_level === 'critical') &&
      onScamDetected
    ) {
      onScamDetected(analysis);
    }
  };

  const showRiskNotification = (analysis) => {
    // Request notification permission if not granted
    if (!('Notification' in window)) {
      console.log('Este navegador no soporta notificaciones');
      return;
    }

    const requestAndShow = () => {
      const riskLevelText = {
        medium: 'MEDIO',
        high: 'ALTO',
        critical: 'CRÍTICO'
      };

      const riskEmoji = {
        medium: '⚠️',
        high: '🚨',
        critical: '🔴'
      };

      const title = `${riskEmoji[analysis.risk_level]} ¡ALERTA DE RIESGO ${riskLevelText[analysis.risk_level]}!`;

      const indicatorsText = analysis.indicators && analysis.indicators.length > 0
        ? analysis.indicators.slice(0, 2).join(', ')
        : 'Posible estafa detectada';

      const notification = new Notification(title, {
        body: `Indicadores: ${indicatorsText}\n\n¡Revisa la llamada inmediatamente!`,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'scam-alert',
        requireInteraction: analysis.risk_level === 'critical', // Require action for critical
        vibrate: analysis.risk_level === 'critical' ? [200, 100, 200, 100, 200] : [200, 100, 200],
        silent: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Play alert sound for high/critical risk
      if (analysis.risk_level === 'high' || analysis.risk_level === 'critical') {
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKXh8LhjHAU2jdXmyHomBSp+zPLaizsKGGS26+mhVBIKRp/g8r5sIgUrgc7y2Yk2Bxxpv/DomlELElCl4fC4Yx0GNIzV5sljKAUpfMzy2oo8ChpnuOvmn1UTCkai4PK+ayIFLYHO8tmJNgcaab/w6JpRDRJQpeHwuGMeBDSM1ebJYyYFKn3M8tqKPAobZ7fq5aFVEwlGn+DyvmwhBSyBzvLaiTYHGmm/8OibTwwSUKXh8LhjHQU0jNXmyWMmBSl8y/HajDsKG2m68OaeUxMKRp/g8r5sIgUsgc7y2og2Bxppv/DomFENElGl4vC4Yx0FNI3V5sljJgUpfcvx2ow7ChtpuvHmnFQTCkSf4PK+bCIFLYHO8tmJNgcaab/w6JhPDBNQo+Lxt2MdBTSN1ebJYyYFKXzL8duNOgocabnx5JxVEwlGn+DyvmshBSyBzvLZiDUHGmm/8OiaUQ0SUaXi8LhjHQU0jNXmyWMmBSl9y/HajDsKG2m68eSbUxILRp/g8r5sIQUtgc7y2Yk2Bxppv/DomFENElGl4vC4Yx0FNI3V5sljJgUpfMvx2ow7ChtpuvHkm1MSC0af4PK+bCIFLIHO8tiJNgcaab/w6JhRDBJRpeLwuGMdBTSN1ebJYyYFKXzL8duMOgocabrx5JtTEQtGn+DyvmwhBSyBzvLYiTcHGmi+8OiYUQ0SUqTi8LhjHQU0jdXmyWMmBSl9y/HajDsKHGm68uOcUxMKRp/g8r5sIQUtgc7y2Ik2BxtovvDpmlENElKk4fC5Yx0FNI3V5sljJgUpfcvx2ow7ChtpuvLkm1ISC0af4PK+bCEFLYHO8tmJNgcaab7w6ZpRDRJSpeHwuWIdBTSM1ebJYyYFKX3L8duMOwocabry5JtSEgtGn+DyvmshBS2BzvLYiTcHGmi+8OmaUg0SUaXh8LljHQU0jdXmyWMmBSl9y/HbjDsKHGm68uScUhILRp/g8r5sIQUtgc7y2Ik3Bxtov/Dom1INElKl4fC5Yx0FNI3V5sljJgUpfsz12ow7ChtpuvLknFISC0af4PO+ayIFLYDP8tmJNgcbab/w6ZpSDBJSpeLwuWIdBDON1OjJYyYEKX7M9dqMPAobabzw5JxUEwtGn+Dzvmshmain');
          audio.volume = 0.5;
          audio.play().catch(e => console.log('No se pudo reproducir el sonido:', e));
        } catch (e) {
          console.log('Error al reproducir sonido de alerta:', e);
        }
      }

      // Auto-close after 10 seconds (except critical)
      if (analysis.risk_level !== 'critical') {
        setTimeout(() => notification.close(), 10000);
      }
    };

    if (Notification.permission === 'granted') {
      requestAndShow();
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          requestAndShow();
        }
      });
    }
  };

  const handleError = (errorMsg) => {
    setError(errorMsg);
  };

  const {
    isConnected,
    isConnectedRef,
    sessionId,
    recordingId,
    connect,
    disconnect,
    sendAudio,
    requestAnalysis,
  } = useRealtimeConnection(handleTranscript, handleAnalysis, handleError);

  const startRecording = async () => {
    try {
      console.log('[RealtimeRecorder] Starting recording...');
      setError(null);
      setTranscript([]);
      setCurrentAnalysis(null);
      setRecordingTime(0);

      // Request notification permissions upfront
      if ('Notification' in window && Notification.permission === 'default') {
        console.log('[RealtimeRecorder] Requesting notification permissions...');
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('[RealtimeRecorder] Notification permissions granted');
        } else {
          console.log('[RealtimeRecorder] Notification permissions denied');
        }
      }

      // Get microphone access FIRST
      console.log('[RealtimeRecorder] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[RealtimeRecorder] Microphone access granted');

      // Create audio context for processing
      console.log('[RealtimeRecorder] Creating AudioContext...');
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 24000, // OpenAI Realtime API expects 24kHz
      });
      console.log('[RealtimeRecorder] AudioContext created');

      const source = audioContextRef.current.createMediaStreamSource(stream);

      // Create analyser for visualization
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;
      setAnalyser(analyserRef.current);
      console.log('[RealtimeRecorder] Audio analyser created for visualization');

      // Create a script processor to send audio chunks
      const bufferSize = 4096;
      processorRef.current = audioContextRef.current.createScriptProcessor(
        bufferSize,
        1,
        1
      );

      let audioChunksSent = 0;
      let audioProcessCallCount = 0;
      processorRef.current.onaudioprocess = (e) => {
        audioProcessCallCount++;
        if (audioProcessCallCount === 1 || audioProcessCallCount % 100 === 0) {
          console.log(`[RealtimeRecorder] 🎤 Audio process called ${audioProcessCallCount} times, isConnected=${isConnectedRef.current}`);
        }

        // Use ref instead of state to avoid closure issues
        if (isConnectedRef.current) {
          const inputData = e.inputBuffer.getChannelData(0);

          // Convert Float32Array to Int16Array (PCM16)
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }

          // Send as binary data
          sendAudio(pcm16.buffer);
          audioChunksSent++;
          if (audioChunksSent % 50 === 0) {
            console.log(`[RealtimeRecorder] ✅ Sent ${audioChunksSent} audio chunks`);
          }
        }
      };

      // Connect audio pipeline: source -> analyser -> processor -> destination
      source.connect(analyserRef.current);
      analyserRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      console.log('[RealtimeRecorder] Audio pipeline connected with visualizer');

      // NOW connect to WebSocket (after audio is ready)
      console.log('[RealtimeRecorder] Connecting to WebSocket...');
      connect();

      setIsRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Start periodic analysis (every 10 seconds)
      console.log('[RealtimeRecorder] Starting periodic analysis every 10 seconds');
      analysisIntervalRef.current = setInterval(() => {
        if (isConnectedRef.current) {
          console.log('[RealtimeRecorder] 🔍 Requesting periodic scam analysis...');
          requestAnalysis();
        }
      }, 10000); // Analyze every 10 seconds

      console.log('[RealtimeRecorder] Recording started successfully');
    } catch (err) {
      console.error('[RealtimeRecorder] Error starting recording:', err);
      setError('Error al acceder al micrófono. Por favor, concede los permisos necesarios.');
    }
  };

  const stopRecording = () => {
    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Disconnect WebSocket
    disconnect();

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop periodic analysis
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }

    setAnalyser(null);
    setIsRecording(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
      if (processorRef.current) {
        processorRef.current.disconnect();
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRiskColor = (level) => {
    const colors = {
      low: '#38a169',
      medium: '#d69e2e',
      high: '#dd6b20',
      critical: '#c53030',
    };
    return colors[level] || colors.low;
  };

  const getRiskIcon = (level) => {
    if (level === 'critical' || level === 'high') {
      return <AlertTriangle size={24} />;
    } else if (level === 'low') {
      return <CheckCircle size={24} />;
    }
    return <Info size={24} />;
  };

  return (
    <div className="realtime-recorder">
      <div className="recorder-header">
        <h2>🔴 Detección de Estafas en Vivo</h2>
        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="recorder-status">
        {isRecording && (
          <div className="status-indicator">
            <div className="pulse-dot" style={{ background: '#e53e3e' }}></div>
            <span>EN VIVO - Monitoreando conversación...</span>
          </div>
        )}

        <div className="time-display">{formatTime(recordingTime)}</div>

        {sessionId && (
          <div className="session-info">
            Session ID: {sessionId.substring(0, 8)}...
          </div>
        )}
      </div>

      {/* Audio Visualizer */}
      <AudioVisualizer analyser={analyser} isActive={isRecording} />

      {currentAnalysis && (
        <div
          className="risk-indicator"
          style={{ borderColor: getRiskColor(currentAnalysis.risk_level) }}
        >
          <div className="risk-header">
            <div
              className="risk-icon"
              style={{ color: getRiskColor(currentAnalysis.risk_level) }}
            >
              {getRiskIcon(currentAnalysis.risk_level)}
            </div>
            <div className="risk-info">
              <div className="risk-level" style={{ color: getRiskColor(currentAnalysis.risk_level) }}>
                RIESGO {currentAnalysis.risk_level.toUpperCase()}
              </div>
              {currentAnalysis.indicators && currentAnalysis.indicators.length > 0 && (
                <div className="risk-indicators">
                  Indicadores: {currentAnalysis.indicators.join(', ')}
                </div>
              )}
            </div>
          </div>
          {currentAnalysis.text && (
            <div className="risk-analysis">{currentAnalysis.text}</div>
          )}
        </div>
      )}

      <div className="transcript-container">
        <h3>Transcripción en Vivo</h3>
        <div className="transcript-messages">
          {transcript.length === 0 && !isRecording && (
            <div className="empty-transcript">
              Inicia la grabación para ver la transcripción de la conversación en tiempo real
            </div>
          )}
          {transcript.map((item, index) => (
            <div key={index} className={`transcript-message ${item.role}`}>
              <div className="message-role">
                {item.role === 'user' ? '🎤 CONVERSACIÓN' : '🔍 ANÁLISIS DE RIESGO'}:
              </div>
              <div className="message-text" style={{ whiteSpace: 'pre-line' }}>
                {item.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="recorder-controls">
        {!isRecording ? (
          <button onClick={startRecording} className="btn btn-primary btn-large">
            <Mic size={24} />
            <span>Iniciar Monitoreo en Vivo</span>
          </button>
        ) : (
          <button onClick={stopRecording} className="btn btn-danger btn-large">
            <Square size={24} />
            <span>Detener Monitoreo</span>
          </button>
        )}
      </div>
    </div>
  );
};
