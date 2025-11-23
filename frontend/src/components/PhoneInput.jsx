import { useState } from 'react';
import { ArrowRight, Lock, Smartphone, Loader2, ArrowLeft } from 'lucide-react';
import { authAPI } from '../services/api';

function PhoneInput({ onSubmit, onBack }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (phoneNumber.length < 8) return;

    setIsLoading(true);
    setError('');

    try {
      await authAPI.sendOTP(phoneNumber);
      onSubmit(phoneNumber);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al enviar el código. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Header */}
      <header className="fixed top-0 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <img
                src="/project-logo.png"
                alt="SafeLine Logo"
                className="h-8 w-auto sm:h-10 md:h-12 rounded-lg"
              />
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-white">SafeLine</span>
            </div>
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm sm:text-base"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Volver</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Phone Input Modal */}
      <main className="pt-16 sm:pt-20 md:pt-24 pb-8 px-3 sm:px-6 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md sm:max-w-lg">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 sm:p-8 md:p-12 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-4 sm:mb-6 p-2">
                <img
                  src="/project-logo.png"
                  alt="SafeLine Logo"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 sm:mb-3">Acceso Seguro</h2>
              <p className="text-blue-100 text-sm sm:text-base">Tu seguridad comienza con tu número.</p>
            </div>

            {/* Form Section */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 md:p-10">
              <label className="block text-slate-300 font-medium mb-3 sm:mb-4 text-sm sm:text-base">
                Número de Celular
              </label>
              <div className="relative mb-4 sm:mb-6">
                <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg sm:rounded-xl p-3 sm:p-4 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                  <span className="text-slate-400 font-medium mr-2 sm:mr-3 text-sm sm:text-base">+56 9</span>
                  <input
                    type="tel"
                    placeholder="1234 5678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    className="flex-1 bg-transparent text-white outline-none placeholder-slate-600 text-sm sm:text-base"
                    autoFocus
                  />
                  <Smartphone className="w-5 h-5 text-slate-600" />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 mb-6 sm:mb-8">
                <Lock className="w-4 h-4" />
                <span>Código enviado vía WhatsApp</span>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={phoneNumber.length < 8 || isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-6 py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base md:text-lg transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar Código
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PhoneInput;
