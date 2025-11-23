import { X, Activity, Clock, Calendar, FileText, Cpu, MessageCircle } from 'lucide-react';

function CallDetail({ call, onClose }) {
  // Parse transcript string into structured messages
  const parseTranscript = (transcriptData) => {
    if (!transcriptData) return [];

    let transcriptString = '';

    // Handle array format
    if (Array.isArray(transcriptData)) {

      // Check if it's an array of objects with 'text' property
      if (transcriptData.length > 0 && transcriptData[0].text) {
        // Extract the text field from the first object
        transcriptString = transcriptData[0].text;
      }
      // Check if it's already properly formatted array with role/text
      else if (transcriptData.length > 0 && transcriptData[0].role) {
        return transcriptData;
      }
      else {
        return [];
      }
    } else {
      // It's a string
      transcriptString = String(transcriptData);
    }

    // Parse string format: [USER]: text [ASSISTANT]: text
    const messages = [];
    const regex = /\[(USER|ASSISTANT)\]:\s*([^[]*?)(?=\s*\[(?:USER|ASSISTANT)\]:|$)/gs;
    let match;

    while ((match = regex.exec(transcriptString)) !== null) {
      const role = match[1].toLowerCase();
      const text = match[2].trim();

      if (text) {
        messages.push({ role, text });
      }
    }

    return messages;
  };

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

  // Parse the transcript
  const transcript = parseTranscript(call.transcript);

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

          {/* Transcript - Chat Style */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-5 sm:p-6 mb-6 sm:mb-8">
            <div className="flex items-center gap-2 text-slate-400 font-semibold text-sm sm:text-base mb-4">
              <FileText className="w-5 h-5" />
              <h3>TRANSCRIPCIÓN DE AUDIO</h3>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 max-h-[500px] overflow-y-auto space-y-3">
              {transcript.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No hay transcripción disponible</p>
              ) : (
                transcript.map((message, index) => {
                  if (message.role === 'user') {
                    /* USER - Left Side */
                    return (
                      <div key={index} className="flex justify-start">
                        <div className="max-w-[70%] bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-2.5">
                          <p className="text-slate-100 text-sm leading-relaxed">
                            {message.text}
                          </p>
                        </div>
                      </div>
                    );
                  } else {
                    /* ASSISTANT - Right Side - SafeLine */
                    const analysis = parseAnalysis(message.text);
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
