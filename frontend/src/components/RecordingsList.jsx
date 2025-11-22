import { useState, useEffect } from 'react';
import { recordingAPI } from '../services/api';
import { AlertTriangle, CheckCircle, Clock, Trash2, RefreshCw } from 'lucide-react';
import './RecordingsList.css';

export const RecordingsList = ({ newRecording, onScamDetected }) => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pollingRecordings, setPollingRecordings] = useState(new Set());

  const loadRecordings = async () => {
    try {
      const data = await recordingAPI.listRecordings(null, 20);
      setRecordings(data);
      setError(null);

      // Start polling for recordings that are still processing
      const processingIds = new Set(
        data
          .filter(r => r.status === 'processing' || r.status === 'transcribed')
          .map(r => r.id)
      );
      setPollingRecordings(processingIds);
    } catch (err) {
      console.error('Failed to load recordings:', err);
      setError('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecordings();
  }, [newRecording]);

  useEffect(() => {
    if (pollingRecordings.size === 0) return;

    const interval = setInterval(async () => {
      for (const recordingId of pollingRecordings) {
        try {
          const updated = await recordingAPI.getRecording(recordingId);

          if (updated.status === 'analyzed') {
            // Update the recording in the list
            setRecordings(prev =>
              prev.map(r => (r.id === recordingId ? updated : r))
            );

            // Remove from polling
            setPollingRecordings(prev => {
              const next = new Set(prev);
              next.delete(recordingId);
              return next;
            });

            // Trigger scam alert if high risk
            if (
              onScamDetected &&
              updated.scam_risk_level &&
              ['high', 'critical'].includes(updated.scam_risk_level)
            ) {
              onScamDetected(updated);
            }
          }
        } catch (err) {
          console.error(`Failed to poll recording ${recordingId}:`, err);
        }
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [pollingRecordings, onScamDetected]);

  const handleDelete = async (recordingId) => {
    if (!confirm('Are you sure you want to delete this recording?')) return;

    try {
      await recordingAPI.deleteRecording(recordingId);
      setRecordings(prev => prev.filter(r => r.id !== recordingId));
    } catch (err) {
      console.error('Failed to delete recording:', err);
      alert('Failed to delete recording');
    }
  };

  const getRiskBadge = (riskLevel) => {
    const badges = {
      critical: { color: '#c53030', icon: AlertTriangle, label: 'CRITICAL' },
      high: { color: '#dd6b20', icon: AlertTriangle, label: 'HIGH RISK' },
      medium: { color: '#d69e2e', icon: AlertTriangle, label: 'MEDIUM' },
      low: { color: '#38a169', icon: CheckCircle, label: 'LOW RISK' },
    };

    const badge = badges[riskLevel];
    if (!badge) return null;

    const Icon = badge.icon;
    return (
      <span className="risk-badge" style={{ backgroundColor: badge.color }}>
        <Icon size={16} />
        {badge.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      processing: { color: '#4299e1', label: 'Processing...' },
      transcribed: { color: '#805ad5', label: 'Analyzing...' },
      analyzed: { color: '#38a169', label: 'Complete' },
      failed: { color: '#e53e3e', label: 'Failed' },
    };

    const badge = badges[status] || badges.processing;
    return (
      <span className="status-badge" style={{ backgroundColor: badge.color }}>
        {status === 'processing' || status === 'transcribed' ? (
          <Clock size={14} className="spinning" />
        ) : null}
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="recordings-list">
        <div className="loading">Loading recordings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recordings-list">
        <div className="error">{error}</div>
        <button onClick={loadRecordings} className="btn btn-secondary">
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="recordings-list">
      <div className="list-header">
        <h2>Recent Recordings</h2>
        <button onClick={loadRecordings} className="btn-icon">
          <RefreshCw size={20} />
        </button>
      </div>

      {recordings.length === 0 ? (
        <div className="empty-state">
          <p>No recordings yet. Start by recording a conversation above.</p>
        </div>
      ) : (
        <div className="recordings-grid">
          {recordings.map(recording => (
            <div key={recording.id} className="recording-card">
              <div className="card-header">
                <div className="card-date">
                  {new Date(recording.created_at).toLocaleString()}
                </div>
                <button
                  onClick={() => handleDelete(recording.id)}
                  className="btn-icon btn-delete"
                  title="Delete recording"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="card-status">
                {getStatusBadge(recording.status)}
                {recording.scam_risk_level && getRiskBadge(recording.scam_risk_level)}
              </div>

              {recording.scam_confidence && (
                <div className="confidence-bar">
                  <div className="confidence-label">
                    Confidence: {(recording.scam_confidence * 100).toFixed(0)}%
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${recording.scam_confidence * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {recording.scam_indicators && recording.scam_indicators.length > 0 && (
                <div className="indicators">
                  <div className="indicators-label">Scam Indicators:</div>
                  <ul>
                    {recording.scam_indicators.slice(0, 3).map((indicator, idx) => (
                      <li key={idx}>{indicator}</li>
                    ))}
                  </ul>
                </div>
              )}

              {recording.transcript && (
                <div className="transcript-preview">
                  <div className="transcript-label">Transcript:</div>
                  <p>{recording.transcript.substring(0, 150)}...</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
