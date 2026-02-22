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

  const chartW = 640;
  const chartH = 220;
  const pad = { top: 28, right: 12, bottom: 32, left: 40 };
  const innerW = chartW - pad.left - pad.right;
  const innerH = chartH - pad.top - pad.bottom;

  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);

  function lineChartPath(values: number[], maxVal: number): string {
    if (!values.length || maxVal <= 0) return '';
    const n = values.length;
    const pts = values.map((v, i) => {
      const x = pad.left + (n > 1 ? (i / (n - 1)) : 0.5) * innerW;
      const y = pad.top + innerH - (v / maxVal) * innerH;
      return `${x},${y}`;
    });
    return `M ${pts.join(' L ')}`;
  }

  function getPointX(index: number): number {
    const n = timeSeries?.length ?? 0;
    if (n <= 0) return pad.left;
    return pad.left + (n > 1 ? (index / (n - 1)) : 0.5) * innerW;
  }

  function getPointY(seriesIndex: number, pointIndex: number): number {
    const s = series[seriesIndex];
    if (!s || pointIndex < 0 || pointIndex >= s.values.length) return pad.top + innerH;
    const v = s.values[pointIndex];
    return pad.top + innerH - (v / s.max) * innerH;
  }

  const xAxisLabelIndices =
    timeSeries?.length &&
    (() => {
      const n = timeSeries.length;
      const maxLabels = 10;
      if (n <= 1) return [0];
      if (n <= maxLabels) return timeSeries.map((_, i) => i);
      return Array.from({ length: maxLabels }, (_, i) => Math.round((i * (n - 1)) / (maxLabels - 1)));
    })();

  const maxVisitors = timeSeries?.length ? Math.max(1, ...timeSeries.map((r) => r.visitors)) : 1;
  const maxClicks = timeSeries?.length ? Math.max(1, ...timeSeries.map((r) => r.clicks)) : 1;
  const maxTime = timeSeries?.length ? Math.max(1, ...timeSeries.map((r) => r.timeSpentSeconds)) : 1;
  const maxOrders = timeSeries?.length ? Math.max(1, ...timeSeries.map((r) => r.orders)) : 1;

  const series = timeSeries?.length
    ? [
        { key: 'visitors', values: timeSeries.map((r) => r.visitors), max: maxVisitors, color: 'rgb(59 130 246)', label: 'Visiteurs' },
        { key: 'clicks', values: timeSeries.map((r) => r.clicks), max: maxClicks, color: 'rgb(139 92 246)', label: 'Clics CTA' },
        { key: 'time', values: timeSeries.map((r) => r.timeSpentSeconds), max: maxTime, color: 'rgb(245 158 11)', label: 'Temps (s)' },
        { key: 'orders', values: timeSeries.map((r) => r.orders), max: maxOrders, color: 'rgb(34 197 94)', label: 'Commandes' },
      ]
    : [];

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
                      ? (() => {
                          const pct = (100 * analytics.totalOrders) / analytics.uniqueClicks;
                          if (pct > 100) return '100 %+';
                          return `${pct.toFixed(1)} %`;
                        })()
                      : '—'}
                  </p>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {analytics.uniqueClicks > 0 && analytics.totalOrders > analytics.uniqueClicks
                  ? `${analytics.totalOrders} cmd / ${analytics.uniqueClicks} visiteur(s)`
                  : 'Commandes / visiteurs uniques'}
              </p>
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
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative">
                {hoveredDayIndex != null && timeSeries[hoveredDayIndex] && (
                  <div className="absolute left-4 top-3 z-10 max-w-[360px] rounded border border-gray-200 bg-white/95 px-2.5 py-1.5 shadow-md backdrop-blur-sm">
                    <p className="text-[11px] font-medium text-gray-700 mb-1">{timeSeries[hoveredDayIndex].date}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-600">
                      <span>Vis. <strong className="text-gray-800">{timeSeries[hoveredDayIndex].visitors}</strong> ({maxVisitors > 0 ? Math.round((100 * timeSeries[hoveredDayIndex].visitors) / maxVisitors) : 0}%)</span>
                      <span>CTA <strong className="text-gray-800">{timeSeries[hoveredDayIndex].clicks}</strong> ({maxClicks > 0 ? Math.round((100 * timeSeries[hoveredDayIndex].clicks) / maxClicks) : 0}%)</span>
                      <span>Temps <strong className="text-gray-800">{timeSeries[hoveredDayIndex].timeSpentSeconds}s</strong> ({maxTime > 0 ? Math.round((100 * timeSeries[hoveredDayIndex].timeSpentSeconds) / maxTime) : 0}%)</span>
                      <span>Cmd <strong className="text-gray-800">{timeSeries[hoveredDayIndex].orders}</strong> ({maxOrders > 0 ? Math.round((100 * timeSeries[hoveredDayIndex].orders) / maxOrders) : 0}%)</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Y = % du max sur la période</p>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full min-w-[280px]" preserveAspectRatio="xMidYMid meet">
                    {/* Y-axis line */}
                    <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + innerH} stroke="#e5e7eb" strokeWidth="1" />
                    {/* Y-axis labels (0–100 relative scale) */}
                    {[0, 25, 50, 75, 100].map((pct) => {
                      const y = pad.top + innerH - (pct / 100) * innerH;
                      return (
                        <g key={pct}>
                          <line x1={pad.left} y1={y} x2={pad.left + innerW} y2={y} stroke="#f3f4f6" strokeWidth="1" strokeDasharray="2,2" />
                          <text x={pad.left - 6} y={y + 4} textAnchor="end" style={{ fontSize: 10, fill: '#6b7280', fontFamily: 'system-ui' }}>{pct}</text>
                        </g>
                      );
                    })}
                    {series.map((s) => (
                      <path key={s.key} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d={lineChartPath(s.values, s.max)} />
                    ))}
                    {/* Crosshairs and data points when hovering */}
                    {hoveredDayIndex != null && timeSeries[hoveredDayIndex] && (() => {
                      const x = getPointX(hoveredDayIndex);
                      return (
                        <g>
                          {/* Vertical crosshair */}
                          <line x1={x} y1={pad.top} x2={x} y2={pad.top + innerH} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,2" />
                          {/* Horizontal crosshairs (from Y-axis to each data point) + dots */}
                          {series.map((s, si) => {
                            const y = getPointY(si, hoveredDayIndex);
                            return (
                              <g key={s.key}>
                                <line x1={pad.left} y1={y} x2={x} y2={y} stroke={s.color} strokeWidth="1" strokeDasharray="2,2" opacity={0.7} />
                                <circle cx={x} cy={y} r={4} fill={s.color} stroke="white" strokeWidth={1.5} />
                              </g>
                            );
                          })}
                        </g>
                      );
                    })()}
                    {/* Invisible hover strips per day */}
                    {timeSeries.map((r, i) => {
                      const n = timeSeries.length;
                      const x = pad.left + (n > 1 ? (i / (n - 1)) : 0.5) * innerW;
                      const w = n > 1 ? Math.max(4, innerW / (n - 1) * 0.8) : innerW;
                      return (
                        <rect
                          key={r.date}
                          x={x - w / 2}
                          y={pad.top}
                          width={w}
                          height={innerH}
                          fill="transparent"
                          onMouseEnter={() => setHoveredDayIndex(i)}
                          onMouseLeave={() => setHoveredDayIndex(null)}
                        />
                      );
                    })}
                    {xAxisLabelIndices?.map((i) => {
                      const r = timeSeries[i];
                      if (!r) return null;
                      const n = timeSeries.length;
                      const x = pad.left + (n > 1 ? (i / (n - 1)) : 0.5) * innerW;
                      return (
                        <text key={r.date} x={x} y={chartH - 6} textAnchor="middle" style={{ fontSize: 11, fill: '#6b7280', fontFamily: 'system-ui' }}>{formatShortDate(r.date)}</text>
                      );
                    })}
                  </svg>
                </div>
                <p className="text-xs text-gray-400 mt-1 pl-1">Axe Y : 0–100 = % du max de chaque indicateur sur la période (ex. Cmd 1 à 25 = 1 commande = 25% du max). Survolez pour voir les valeurs.</p>
                <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-100 justify-center sm:justify-start">
                  {series.map((s) => (
                    <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                      <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </span>
                  ))}
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
