import { useState } from 'react';
import { X, Download, Phone, Smartphone, Shield, CheckCircle, ArrowRight, Bell } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

function OnboardingFlow({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const { isInstallable, promptInstall } = usePWAInstall();

  const steps = [
    {
      id: 'vcard',
      title: 'Guarda el Contacto del Bot',
      component: VCardStep
    },
    {
      id: 'pwa',
      title: 'Instala la App',
      component: PWAStep
    },
    {
      id: 'explanation',
      title: 'Cómo Funciona SafeLine',
      component: ExplanationStep
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full relative overflow-hidden">
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
          aria-label="Saltar"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Progress indicator */}
        <div className="flex gap-2 p-4 bg-slate-950/50">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                index <= currentStep ? 'bg-gradient-to-r from-purple-500 to-pink-600' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="p-6 sm:p-8">
          <CurrentStepComponent onNext={handleNext} isInstallable={isInstallable} promptInstall={promptInstall} />
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center p-6 bg-slate-950/50 border-t border-slate-800">
          <span className="text-sm text-slate-400">
            Paso {currentStep + 1} de {steps.length}
          </span>
          <button
            onClick={handleSkip}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Saltar todo
          </button>
        </div>
      </div>
    </div>
  );
}

function VCardStep({ onNext }) {
  const handleDownloadVCard = () => {
    const vCard = `BEGIN:VCARD
VERSION:3.0
FN:# BOT
TEL;TYPE=WORK:+566009140389
END:VCARD`;

    const blob = new Blob([vCard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bot-contact.vcf';
    link.click();
    URL.revokeObjectURL(url);

    // Automatically go to next step after download
    setTimeout(onNext, 500);
  };

  return (
    <div className="text-center">
      {/* Icon */}
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
          <Phone className="w-10 h-10 text-white" />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-3xl font-bold text-white mb-3">
        Guarda el Contacto del Bot
      </h2>

      {/* Description */}
      <p className="text-slate-300 mb-8 text-lg">
        Agrega el bot a tus contactos para que puedas llamarlo fácilmente cuando necesites analizar una llamada sospechosa.
      </p>

      {/* Contact Info */}
      <div className="bg-slate-800 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="text-left">
            <p className="text-sm text-slate-400 mb-1">Nombre del Contacto</p>
            <p className="text-white font-bold text-xl"># BOT</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400 mb-1">Número</p>
            <p className="text-white font-bold text-xl">+56 600 914 0389</p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-8">
        <p className="text-blue-300 text-sm">
          💡 <strong>Tip:</strong> Una vez guardado, solo llama a este número durante una llamada sospechosa y el bot la analizará en tiempo real.
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onNext}
          className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
        >
          Omitir
        </button>
        <button
          onClick={handleDownloadVCard}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Descargar Contacto
        </button>
      </div>
    </div>
  );
}

function PWAStep({ onNext, isInstallable, promptInstall }) {
  const handleInstall = async () => {
    if (isInstallable && promptInstall) {
      await promptInstall();
    }
    onNext();
  };

  return (
    <div className="text-center">
      {/* Icon */}
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center">
          <Smartphone className="w-10 h-10 text-white" />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-3xl font-bold text-white mb-3">
        Instala SafeLine en tu Dispositivo
      </h2>

      {/* Description */}
      <p className="text-slate-300 mb-8 text-lg">
        Instala SafeLine como una aplicación nativa para acceder rápidamente y recibir notificaciones de llamadas sospechosas.
      </p>

      {/* Features */}
      <div className="space-y-4 mb-8">
        <div className="flex items-start gap-3 text-left bg-slate-800 rounded-lg p-4">
          <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white font-semibold">Acceso Rápido</p>
            <p className="text-slate-400 text-sm">Abre la app directamente desde tu pantalla de inicio</p>
          </div>
        </div>
        <div className="flex items-start gap-3 text-left bg-slate-800 rounded-lg p-4">
          <Bell className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white font-semibold">Notificaciones Push</p>
            <p className="text-slate-400 text-sm">Recibe alertas en tiempo real sobre llamadas analizadas</p>
          </div>
        </div>
        <div className="flex items-start gap-3 text-left bg-slate-800 rounded-lg p-4">
          <Shield className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white font-semibold">Funciona Offline</p>
            <p className="text-slate-400 text-sm">Consulta tu historial incluso sin conexión</p>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onNext}
          className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
        >
          Omitir
        </button>
        {isInstallable ? (
          <button
            onClick={handleInstall}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
          >
            <Smartphone className="w-5 h-5" />
            Instalar App
          </button>
        ) : (
          <button
            onClick={onNext}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
          >
            Continuar
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

function ExplanationStep({ onNext }) {
  return (
    <div className="text-center">
      {/* Icon */}
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
          <Shield className="w-10 h-10 text-white" />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-3xl font-bold text-white mb-3">
        ¿Cómo Funciona SafeLine?
      </h2>

      {/* Description */}
      <p className="text-slate-300 mb-8 text-lg">
        Protección inteligente contra fraudes telefónicos en 3 simples pasos
      </p>

      {/* Steps */}
      <div className="space-y-4 mb-8 text-left">
        <div className="bg-slate-800 rounded-xl p-5 border-l-4 border-purple-500">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-purple-400 font-bold text-lg">1</span>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-1">Recibe una Llamada Sospechosa</h3>
              <p className="text-slate-400">
                Cuando recibas una llamada que te parezca extraña o sospechosa, no cuelgues.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-5 border-l-4 border-blue-500">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-blue-400 font-bold text-lg">2</span>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-1">Llama al Bot</h3>
              <p className="text-slate-400">
                Durante la llamada, marca el número del bot (+56 600 914 0389) para crear una conferencia.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-5 border-l-4 border-green-500">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-green-400 font-bold text-lg">3</span>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-1">Análisis en Tiempo Real</h3>
              <p className="text-slate-400">
                Nuestra IA analiza la conversación en tiempo real y te alerta si detecta señales de fraude.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onNext}
        className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/30"
      >
        ¡Entendido, Comenzar!
        <CheckCircle className="w-6 h-6" />
      </button>
    </div>
  );
}

export default OnboardingFlow;
