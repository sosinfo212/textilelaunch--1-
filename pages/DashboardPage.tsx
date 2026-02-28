import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../src/utils/currency';
import {
  BarChart3,
  TrendingUp,
  LayoutTemplate,
  Package,
  ChevronLeft,
  Calendar,
  Store,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { orders, products, templates } = useStore();
  const [dateRange] = useState('30 derniers jours');
  const [conversionFilter] = useState('Mensuel');
  const [salesFilter, setSalesFilter] = useState<'Privé' | 'Affilié'>('Privé');

  const totalOrders = orders.length;
  const totalSales = useMemo(() => orders.reduce((sum, o) => sum + o.productPrice, 0), [orders]);
  const lastThreeOrders = useMemo(
    () => [...orders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3),
    [orders]
  );

  const bestSelling = useMemo(() => {
    const byProduct: Record<string, { name: string; price: number; count: number; total: number }> = {};
    orders.forEach((o) => {
      const key = o.productId;
      if (!byProduct[key]) {
        byProduct[key] = { name: o.productName, price: o.productPrice, count: 0, total: 0 };
      }
      byProduct[key].count += 1;
      byProduct[key].total += o.productPrice;
    });
    return Object.values(byProduct).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [orders]);

  const privateLandingCount = templates.length;
  const affiliateLandingCount = 0;
  const totalLandingPages = privateLandingCount + affiliateLandingCount;
  const conversionPurchased = totalOrders;
  const conversionVisits = 0;
  const conversionRate = conversionVisits > 0 ? (conversionPurchased / conversionVisits) * 100 : 0;

  const statusLabel = (status: string) =>
    status === 'pending' ? 'En attente' : status === 'shipped' ? 'Expédié' : 'Terminé';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenue, {user?.name || 'Utilisateur'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Bon retour - Voici ce qui se passe dans votre compte.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-700"
        >
          <Calendar className="h-4 w-4" />
          {dateRange}
        </button>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Toutes les commandes */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Toutes les commandes</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{totalOrders}</p>
              <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <TrendingUp className="h-3 w-3" /> +0%
              </span>
            </div>
            <BarChart3 className="h-8 w-8 text-gray-400" />
          </div>
          <Link
            to="/orders"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Voir les détails
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Link>
        </div>

        {/* Ventes totales */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Ventes totales</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {formatPrice(totalSales, 'MAD')}
              </p>
              <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                +0%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4 text-gray-400" />
              <Store className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSalesFilter('Privé')}
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${salesFilter === 'Privé' ? 'text-orange-600' : 'text-gray-500'}`}
            >
              <span className={`w-2 h-2 rounded-full ${salesFilter === 'Privé' ? 'bg-orange-500' : 'bg-gray-300'}`} />
              Privé
            </button>
            <button
              type="button"
              onClick={() => setSalesFilter('Affilié')}
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${salesFilter === 'Affilié' ? 'text-orange-600' : 'text-gray-500'}`}
            >
              <span className={`w-2 h-2 rounded-full ${salesFilter === 'Affilié' ? 'bg-orange-500' : 'bg-gray-300'}`} />
              Affilié
            </button>
          </div>
          <div className="mt-3 h-12 flex items-end gap-0.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gray-200 min-h-[4px]"
                style={{ height: `${Math.max(10, 30 - i * 2)}%` }}
              />
            ))}
          </div>
        </div>

        {/* Taux de conversion */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">Taux de conversion</p>
            <select
              className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600"
              value={conversionFilter}
              readOnly
            >
              <option>Mensuel</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="3"
                  strokeDasharray={`${conversionRate}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-gray-500">Taux</span>
                <span className="text-sm font-bold text-green-600">+{conversionRate.toFixed(0)}%</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Visites
                </span>
                <span>{conversionVisits}</span>
                <span>100%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Acheté
                </span>
                <span>{conversionPurchased}</span>
                <span>{conversionVisits > 0 ? ((conversionPurchased / conversionVisits) * 100).toFixed(0) : 0}%</span>
              </div>
              <div className="pt-1 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                  <LayoutTemplate className="h-3 w-3" /> Landing pages
                </p>
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-900" /> Affilié
                  </span>
                  <span>{affiliateLandingCount}</span>
                  <span>{affiliateLandingCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-400" /> Privé
                  </span>
                  <span>{privateLandingCount}</span>
                  <span>{privateLandingCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pages de destination */}
      <div className="grid grid-cols-1 md:grid-cols-3">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pages de destination</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {totalLandingPages}/{products.length || 1}
              </p>
              <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <TrendingUp className="h-3 w-3" /> 0/0
              </span>
            </div>
            <Package className="h-8 w-8 text-green-500" />
          </div>
          <Link
            to="/templates"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Voir les détails
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Link>
        </div>
      </div>

      {/* Row 3: Best sellers + Last orders */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Produits les plus vendus */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Produits les plus vendus</h3>
            <select
              className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600"
              readOnly
            >
              <option>Mensuel</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500 font-medium">
                  <th className="pb-2 pr-2">Nom du produit</th>
                  <th className="pb-2 pr-2">Prix</th>
                  <th className="pb-2 pr-2">Ventes</th>
                  <th className="pb-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {bestSelling.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">
                      Aucun produit
                    </td>
                  </tr>
                ) : (
                  bestSelling.map((row) => (
                    <tr key={row.name} className="border-b border-gray-100">
                      <td className="py-2 pr-2 font-medium text-gray-900">{row.name}</td>
                      <td className="py-2 pr-2 text-gray-600">{formatPrice(row.price, 'MAD')}</td>
                      <td className="py-2 pr-2 text-gray-600">{row.count}</td>
                      <td className="py-2 text-gray-600">{formatPrice(row.total, 'MAD')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dernières 3 commandes */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Dernières 3 commandes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500 font-medium">
                  <th className="pb-2 pr-2">Numéro de commande</th>
                  <th className="pb-2 pr-2">Client</th>
                  <th className="pb-2 pr-2">Adresse</th>
                  <th className="pb-2 pr-2">Prix</th>
                  <th className="pb-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {lastThreeOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      Aucune commande récente
                    </td>
                  </tr>
                ) : (
                  lastThreeOrders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-100">
                      <td className="py-2 pr-2">
                        <Link to={`/orders/${order.id}`} className="font-medium text-brand-600 hover:underline">
                          {order.id.slice(0, 8)}…
                        </Link>
                      </td>
                      <td className="py-2 pr-2 text-gray-900">{order.customer.fullName}</td>
                      <td className="py-2 pr-2 text-gray-600 truncate max-w-[120px]" title={order.customer.address}>
                        {order.customer.city || order.customer.address || '—'}
                      </td>
                      <td className="py-2 pr-2 text-gray-600">{formatPrice(order.productPrice, 'MAD')}</td>
                      <td className="py-2">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            order.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'shipped'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {statusLabel(order.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
