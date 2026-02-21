import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { productsAPI, analyticsAPI } from '../src/utils/api';
import {
  BarChart2,
  MousePointer,
  ShoppingCart,
  Clock,
  ArrowLeft,
  MousePointerClick,
  Smartphone,
  Monitor,
  Calendar,
  TrendingUp,
  Percent,
  Zap,
} from 'lucide-react';

const PRESETS = [
  { id: '7', label: '7 jours' },
  { id: '30', label: '30 jours' },
  { id: '90', label: '90 jours' },
  { id: 'all', label: 'Tout' },
] as const;

function getDateRange(preset: string): { dateFrom: string; dateTo: string } | null {
  if (preset === 'all') return null;
  const n = parseInt(preset, 10);
  if (Number.isNaN(n) || n < 1) return null;
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - n + 1);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
  };
}

export const ProductAnalyticsPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { getProduct } = useStore();
  const [datePreset, setDatePreset] = useState<string>('30');
  const [analytics, setAnalytics] = useState<{
    uniqueClicks: number;
    totalOrders: number;
    totalTimeSpentSeconds: number;
    clickCount: number;
    deviceBreakdown?: Record<string, number>;
    browserBreakdown?: Record<string, number>;
  } | null>(null);
  const [timeSeries, setTimeSeries] = useState<
    { date: string; visitors: number; clicks: number; timeSpentSeconds: number; orders: number }[] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productName, setProductName] = useState<string>('');
  const product = productId ? getProduct(productId) : undefined;

  const range = useMemo(() => getDateRange(datePreset), [datePreset]);

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
    setTimeSeries(null);

    if (range) {
      productsAPI
        .getAnalytics(productId, { dateFrom: range.dateFrom, dateTo: range.dateTo })
        .then((res) => {
          if (cancelled) return;
          setAnalytics({
            uniqueClicks: res.analytics.uniqueClicks,
            totalOrders: res.analytics.totalOrders,
            totalTimeSpentSeconds:
              (res.analytics.totalTimeSpentSecondsFromEvents ?? res.analytics.totalTimeSpentSeconds) || 0,
            clickCount: res.analytics.clickCount ?? 0,
            deviceBreakdown: res.analytics.deviceBreakdown,
            browserBreakdown: res.analytics.browserBreakdown,
          });
          if (res.timeSeries?.length) setTimeSeries(res.timeSeries);
        })
        .catch((err) => {
          if (!cancelled) setError(err?.message || 'Erreur lors du chargement des statistiques.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      Promise.all([
        productsAPI.getAnalytics(productId),
        analyticsAPI.getSummary(productId).catch(() => ({ productId, clickCount: 0, totalTimeSpentSeconds: 0 })),
      ])
        .then(([res, summary]) => {
          if (cancelled) return;
          setAnalytics({
            uniqueClicks: res.analytics.uniqueClicks,
            totalOrders: res.analytics.totalOrders,
            totalTimeSpentSeconds:
              summary.totalTimeSpentSeconds > 0 ? summary.totalTimeSpentSeconds : res.analytics.totalTimeSpentSeconds,
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
    }
    return () => {
      cancelled = true;
    };
  }, [productId, range?.dateFrom, range?.dateTo]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds} s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s ? `${m} min ${s} s` : `${m} min`;
  };

  const formatShortDate = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}`;
  };

  const chartW = 280;
  const chartH = 120;
  const pad = { top: 8, right: 8, bottom: 24, left: 28 };
  const innerW = chartW - pad.left - pad.right;
  const innerH = chartH - pad.top - pad.bottom;

  function lineChartPath(values: number[], maxVal: number): string {
    if (!values.length || maxVal <= 0) return '';
    const pts = values.map((v, i) => {
      const x = pad.left + (i / Math.max(1, values.length - 1)) * innerW;
      const y = pad.top + innerH - (v / maxVal) * innerH;
      return `${x},${y}`;
    });
    return `M ${pts.join(' L ')}`;
  }

  const maxVisitors = timeSeries?.length
    ? Math.max(1, ...timeSeries.map((r) => r.visitors))
    : 1;
  const maxClicks = timeSeries?.length ? Math.max(1, ...timeSeries.map((r) => r.clicks)) : 1;
  const maxTime = timeSeries?.length ? Math.max(1, ...timeSeries.map((r) => r.timeSpentSeconds)) : 1;
  const maxOrders = timeSeries?.length ? Math.max(1, ...timeSeries.map((r) => r.orders)) : 1;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="inline-flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Retour
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-100 text-brand-600">
              <BarChart2 className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Statistiques de la landing page</h1>
              <p className="text-sm text-gray-500">{productName || product?.name || `Produit ${productId}`}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3">{error}</div>
      )}

      {!loading && !error && analytics && (
        <>
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
                  <p className="text-2xl font-bold text-gray-900">{formatDuration(analytics.totalTimeSpentSeconds)}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-400">Temps cumulé (onglet actif, Page Visibility)</p>
            </div>
          </div>

          {/* Extra KPIs: conversion, avg time, CTA per visitor */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                  <Percent className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Taux de conversion</p>
                  <p className="text-xl font-bold text-gray-900">
                    {analytics.uniqueClicks > 0
                      ? `${((100 * analytics.totalOrders) / analytics.uniqueClicks).toFixed(1)} %`
                      : '—'}
                  </p>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-400">Commandes / visiteurs uniques</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-sky-100 text-sky-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Temps moyen / visiteur</p>
                  <p className="text-xl font-bold text-gray-900">
                    {analytics.uniqueClicks > 0
                      ? formatDuration(Math.round(analytics.totalTimeSpentSeconds / analytics.uniqueClicks))
                      : '—'}
                  </p>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-400">Temps total ÷ visiteurs</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-fuchsia-100 text-fuchsia-600">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Clics CTA / visiteur</p>
                  <p className="text-xl font-bold text-gray-900">
                    {analytics.uniqueClicks > 0
                      ? (analytics.clickCount / analytics.uniqueClicks).toFixed(1)
                      : '—'}
                  </p>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-400">Engagement moyen</p>
            </div>
          </div>

          {timeSeries && timeSeries.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Évolution par jour
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <p className="text-sm font-medium text-gray-700 mb-2">Visiteurs uniques</p>
                  <div className="overflow-x-auto">
                    <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full min-w-[200px]" preserveAspectRatio="xMidYMid meet">
                      <path fill="none" stroke="rgb(59 130 246)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d={lineChartPath(timeSeries.map((r) => r.visitors), maxVisitors)} />
                      {timeSeries.map((r, i) => {
                        const x = pad.left + (i / Math.max(1, timeSeries.length - 1)) * innerW;
                        return (
                          <text key={r.date} x={x} y={chartH - 4} textAnchor="middle" className="text-[10px] fill-gray-500" style={{ fontFamily: 'system-ui' }}>{formatShortDate(r.date)}</text>
                        );
                      })}
                    </svg>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <p className="text-sm font-medium text-gray-700 mb-2">Clics CTA</p>
                  <div className="overflow-x-auto">
                    <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full min-w-[200px]" preserveAspectRatio="xMidYMid meet">
                      <path fill="none" stroke="rgb(139 92 246)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d={lineChartPath(timeSeries.map((r) => r.clicks), maxClicks)} />
                      {timeSeries.map((r, i) => {
                        const x = pad.left + (i / Math.max(1, timeSeries.length - 1)) * innerW;
                        return (
                          <text key={r.date} x={x} y={chartH - 4} textAnchor="middle" className="text-[10px] fill-gray-500" style={{ fontFamily: 'system-ui' }}>{formatShortDate(r.date)}</text>
                        );
                      })}
                    </svg>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <p className="text-sm font-medium text-gray-700 mb-2">Temps (s)</p>
                  <div className="overflow-x-auto">
                    <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full min-w-[200px]" preserveAspectRatio="xMidYMid meet">
                      <path fill="none" stroke="rgb(245 158 11)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d={lineChartPath(timeSeries.map((r) => r.timeSpentSeconds), maxTime)} />
                      {timeSeries.map((r, i) => {
                        const x = pad.left + (i / Math.max(1, timeSeries.length - 1)) * innerW;
                        return (
                          <text key={r.date} x={x} y={chartH - 4} textAnchor="middle" className="text-[10px] fill-gray-500" style={{ fontFamily: 'system-ui' }}>{formatShortDate(r.date)}</text>
                        );
                      })}
                    </svg>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <p className="text-sm font-medium text-gray-700 mb-2">Commandes</p>
                  <div className="overflow-x-auto">
                    <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full min-w-[200px]" preserveAspectRatio="xMidYMid meet">
                      <path fill="none" stroke="rgb(34 197 94)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d={lineChartPath(timeSeries.map((r) => r.orders), maxOrders)} />
                      {timeSeries.map((r, i) => {
                        const x = pad.left + (i / Math.max(1, timeSeries.length - 1)) * innerW;
                        return (
                          <text key={r.date} x={x} y={chartH - 4} textAnchor="middle" className="text-[10px] fill-gray-500" style={{ fontFamily: 'system-ui' }}>{formatShortDate(r.date)}</text>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(analytics.deviceBreakdown || analytics.browserBreakdown) && (
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
                            <span className="capitalize text-gray-600">
                              {device === 'iphone' ? 'iPhone' : device}
                            </span>
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

          {analytics.clickCount === 0 && analytics.totalTimeSpentSeconds === 0 && analytics.totalOrders > 0 && (
            <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              Clics et temps à 0 ? Sur le serveur, exécutez la migration :{' '}
              <code className="text-xs bg-amber-100 px-1 rounded">database/add-analytics-events-table.sql</code>,
              puis redéployez.
            </p>
          )}
        </>
      )}
    </div>
  );
};
