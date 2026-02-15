import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { productsAPI, analyticsAPI } from '../src/utils/api';
import { BarChart2, MousePointer, ShoppingCart, Clock, ArrowLeft, MousePointerClick } from 'lucide-react';

export const ProductAnalyticsPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { getProduct } = useStore();
  const [analytics, setAnalytics] = useState<{
    uniqueClicks: number;
    totalOrders: number;
    totalTimeSpentSeconds: number;
    clickCount: number;
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
    </div>
  );
};
