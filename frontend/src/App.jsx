import { useState, useEffect } from 'react';
import { AudioRecorder } from './components/AudioRecorder';
import { RealtimeRecorder } from './components/RealtimeRecorder';
import { RecordingsList } from './components/RecordingsList';
import { useNotifications } from './hooks/useNotifications';
import { Shield, Bell, BellOff, Radio, Upload } from 'lucide-react';
import './App.css';

function App() {
  const [newRecording, setNewRecording] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [mode, setMode] = useState('realtime'); // 'realtime' or 'upload'
  const { isSupported, permission, requestPermission, showScamAlert } = useNotifications();

  useEffect(() => {
    setNotificationsEnabled(permission === 'granted');
  }, [permission]);

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    setNotificationsEnabled(granted);
  };

  const handleUploadComplete = (recording) => {
    setNewRecording(recording);
  };

  const handleScamDetected = (recording) => {
    if (notificationsEnabled) {
      showScamAlert(
        recording.scam_risk_level || recording.risk_level,
        recording.scam_confidence || 0.9,
        recording.scam_indicators || recording.indicators
      );
    }
  };

  const handleRealtimeScam = (analysis) => {
    if (notificationsEnabled) {
      showScamAlert(analysis.risk_level, 0.9, analysis.indicators);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <Shield size={32} />
            <h1>Call Interceptor</h1>
          </div>
          <div className="header-actions">
            {isSupported && (
              <button
                onClick={handleEnableNotifications}
                className={`notification-btn ${notificationsEnabled ? 'enabled' : ''}`}
                title={notificationsEnabled ? 'Notifications enabled' : 'Enable notifications'}
              >
                {notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
                <span>{notificationsEnabled ? 'Alerts On' : 'Enable Alerts'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          <div className="intro">
            <h2>Scam Call Detection POC</h2>
            <p>
              {mode === 'realtime'
                ? 'Monitor conversations in real-time with AI-powered scam detection'
                : 'Record and upload conversations for analysis'}
            </p>
          </div>

          <div className="mode-selector">
            <button
              onClick={() => setMode('realtime')}
              className={`mode-btn ${mode === 'realtime' ? 'active' : ''}`}
            >
              <Radio size={20} />
              <span>Live Monitoring</span>
            </button>
            <button
              onClick={() => setMode('upload')}
              className={`mode-btn ${mode === 'upload' ? 'active' : ''}`}
            >
              <Upload size={20} />
              <span>Upload & Analyze</span>
            </button>
          </div>

          {mode === 'realtime' ? (
            <RealtimeRecorder onScamDetected={handleRealtimeScam} />
          ) : (
            <AudioRecorder onUploadComplete={handleUploadComplete} />
          )}

          <RecordingsList newRecording={newRecording} onScamDetected={handleScamDetected} />
        </div>
      </main>

      <footer className="app-footer">
        <p>
          Powered by OpenAI Whisper for transcription and Anthropic Claude for scam detection
        </p>
      </footer>
    </div>
  );
}

export default App;
