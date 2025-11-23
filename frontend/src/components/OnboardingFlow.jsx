import { useState } from 'react';
import { X, Download, Phone, Smartphone, Shield, CheckCircle, ArrowRight, Bell, Users, UserPlus, Trash2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import api from '../services/api';

function OnboardingFlow({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const { isInstallable, promptInstall } = usePWAInstall();

  const [trustedContacts, setTrustedContacts] = useState([]);

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
      id: 'contacts',
      title: 'Agrega Contactos Cercanos',
      component: TrustedContactsStep
    },
    {
      id: 'explanation',
      title: 'Cómo Funciona SafeLine',
      component: ExplanationStep
    }
  ];

  const handleNext = async () => {
    // If on contacts step and has contacts, save them
    if (steps[currentStep].id === 'contacts' && trustedContacts.length > 0) {
      try {
        await api.post('/trusted-contacts/bulk', {
          contacts: trustedContacts
        });
      } catch (error) {
        console.error('Error saving trusted contacts:', error);
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark onboarding as complete
      try {
        await api.post('/auth/complete-onboarding');
      } catch (error) {
        console.error('Error completing onboarding:', error);
      }
      onComplete();
    }
  };

  const handleSkip = async () => {
    try {
      await api.post('/auth/complete-onboarding');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
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
          <CurrentStepComponent
            onNext={handleNext}
            isInstallable={isInstallable}
            promptInstall={promptInstall}
            trustedContacts={trustedContacts}
            setTrustedContacts={setTrustedContacts}
          />
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

function TrustedContactsStep({ onNext, trustedContacts, setTrustedContacts }) {
  const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: '' });
  const [error, setError] = useState('');

  const handleAddContact = () => {
    setError('');

    // Validate
    if (!newContact.name.trim()) {
      setError('Por favor ingresa el nombre del contacto');
      return;
    }

    if (!newContact.phone.trim()) {
      setError('Por favor ingresa el teléfono del contacto');
      return;
    }

    // Normalize phone (remove spaces, dashes, etc.)
    let normalizedPhone = newContact.phone.replace(/\s|-|\(|\)/g, '');

    // Ensure it starts with 569
    if (normalizedPhone.startsWith('9')) {
      normalizedPhone = '56' + normalizedPhone;
    } else if (normalizedPhone.startsWith('569')) {
      // Already correct
    } else if (normalizedPhone.startsWith('+569')) {
      normalizedPhone = normalizedPhone.substring(1);
    } else if (normalizedPhone.startsWith('56') && normalizedPhone.length === 11) {
      // Already correct format
    } else {
      setError('El número debe ser un celular chileno válido (ej: 912345678)');
      return;
    }

    // Validate length (569XXXXXXXX = 11 digits)
    if (normalizedPhone.length !== 11) {
      setError('El número de celular debe tener 9 dígitos');
      return;
    }

    // Check for duplicates
    if (trustedContacts.some(c => c.phone === normalizedPhone)) {
      setError('Este contacto ya fue agregado');
      return;
    }

    setTrustedContacts([
      ...trustedContacts,
      {
        name: newContact.name.trim(),
        phone: normalizedPhone,
        relationship: newContact.relationship.trim() || undefined
      }
    ]);

    setNewContact({ name: '', phone: '', relationship: '' });
  };

  const handleRemoveContact = (index) => {
    setTrustedContacts(trustedContacts.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddContact();
    }
  };

  return (
    <div className="text-center">
      {/* Icon */}
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
          <Users className="w-10 h-10 text-white" />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-3xl font-bold text-white mb-3">
        Agrega Contactos Cercanos
      </h2>

      {/* Description */}
      <p className="text-slate-300 mb-6 text-lg">
        Si detectamos que un estafador se hace pasar por alguno de estos contactos, les enviaremos un WhatsApp para verificar si realmente son ellos.
      </p>

      {/* Info box */}
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6">
        <p className="text-orange-300 text-sm text-left">
          💡 <strong>Tip:</strong> Agrega familiares cercanos, tu banco, o instituciones que te contactan frecuentemente.
        </p>
      </div>

      {/* Add contact form */}
      <div className="bg-slate-800 rounded-xl p-5 mb-6">
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Nombre (ej: Mamá, Banco de Chile)"
            value={newContact.name}
            onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
            onKeyPress={handleKeyPress}
            className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <input
            type="tel"
            placeholder="Celular (ej: 912345678)"
            value={newContact.phone}
            onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
            onKeyPress={handleKeyPress}
            className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <input
            type="text"
            placeholder="Relación (opcional, ej: Madre, Banco)"
            value={newContact.relationship}
            onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
            onKeyPress={handleKeyPress}
            className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            onClick={handleAddContact}
            className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Agregar Contacto
          </button>
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
        </div>
      </div>

      {/* Contacts list */}
      {trustedContacts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-white font-semibold mb-3 text-left">
            Contactos Agregados ({trustedContacts.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {trustedContacts.map((contact, index) => (
              <div
                key={index}
                className="bg-slate-800 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="text-left flex-1">
                  <p className="text-white font-semibold">{contact.name}</p>
                  <p className="text-slate-400 text-sm">+{contact.phone}</p>
                  {contact.relationship && (
                    <p className="text-slate-500 text-xs">{contact.relationship}</p>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveContact(index)}
                  className="text-red-400 hover:text-red-300 transition-colors p-2"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onNext}
          className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
        >
          {trustedContacts.length > 0 ? 'Continuar' : 'Omitir'}
        </button>
        {trustedContacts.length > 0 && (
          <button
            onClick={onNext}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
          >
            Guardar y Continuar
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
