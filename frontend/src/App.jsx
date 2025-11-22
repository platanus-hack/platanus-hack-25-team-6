import { useState, useEffect } from 'react';
import { AudioRecorder } from './components/AudioRecorder';
import { RecordingsList } from './components/RecordingsList';
import { useNotifications } from './hooks/useNotifications';
import { Shield, Bell, BellOff } from 'lucide-react';
import './App.css';

function App() {
  const [newRecording, setNewRecording] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
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
        recording.scam_risk_level,
        recording.scam_confidence,
        recording.scam_indicators
      );
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
              Record a conversation to automatically transcribe and analyze it for potential scam
              indicators using AI.
            </p>
          </div>

          <AudioRecorder onUploadComplete={handleUploadComplete} />

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
