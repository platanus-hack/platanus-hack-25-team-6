import { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { authAPI } from '../services/api';

function VerificationCode({ phoneNumber, onVerify, onBack }) {
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = verificationCode.join('');
    if (code.length !== 6) return;

    setIsLoading(true);
    setError('');

    try {
      console.log('[VerificationCode] Verifying OTP:', { phoneNumber, code });
      const response = await authAPI.verifyOTP(phoneNumber, code);
      console.log('[VerificationCode] OTP verification success:', response);
      // Pass the full response data to onVerify (includes token, user_id, onboarding_completed)
      onVerify(response);
    } catch (err) {
      console.error('[VerificationCode] OTP verification failed:', err);
      console.error('[VerificationCode] Error response:', err.response?.data);
      setError(err.response?.data?.detail || 'Código inválido. Intenta nuevamente.');
      setVerificationCode(['', '', '', '', '', '']);
      document.getElementById('code-0')?.focus();
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
              <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg sm:rounded-xl">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
              </div>
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-white">SafeLine</span>
            </div>
          </div>
        </div>
      </header>

      {/* Verification Modal */}
      <main className="pt-16 sm:pt-20 md:pt-24 pb-8 px-3 sm:px-6 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md sm:max-w-lg">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 sm:p-8 md:p-12 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 sm:mb-3">Verificación de Identidad</h2>
              <p className="text-blue-100 text-sm sm:text-base">
                Hemos enviado un código seguro al +56 9 {phoneNumber}
              </p>
            </div>

            {/* Form Section */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 md:p-10">
              <label className="block text-slate-300 font-medium mb-3 sm:mb-4 text-sm sm:text-base">
                Código de 6 dígitos
              </label>

              <div className="flex gap-2 sm:gap-3 mb-6 sm:mb-8 justify-center">
                {verificationCode.map((digit, index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-10 h-12 sm:w-12 sm:h-14 md:w-14 md:h-16 bg-slate-950 border-2 border-slate-700 rounded-lg sm:rounded-xl text-white text-center text-lg sm:text-xl md:text-2xl font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={verificationCode.some(d => !d) || isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-6 py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base md:text-lg transition-all shadow-lg mb-4 sm:mb-6 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Validando...
                  </>
                ) : (
                  'Validar'
                )}
              </button>

              <button
                type="button"
                onClick={onBack}
                className="w-full text-slate-400 hover:text-white text-xs sm:text-sm transition-colors"
              >
                ¿Número equivocado? Volver atrás
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default VerificationCode;
