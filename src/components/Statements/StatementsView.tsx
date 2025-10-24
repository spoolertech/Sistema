import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, TrendingUp, TrendingDown, DollarSign, FileText, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  type: 'regular' | 'occasional';
}

interface Movement {
  id: string;
  movement_date: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export function StatementsView() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (profile?.tenant_id) {
      loadClients();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedClient) {
      loadMovements();
    }
  }, [selectedClient]);

  const loadClients = async () => {
    if (!profile?.tenant_id) return;

    try {
      const [regularData, occasionalData] = await Promise.all([
        supabase.from('clients').select('id, name').eq('tenant_id', profile.tenant_id),
        supabase.from('occasional_clients').select('id, name').eq('tenant_id', profile.tenant_id),
      ]);

      const allClients: Client[] = [
        ...(regularData.data || []).map(c => ({ ...c, type: 'regular' as const })),
        ...(occasionalData.data || []).map(c => ({ ...c, type: 'occasional' as const })),
      ];

      setClients(allClients);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async () => {
    if (!profile?.tenant_id || !selectedClient) return;

    setLoading(true);

    try {
      const selectedClientData = clients.find(c => c.id === selectedClient);
      if (!selectedClientData) return;

      const query = supabase
        .from('account_movements')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('movement_date', { ascending: false });

      if (selectedClientData.type === 'regular') {
        query.eq('client_id', selectedClient);
      } else {
        query.eq('occasional_client_id', selectedClient);
      }

      const { data, error } = await query;

      if (error) throw error;

      let runningBalance = 0;
      const movementsWithBalance = (data || []).reverse().map(mov => {
        runningBalance += mov.debit - mov.credit;
        return {
          ...mov,
          balance: runningBalance,
        };
      });

      setMovements(movementsWithBalance.reverse());
    } catch (error) {
      console.error('Error loading movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentBalance = movements.length > 0 ? movements[0].balance : 0;
  const totalDebit = movements.reduce((sum, mov) => sum + mov.debit, 0);
  const totalCredit = movements.reduce((sum, mov) => sum + mov.credit, 0);

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'factura': return <ArrowUpCircle className="w-5 h-5 text-red-500" />;
      case 'pago': return <ArrowDownCircle className="w-5 h-5 text-green-500" />;
      case 'nota_credito': return <TrendingDown className="w-5 h-5 text-blue-500" />;
      case 'nota_debito': return <TrendingUp className="w-5 h-5 text-orange-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'factura': return 'text-red-600';
      case 'pago': return 'text-green-600';
      case 'nota_credito': return 'text-blue-600';
      case 'nota_debito': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Cuentas Corrientes</h1>
        <p className="text-gray-600 mt-1">Consultá el estado de cuenta de tus clientes</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Cliente</label>
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[300px]"
          >
            <option value="">Seleccionar...</option>
            {filteredClients.filter(c => c.type === 'regular').length > 0 && (
              <optgroup label="Clientes Abonados">
                {filteredClients.filter(c => c.type === 'regular').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
            )}
            {filteredClients.filter(c => c.type === 'occasional').length > 0 && (
              <optgroup label="Clientes Eventuales">
                {filteredClients.filter(c => c.type === 'occasional').map(c => (
                  <option key={c.id} value={c.id}>{c.name} (Eventual)</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      {selectedClient && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Saldo Actual</p>
                  <p className={`text-2xl font-bold ${currentBalance > 0 ? 'text-red-600' : currentBalance < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                    ${Math.abs(currentBalance).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {currentBalance > 0 ? 'A favor cliente' : currentBalance < 0 ? 'Debe' : 'Al día'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-50 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Facturado</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${totalDebit.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Cobrado</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${totalCredit.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Movimientos</p>
                  <p className="text-2xl font-bold text-gray-900">{movements.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debe</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Haber</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movements.map((movement) => (
                    <tr key={movement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(movement.movement_date).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getMovementIcon(movement.type)}
                          <span className={`text-sm font-medium ${getMovementColor(movement.type)}`}>
                            {movement.type.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{movement.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {movement.debit > 0 && (
                          <span className="text-red-600 font-medium">
                            ${movement.debit.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {movement.credit > 0 && (
                          <span className="text-green-600 font-medium">
                            ${movement.credit.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold">
                        <span className={movement.balance > 0 ? 'text-red-600' : movement.balance < 0 ? 'text-green-600' : 'text-gray-900'}>
                          ${Math.abs(movement.balance).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {movements.length === 0 && (
              <div className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay movimientos registrados para este cliente</p>
              </div>
            )}
          </div>
        </>
      )}

      {!selectedClient && !loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Seleccioná un cliente para ver su cuenta corriente</p>
        </div>
      )}
    </div>
  );
}
