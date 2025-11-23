import { useState, useEffect, useRef } from 'react';
import { CallWaveform } from './CallWaveform';
import { Phone, AlertTriangle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const TwilioCallMonitor = () => {
  const [activeCalls, setActiveCalls] = useState([]);
  const [selectedCall, setSelectedCall] = useState(null);
  const [callState, setCallState] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [currentRiskLevel, setCurrentRiskLevel] = useState('low');
  const [isConnected, setIsConnected] = useState(false);
  const [callInfo, setCallInfo] = useState(null); // Stores call metadata (numbers, times, etc)

  const wsRef = useRef(null);
  const alertAudioRef = useRef(null);

  // Poll for active calls
  useEffect(() => {
    const fetchActiveCalls = async () => {
      try {
        const response = await fetch(`${API_BASE}/twilio/active-calls`);
        const data = await response.json();
        setActiveCalls(data.active_calls || []);
      } catch (error) {
        console.error('Error fetching active calls:', error);
      }
    };

    fetchActiveCalls();
    const interval = setInterval(fetchActiveCalls, 3000);

    return () => clearInterval(interval);
  }, []);

  // Automatically select the active call
  useEffect(() => {
    if (activeCalls.length > 0 && activeCalls[0].call_sid) {
      setSelectedCall(activeCalls[0].call_sid);
    } else {
      setSelectedCall(null);
      setCallInfo(null);
      setTranscript([]);
      setCurrentRiskLevel('low');
    }
  }, [activeCalls]);

  // Connect to monitor websocket when call is selected
  useEffect(() => {
    if (!selectedCall) return;

    const ws_url = API_BASE.replace('http://', 'ws://').replace('https://', 'wss://');
    const ws = new WebSocket(`${ws_url}/twilio/monitor/${selectedCall}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to call monitor');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Monitor message:', data);

      switch (data.type) {
        case 'call.state':
          setCallState(data);
          setCurrentRiskLevel(data.current_risk_level || 'low');
          setTranscript(data.transcript || []);
          setCallInfo({
            caller_number: data.caller_number,
            called_number: data.called_number,
            start_time: data.start_time,
            duration: data.duration
          });
          break;

        case 'call.started':
          setCallState(data);
          setCallInfo({
            caller_number: data.caller_number,
            called_number: data.called_number,
            start_time: data.start_time,
            duration: 0
          });
          break;

        case 'transcript.update':
          setTranscript(prev => [...prev, {
            role: data.role,
            text: data.text,
            timestamp: new Date().toISOString()
          }]);
          break;

        case 'analysis.complete':
          setCurrentRiskLevel(data.risk_level);
          setTranscript(prev => [...prev, {
            role: 'assistant',
            text: data.text,
            timestamp: new Date().toISOString()
          }]);

          // Play danger alert if risky
          if (data.is_danger) {
            playDangerAlert(data.risk_level);
            showNotification(data);
          }
          break;

        case 'call.stopped':
          setIsConnected(false);
          break;

        case 'error':
          console.error('Monitor error:', data.message);
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('Disconnected from call monitor');
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [selectedCall]);

  const playDangerAlert = (riskLevel) => {
    // Play alert sound based on risk level
    const duration = riskLevel === 'critical' ? 1000 : 500;
    const frequency = riskLevel === 'critical' ? 800 : 600;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);

    // Vibrate if supported
    if (navigator.vibrate) {
      if (riskLevel === 'critical') {
        navigator.vibrate([200, 100, 200, 100, 200]);
      } else {
        navigator.vibrate([200, 100, 200]);
      }
    }
  };

  const showNotification = (analysis) => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      createNotification(analysis);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          createNotification(analysis);
        }
      });
    }
  };

  const createNotification = (analysis) => {
    const riskEmoji = {
      medium: '⚠️',
      high: '🚨',
      critical: '🔴'
    };

    const riskText = {
      medium: 'MEDIO',
      high: 'ALTO',
      critical: 'CRÍTICO'
    };

    const title = `${riskEmoji[analysis.risk_level]} ¡ALERTA DE RIESGO ${riskText[analysis.risk_level]}!`;
    const indicatorsText = analysis.indicators.slice(0, 2).join(', ');

    new Notification(title, {
      body: `Indicadores: ${indicatorsText}\n\n¡Revisa la llamada inmediatamente!`,
      icon: '/alert-icon.png',
      badge: '/alert-badge.png',
      requireInteraction: analysis.risk_level === 'critical',
      tag: 'scam-alert'
    });
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getRiskLabel = (level) => {
    switch (level) {
      case 'critical': return 'CRÍTICO';
      case 'high': return 'ALTO';
      case 'medium': return 'MEDIO';
      case 'low': return 'BAJO';
      default: return 'DESCONOCIDO';
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString('es-ES'),
      time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <Phone className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400" />
          <h2 className="text-xl sm:text-2xl font-bold text-white">Monitor de Llamadas</h2>
        </div>
        <div className="bg-blue-600/20 border border-blue-600/50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
          <span className="text-blue-300 font-semibold text-sm sm:text-base">
            {activeCalls.length > 0 ? 'Llamada Activa' : 'No existe una llamada activa'}
          </span>
        </div>
      </div>

      {activeCalls.length === 0 ? (
        /* Empty State */
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-8 sm:p-12">
          <div className="text-center py-8">
            <Phone className="w-16 h-16 sm:w-20 sm:h-20 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 text-base sm:text-lg mb-2">No existe una llamada activa</p>
            <p className="text-slate-600 text-sm sm:text-base">La llamada aparecerá aquí cuando alguien llame a tu número</p>
          </div>
        </div>
      ) : (
        /* Active Call Monitor - Side by Side Layout */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column: Call Info & Waveform */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4 sm:p-6">
            {/* Connection Status & Risk Level */}
            <div className="flex flex-col gap-3 mb-6">
              {isConnected ? (
                <span className="inline-flex items-center gap-2 bg-green-600/20 text-green-400 px-3 sm:px-4 py-2 rounded-lg border border-green-600/50 text-sm sm:text-base font-semibold w-fit">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Conectado - Monitoreando
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 bg-red-600/20 text-red-400 px-3 sm:px-4 py-2 rounded-lg border border-red-600/50 text-sm sm:text-base font-semibold w-fit">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Desconectado
                </span>
              )}

              {callInfo && (
                <div
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-bold text-sm sm:text-base w-fit"
                  style={{
                    backgroundColor: `${getRiskColor(currentRiskLevel)}20`,
                    color: getRiskColor(currentRiskLevel),
                    border: `2px solid ${getRiskColor(currentRiskLevel)}50`
                  }}
                >
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                  Riesgo: {getRiskLabel(currentRiskLevel)}
                </div>
              )}
            </div>

            {/* Live Badge */}
            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 bg-red-600/20 text-red-400 px-3 py-1.5 rounded-md text-sm font-bold">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                EN VIVO
              </span>
            </div>

            {/* Call Info */}
            {callInfo && (
              <div className="bg-slate-950/50 rounded-lg p-4 sm:p-5 mb-6">
                <h3 className="text-base sm:text-lg font-bold text-slate-200 mb-4">Información de Llamada</h3>
                <div className="space-y-3 text-sm sm:text-base">
                  <div>
                    <span className="text-slate-500 block mb-1">Llamante</span>
                    <span className="text-slate-200 font-mono font-semibold text-base sm:text-lg">{callInfo.caller_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Receptor</span>
                    <span className="text-slate-200 font-mono font-semibold text-base sm:text-lg">{callInfo.called_number}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <span className="text-slate-500 block mb-1">Inicio</span>
                      <span className="text-slate-200 font-semibold block">{formatDateTime(callInfo.start_time).time}</span>
                      <span className="text-slate-400 text-xs">{formatDateTime(callInfo.start_time).date}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Duración</span>
                      <span className="text-slate-200 font-semibold text-lg">{formatDuration(callInfo.duration)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Waveform Visualization */}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-200 mb-4">Visualización de Audio</h3>
              <CallWaveform isActive={isConnected} riskLevel={currentRiskLevel} />
            </div>
          </div>

          {/* Right Column: Transcript */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              Transcripción en Vivo
            </h3>
            <div className="bg-slate-950/50 rounded-lg p-3 sm:p-4 h-[calc(100vh-20rem)] overflow-y-auto space-y-3">
              {transcript.length === 0 ? (
                <div className="text-center py-8 text-slate-500 italic text-sm sm:text-base">
                  Esperando transcripción...
                </div>
              ) : (
                transcript.map((item, index) => (
                  <div
                    key={index}
                    className={`border-l-4 p-3 rounded-lg ${
                      item.role === 'user'
                        ? 'bg-blue-950/30 border-blue-500'
                        : 'bg-amber-950/30 border-amber-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {item.role === 'user' ? '🎤 CONVERSACIÓN' : '🔍 ANÁLISIS DE RIESGO'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm sm:text-base text-slate-200 leading-relaxed">{item.text}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
