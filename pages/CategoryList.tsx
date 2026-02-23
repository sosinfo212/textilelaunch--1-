import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Tag, Package, ChevronRight, Layers, Plus, X, Trash2 } from 'lucide-react';
import { Product } from '../types';

export const CategoryList: React.FC = () => {
  const { products, categories, addCategory, deleteProducts } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Combine managed categories with any loose strings found in products (just in case)
  // and map products to them.
  const categoryData = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    
    // Initialize groups for all known categories
    categories.forEach(cat => {
        groups[cat] = [];
    });

    // Also handle "Non classé"
    groups['Non classé'] = [];

    products.forEach(product => {
      let catName = product.category && product.category.trim() !== '' ? product.category : 'Non classé';
      
      // If product has a category not in our list (rare if auto-add works), add it to groups map
      if (!groups[catName]) {
          groups[catName] = [];
      }
      groups[catName].push(product);
    });

    // Sort by name, but keep 'Non classé' at bottom if desired, or just alpha
    return Object.entries(groups).sort((a, b) => {
        if (a[0] === 'Non classé') return 1;
        if (b[0] === 'Non classé') return -1;
        return a[0].localeCompare(b[0]);
    });
  }, [products, categories]);

  const handleCreateCategory = (e: React.FormEvent) => {
      e.preventDefault();
      if (newCategoryName.trim()) {
          addCategory(newCategoryName);
          setNewCategoryName('');
          setIsModalOpen(false);
      }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllInCategory = (items: Product[]) => {
    const ids = items.map(p => p.id);
    const allSelected = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === products.length && products.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(products.map(p => p.id)));
  };

  const handleBulkDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Supprimer ${selectedIds.size} produit(s) ? Cette action est irréversible.`)) return;
    setBulkDeleting(true);
    try {
      await deleteProducts(Array.from(selectedIds));
      setSelectedIds(new Set());
    } catch (err) {
      alert('Erreur lors de la suppression des produits');
      console.error(err);
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catégories Produits</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez vos catégories et visualisez votre inventaire.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
             <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle Catégorie
            </button>
            <Link
            to="/add-product"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700"
            >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un produit
            </Link>
            {products.length > 0 && (
              <>
                <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === products.length}
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

      {categoryData.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <Layers className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune catégorie</h3>
          <p className="mt-1 text-sm text-gray-500">Créez votre première catégorie pour organiser vos produits.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {categoryData.map(([categoryName, items]) => {
            const totalValue = items.reduce((sum, p) => sum + p.price, 0);
            const isEmpty = items.length === 0;

            if (categoryName === 'Non classé' && isEmpty) return null; // Don't show empty Uncategorized

            return (
              <div key={categoryName} className={`bg-white shadow rounded-lg overflow-hidden border ${isEmpty ? 'border-dashed border-gray-300' : 'border-gray-100'}`}>
                <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg mr-4 ${isEmpty ? 'bg-gray-200 text-gray-500' : 'bg-brand-100 text-brand-600'}`}>
                      <Tag size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium leading-6 text-gray-900">{categoryName}</h3>
                      <p className="text-sm text-gray-500">
                        {items.length} produit{items.length !== 1 ? 's' : ''} {items.length > 0 && `• Valeur: ${totalValue.toFixed(2)} €`}
                      </p>
                    </div>
                  </div>
                  {!isEmpty ? (
                    <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={items.length > 0 && items.every(p => selectedIds.has(p.id))}
                        onChange={() => selectAllInCategory(items)}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      Tout dans cette catégorie
                    </label>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Vide</span>
                  )}
                </div>
                
                {/* Product List within Category */}
                {!isEmpty && (
                    <ul className="divide-y divide-gray-200">
                    {items.map((product) => (
                        <li key={product.id} className="hover:bg-gray-50 transition flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(product.id)}
                          onClick={(e) => toggleSelect(product.id, e)}
                          className="ml-4 flex-shrink-0 rounded border-gray-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                        />
                        <Link to={`/edit-product/${product.id}`} className="flex-1 flex items-center min-w-0 py-4 pr-4">
                            <div className="flex-shrink-0 h-12 w-12 bg-gray-200 rounded-md overflow-hidden ml-3">
                                {product.images[0] ? (
                                    <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <Package className="h-6 w-6 text-gray-400 m-3" />
                                )}
                            </div>
                            <div className="ml-4 flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-brand-600 truncate">{product.name}</p>
                                    <div className="ml-2 flex-shrink-0 flex">
                                    <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                        {product.price} €
                                    </p>
                                    </div>
                                </div>
                                <div className="flex justify-between mt-1">
                                    <p className="text-sm text-gray-500 truncate w-3/4">
                                    {product.supplier ? `Fournisseur: ${product.supplier}` : 'Fournisseur non spécifié'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex-shrink-0">
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                            </div>
                        </Link>
                        </li>
                    ))}
                    </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for creating category */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Nouvelle Catégorie</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateCategory}>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-brand-500 focus:border-brand-500 sm:text-sm mb-4"
                placeholder="Nom de la catégorie..."
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!newCategoryName.trim()}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};