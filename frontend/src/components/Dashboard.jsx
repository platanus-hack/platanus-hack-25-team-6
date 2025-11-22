import { useState } from 'react';
import { Shield, Phone, AlertTriangle, Search, Filter } from 'lucide-react';
import CallDetail from './CallDetail';

function Dashboard({ onLogout }) {
  const [selectedCall, setSelectedCall] = useState(null);

  // Mock data - replace with actual API calls
  const calls = [
    {
      id: 1,
      title: 'Banco Falso',
      phoneNumber: '+56 9 8888 7777',
      time: 'Hoy, 14:30',
      duration: '2m 15s',
      status: 'FRAUDE',
      risk: 95,
      analysis: 'Solicitud urgente de claves web.',
      icon: 'alert',
      transcript: [
        { speaker: 'Banco Falso', text: 'Buenos días, llamamos del banco. Necesitamos que actualice sus claves.' },
        { speaker: 'Usuario', text: '¿De qué banco?' },
        { speaker: 'Banco Falso', text: 'Del Banco de Chile. Es urgente, su cuenta está bloqueada.' },
      ],
    },
    {
      id: 2,
      title: 'Mamá',
      phoneNumber: '+56 9 5555 0000',
      time: 'Hoy, 10:15',
      duration: '15m 00s',
      status: 'SEGURA',
      risk: 5,
      analysis: 'Conversación familiar normal.',
      icon: 'safe',
      transcript: [
        { speaker: 'Mamá', text: 'Hola hijo, ¿cómo estás?' },
        { speaker: 'Usuario', text: 'Bien mamá, ¿y tú?' },
        { speaker: 'Mamá', text: 'Todo bien. ¿Vas a venir a almorzar el domingo?' },
      ],
    },
    {
      id: 3,
      title: '+56 2 2333 4444',
      phoneNumber: '+56 2 2333 4444',
      time: 'Ayer, 18:45',
      duration: '1m 20s',
      status: 'SOSPECHOSA',
      risk: 60,
      analysis: 'Oferta de plan telefónico agresiva.',
      icon: 'warning',
      transcript: [
        { speaker: '+56 2 2333 4444', text: 'Buenas tardes, tenemos una oferta especial de telefonía.' },
        { speaker: 'Usuario', text: 'No me interesa.' },
        { speaker: '+56 2 2333 4444', text: 'Espere, es una oferta única, solo por hoy.' },
      ],
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'FRAUDE':
        return 'bg-red-600/20 text-red-400 border border-red-600/50';
      case 'SEGURA':
        return 'bg-green-600/20 text-green-400 border border-green-600/50';
      case 'SOSPECHOSA':
        return 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/50';
      default:
        return 'bg-slate-600/20 text-slate-400 border border-slate-600/50';
    }
  };

  const getRiskColor = (risk) => {
    if (risk >= 70) return 'text-red-400';
    if (risk >= 40) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getIcon = (iconType) => {
    switch (iconType) {
      case 'alert':
        return (
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-600/20 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-red-500" />
          </div>
        );
      case 'safe':
        return (
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-600/20 rounded-full flex items-center justify-center">
            <Phone className="w-6 h-6 sm:w-7 sm:h-7 text-green-500" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-yellow-600/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-500" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl">
                <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-white">SafeLine</span>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-4 sm:gap-6">
              <button
                onClick={onLogout}
                className="bg-transparent border border-red-600/50 hover:bg-red-600/20 text-red-400 px-4 sm:px-6 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Registro de Interceptaciones
          </h1>
          <div className="flex items-center gap-3">
            <button className="p-2 sm:p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
              <Search className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300" />
            </button>
            <button className="p-2 sm:p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
              <Filter className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300" />
            </button>
          </div>
        </div>

        {/* Calls List */}
        <div className="space-y-4 sm:space-y-5">
          {calls.map((call) => (
            <div
              key={call.id}
              onClick={() => setSelectedCall(call)}
              className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-slate-700 hover:bg-slate-900/70 transition-all cursor-pointer"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0">{getIcon(call.icon)}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">
                        {call.title}
                      </h3>
                      <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-400">
                        <span>{call.time}</span>
                        <span>|</span>
                        <span>{call.duration}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-col items-start sm:items-end gap-2">
                      <span
                        className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg font-bold text-xs sm:text-sm ${getStatusColor(
                          call.status
                        )}`}
                      >
                        {call.status}
                      </span>
                      <span className="text-xs sm:text-sm text-slate-400">
                        Riesgo:{' '}
                        <span className={`font-bold ${getRiskColor(call.risk)}`}>
                          {call.risk}%
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* AI Analysis */}
                  <div className="bg-slate-950/50 rounded-lg p-3 sm:p-4">
                    <h4 className="text-blue-400 font-semibold text-xs sm:text-sm mb-1 sm:mb-2">
                      ANÁLISIS IA:
                    </h4>
                    <p className="text-slate-300 text-sm sm:text-base">{call.analysis}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State (shown when no calls) */}
        {calls.length === 0 && (
          <div className="text-center py-12 sm:py-16">
            <Shield className="w-16 h-16 sm:w-20 sm:h-20 text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-slate-400 mb-2">
              No hay llamadas interceptadas
            </h3>
            <p className="text-sm sm:text-base text-slate-500">
              Las llamadas analizadas aparecerán aquí
            </p>
          </div>
        )}
      </main>

      {/* Call Detail Modal */}
      {selectedCall && (
        <CallDetail call={selectedCall} onClose={() => setSelectedCall(null)} />
      )}
    </div>
  );
}

export default Dashboard;
