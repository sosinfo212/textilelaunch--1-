import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../src/utils/currency';
import { scraperAPI, settingsAPI } from '../src/utils/api';
import { ExternalLink, Edit2, Tag, Box, Truck, Trash2, BarChart2, Plus, Scissors, X, RefreshCw, Filter } from 'lucide-react';
import { Product } from '../types';

export const SellerDashboard: React.FC = () => {
  const { products, categories, deleteProduct, deleteProducts, refreshData, loading } = useStore();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filterName, setFilterName] = useState('');
  const [filterPriceMin, setFilterPriceMin] = useState<string>('');
  const [filterPriceMax, setFilterPriceMax] = useState<string>('');
  const [filterSupplier, setFilterSupplier] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');

  const [scrapModalOpen, setScrapModalOpen] = useState(false);
  const [scrapUrl, setScrapUrl] = useState('');
  const [scrapEmail, setScrapEmail] = useState('');
  const [scrapPassword, setScrapPassword] = useState('');
  const [scrapApiKey, setScrapApiKey] = useState('');
  const [scrapOutput, setScrapOutput] = useState('');
  const [scrapRunning, setScrapRunning] = useState(false);
  const scrapAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrapModalOpen && !scrapApiKey) {
      settingsAPI.getApiKey().then((r) => {
        if (r.apiKey) setScrapApiKey(r.apiKey);
      }).catch(() => {});
    }
  }, [scrapModalOpen, scrapApiKey]);

  const uniqueSuppliers = useMemo(() => 
    Array.from(new Set(products.map((p: Product) => p.supplier).filter(Boolean) as string[])).sort(),
    [products]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((p: Product) => {
      const nameMatch = !filterName.trim() || p.name.toLowerCase().includes(filterName.trim().toLowerCase());
      const price = p.price ?? 0;
      const minOk = filterPriceMin === '' || price >= Number(filterPriceMin);
      const maxOk = filterPriceMax === '' || price <= Number(filterPriceMax);
      const supplierMatch = !filterSupplier || (p.supplier || '') === filterSupplier;
      const categoryMatch = !filterCategory || (p.category || '') === filterCategory;
      return nameMatch && minOk && maxOk && supplierMatch && categoryMatch;
    });
  }, [products, filterName, filterPriceMin, filterPriceMax, filterSupplier, filterCategory]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${name}" ? Cette action est irréversible.`)) {
      try {
        await deleteProduct(id);
      } catch (error) {
        alert('Erreur lors de la suppression du produit');
        console.error(error);
      }
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const visibleIds = new Set(filteredProducts.map(p => p.id));
    if (visibleIds.size > 0 && selectedIds.size === visibleIds.size && [...visibleIds].every(id => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Supprimer ${selectedIds.size} produit(s) ? Cette action est irréversible.`)) return;
    setBulkDeleting(true);
    try {
      await deleteProducts(Array.from(selectedIds));
      setSelectedIds(new Set());
    } catch (error) {
      alert('Erreur lors de la suppression des produits');
      console.error(error);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleScrapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrapUrl.trim()) {
      alert('URL requise');
      return;
    }
    if (!scrapEmail.trim()) {
      alert('Email requis');
      return;
    }
    scrapAbortRef.current = new AbortController();
    setScrapRunning(true);
    setScrapOutput('');
    try {
      await scraperAPI.run(
        {
          url: scrapUrl.trim(),
          email: scrapEmail.trim(),
          password: scrapPassword,
          apiKey: scrapApiKey.trim() || undefined,
        },
        (chunk) => setScrapOutput((prev) => prev + chunk),
        scrapAbortRef.current.signal
      );
    } catch (err: any) {
      const msg = err?.message || String(err);
      const isAbort = msg.includes('abort') || err?.name === 'AbortError';
      setScrapOutput((prev) => prev + (isAbort ? '\n[Annulé]' : '\n[Erreur: ' + msg + ']'));
    } finally {
      setScrapRunning(false);
      scrapAbortRef.current = null;
    }
  };

  const handleScrapCancel = () => {
    if (scrapRunning && scrapAbortRef.current) {
      scrapAbortRef.current.abort();
    }
    setScrapModalOpen(false);
  };

  return (
    <div className="flex gap-6">
      {/* Sidebar filters */}
      <aside className={`flex-shrink-0 w-64 transition-all overflow-hidden ${sidebarOpen ? '' : 'w-0 opacity-0'}`}>
        <div className="w-64 space-y-4 pr-4 border-r border-gray-200 min-h-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres
            </h2>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 text-gray-500 hover:text-gray-700 rounded lg:hidden"
              aria-label="Fermer le filtre"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nom</label>
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Rechercher..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Prix min</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={filterPriceMin}
                  onChange={(e) => setFilterPriceMin(e.target.value)}
                  placeholder="Min"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Prix max</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={filterPriceMax}
                  onChange={(e) => setFilterPriceMax(e.target.value)}
                  placeholder="Max"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fournisseur</label>
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="">Tous</option>
                {uniqueSuppliers.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Catégorie</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="">Toutes</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setFilterName('');
                setFilterPriceMin('');
                setFilterPriceMax('');
                setFilterSupplier('');
                setFilterCategory('');
              }}
              className="w-full py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 space-y-6">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {!sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              title="Ouvrir les filtres"
            >
              <Filter className="h-4 w-4" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vos Produits</h1>
            <p className="mt-1 text-sm text-gray-500">Gérez votre catalogue et accédez aux landing pages.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            title="Rafraîchir la liste"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Rafraîchir
          </button>
          <button
            type="button"
            onClick={() => setScrapModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
          >
            <Scissors className="h-4 w-4" />
            Scrap
          </button>
          <Link
            to="/add-product"
            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
          >
            <Plus className="h-4 w-4" />
            Créer un produit
          </Link>
        {filteredProducts.length > 0 && (
          <>
            <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.has(p.id))}
                onChange={selectAll}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              Tout sélectionner
            </label>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={selectedIds.size === 0 || bulkDeleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-700 text-sm font-medium rounded-md bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4" />
              {bulkDeleting ? 'Suppression...' : `Supprimer (${selectedIds.size})`}
            </button>
          </>
        )}
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <Tag className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun produit</h3>
          <p className="mt-1 text-sm text-gray-500">Commencez par ajouter votre premier article textile.</p>
          <div className="mt-6">
            <Link
              to="/add-product"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700"
            >
              Créer un produit
            </Link>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-200">
          <Filter className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun résultat</h3>
          <p className="mt-1 text-sm text-gray-500">Aucun produit ne correspond aux filtres. Modifiez ou réinitialisez les critères.</p>
          <button
            type="button"
            onClick={() => { setFilterName(''); setFilterPriceMin(''); setFilterPriceMax(''); setFilterSupplier(''); setFilterCategory(''); }}
            className="mt-4 px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
              <div className="aspect-w-16 aspect-h-9 bg-gray-200 h-48 overflow-hidden relative">
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product.id)}
                    onChange={() => toggleSelect(product.id)}
                    onClick={e => e.stopPropagation()}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 h-4 w-4 shadow"
                  />
                </div>
                {product.images && product.images.length > 0 ? (
                  <img 
                    src={product.images[0]} 
                    alt={product.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      // Replace blob URLs or invalid images with placeholder
                      if (target.src.startsWith('blob:') || !target.src) {
                        target.src = 'https://picsum.photos/400/300';
                        target.onerror = null; // Prevent infinite loop
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 bg-gray-100">
                    <span className="text-sm">Pas d'image</span>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex flex-col items-end">
                   {product.regularPrice && product.regularPrice > product.price && (
                       <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded mb-1 line-through opacity-80 backdrop-blur shadow-sm">
                           {formatPrice(product.regularPrice, product.currency || 'MAD')}
                       </span>
                   )}
                  <span className="bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold text-gray-900 shadow-sm">
                    {formatPrice(product.price, product.currency || 'MAD')}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900 truncate" title={product.name}>
                  {product.name}
                </h3>
                
                {/* Category & Supplier Tags */}
                <div className="flex flex-wrap gap-2 mt-2">
                    {product.category && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            <Box size={10} className="mr-1" />
                            {product.category}
                        </span>
                    )}
                    {product.supplier && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            <Truck size={10} className="mr-1" />
                            {product.supplier}
                        </span>
                    )}
                </div>

                <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                  {product.description}
                </p>
                
                <div className="mt-4 flex flex-wrap gap-2">
                    {product.attributes.map(attr => (
                        <span key={attr.name} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {attr.name}: {attr.options.length}
                        </span>
                    ))}
                </div>

                <div className="mt-6 flex gap-3">
                  <Link
                    to={`/product/${product.id}`}
                    className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Voir la page
                  </Link>
                  <Link
                    to={`/product/${product.id}/analytics`}
                    className="flex-shrink-0 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    title="Statistiques"
                  >
                    <BarChart2 className="h-4 w-4" />
                  </Link>
                  <Link 
                    to={`/edit-product/${product.id}`}
                    className="flex-shrink-0 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    title="Modifier"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDeleteProduct(product.id, product.name)}
                    className="flex-shrink-0 inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                    title="Supprimer le produit"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Scrap modal */}
      {scrapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Scraper</h3>
              <button
                type="button"
                onClick={handleScrapCancel}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleScrapSubmit} className="px-6 py-4 space-y-4 border-b border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  type="url"
                  value={scrapUrl}
                  onChange={(e) => setScrapUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={scrapEmail}
                    onChange={(e) => setScrapEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                  <input
                    type="password"
                    value={scrapPassword}
                    onChange={(e) => setScrapPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API (clé sauvegardée si vide)</label>
                <input
                  type="password"
                  value={scrapApiKey}
                  onChange={(e) => setScrapApiKey(e.target.value)}
                  placeholder="Chargée depuis Paramètres si disponible"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-mono text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleScrapCancel}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  {scrapRunning ? 'Arrêter' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  disabled={scrapRunning}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
                >
                  {scrapRunning ? 'En cours…' : 'Lancer'}
                </button>
              </div>
            </form>
            <div className="flex-1 min-h-0 px-6 py-4 flex flex-col">
              <p className="text-sm font-medium text-gray-700 mb-2">Sortie du script</p>
              <pre className="flex-1 min-h-[200px] p-4 bg-gray-900 text-gray-100 text-xs rounded-lg overflow-auto whitespace-pre-wrap font-mono">
                {scrapOutput || (scrapRunning ? 'Démarrage…' : '—')}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};