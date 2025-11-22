import { useState } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { recordingAPI } from '../services/api';
import { Mic, Square, Pause, Play, Upload, Trash2 } from 'lucide-react';

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
    <div className="bg-white rounded-xl p-4 sm:p-6 md:p-8 shadow-lg mb-6 sm:mb-8">
      <div className="mb-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-3">Voice Recorder</h2>
        {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg mb-3 text-sm sm:text-base">{error}</div>}
        {uploadError && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg mb-3 text-sm sm:text-base">{uploadError}</div>}
      </div>

      <div className="text-center my-6 sm:my-8">
        <div className="text-4xl sm:text-5xl md:text-6xl font-bold font-mono text-gray-800 mb-3 sm:mb-4">{formatTime(recordingTime)}</div>
        {isRecording && (
          <div className="flex items-center justify-center gap-2 text-red-600 font-semibold text-sm sm:text-base">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
            <span>{isPaused ? 'Paused' : 'Recording...'}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 sm:gap-4">
        {!isRecording && !audioURL && (
          <button onClick={startRecording} className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white rounded-lg font-semibold text-base sm:text-lg hover:bg-blue-700 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed w-full sm:w-auto">
            <Mic size={24} className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>Start Recording</span>
          </button>
        )}

        {isRecording && (
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-600 text-white rounded-lg font-semibold text-sm sm:text-base hover:bg-gray-700 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPaused ? <Play size={20} className="w-4 h-4 sm:w-5 sm:h-5" /> : <Pause size={20} className="w-4 h-4 sm:w-5 sm:h-5" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
            <button onClick={stopRecording} className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-red-600 text-white rounded-lg font-semibold text-sm sm:text-base hover:bg-red-700 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
              <Square size={20} className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Stop</span>
            </button>
          </div>
        )}

        {audioURL && !isRecording && (
          <>
            <audio src={audioURL} controls className="w-full my-3 sm:my-4" />
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:max-w-md">
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg font-semibold text-sm sm:text-base hover:bg-green-700 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Upload size={20} className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{isUploading ? 'Uploading...' : 'Upload & Analyze'}</span>
              </button>
              <button onClick={clearRecording} className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-600 text-white rounded-lg font-semibold text-sm sm:text-base hover:bg-gray-700 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
                <Trash2 size={20} className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Discard</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
