import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, Phone, X, Save, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

function TrustedContacts() {
  const { getAuthHeader } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    relationship: ''
  });

  // Fetch contacts
  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/trusted-contacts/`, {
        headers: getAuthHeader()
      });

      if (!response.ok) {
        throw new Error('Error al cargar contactos');
      }

      const data = await response.json();
      setContacts(data);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();

    try {
      setError(null);
      const response = await fetch(`${API_BASE}/trusted-contacts/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al agregar contacto');
      }

      const newContact = await response.json();
      setContacts([...contacts, newContact]);
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error('Error adding contact:', err);
      setError(err.message);
    }
  };

  const handleUpdateContact = async (e) => {
    e.preventDefault();

    try {
      setError(null);
      const response = await fetch(`${API_BASE}/trusted-contacts/${editingContact.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al actualizar contacto');
      }

      const updatedContact = await response.json();
      setContacts(contacts.map(c => c.id === updatedContact.id ? updatedContact : c));
      setEditingContact(null);
      resetForm();
    } catch (err) {
      console.error('Error updating contact:', err);
      setError(err.message);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!confirm('¿Estás seguro de eliminar este contacto de confianza?')) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${API_BASE}/trusted-contacts/${contactId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });

      if (!response.ok) {
        throw new Error('Error al eliminar contacto');
      }

      setContacts(contacts.filter(c => c.id !== contactId));
    } catch (err) {
      console.error('Error deleting contact:', err);
      setError(err.message);
    }
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (contact) => {
    setFormData({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship || ''
    });
    setEditingContact(contact);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingContact(null);
    resetForm();
    setError(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      relationship: ''
    });
  };

  const formatPhoneNumber = (phone) => {
    // Format Chilean number: 569XXXXXXXX -> +56 9 XXXX XXXX
    if (phone.startsWith('569') && phone.length === 11) {
      return `+56 9 ${phone.slice(3, 7)} ${phone.slice(7)}`;
    }
    return phone;
  };

  // Calculate positions in circle for network graph
  const calculatePositions = () => {
    const positions = [];
    const centerX = 300;
    const centerY = 250;
    const radius = 180;

    contacts.forEach((contact, i) => {
      const angle = (i * 2 * Math.PI / contacts.length) - Math.PI / 2;
      positions.push({
        ...contact,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      });
    });

    return positions;
  };

  const positions = contacts.length > 0 ? calculatePositions() : [];

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600/20 p-2 rounded-lg">
            <Users className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Red de Protección</h2>
            <p className="text-sm text-slate-400 mt-1">
              {contacts.length} {contacts.length === 1 ? 'contacto conectado' : 'contactos conectados'}
            </p>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Agregar</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-600/20 border border-red-600/50 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando red...</p>
        </div>
      )}

      {/* Network Graph */}
      {!loading && contacts.length > 0 && (
        <div className="relative bg-slate-950/30 rounded-xl p-4">
          <svg width="100%" height="500" viewBox="0 0 600 500" className="overflow-visible">
            {/* Connection Lines */}
            {positions.map((pos, i) => (
              <line
                key={`line-${i}`}
                x1="300"
                y1="250"
                x2={pos.x}
                y2={pos.y}
                stroke="#a855f7"
                strokeWidth="2"
                opacity="0.3"
                strokeDasharray="5,5"
              />
            ))}

            {/* Center Node (You) */}
            <g>
              <circle
                cx="300"
                cy="250"
                r="50"
                fill="#7c3aed"
                opacity="0.2"
              />
              <circle
                cx="300"
                cy="250"
                r="35"
                fill="#1e293b"
                stroke="#a855f7"
                strokeWidth="3"
              />
              <text
                x="300"
                y="258"
                textAnchor="middle"
                fill="#e9d5ff"
                fontSize="18"
                fontWeight="bold"
              >
                TÚ
              </text>
            </g>

            {/* Contact Nodes */}
            {positions.map((pos, i) => (
              <g key={`node-${i}`}>
                {/* Node Circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="35"
                  fill="#1e293b"
                  stroke="#a855f7"
                  strokeWidth="2"
                />
                <text
                  x={pos.x}
                  y={pos.y + 6}
                  textAnchor="middle"
                  fill="#c084fc"
                  fontSize="13"
                  fontWeight="bold"
                >
                  {pos.name.split(' ')[0]}
                </text>
              </g>
            ))}
          </svg>

          {/* Contact Cards Below Graph */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-slate-900/50 border border-purple-600/20 rounded-lg p-3"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-purple-600/20 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-base font-bold text-purple-300">
                      {contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{contact.name}</h4>
                    <p className="text-xs text-slate-400">{formatPhoneNumber(contact.phone)}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(contact)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300"
                  >
                    <Edit2 className="w-3 h-3" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteContact(contact.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-800 hover:bg-red-600/20 rounded text-xs text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && contacts.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-400 mb-2">
            Tu red de protección está vacía
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            Agrega contactos de confianza para crear tu red de seguridad
          </p>
          <button
            onClick={openAddModal}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Crear mi red
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingContact ? 'Editar Contacto' : 'Agregar Contacto'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Error in Modal */}
            {error && (
              <div className="mb-4 bg-red-600/20 border border-red-600/50 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={editingContact ? handleUpdateContact : handleAddContact}>
              <div className="space-y-4">
                {/* Name Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: María González"
                    required
                    maxLength={100}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                {/* Phone Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="569XXXXXXXX"
                    required
                    pattern="^569\d{8}$"
                    title="Debe ser un número chileno válido (569XXXXXXXX)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <p className="text-xs text-slate-500 mt-1">Formato: 569XXXXXXXX</p>
                </div>

                {/* Relationship Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Relación (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    placeholder="Ej: Hija, Hijo, Sobrino, etc."
                    maxLength={50}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {editingContact ? 'Actualizar' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrustedContacts;
