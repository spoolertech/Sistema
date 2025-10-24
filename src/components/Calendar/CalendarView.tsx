import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Calendar as CalendarIcon, Clock, User, Phone, CheckCircle, X, Edit2, Trash2 } from 'lucide-react';

interface CalendarEvent {
  id: string;
  client_id: string | null;
  occasional_client_id: string | null;
  event_date: string;
  end_date: string;
  title: string;
  description: string | null;
  event_type: string;
  status: string;
  client_name?: string;
}

interface Client {
  id: string;
  name: string;
  type: 'regular' | 'occasional';
}

export function CalendarView() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState({
    client_id: '',
    client_type: 'regular',
    event_date: new Date().toISOString().slice(0, 16),
    end_date: '',
    title: '',
    description: '',
    event_type: 'visita',
    status: 'pendiente',
  });

  useEffect(() => {
    if (profile?.tenant_id) {
      loadEvents();
      loadClients();
    }
  }, [profile, selectedDate]);

  const loadEvents = async () => {
    if (!profile?.tenant_id) return;

    try {
      const startOfDay = `${selectedDate}T00:00:00`;
      const endOfDay = `${selectedDate}T23:59:59`;

      const { data: eventsData, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .gte('event_date', startOfDay)
        .lte('event_date', endOfDay)
        .order('event_date', { ascending: true });

      if (error) throw error;

      const eventsWithClients = await Promise.all(
        (eventsData || []).map(async (event) => {
          let clientName = 'Sin cliente';

          if (event.client_id) {
            const { data: client } = await supabase
              .from('clients')
              .select('name')
              .eq('id', event.client_id)
              .maybeSingle();
            if (client) clientName = client.name;
          } else if (event.occasional_client_id) {
            const { data: client } = await supabase
              .from('occasional_clients')
              .select('name')
              .eq('id', event.occasional_client_id)
              .maybeSingle();
            if (client) clientName = `${client.name} (Eventual)`;
          }

          return { ...event, client_name: clientName };
        })
      );

      setEvents(eventsWithClients);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    if (!profile?.tenant_id) return;

    const [regularData, occasionalData] = await Promise.all([
      supabase.from('clients').select('id, name').eq('tenant_id', profile.tenant_id),
      supabase.from('occasional_clients').select('id, name').eq('tenant_id', profile.tenant_id),
    ]);

    const allClients: Client[] = [
      ...(regularData.data || []).map(c => ({ ...c, type: 'regular' as const })),
      ...(occasionalData.data || []).map(c => ({ ...c, type: 'occasional' as const })),
    ];

    setClients(allClients);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;

    try {
      const endDate = formData.end_date || new Date(new Date(formData.event_date).getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);

      const eventData = {
        tenant_id: profile.tenant_id,
        client_id: formData.client_type === 'regular' ? formData.client_id : null,
        occasional_client_id: formData.client_type === 'occasional' ? formData.client_id : null,
        event_date: formData.event_date,
        end_date: endDate,
        title: formData.title,
        description: formData.description,
        event_type: formData.event_type,
        status: formData.status,
      };

      const { error } = await supabase.from('calendar_events').insert(eventData);
      if (error) throw error;

      setShowForm(false);
      setFormData({
        client_id: '',
        client_type: 'regular',
        event_date: new Date().toISOString().slice(0, 16),
        end_date: '',
        title: '',
        description: '',
        event_type: 'visita',
        status: 'pendiente',
      });
      loadEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Error al guardar el evento');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este evento?')) return;

    try {
      const { error } = await supabase.from('calendar_events').delete().eq('id', id);
      if (error) throw error;
      loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error al eliminar el evento');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('calendar_events').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      loadEvents();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'confirmado': return 'bg-blue-100 text-blue-800';
      case 'realizado': return 'bg-green-100 text-green-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'visita': return <User className="w-4 h-4" />;
      case 'llamada': return <Phone className="w-4 h-4" />;
      case 'reunion': return <CalendarIcon className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-600 mt-1">Organizá tus visitas, llamadas y reuniones</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition"
        >
          {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showForm ? 'Cancelar' : 'Nuevo Evento'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Fecha</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Nuevo Evento</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
                <select
                  value={formData.client_id}
                  onChange={(e) => {
                    const selectedClient = clients.find(c => c.id === e.target.value);
                    setFormData({
                      ...formData,
                      client_id: e.target.value,
                      client_type: selectedClient?.type || 'regular'
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">Sin cliente</option>
                  {clients.filter(c => c.type === 'regular').length > 0 && (
                    <optgroup label="Clientes Abonados">
                      {clients.filter(c => c.type === 'regular').map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {clients.filter(c => c.type === 'occasional').length > 0 && (
                    <optgroup label="Clientes Eventuales">
                      {clients.filter(c => c.type === 'occasional').map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ej: Visita técnica"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha y Hora Inicio *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha y Hora Fin</label>
                <input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="visita">Visita</option>
                  <option value="llamada">Llamada</option>
                  <option value="reunion">Reunión</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="realizado">Realizado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-medium"
            >
              Guardar Evento
            </button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">
          Eventos del {new Date(selectedDate).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </h3>

        {events.length > 0 ? (
          events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getTypeIcon(event.event_type)}
                    <h4 className="text-lg font-bold text-gray-900">{event.title}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                      {event.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{event.client_name}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Hora Inicio</p>
                  <p className="font-medium">{new Date(event.event_date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Hora Fin</p>
                  <p className="font-medium">{new Date(event.end_date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Tipo</p>
                  <p className="font-medium capitalize">{event.event_type}</p>
                </div>
              </div>

              {event.description && (
                <div className="mb-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">{event.description}</p>
                </div>
              )}

              <div className="flex gap-2">
                {event.status !== 'realizado' && (
                  <button
                    onClick={() => handleStatusChange(event.id, 'realizado')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Marcar Realizado
                  </button>
                )}
                {event.status === 'pendiente' && (
                  <button
                    onClick={() => handleStatusChange(event.id, 'confirmado')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                  >
                    Confirmar
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay eventos para esta fecha</p>
          </div>
        )}
      </div>
    </div>
  );
}
