import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TrendingUp, AlertCircle, CheckCircle, Calendar, DollarSign } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  subscription_value: number;
  ipc_adjustment_period: string;
  last_value_update: string;
  next_value_update: string;
}

export function IPCView() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [ipcRate, setIpcRate] = useState<number>(0);
  const [customIpcRate, setCustomIpcRate] = useState<string>('');
  const [applyingAdjustment, setApplyingAdjustment] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.tenant_id) {
      loadClientsNeedingAdjustment();
      setDefaultIpcRate();
    }
  }, [profile]);

  const setDefaultIpcRate = () => {
    const currentMonth = new Date().getMonth();
    const monthlyRates = [25, 20, 13, 8.8, 4.2, 4.6, 4.0, 4.2, 3.5, 2.7, 2.4, 2.7];
    setIpcRate(monthlyRates[currentMonth]);
  };

  const loadClientsNeedingAdjustment = async () => {
    if (!profile?.tenant_id) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('status', 'activo')
        .not('next_value_update', 'is', null);

      if (error) throw error;

      const today = new Date();
      const needingAdjustment = (data || []).filter(client => {
        const nextUpdate = new Date(client.next_value_update);
        return nextUpdate <= today;
      });

      setClients(needingAdjustment);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateNewValue = (currentValue: number, ipcPercentage: number) => {
    return currentValue * (1 + ipcPercentage / 100);
  };

  const calculateNextUpdateDate = (lastUpdate: string, period: string) => {
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

  const handleApplyAdjustment = async (client: Client) => {
    if (!confirm(`¿Confirmar ajuste IPC del ${ipcRate}% para ${client.name}?`)) return;

    setApplyingAdjustment(client.id);

    try {
      const oldValue = client.subscription_value;
      const newValue = calculateNewValue(oldValue, ipcRate);
      const today = new Date().toISOString().split('T')[0];
      const nextUpdate = calculateNextUpdateDate(today, client.ipc_adjustment_period);

      await supabase
        .from('clients')
        .update({
          subscription_value: newValue,
          last_value_update: today,
          next_value_update: nextUpdate,
        })
        .eq('id', client.id);

      await supabase.from('value_adjustments').insert({
        tenant_id: profile?.tenant_id,
        client_id: client.id,
        adjustment_date: today,
        old_value: oldValue,
        new_value: newValue,
        ipc_percentage: ipcRate,
        notes: `Ajuste automático por IPC ${client.ipc_adjustment_period}`,
      });

      loadClientsNeedingAdjustment();
    } catch (error) {
      console.error('Error applying adjustment:', error);
      alert('Error al aplicar el ajuste');
    } finally {
      setApplyingAdjustment(null);
    }
  };

  const handleCustomIpcChange = () => {
    const rate = parseFloat(customIpcRate);
    if (!isNaN(rate) && rate >= 0) {
      setIpcRate(rate);
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Ajustes por IPC</h1>
        <p className="text-gray-600 mt-1">Ajustá los valores de abonos según el índice de inflación</p>
      </div>

      <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">IPC a Aplicar</h3>
            <p className="text-orange-100 mt-1">Ajustá el porcentaje según el período correspondiente</p>
          </div>
          <div className="text-right">
            <p className="text-5xl font-bold">{ipcRate.toFixed(2)}%</p>
          </div>
        </div>
        <div className="mt-4 flex gap-4">
          <input
            type="number"
            step="0.01"
            value={customIpcRate}
            onChange={(e) => setCustomIpcRate(e.target.value)}
            placeholder="Ingresá un % personalizado"
            className="flex-1 px-4 py-2 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-300"
          />
          <button
            onClick={handleCustomIpcChange}
            className="px-6 py-2 bg-white text-orange-600 rounded-lg font-medium hover:bg-orange-50 transition"
          >
            Aplicar
          </button>
        </div>
      </div>

      {clients.length > 0 ? (
        <>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-3" />
              <div>
                <p className="font-medium text-yellow-800">
                  {clients.length} cliente{clients.length > 1 ? 's necesitan' : ' necesita'} ajuste
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Los siguientes clientes tienen su fecha de ajuste vencida o próxima
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {clients.map((client) => {
              const newValue = calculateNewValue(client.subscription_value, ipcRate);
              const increase = newValue - client.subscription_value;

              return (
                <div
                  key={client.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{client.name}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Último ajuste: {new Date(client.last_value_update).toLocaleDateString('es-AR')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <AlertCircle className="w-4 h-4 text-orange-500" />
                          <span>Próximo: {new Date(client.next_value_update).toLocaleDateString('es-AR')}</span>
                        </div>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {client.ipc_adjustment_period}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Valor Actual</p>
                      <p className="text-xl font-bold text-gray-900">
                        ${client.subscription_value.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">IPC a Aplicar</p>
                      <p className="text-xl font-bold text-orange-600">{ipcRate.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Incremento</p>
                      <p className="text-xl font-bold text-green-600">
                        +${increase.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Nuevo Valor</p>
                      <p className="text-xl font-bold text-blue-600">
                        ${newValue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleApplyAdjustment(client)}
                    disabled={applyingAdjustment === client.id}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium disabled:opacity-50"
                  >
                    {applyingAdjustment === client.id ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Aplicando...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-5 h-5" />
                        Aplicar Ajuste
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Todo al día</h3>
          <p className="text-gray-500">
            No hay clientes que necesiten ajuste por IPC en este momento
          </p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Información sobre IPC</h3>
        <p className="text-sm text-blue-800">
          El sistema muestra los clientes cuya fecha de próximo ajuste ya venció o está próxima.
          Podés ajustar manualmente el porcentaje de IPC a aplicar según el período acumulado.
          Cada ajuste queda registrado en el historial del cliente.
        </p>
      </div>
    </div>
  );
}
