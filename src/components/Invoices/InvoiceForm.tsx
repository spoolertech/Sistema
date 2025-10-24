import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Plus, Trash2 } from 'lucide-react';

interface Invoice {
  id?: string;
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
}

interface InvoiceFormProps {
  invoice: Invoice | null;
  onClose: () => void;
}

interface Client {
  id: string;
  name: string;
  type: 'regular' | 'occasional';
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export function InvoiceForm({ invoice, onClose }: InvoiceFormProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0, total: 0 }
  ]);
  const [formData, setFormData] = useState({
    client_id: '',
    client_type: 'regular',
    invoice_number: '',
    issue_date: new Date().toISOString().split('T')[0],
    period: '',
    pdf_url: '',
    status: 'emitida',
    notes: '',
    iva_percentage: 21,
  });

  useEffect(() => {
    loadClients();
    if (invoice) {
      setFormData({
        client_id: invoice.client_id || invoice.occasional_client_id || '',
        client_type: invoice.client_id ? 'regular' : 'occasional',
        invoice_number: invoice.invoice_number,
        issue_date: invoice.issue_date,
        period: invoice.period || '',
        pdf_url: invoice.pdf_url || '',
        status: invoice.status,
        notes: invoice.notes || '',
        iva_percentage: invoice.subtotal > 0 ? (invoice.iva / invoice.subtotal) * 100 : 21,
      });
      loadInvoiceItems(invoice.id!);
    }
  }, [invoice]);

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

  const loadInvoiceItems = async (invoiceId: string) => {
    const { data } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId);

    if (data && data.length > 0) {
      setItems(data.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      })));
    }
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'quantity' || field === 'unit_price') {
      const qty = field === 'quantity' ? Number(value) : newItems[index].quantity;
      const price = field === 'unit_price' ? Number(value) : newItems[index].unit_price;
      newItems[index].total = qty * price;
    }

    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const iva = subtotal * (formData.iva_percentage / 100);
    const total = subtotal + iva;
    return { subtotal, iva, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;

    setLoading(true);

    try {
      const { subtotal, iva, total } = calculateTotals();

      const invoiceData = {
        tenant_id: profile.tenant_id,
        client_id: formData.client_type === 'regular' ? formData.client_id : null,
        occasional_client_id: formData.client_type === 'occasional' ? formData.client_id : null,
        invoice_number: formData.invoice_number,
        issue_date: formData.issue_date,
        period: formData.period,
        subtotal,
        iva,
        total,
        pdf_url: formData.pdf_url || null,
        status: formData.status,
        payment_date: null,
        notes: formData.notes,
      };

      let invoiceId: string;

      if (invoice?.id) {
        const { error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', invoice.id);
        if (error) throw error;
        invoiceId = invoice.id;

        await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
      } else {
        const { data, error } = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select()
          .single();
        if (error) throw error;
        invoiceId = data.id;
      }

      const itemsToInsert = items
        .filter(item => item.description.trim() !== '')
        .map(item => ({
          invoice_id: invoiceId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
        }));

      if (itemsToInsert.length > 0) {
        const { error } = await supabase.from('invoice_items').insert(itemsToInsert);
        if (error) throw error;
      }

      await supabase.from('account_movements').insert({
        tenant_id: profile.tenant_id,
        client_id: formData.client_type === 'regular' ? formData.client_id : null,
        occasional_client_id: formData.client_type === 'occasional' ? formData.client_id : null,
        movement_date: formData.issue_date,
        type: 'factura',
        description: `Factura ${formData.invoice_number}${formData.period ? ` - ${formData.period}` : ''}`,
        debit: total,
        credit: 0,
        balance: 0,
        invoice_id: invoiceId,
      });

      onClose();
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Error al guardar la factura');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, iva, total } = calculateTotals();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{invoice ? 'Editar Factura' : 'Nueva Factura'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Número de Factura *</label>
              <input
                type="text"
                required
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                placeholder="00001-00000001"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Emisión *</label>
              <input
                type="date"
                required
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Período Facturado</label>
              <input
                type="text"
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                placeholder="Diciembre 2024"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado *</label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="emitida">Emitida</option>
                <option value="enviada">Enviada</option>
                <option value="cobrada">Cobrada</option>
                <option value="vencida">Vencida</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">IVA (%)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.iva_percentage}
                onChange={(e) => setFormData({ ...formData, iva_percentage: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">URL del PDF</label>
              <input
                type="url"
                value={formData.pdf_url}
                onChange={(e) => setFormData({ ...formData, pdf_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notas / Observaciones</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Items de la Factura</h3>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition"
              >
                <Plus className="w-4 h-4" />
                Agregar Item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 items-start">
                  <div className="col-span-12 md:col-span-5">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="Descripción del servicio"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                      placeholder="Cant."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                      placeholder="Precio"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-3 md:col-span-2">
                    <input
                      type="text"
                      value={`$${item.total.toFixed(2)}`}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">IVA ({formData.iva_percentage}%):</span>
                <span className="font-medium">${iva.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                <span>Total:</span>
                <span className="text-purple-600">${total.toFixed(2)}</span>
              </div>
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
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Factura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
