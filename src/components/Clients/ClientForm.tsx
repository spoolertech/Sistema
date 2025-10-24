import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X } from 'lucide-react';

interface Client {
  id: string;
  client_number: string;
  name: string;
  cuit: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  subscription_type: string | null;
  subscription_value: number;
  included_hours: number;
  consumed_hours: number;
  ipc_adjustment_period: string | null;
  last_value_update: string | null;
  next_value_update: string | null;
  notes: string | null;
}

interface ClientFormProps {
  client: Client | null;
  onClose: () => void;
}

export function ClientForm({ client, onClose }: ClientFormProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_number: '',
    name: '',
    cuit: '',
    email: '',
    phone: '',
    address: '',
    status: 'activo',
    subscription_type: 'mensual',
    subscription_value: 0,
    included_hours: 0,
    ipc_adjustment_period: 'trimestral',
    last_value_update: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    if (client) {
      setFormData({
        client_number: client.client_number,
        name: client.name,
        cuit: client.cuit || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        status: client.status,
        subscription_type: client.subscription_type || 'mensual',
        subscription_value: client.subscription_value,
        included_hours: client.included_hours,
        ipc_adjustment_period: client.ipc_adjustment_period || 'trimestral',
        last_value_update: client.last_value_update || new Date().toISOString().split('T')[0],
        notes: client.notes || '',
      });
    }
  }, [client]);

  const calculateNextUpdate = (lastUpdate: string, period: string) => {
    const date = new Date(lastUpdate);
    switch (period) {
      case 'trimestral':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'cuatrimestral':
        date.setMonth(date.getMonth() + 4);
        break;
      case 'semestral':
        date.setMonth(date.getMonth() + 6);
        break;
    }
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;

    setLoading(true);

    try {
      const nextUpdate = calculateNextUpdate(
        formData.last_value_update,
        formData.ipc_adjustment_period
      );

      const dataToSave = {
        ...formData,
        tenant_id: profile.tenant_id,
        next_value_update: nextUpdate,
        subscription_value: parseFloat(formData.subscription_value.toString()),
        included_hours: parseFloat(formData.included_hours.toString()),
      };

      if (client) {
        const { error } = await supabase
          .from('clients')
          .update(dataToSave)
          .eq('id', client.id);

        if (error) throw error;
      } else {
        const { data: lastClient } = await supabase
          .from('clients')
          .select('client_number')
          .eq('tenant_id', profile.tenant_id)
          .order('client_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextNumber = lastClient
          ? (parseInt(lastClient.client_number) + 1).toString().padStart(4, '0')
          : '0001';

        const { error } = await supabase
          .from('clients')
          .insert({
            ...dataToSave,
            client_number: nextNumber,
            consumed_hours: 0,
          });

        if (error) throw error;
      }

      onClose();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Error al guardar el cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {client ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre / Razón Social *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CUIT
              </label>
              <input
                type="text"
                value={formData.cuit}
                onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="moroso">Moroso</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Abono
              </label>
              <select
                value={formData.subscription_type}
                onChange={(e) => setFormData({ ...formData, subscription_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="mensual">Mensual</option>
                <option value="bimestral">Bimestral</option>
                <option value="trimestral">Trimestral</option>
                <option value="semestral">Semestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor del Abono *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.subscription_value}
                onChange={(e) => setFormData({ ...formData, subscription_value: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Horas Incluidas *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.5"
                value={formData.included_hours}
                onChange={(e) => setFormData({ ...formData, included_hours: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Período de Ajuste IPC
              </label>
              <select
                value={formData.ipc_adjustment_period}
                onChange={(e) => setFormData({ ...formData, ipc_adjustment_period: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="trimestral">Trimestral</option>
                <option value="cuatrimestral">Cuatrimestral</option>
                <option value="semestral">Semestral</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Última Actualización de Valor
              </label>
              <input
                type="date"
                value={formData.last_value_update}
                onChange={(e) => setFormData({ ...formData, last_value_update: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas / Observaciones
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
