import { Shield, CheckCircle } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Header */}
      <header className="fixed top-0 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg sm:rounded-xl">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
              </div>
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-white">SafeLine</span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-4 lg:gap-8">
              <a href="#inicio" className="text-slate-300 hover:text-white transition-colors text-sm lg:text-base">
                Inicio
              </a>
              <a href="#ingresar" className="text-slate-300 hover:text-white transition-colors text-sm lg:text-base">
                Ingresar
              </a>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 lg:px-6 py-2 lg:py-2.5 rounded-lg font-medium transition-colors text-sm lg:text-base whitespace-nowrap">
                Comenzar Ahora
              </button>
            </nav>

            {/* Mobile CTA */}
            <button className="md:hidden bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm whitespace-nowrap">
              Comenzar
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-16 sm:pt-20 md:pt-24 lg:pt-32 pb-8 sm:pb-12 md:pb-16 lg:pb-20 px-3 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-950/50 border border-blue-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-4 sm:mb-6 md:mb-8">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-blue-300 font-medium text-xs sm:text-sm">ACTIVO EN CHILE 🇨🇱</span>
          </div>

          {/* Main Title */}
          <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-3 sm:mb-4 md:mb-6 leading-tight px-1 sm:px-2">
            Tu Escudo Digital Contra{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 inline-block">
              Estafas
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-slate-400 mb-6 sm:mb-8 md:mb-10 lg:mb-12 max-w-4xl mx-auto leading-relaxed px-2 sm:px-4">
            SafeLine usa Inteligencia Artificial militar para analizar tus llamadas en tiempo real.
            Detecta fraudes antes de que ocurran.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-10 md:mb-12 lg:mb-16 px-2 sm:px-4 max-w-2xl mx-auto">
            <button className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 sm:px-6 md:px-8 py-3 sm:py-3.5 md:py-4 rounded-lg font-semibold text-sm sm:text-base md:text-lg transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 w-full sm:w-auto">
              Proteger mi Teléfono
            </button>
            <button className="bg-transparent border-2 border-slate-600 hover:border-slate-500 active:border-slate-400 text-white px-5 sm:px-6 md:px-8 py-3 sm:py-3.5 md:py-4 rounded-lg font-semibold text-sm sm:text-base md:text-lg transition-all w-full sm:w-auto">
              Ver Demo en Vivo
            </button>
          </div>

          {/* Features */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 justify-center items-center text-slate-300 text-xs sm:text-sm md:text-base px-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
              <span>Sin descargas extra</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
              <span>100% Privado</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
