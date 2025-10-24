import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users,
  UserCheck,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  FileText
} from 'lucide-react';

interface Stats {
  activeClients: number;
  occasionalClients: number;
  pendingServices: number;
  unpaidInvoices: number;
  monthlyRevenue: number;
  clientsNeedingAdjustment: number;
}

export function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({
    activeClients: 0,
    occasionalClients: 0,
    pendingServices: 0,
    unpaidInvoices: 0,
    monthlyRevenue: 0,
    clientsNeedingAdjustment: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.tenant_id) {
      loadStats();
    }
  }, [profile]);

  const loadStats = async () => {
    if (!profile?.tenant_id) return;

    try {
      const [
        clientsData,
        occasionalData,
        servicesData,
        invoicesData,
      ] = await Promise.all([
        supabase
          .from('clients')
          .select('*', { count: 'exact' })
          .eq('tenant_id', profile.tenant_id)
          .eq('status', 'activo'),
        supabase
          .from('occasional_clients')
          .select('*', { count: 'exact' })
          .eq('tenant_id', profile.tenant_id),
        supabase
          .from('services')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
          .in('status', ['pendiente', 'en_proceso']),
        supabase
          .from('invoices')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
          .in('status', ['emitida', 'enviada']),
      ]);

      const today = new Date();
      const clientsNeedingAdjustment = clientsData.data?.filter(client => {
        if (!client.next_value_update) return false;
        const nextUpdate = new Date(client.next_value_update);
        return nextUpdate <= today;
      }).length || 0;

      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const monthlyRevenue = invoicesData.data
        ?.filter(inv => {
          const invDate = new Date(inv.issue_date);
          return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
        })
        .reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

      setStats({
        activeClients: clientsData.count || 0,
        occasionalClients: occasionalData.count || 0,
        pendingServices: servicesData.data?.length || 0,
        unpaidInvoices: invoicesData.data?.length || 0,
        monthlyRevenue,
        clientsNeedingAdjustment,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Clientes Activos',
      value: stats.activeClients,
      icon: Users,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Clientes Eventuales',
      value: stats.occasionalClients,
      icon: UserCheck,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Trabajos Pendientes',
      value: stats.pendingServices,
      icon: Clock,
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Facturas Impagas',
      value: stats.unpaidInvoices,
      icon: AlertTriangle,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Facturación del Mes',
      value: `$${stats.monthlyRevenue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Ajustes IPC Pendientes',
      value: stats.clientsNeedingAdjustment,
      icon: TrendingUp,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Resumen general de tu negocio</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-8 h-8 ${stat.textColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {stats.clientsNeedingAdjustment > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3" />
            <div>
              <p className="font-medium text-yellow-800">
                {stats.clientsNeedingAdjustment} cliente{stats.clientsNeedingAdjustment > 1 ? 's necesitan' : ' necesita'} ajuste por IPC
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Revisá la sección de Ajustes IPC para actualizar los valores
              </p>
            </div>
          </div>
        </div>
      )}

      {stats.unpaidInvoices > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <div className="flex items-center">
            <FileText className="w-5 h-5 text-red-600 mr-3" />
            <div>
              <p className="font-medium text-red-800">
                Tenés {stats.unpaidInvoices} factura{stats.unpaidInvoices > 1 ? 's' : ''} pendiente{stats.unpaidInvoices > 1 ? 's' : ''} de cobro
              </p>
              <p className="text-sm text-red-700 mt-1">
                Revisá la sección de Cuentas Corrientes para hacer seguimiento
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Sistema de Gestión Completo</h3>
            <p className="text-blue-100 mt-1">
              Gestioná clientes, trabajos, facturación y más desde un solo lugar
            </p>
          </div>
          <CheckCircle className="w-12 h-12 text-blue-200" />
        </div>
      </div>
    </div>
  );
}
