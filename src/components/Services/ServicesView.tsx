import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search, Edit2, Trash2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { ServiceForm } from './ServiceForm';

interface Service {
  id: string;
  client_id: string | null;
  occasional_client_id: string | null;
  request_date: string;
  completion_date: string | null;
  description: string;
  service_type: string | null;
  status: string;
  hours_spent: number;
  value: number;
  notes: string | null;
  client_name?: string;
}

export function ServicesView() {
  const { profile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (profile?.tenant_id) {
      loadServices();
    }
  }, [profile]);

  const loadServices = async () => {
    if (!profile?.tenant_id) return;

    try {
      const { data: servicesData, error } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('request_date', { ascending: false });

      if (error) throw error;

      const servicesWithClients = await Promise.all(
        (servicesData || []).map(async (service) => {
          let clientName = 'Sin cliente';

          if (service.client_id) {
            const { data: client } = await supabase
              .from('clients')
              .select('name')
              .eq('id', service.client_id)
              .maybeSingle();
            if (client) clientName = client.name;
          } else if (service.occasional_client_id) {
            const { data: client } = await supabase
              .from('occasional_clients')
              .select('name')
              .eq('id', service.occasional_client_id)
              .maybeSingle();
            if (client) clientName = `${client.name} (Eventual)`;
          }

          return { ...service, client_name: clientName };
        })
      );

      setServices(servicesWithClients);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este trabajo?')) return;

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      alert('Error al eliminar el trabajo');
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch =
      service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.client_name?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && service.status === filterStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'en_proceso': return 'bg-blue-100 text-blue-800';
      case 'terminado': return 'bg-green-100 text-green-800';
      case 'facturado': return 'bg-purple-100 text-purple-800';
      case 'cobrado': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendiente': return <Clock className="w-4 h-4" />;
      case 'en_proceso': return <AlertCircle className="w-4 h-4" />;
      case 'terminado':
      case 'facturado':
      case 'cobrado': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trabajos y Servicios</h1>
          <p className="text-gray-600 mt-1">Registrá y seguí todos los trabajos realizados</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition"
        >
          <Plus className="w-5 h-5" />
          Nuevo Trabajo
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por descripción o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pendiente', 'en_proceso', 'terminado', 'facturado', 'cobrado'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === status
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'Todos' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredServices.map((service) => (
          <div
            key={service.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{service.description}</h3>
                  <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                    {getStatusIcon(service.status)}
                    {service.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{service.client_name}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingService(service) || setShowForm(true)}
                  className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Fecha Solicitud</p>
                <p className="font-medium">{new Date(service.request_date).toLocaleDateString('es-AR')}</p>
              </div>
              {service.completion_date && (
                <div>
                  <p className="text-xs text-gray-500">Fecha Finalización</p>
                  <p className="font-medium">{new Date(service.completion_date).toLocaleDateString('es-AR')}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Horas</p>
                <p className="font-medium">{service.hours_spent} hs</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Valor</p>
                <p className="font-bold text-orange-600">${service.value.toLocaleString('es-AR')}</p>
              </div>
            </div>

            {service.notes && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">{service.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">
            {searchTerm ? 'No se encontraron trabajos con ese criterio' : 'No hay trabajos registrados'}
          </p>
        </div>
      )}

      {showForm && (
        <ServiceForm
          service={editingService}
          onClose={() => {
            setShowForm(false);
            setEditingService(null);
            loadServices();
          }}
        />
      )}
    </div>
  );
}
