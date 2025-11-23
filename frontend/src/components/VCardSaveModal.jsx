import { X, Download, Phone } from 'lucide-react';

function VCardSaveModal({ onClose, onSave }) {
  const handleDownloadVCard = () => {
    // Create vCard content
    const vCard = `BEGIN:VCARD
VERSION:3.0
FN:#SafeLine
TEL;TYPE=WORK:+566009140389
END:VCARD`;

    // Create download link
    const blob = new Blob([vCard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bot-contact.vcf';
    link.click();

    // Clean up
    URL.revokeObjectURL(url);

    // Call onSave callback and close modal
    if (onSave) onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
            <Phone className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          ¡Contacto Creado!
        </h2>

        {/* Description */}
        <p className="text-slate-300 text-center mb-6">
          ¿Deseas guardar el contacto del bot en tu teléfono para futuras llamadas?
        </p>

        {/* Contact Info */}
        <div className="bg-slate-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Nombre</p>
              <p className="text-white font-medium">#SafeLine</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Teléfono</p>
              <p className="text-white font-medium">+56 600 914 0389</p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
          >
            No, gracias
          </button>
          <button
            onClick={handleDownloadVCard}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Descargar
          </button>
        </div>
      </div>
    </div>
  );
}

export default VCardSaveModal;
