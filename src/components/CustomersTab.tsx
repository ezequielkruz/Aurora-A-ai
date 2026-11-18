import { Edit3, Plus, Search, Trash2, UserPlus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AddCustomerInput } from '../hooks/useAuroraStore';
import type { CustomerStats, SalesChannel } from '../types/aurora';
import { formatBRL, formatDateBR, SALES_CHANNELS } from '../utils/auroraLogic';

interface CustomersTabProps {
  customerStats: CustomerStats[];
  onAddCustomer: (input: AddCustomerInput) => void;
  onUpdateCustomer: (customerId: string, input: AddCustomerInput) => void;
  onDeleteCustomer: (customerId: string) => void;
}

export function CustomersTab({
  customerStats,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
}: CustomersTabProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [channelFilter, setChannelFilter] = useState<'Todos' | SalesChannel>('Todos');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState<string>('');
  const [neighborhood, setNeighborhood] = useState<string>('');
  const [preferredChannel, setPreferredChannel] = useState<SalesChannel>('WhatsApp');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customerStats.filter((item) => {
      if (channelFilter !== 'Todos' && item.customer.preferredChannel !== channelFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.customer.name.toLowerCase().includes(q) ||
        item.customer.whatsapp.toLowerCase().includes(q) ||
        item.customer.neighborhood.toLowerCase().includes(q)
      );
    });
  }, [customerStats, searchQuery, channelFilter]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setWhatsapp('');
    setNeighborhood('');
    setPreferredChannel('WhatsApp');
    setNotes('');
    setFormError(null);
  };

  const handleStartEdit = (stat: CustomerStats) => {
    setEditingId(stat.customer.id);
    setName(stat.customer.name);
    setWhatsapp(stat.customer.whatsapp === '-' ? '' : stat.customer.whatsapp);
    setNeighborhood(stat.customer.neighborhood);
    setPreferredChannel(stat.customer.preferredChannel);
    setNotes(stat.customer.notes);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Informe o nome do cliente.');
      return;
    }

    const payload: AddCustomerInput = {
      name,
      whatsapp,
      neighborhood,
      preferredChannel,
      notes,
    };

    if (editingId) {
      onUpdateCustomer(editingId, payload);
    } else {
      onAddCustomer(payload);
    }
    resetForm();
  };

  return (
    <div
      className="aurora-page-bg space-y-6"
      style={{ backgroundColor: 'var(--aurora-page-bg)' }}
    >
      {/* Add / Edit Customer Form */}
      <section className="aurora-card rounded-xl border p-5 shadow-sm shadow-purple-950/5">
        <div className="aurora-divider flex items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-amber-600" />
            <h2 className="font-display text-base font-bold text-slate-900">
              {editingId ? 'Editar Cliente' : 'Novo Cadastro de Cliente'}
            </h2>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              <X className="h-3.5 w-3.5" />
              Cancelar edição
            </button>
          )}
        </div>

        {formError && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-800"
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="cust-name" className="block text-xs font-medium text-slate-700">
                Nome Completo
              </label>
              <input
                id="cust-name"
                type="text"
                placeholder="Ex: Camila Mendes"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#4A154B] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="cust-whatsapp"
                className="block text-xs font-medium text-slate-700"
              >
                WhatsApp / Telefone
              </label>
              <input
                id="cust-whatsapp"
                type="text"
                placeholder="(67) 99999-0000"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-[#4A154B] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="cust-neighborhood"
                className="block text-xs font-medium text-slate-700"
              >
                Endereço / Bairro
              </label>
              <input
                id="cust-neighborhood"
                type="text"
                placeholder="Ex: Centro, Rua 14 de Julho"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#4A154B] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="cust-channel"
                className="block text-xs font-medium text-slate-700"
              >
                Canal Preferido
              </label>
              <select
                id="cust-channel"
                value={preferredChannel}
                onChange={(e) => setPreferredChannel(e.target.value as SalesChannel)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#4A154B] focus:outline-none"
              >
                {SALES_CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex-1 min-w-[240px]">
              <label htmlFor="cust-notes" className="block text-xs font-medium text-slate-700">
                Observações
              </label>
              <input
                id="cust-notes"
                type="text"
                placeholder="Preferências de montagem, referência de entrega..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#4A154B] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-[#2E0B2F] shadow-xs transition-colors hover:bg-amber-400 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-600"
            >
              <Plus className="h-4 w-4" />
              <span>{editingId ? 'Salvar Alterações' : 'Cadastrar Cliente'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Customer List */}
      <section className="aurora-card rounded-xl border shadow-sm shadow-purple-950/5">
        <div className="aurora-divider flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Carteira de Clientes ({customerStats.length})
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Pedidos, total gasto e última compra calculados automaticamente pelo Fluxo de Caixa
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Filtrar clientes por canal preferido"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as 'Todos' | SalesChannel)}
              className="aurora-input rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-[#4A154B] focus:bg-white focus:outline-none"
            >
              <option value="Todos">Todos os Canais</option>
              {SALES_CHANNELS.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                aria-label="Buscar cliente"
                placeholder="Buscar nome, telefone ou bairro..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="aurora-input w-60 rounded-lg border py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#4A154B] focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left text-xs">
            <thead>
              <tr className="aurora-table-head border-b text-slate-600">
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">WhatsApp</th>
                <th className="px-4 py-3 font-semibold">Endereço / Bairro</th>
                <th className="px-4 py-3 font-semibold">Canal Preferido</th>
                <th className="px-4 py-3 text-right font-semibold">Qtd. Pedidos</th>
                <th className="px-4 py-3 text-right font-semibold">Total Gasto</th>
                <th className="px-4 py-3 font-semibold">Última Compra</th>
                <th className="px-4 py-3 font-semibold">Observações</th>
                <th className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-500">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((stat) => {
                  const { customer } = stat;
                  return (
                    <tr key={customer.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        {customer.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                        {customer.whatsapp}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{customer.neighborhood}</td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {customer.preferredChannel}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {stat.orderCount}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-[#4A154B] tabular-nums whitespace-nowrap">
                        {formatBRL(stat.totalSpent)}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                        {stat.lastPurchaseDate ? formatDateBR(stat.lastPurchaseDate) : 'Sem pedidos'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[200px]">
                        <span className="block truncate" title={customer.notes}>
                          {customer.notes || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(stat)}
                            aria-label={`Editar cliente ${customer.name}`}
                            className="rounded p-1.5 text-slate-500 hover:bg-[#F3E8F4] hover:text-[#4A154B]"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteCustomer(customer.id)}
                            aria-label={`Excluir cliente ${customer.name}`}
                            className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
