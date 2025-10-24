import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search, Edit2, Trash2, FileText, Download, Mail, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { InvoiceForm } from './InvoiceForm';

interface Invoice {
  id: string;
  client_id: string | null;
  occasional_client_id: string | null;
  invoice_number: string;
  issue_date: string;
  period: string | null;
  subtotal: number;
  iva: number;
  total: number;
  pdf_url: string | null;
  status: string;
  payment_date: string | null;
  notes: string | null;
  client_name?: string;
}

export function InvoicesView() {
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (profile?.tenant_id) {
      loadInvoices();
    }
  }, [profile]);

  const loadInvoices = async () => {
    if (!profile?.tenant_id) return;

    try {
      const { data: invoicesData, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('issue_date', { ascending: false });

      if (error) throw error;

      const invoicesWithClients = await Promise.all(
        (invoicesData || []).map(async (invoice) => {
          let clientName = 'Sin cliente';

          if (invoice.client_id) {
            const { data: client } = await supabase
              .from('clients')
              .select('name')
              .eq('id', invoice.client_id)
              .maybeSingle();
            if (client) clientName = client.name;
          } else if (invoice.occasional_client_id) {
            const { data: client } = await supabase
              .from('occasional_clients')
              .select('name')
              .eq('id', invoice.occasional_client_id)
              .maybeSingle();
            if (client) clientName = `${client.name} (Eventual)`;
          }

          return { ...invoice, client_name: clientName };
        })
      );

      setInvoices(invoicesWithClients);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta factura?')) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Error al eliminar la factura');
    }
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'cobrada',
          payment_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', invoice.id);

      if (error) throw error;

      await supabase.from('account_movements').insert({
        tenant_id: profile?.tenant_id,
        client_id: invoice.client_id,
        occasional_client_id: invoice.occasional_client_id,
        movement_date: new Date().toISOString().split('T')[0],
        type: 'pago',
        description: `Pago de factura ${invoice.invoice_number}`,
        debit: 0,
        credit: invoice.total,
        balance: 0,
        invoice_id: invoice.id,
      });

      loadInvoices();
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      alert('Error al marcar la factura como cobrada');
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.period?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && invoice.status === filterStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'emitida': return 'bg-blue-100 text-blue-800';
      case 'enviada': return 'bg-purple-100 text-purple-800';
      case 'cobrada': return 'bg-green-100 text-green-800';
      case 'vencida': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'emitida': return <FileText className="w-4 h-4" />;
      case 'enviada': return <Mail className="w-4 h-4" />;
      case 'cobrada': return <CheckCircle className="w-4 h-4" />;
      case 'vencida': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const totalFacturado = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalCobrado = filteredInvoices.filter(inv => inv.status === 'cobrada').reduce((sum, inv) => sum + inv.total, 0);
  const totalPendiente = filteredInvoices.filter(inv => inv.status !== 'cobrada').reduce((sum, inv) => sum + inv.total, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Facturación</h1>
          <p className="text-gray-600 mt-1">Registrá y gestioná tus facturas emitidas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
        >
          <Plus className="w-5 h-5" />
          Nueva Factura
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Facturado</p>
          <p className="text-2xl font-bold text-gray-900">${totalFacturado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Cobrado</p>
          <p className="text-2xl font-bold text-green-600">${totalCobrado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Pendiente de Cobro</p>
          <p className="text-2xl font-bold text-orange-600">${totalPendiente.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por número, cliente o período..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'emitida', 'enviada', 'cobrada', 'vencida'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === status
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'Todas' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredInvoices.map((invoice) => (
          <div
            key={invoice.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-gray-900">Factura {invoice.invoice_number}</h3>
                  <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                    {getStatusIcon(invoice.status)}
                    {invoice.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{invoice.client_name}</p>
                {invoice.period && (
                  <p className="text-sm text-gray-500">Período: {invoice.period}</p>
                )}
              </div>
              <div className="flex flex-col items-end">
                <p className="text-2xl font-bold text-purple-600">${invoice.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-gray-500">IVA: ${invoice.iva.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500">Fecha Emisión</p>
                <p className="font-medium">{new Date(invoice.issue_date).toLocaleDateString('es-AR')}</p>
              </div>
              {invoice.payment_date && (
                <div>
                  <p className="text-xs text-gray-500">Fecha Cobro</p>
                  <p className="font-medium">{new Date(invoice.payment_date).toLocaleDateString('es-AR')}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Subtotal</p>
                <p className="font-medium">${invoice.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            {invoice.notes && (
              <div className="mb-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">{invoice.notes}</p>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setEditingInvoice(invoice) || setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition"
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </button>
              {invoice.status !== 'cobrada' && (
                <button
                  onClick={() => handleMarkAsPaid(invoice)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition"
                >
                  <CheckCircle className="w-4 h-4" />
                  Marcar como Cobrada
                </button>
              )}
              {invoice.pdf_url && (
                <a
                  href={invoice.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                >
                  <Download className="w-4 h-4" />
                  Ver PDF
                </a>
              )}
              <button
                onClick={() => handleDelete(invoice.id)}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredInvoices.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {searchTerm ? 'No se encontraron facturas con ese criterio' : 'No hay facturas registradas'}
          </p>
        </div>
      )}

      {showForm && (
        <InvoiceForm
          invoice={editingInvoice}
          onClose={() => {
            setShowForm(false);
            setEditingInvoice(null);
            loadInvoices();
          }}
        />
      )}
    </div>
  );
}
