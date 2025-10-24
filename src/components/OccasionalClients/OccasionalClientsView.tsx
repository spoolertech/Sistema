import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { OccasionalClientForm } from './OccasionalClientForm';

interface OccasionalClient {
  id: string;
  client_number: string;
  name: string;
  cuit: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

export function OccasionalClientsView() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<OccasionalClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<OccasionalClient | null>(null);

  useEffect(() => {
    if (profile?.tenant_id) {
      loadClients();
    }
  }, [profile]);

  const loadClients = async () => {
    if (!profile?.tenant_id) return;

    try {
      const { data, error } = await supabase
        .from('occasional_clients')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('client_number', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este cliente eventual?')) return;

    try {
      const { error } = await supabase
        .from('occasional_clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Error al eliminar el cliente');
    }
  };

  const handleEdit = (client: OccasionalClient) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingClient(null);
    loadClients();
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.client_number.includes(searchTerm) ||
    client.cuit?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes Eventuales</h1>
          <p className="text-gray-600 mt-1">Gestioná tus clientes que contratan servicios por única vez</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          <Plus className="w-5 h-5" />
          Nuevo Cliente
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nombre, número o CUIT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">{client.name}</h3>
                <p className="text-sm text-gray-600">Nº {client.client_number}</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {client.cuit && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">CUIT:</span> {client.cuit}
                </p>
              )}
              {client.email && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Email:</span> {client.email}
                </p>
              )}
              {client.phone && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Tel:</span> {client.phone}
                </p>
              )}
              {client.notes && (
                <p className="text-sm text-gray-600 italic">
                  {client.notes}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(client)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition"
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={() => handleDelete(client.id)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">
            {searchTerm ? 'No se encontraron clientes con ese criterio' : 'No hay clientes eventuales registrados'}
          </p>
        </div>
      )}

      {showForm && (
        <OccasionalClientForm
          client={editingClient}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
