import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { productsAPI, analyticsAPI } from '../src/utils/api';
import { BarChart2, MousePointer, ShoppingCart, Clock, ArrowLeft, MousePointerClick, Smartphone, Monitor } from 'lucide-react';

export const ProductAnalyticsPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { getProduct } = useStore();
  const [analytics, setAnalytics] = useState<{
    uniqueClicks: number;
    totalOrders: number;
    totalTimeSpentSeconds: number;
    clickCount: number;
    deviceBreakdown?: Record<string, number>;
    browserBreakdown?: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productName, setProductName] = useState<string>('');
  const product = productId ? getProduct(productId) : undefined;

  useEffect(() => {
    if (!productId) return;
    const name = product?.name;
    if (name) setProductName(name);
    else productsAPI.getById(productId).then((r) => r.product?.name && setProductName(r.product.name)).catch(() => {});
  }, [productId, product?.name]);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      productsAPI.getAnalytics(productId),
      analyticsAPI.getSummary(productId).catch(() => ({ productId, clickCount: 0, totalTimeSpentSeconds: 0 })),
    ])
      .then(([res, summary]) => {
        if (cancelled) return;
        setAnalytics({
          uniqueClicks: res.analytics.uniqueClicks,
          totalOrders: res.analytics.totalOrders,
          totalTimeSpentSeconds: summary.totalTimeSpentSeconds > 0 ? summary.totalTimeSpentSeconds : res.analytics.totalTimeSpentSeconds,
          clickCount: summary.clickCount ?? 0,
          deviceBreakdown: res.analytics.deviceBreakdown,
          browserBreakdown: res.analytics.browserBreakdown,
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Erreur lors du chargement des statistiques.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [productId]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds} s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s ? `${m} min ${s} s` : `${m} min`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Retour
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-brand-100 text-brand-600">
          <BarChart2 className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistiques de la landing page</h1>
          <p className="text-sm text-gray-500">{productName || product?.name || `Produit ${productId}`}</p>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3">
          {error}
        </div>
      )}

      {!loading && !error && analytics && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <MousePointer className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Visiteurs uniques</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.uniqueClicks}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400">Sessions uniques sur la page</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100 text-violet-600">
                <MousePointerClick className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Clics CTA</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.clickCount}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400">Clics sur boutons (ordre, quantité, etc.)</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Commandes</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalOrders}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400">Total des commandes pour ce produit</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Temps actif total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatDuration(analytics.totalTimeSpentSeconds)}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400">Temps cumulé (onglet actif, Page Visibility)</p>
          </div>
        </div>
      )}

      {!loading && !error && analytics && (analytics.deviceBreakdown || analytics.browserBreakdown) && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Tracking (appareil & navigateur)</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {analytics.deviceBreakdown && Object.keys(analytics.deviceBreakdown).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Smartphone className="h-5 w-5 text-gray-500" />
                  <p className="text-sm font-medium text-gray-700">Par appareil</p>
                </div>
                <ul className="space-y-2">
                  {Object.entries(analytics.deviceBreakdown)
                    .filter(([, n]) => n > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([device, count]) => (
                      <li key={device} className="flex justify-between text-sm">
                        <span className="capitalize text-gray-600">{device === 'iphone' ? 'iPhone' : device}</span>
                        <span className="font-medium text-gray-900">{count}</span>
                      </li>
                    ))}
                </ul>
                {Object.values(analytics.deviceBreakdown).every((n) => n === 0) && (
                  <p className="text-xs text-gray-400">Aucune donnée</p>
                )}
              </div>
            )}
            {analytics.browserBreakdown && Object.keys(analytics.browserBreakdown).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Monitor className="h-5 w-5 text-gray-500" />
                  <p className="text-sm font-medium text-gray-700">Par navigateur</p>
                </div>
                <ul className="space-y-2">
                  {Object.entries(analytics.browserBreakdown)
                    .filter(([, n]) => n > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([browser, count]) => (
                      <li key={browser} className="flex justify-between text-sm">
                        <span className="text-gray-600">{browser}</span>
                        <span className="font-medium text-gray-900">{count}</span>
                      </li>
                    ))}
                </ul>
                {Object.values(analytics.browserBreakdown).every((n) => n === 0) && (
                  <p className="text-xs text-gray-400">Aucune donnée</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !error && analytics && analytics.clickCount === 0 && analytics.totalTimeSpentSeconds === 0 && analytics.totalOrders > 0 && (
        <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          Clics et temps à 0 ? Sur le serveur, exécutez la migration : <code className="text-xs bg-amber-100 px-1 rounded">database/add-analytics-events-table.sql</code>, puis redéployez.
        </p>
      )}
    </div>
  );
};
