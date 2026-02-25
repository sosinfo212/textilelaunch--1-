import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { User, Phone, MapPin, Package, Filter, ChevronRight } from 'lucide-react';
import type { Order, CustomerInfo } from '../types';

type FilterMode = 'tout' | 'fournisseur' | 'produit';

interface ClientRow {
  key: string;
  customer: CustomerInfo;
  orders: Order[];
}

function getSupplier(order: Order, productSupplier?: string): string {
  return order.productSupplier || productSupplier || '';
}

export const ClientList: React.FC = () => {
  const { orders, products } = useStore();
  const [filterMode, setFilterMode] = useState<FilterMode>('tout');
  const [filterValue, setFilterValue] = useState<string>('');

  // Unique suppliers (from products + orders)
  const uniqueSuppliers = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => { if (p.supplier) set.add(p.supplier); });
    orders.forEach(o => { if (o.productSupplier) set.add(o.productSupplier); });
    return Array.from(set).sort();
  }, [products, orders]);

  // Products list for filter (current products + any from orders)
  const productOptions = useMemo(() => {
    const byId = new Map<string, string>();
    products.forEach(p => byId.set(p.id, p.name));
    orders.forEach(o => byId.set(o.productId, o.productName));
    return Array.from(byId.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, orders]);

  // Build unique clients (group orders by customer phone)
  const clientsRaw = useMemo(() => {
    const map = new Map<string, { customer: CustomerInfo; orders: Order[] }>();
    orders.forEach(order => {
      const key = `${order.customer.phone}|${order.customer.fullName}`.trim();
      const existing = map.get(key);
      const customer = order.customer;
      if (existing) {
        existing.orders.push(order);
      } else {
        map.set(key, { customer, orders: [order] });
      }
    });
    return Array.from(map.entries()).map(([key, { customer, orders: orderList }]) => ({
      key,
      customer,
      orders: orderList.sort((a, b) => b.createdAt - a.createdAt),
    }));
  }, [orders]);

  // Apply filter
  const clients = useMemo(() => {
    if (filterMode === 'tout') return clientsRaw;
    if (filterMode === 'fournisseur' && filterValue) {
      return clientsRaw.filter(c =>
        c.orders.some(o => getSupplier(o, products.find(p => p.id === o.productId)?.supplier) === filterValue)
      );
    }
    if (filterMode === 'produit' && filterValue) {
      return clientsRaw.filter(c => c.orders.some(o => o.productId === filterValue));
    }
    return clientsRaw;
  }, [clientsRaw, filterMode, filterValue, products]);

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="mt-1 text-sm text-gray-500">Liste des clients ayant passé commande, avec filtre par fournisseur ou produit.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Filter className="h-4 w-4 text-gray-500" />
            Filtre :
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setFilterMode('tout'); setFilterValue(''); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${filterMode === 'tout' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Tout
            </button>
            <button
              type="button"
              onClick={() => { setFilterMode('fournisseur'); setFilterValue(uniqueSuppliers[0] || ''); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${filterMode === 'fournisseur' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Fournisseur
            </button>
            <button
              type="button"
              onClick={() => { setFilterMode('produit'); setFilterValue(productOptions[0]?.id || ''); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${filterMode === 'produit' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Produit
            </button>
          </div>
          {filterMode === 'fournisseur' && (
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="block rounded-md border-gray-300 shadow-sm py-1.5 pl-3 pr-8 text-sm focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">Tous les fournisseurs</option>
              {uniqueSuppliers.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          {filterMode === 'produit' && (
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="block rounded-md border-gray-300 shadow-sm py-1.5 pl-3 pr-8 text-sm focus:ring-brand-500 focus:border-brand-500 min-w-[200px]"
            >
              <option value="">Tous les produits</option>
              {productOptions.map(({ id, name }) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Client list */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            {clients.length} client{clients.length !== 1 ? 's' : ''}
          </span>
        </div>
        <ul className="divide-y divide-gray-200">
          {clients.length === 0 ? (
            <li className="px-6 py-12 text-center text-gray-500">
              Aucun client trouvé.
            </li>
          ) : (
            clients.map((row) => (
              <li key={row.key} className="hover:bg-gray-50 transition-colors">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        <p className="text-sm font-semibold text-gray-900 truncate">{row.customer.fullName}</p>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800">
                          {row.orders.length} commande{row.orders.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {row.customer.phone}
                        </span>
                        {row.customer.city && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            {row.customer.city}
                            {row.customer.address ? `, ${row.customer.address}` : ''}
                          </span>
                        )}
                      </div>
                      {row.customer.address && !row.customer.city && (
                        <div className="mt-1 text-sm text-gray-500 flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {row.customer.address}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <div className="flex flex-wrap gap-1 max-w-xs justify-end">
                        {row.orders.slice(0, 3).map(o => (
                          <span key={o.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                            <Package className="h-3 w-3 mr-1" />
                            {o.productName}
                          </span>
                        ))}
                        {row.orders.length > 3 && (
                          <span className="text-xs text-gray-400">+{row.orders.length - 3}</span>
                        )}
                      </div>
                      <Link
                        to={`/orders/${row.orders[0].id}`}
                        className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-700"
                      >
                        Voir commande
                        <ChevronRight className="h-4 w-4 ml-0.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};
