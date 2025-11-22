import { useState, useEffect, useRef } from 'react';
import { AudioVisualizer } from './AudioVisualizer';
import './TwilioCallMonitor.css';

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
    <div className="twilio-monitor-container">
      <div className="monitor-header">
        <h2>📞 Monitor de Llamadas Twilio</h2>
        <div className="active-calls-count">
          {activeCalls.length} llamada{activeCalls.length !== 1 ? 's' : ''} activa{activeCalls.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="monitor-content">
        {/* Active Calls List */}
        <div className="calls-list">
          <h3>Llamadas Activas</h3>
          {activeCalls.length === 0 ? (
            <div className="no-calls">
              <p>No hay llamadas activas</p>
              <p className="hint">Las llamadas aparecerán aquí cuando alguien llame a tu número Twilio</p>
            </div>
          ) : (
            <div className="calls-grid">
              {activeCalls.map((call) => (
                <div
                  key={call.call_sid}
                  className={`call-card ${selectedCall === call.call_sid ? 'selected' : ''}`}
                  onClick={() => setSelectedCall(call.call_sid)}
                >
                  <div className="call-header">
                    <span className="call-status">🔴 EN VIVO</span>
                    <span
                      className="call-risk"
                      style={{ color: getRiskColor(call.current_risk_level) }}
                    >
                      {getRiskLabel(call.current_risk_level)}
                    </span>
                  </div>
                  <div className="call-info">
                    <div className="caller-number">
                      <strong>De:</strong> {call.caller_number}
                    </div>
                    <div className="called-number">
                      <strong>A:</strong> {call.called_number}
                    </div>
                    <div className="call-time">
                      <strong>Inicio:</strong> {formatDateTime(call.start_time).time}
                    </div>
                    <div className="call-duration">
                      <strong>Duración:</strong> {formatDuration(call.duration)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Call Monitor */}
        {selectedCall && (
          <div className="call-monitor">
            <div className="monitor-status">
              {isConnected ? (
                <span className="status-badge connected">
                  🟢 Conectado - Monitoreando llamada
                </span>
              ) : (
                <span className="status-badge disconnected">
                  🔴 Desconectado
                </span>
              )}
              {callInfo && (
                <div className="call-details">
                  <div className="call-metadata">
                    <span><strong>De:</strong> {callInfo.caller_number}</span>
                    <span><strong>A:</strong> {callInfo.called_number}</span>
                    <span><strong>Inicio:</strong> {formatDateTime(callInfo.start_time).date} {formatDateTime(callInfo.start_time).time}</span>
                    <span><strong>Duración:</strong> {formatDuration(callInfo.duration)}</span>
                  </div>
                  <span
                    className="risk-indicator"
                    style={{
                      backgroundColor: getRiskColor(currentRiskLevel),
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    Riesgo: {getRiskLabel(currentRiskLevel)}
                  </span>
                </div>
              )}
            </div>

            {/* Transcript */}
            <div className="monitor-transcript">
              <h3>Transcripción en Vivo</h3>
              <div className="transcript-content">
                {transcript.length === 0 ? (
                  <div className="no-transcript">
                    Esperando transcripción...
                  </div>
                ) : (
                  transcript.map((item, index) => (
                    <div key={index} className={`transcript-item ${item.role}`}>
                      <div className="item-header">
                        <span className="role-badge">
                          {item.role === 'user' ? '🎤 CONVERSACIÓN' : '🔍 ANÁLISIS DE RIESGO'}
                        </span>
                        <span className="timestamp">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="item-text">{item.text}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
