import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X } from 'lucide-react';

interface Service {
  id?: string;
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
}

interface ServiceFormProps {
  service: Service | null;
  onClose: () => void;
}

interface Client {
  id: string;
  name: string;
  type: 'regular' | 'occasional';
}

export function ServiceForm({ service, onClose }: ServiceFormProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState({
    client_id: '',
    client_type: 'regular',
    request_date: new Date().toISOString().split('T')[0],
    completion_date: '',
    description: '',
    service_type: 'remoto',
    status: 'pendiente',
    hours_spent: 0,
    value: 0,
    notes: '',
  });

  useEffect(() => {
    loadClients();
    if (service) {
      setFormData({
        client_id: service.client_id || service.occasional_client_id || '',
        client_type: service.client_id ? 'regular' : 'occasional',
        request_date: service.request_date,
        completion_date: service.completion_date || '',
        description: service.description,
        service_type: service.service_type || 'remoto',
        status: service.status,
        hours_spent: service.hours_spent,
        value: service.value,
        notes: service.notes || '',
      });
    }
  }, [service]);

  const loadClients = async () => {
    if (!profile?.tenant_id) return;

    const [regularData, occasionalData] = await Promise.all([
      supabase.from('clients').select('id, name').eq('tenant_id', profile.tenant_id).eq('status', 'activo'),
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

    setLoading(true);

    try {
      const dataToSave = {
        tenant_id: profile.tenant_id,
        client_id: formData.client_type === 'regular' ? formData.client_id : null,
        occasional_client_id: formData.client_type === 'occasional' ? formData.client_id : null,
        request_date: formData.request_date,
        completion_date: formData.completion_date || null,
        description: formData.description,
        service_type: formData.service_type,
        status: formData.status,
        hours_spent: parseFloat(formData.hours_spent.toString()),
        value: parseFloat(formData.value.toString()),
        notes: formData.notes,
      };

      if (service?.id) {
        const { error } = await supabase.from('services').update(dataToSave).eq('id', service.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('services').insert(dataToSave);
        if (error) throw error;
      }

      onClose();
    } catch (error) {
      console.error('Error saving service:', error);
      alert('Error al guardar el trabajo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{service ? 'Editar Trabajo' : 'Nuevo Trabajo'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Cliente *</label>
              <select
                required
                value={formData.client_id}
                onChange={(e) => {
                  const selectedClient = clients.find(c => c.id === e.target.value);
                  setFormData({
                    ...formData,
                    client_id: e.target.value,
                    client_type: selectedClient?.type || 'regular'
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Seleccionar cliente</option>
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
                      <option key={c.id} value={c.id}>{c.name} (Eventual)</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Solicitud *</label>
              <input
                type="date"
                required
                value={formData.request_date}
                onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Finalización</label>
              <input
                type="date"
                value={formData.completion_date}
                onChange={(e) => setFormData({ ...formData, completion_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Descripción del Servicio *</label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Servicio</label>
              <select
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="abono">Abono</option>
                <option value="eventual">Eventual</option>
                <option value="urgencia">Urgencia</option>
                <option value="remoto">Remoto</option>
                <option value="presencial">Presencial</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado *</label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En Proceso</option>
                <option value="terminado">Terminado</option>
                <option value="facturado">Facturado</option>
                <option value="cobrado">Cobrado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Horas Trabajadas</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.hours_spent}
                onChange={(e) => setFormData({ ...formData, hours_spent: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valor</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notas / Observaciones</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Trabajo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
