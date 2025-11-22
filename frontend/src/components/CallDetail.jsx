import { X, Activity, Clock, Calendar, FileText, Cpu } from 'lucide-react';

function CallDetail({ call, onClose }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'FRAUDE':
        return 'bg-red-600 text-white';
      case 'SEGURA':
        return 'bg-green-600 text-white';
      case 'SOSPECHOSA':
        return 'bg-yellow-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  const getRiskColor = (risk) => {
    if (risk >= 70) return 'text-red-400';
    if (risk >= 40) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getHeaderColor = (status) => {
    switch (status) {
      case 'FRAUDE':
        return 'from-red-900 to-red-800';
      case 'SEGURA':
        return 'from-green-900 to-green-800';
      case 'SOSPECHOSA':
        return 'from-yellow-900 to-yellow-800';
      default:
        return 'from-slate-900 to-slate-800';
    }
  };

  const getIconBgColor = (status) => {
    switch (status) {
      case 'FRAUDE':
        return 'bg-red-800/50';
      case 'SEGURA':
        return 'bg-green-800/50';
      case 'SOSPECHOSA':
        return 'bg-yellow-800/50';
      default:
        return 'bg-slate-800/50';
    }
  };

  // Mock transcript data - replace with actual data
  const transcript = call.transcript || [
    { speaker: call.title, text: 'Hola hijo, ¿cómo estás?' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`bg-gradient-to-br ${getHeaderColor(call.status)} p-6 sm:p-8 relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            {/* Icon */}
            <div className={`${getIconBgColor(call.status)} p-4 sm:p-5 rounded-2xl border-2 ${
              call.status === 'FRAUDE' ? 'border-red-600' :
              call.status === 'SEGURA' ? 'border-green-600' :
              'border-yellow-600'
            }`}>
              <svg
                className="w-12 h-12 sm:w-16 sm:h-16 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M20.285 6.708l-8-5a1 1 0 00-1.07 0l-8 5A1 1 0 003 7.5v9a1 1 0 00.215.708l8 5a1 1 0 001.07 0l8-5A1 1 0 0021 16.5v-9a1 1 0 00-.215-.792zM12 18.5l-7-4.375V8.875l7 4.375v5.25zm0-7.25L5 6.875 12 2.5l7 4.375-7 4.375z" />
                {call.status === 'SEGURA' && (
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {call.title}
              </h2>
              <p className="text-lg text-white/80 mb-3 sm:mb-4">
                {call.phoneNumber || '+56 9 5555 0000'}
              </p>
              <span className={`inline-block px-4 py-2 rounded-lg font-bold text-sm ${getStatusColor(call.status)}`}>
                LLAMADA {call.status}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 sm:mb-8">
            {/* Risk */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-2 text-slate-400 text-xs sm:text-sm mb-2">
                <Activity className="w-4 h-4" />
                <span>RIESGO</span>
              </div>
              <div className={`text-3xl sm:text-4xl font-bold ${getRiskColor(call.risk)}`}>
                {call.risk}/100
              </div>
            </div>

            {/* Duration */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-2 text-slate-400 text-xs sm:text-sm mb-2">
                <Clock className="w-4 h-4" />
                <span>DURACIÓN</span>
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-white">
                {call.duration}
              </div>
            </div>

            {/* Date */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-2 text-slate-400 text-xs sm:text-sm mb-2">
                <Calendar className="w-4 h-4" />
                <span>FECHA</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white">
                {call.time}
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-5 sm:p-6 mb-6 sm:mb-8">
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm sm:text-base mb-3 sm:mb-4">
              <Cpu className="w-5 h-5" />
              <h3>ANÁLISIS DE INTELIGENCIA ARTIFICIAL</h3>
            </div>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              {call.analysis}
            </p>
          </div>

          {/* Transcript */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-5 sm:p-6 mb-6 sm:mb-8">
            <div className="flex items-center gap-2 text-slate-400 font-semibold text-sm sm:text-base mb-4">
              <FileText className="w-5 h-5" />
              <h3>TRANSCRIPCIÓN DE AUDIO</h3>
            </div>
            <div className="space-y-3">
              {transcript.map((line, index) => (
                <div
                  key={index}
                  className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 sm:p-4"
                >
                  <p className="text-slate-300 text-sm sm:text-base font-mono">
                    <span className="text-blue-400 font-semibold">{line.speaker}:</span>{' '}
                    {line.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 sm:py-4 rounded-xl font-semibold text-sm sm:text-base transition-all"
          >
            Cerrar Expediente
          </button>
        </div>
      </div>
    </div>
  );
}

export default CallDetail;
