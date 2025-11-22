import { useState } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { recordingAPI } from '../services/api';
import { Mic, Square, Pause, Play, Upload, Trash2 } from 'lucide-react';
import './AudioRecorder.css';

export const AudioRecorder = ({ onUploadComplete }) => {
  const {
    isRecording,
    isPaused,
    recordingTime,
    audioURL,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    getAudioBlob,
    clearRecording,
  } = useAudioRecorder();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUpload = async () => {
    const audioBlob = getAudioBlob();
    if (!audioBlob) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await recordingAPI.uploadRecording(audioBlob);
      console.log('Upload successful:', result);
      clearRecording();
      if (onUploadComplete) {
        onUploadComplete(result);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError('Failed to upload recording. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="audio-recorder">
      <div className="recorder-header">
        <h2>Voice Recorder</h2>
        {error && <div className="error-message">{error}</div>}
        {uploadError && <div className="error-message">{uploadError}</div>}
      </div>

      <div className="recorder-display">
        <div className="time-display">{formatTime(recordingTime)}</div>
        {isRecording && (
          <div className="recording-indicator">
            <div className="pulse-dot"></div>
            <span>{isPaused ? 'Paused' : 'Recording...'}</span>
          </div>
        )}
      </div>

      <div className="recorder-controls">
        {!isRecording && !audioURL && (
          <button onClick={startRecording} className="btn btn-primary btn-large">
            <Mic size={24} />
            <span>Start Recording</span>
          </button>
        )}

        {isRecording && (
          <>
            <button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="btn btn-secondary"
            >
              {isPaused ? <Play size={20} /> : <Pause size={20} />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
            <button onClick={stopRecording} className="btn btn-danger">
              <Square size={20} />
              <span>Stop</span>
            </button>
          </>
        )}

        {audioURL && !isRecording && (
          <>
            <audio src={audioURL} controls className="audio-player" />
            <div className="post-recording-controls">
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="btn btn-success"
              >
                <Upload size={20} />
                <span>{isUploading ? 'Uploading...' : 'Upload & Analyze'}</span>
              </button>
              <button onClick={clearRecording} className="btn btn-secondary">
                <Trash2 size={20} />
                <span>Discard</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
