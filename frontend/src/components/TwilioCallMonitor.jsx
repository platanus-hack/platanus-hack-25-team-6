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
  const transcriptContainerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [transcript]);

  // Parse SafeLine analysis text into structured data
  const parseAnalysis = (text) => {
    const analysis = {
      riskLevel: '',
      indicators: '',
      recommendation: '',
      explanation: ''
    };

    const riskMatch = text.match(/Nivel de Riesgo:\s*([^\n]+)/i);
    const indicatorsMatch = text.match(/Indicadores:\s*([^\n]+)/i);
    const recommendationMatch = text.match(/Recomendación:\s*([^\n]+)/i);
    const explanationMatch = text.match(/Explicación:\s*(.+)/is);

    if (riskMatch) analysis.riskLevel = riskMatch[1].trim();
    if (indicatorsMatch) analysis.indicators = indicatorsMatch[1].trim();
    if (recommendationMatch) analysis.recommendation = recommendationMatch[1].trim();
    if (explanationMatch) analysis.explanation = explanationMatch[1].trim();

    return analysis;
  };

  const getRiskLevelColor = (riskLevel) => {
    const level = riskLevel.toUpperCase();
    if (level.includes('CRÍTICO') || level.includes('CRITICAL')) return { bg: 'bg-red-600/20', border: 'border-red-600', text: 'text-red-400', dot: 'bg-red-500' };
    if (level.includes('ALTO') || level.includes('HIGH')) return { bg: 'bg-orange-600/20', border: 'border-orange-600', text: 'text-orange-400', dot: 'bg-orange-500' };
    if (level.includes('MEDIO') || level.includes('MEDIUM')) return { bg: 'bg-yellow-600/20', border: 'border-yellow-600', text: 'text-yellow-400', dot: 'bg-yellow-500' };
    return { bg: 'bg-green-600/20', border: 'border-green-600', text: 'text-green-400', dot: 'bg-green-500' };
  };

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

    // Parse the date string - if no timezone info, assume it's UTC
    let date;

    // If the string doesn't have timezone info (Z or +/-), assume it's UTC
    if (!isoString.includes('Z') && !isoString.includes('+') && !isoString.match(/[+-]\d{2}:\d{2}$/)) {
      // Add 'Z' to indicate UTC
      date = new Date(isoString + 'Z');
    } else {
      // Has timezone info, parse normally
      date = new Date(isoString);
    }

    // Format both date and time in Chile timezone
    const dateFormatter = new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const timeFormatter = new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    return {
      date: dateFormatter.format(date),
      time: timeFormatter.format(date)
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
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {/* Connection Status */}
              {isConnected ? (
                <span className="inline-flex items-center gap-2 bg-green-600/20 text-green-400 px-3 sm:px-4 py-2 rounded-lg border border-green-600/50 text-sm sm:text-base font-semibold">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Conectado - Monitoreando
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 bg-red-600/20 text-red-400 px-3 sm:px-4 py-2 rounded-lg border border-red-600/50 text-sm sm:text-base font-semibold">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Desconectado
                </span>
              )}

              {/* Risk Level */}
              {callInfo && (
                <div
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-bold text-sm sm:text-base"
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

            {/* Call Info */}
            {callInfo && (
              <div className="bg-slate-950/50 rounded-lg p-5 mb-6 border border-slate-800/50">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <span className="text-slate-500 block mb-2 text-sm">Llamante</span>
                    <span className="text-slate-200 font-mono font-semibold text-lg">{callInfo.caller_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-2 text-sm">Receptor</span>
                    <span className="text-slate-200 font-mono font-semibold text-lg">{callInfo.called_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-2 text-sm">Inicio</span>
                    <span className="text-slate-200 font-semibold text-lg">{formatDateTime(callInfo.start_time).time}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-2 text-sm">Duración</span>
                    <span className="text-slate-200 font-semibold text-lg">{formatDuration(callInfo.duration)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Waveform Visualization */}
            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide"></h3>
              <CallWaveform isActive={isConnected} riskLevel={currentRiskLevel} />
            </div>
          </div>

          {/* Right Column: Transcript */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                Transcripción
              </h3>
              {/* Live Badge */}
              <span className="inline-flex items-center gap-1.5 bg-red-600/20 text-red-400 px-3 py-1.5 rounded-lg border border-red-600/50 text-xs sm:text-sm font-bold">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                EN VIVO
              </span>
            </div>
            <div ref={transcriptContainerRef} className="bg-slate-950/50 rounded-lg p-3 sm:p-4 h-[calc(100vh-20rem)] overflow-y-auto space-y-3">
              {transcript.length === 0 ? (
                <div className="text-center py-8 text-slate-500 italic text-sm sm:text-base">
                  Esperando transcripción...
                </div>
              ) : (
                transcript.map((item, index) => {
                  if (item.role === 'user') {
                    /* USER - Left Side */
                    return (
                      <div key={index} className="flex justify-start">
                        <div className="max-w-[70%] bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-2.5">
                          <p className="text-slate-100 text-sm leading-relaxed">
                            {item.text}
                          </p>
                        </div>
                      </div>
                    );
                  } else {
                    /* ASSISTANT - Right Side - SafeLine */
                    const analysis = parseAnalysis(item.text);
                    const riskColors = getRiskLevelColor(analysis.riskLevel);

                    // Dynamic background and border based on risk level
                    const getBubbleStyle = (riskLevel) => {
                      const level = riskLevel.toUpperCase();
                      if (level.includes('CRÍTICO') || level.includes('CRITICAL')) {
                        return 'bg-gradient-to-br from-red-900/50 to-red-800/50 border-2 border-red-600/60 shadow-lg shadow-red-950/50';
                      }
                      if (level.includes('ALTO') || level.includes('HIGH')) {
                        return 'bg-gradient-to-br from-orange-900/50 to-orange-800/50 border-2 border-orange-600/60 shadow-lg shadow-orange-950/50';
                      }
                      if (level.includes('MEDIO') || level.includes('MEDIUM')) {
                        return 'bg-gradient-to-br from-yellow-900/50 to-yellow-800/50 border-2 border-yellow-600/60 shadow-lg shadow-yellow-950/50';
                      }
                      return 'bg-gradient-to-br from-emerald-900/50 to-teal-900/50 border-2 border-emerald-600/60 shadow-lg shadow-emerald-950/50';
                    };

                    return (
                      <div key={index} className="flex justify-end">
                        <div className={`max-w-[70%] ${getBubbleStyle(analysis.riskLevel)} rounded-2xl rounded-tr-sm px-3 py-2.5`}>
                          {/* SafeLine Header */}
                          <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-emerald-700/50">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">SafeLine</span>
                          </div>

                          <div className="space-y-2">
                            {/* Risk Level Badge */}
                            {analysis.riskLevel && (
                              <div className="flex items-center justify-between gap-2 bg-slate-900/40 rounded px-2 py-1.5 border border-slate-700/50">
                                <span className="text-xs text-emerald-200 font-semibold">Riesgo:</span>
                                <div className={`inline-flex items-center gap-1.5 ${riskColors.bg} ${riskColors.border} border px-2 py-0.5 rounded`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${riskColors.dot} animate-pulse`}></div>
                                  <span className={`font-bold text-xs ${riskColors.text}`}>
                                    {analysis.riskLevel}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Indicators - Only show if not "Ninguno detectado" */}
                            {analysis.indicators && !analysis.indicators.toLowerCase().includes('ninguno') && (
                              <div className="bg-slate-900/40 rounded px-2 py-1.5 border border-slate-700/50">
                                <span className="text-xs text-emerald-200 font-semibold block mb-1">Indicadores:</span>
                                <p className="text-slate-100 text-xs leading-relaxed">
                                  {analysis.indicators}
                                </p>
                              </div>
                            )}

                            {/* Recommendation */}
                            {analysis.recommendation && (
                              <div className="bg-blue-950/40 rounded px-2 py-1.5 border border-blue-600/40">
                                <span className="text-xs text-blue-200 font-semibold block mb-1">Recomendación:</span>
                                <p className="text-blue-100 text-xs leading-relaxed">
                                  {analysis.recommendation}
                                </p>
                              </div>
                            )}

                            {/* Explanation */}
                            {analysis.explanation && (
                              <div className="pt-1.5 border-t border-emerald-700/50">
                                <span className="text-xs text-emerald-200 font-semibold block mb-1">Explicación:</span>
                                <p className="text-slate-200 text-xs leading-relaxed">
                                  {analysis.explanation}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
