import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Package, Smartphone, MapPin, ChevronRight, Circle, Download, Filter, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export const OrderList: React.FC = () => {
  const { orders, products, deleteOrder } = useStore();
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [supplierFilter, setSupplierFilter] = useState('');

  const handleDeleteOrder = async (id: string, productName: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la commande pour "${productName}" ? Cette action est irréversible.`)) {
      try {
        await deleteOrder(id);
      } catch (error) {
        alert('Erreur lors de la suppression de la commande');
        console.error(error);
      }
    }
  };

  // Extract unique suppliers for dropdown
  const uniqueSuppliers = useMemo(() => {
    const suppliers = new Set<string>();
    products.forEach(p => {
        if (p.supplier) suppliers.add(p.supplier);
    });
    // Also check historical orders in case a supplier was removed but exists in orders
    orders.forEach(o => {
        if (o.productSupplier) suppliers.add(o.productSupplier);
    });
    return Array.from(suppliers);
  }, [products, orders]);

  // Filter orders logic
  const filteredOrders = useMemo(() => {
    let result = orders.sort((a,b) => b.createdAt - a.createdAt);
    if (supplierFilter) {
        result = result.filter(order => {
            const supplier = order.productSupplier || products.find(p => p.id === order.productId)?.supplier;
            return supplier === supplierFilter;
        });
    }
    return result;
  }, [orders, supplierFilter, products]);

  const toggleSelectOrder = (id: string) => {
    const newSelection = new Set(selectedOrders);
    if (newSelection.has(id)) {
        newSelection.delete(id);
    } else {
        newSelection.add(id);
    }
    setSelectedOrders(newSelection);
  };

  const toggleSelectAll = () => {
      if (selectedOrders.size === filteredOrders.length) {
          setSelectedOrders(new Set());
      } else {
          setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
      }
  };

  const exportToExcel = () => {
      const ordersToExport = filteredOrders.filter(o => 
          selectedOrders.size === 0 || selectedOrders.has(o.id)
      );

      if (ordersToExport.length === 0) {
          alert("Aucune commande à exporter");
          return;
      }

      const data = ordersToExport.map(order => {
          // Flatten attributes
          const attributesStr = Object.entries(order.selectedAttributes)
            .map(([k, v]) => `${k}: ${v}`).join(', ');
          
          const supplier = order.productSupplier || products.find(p => p.id === order.productId)?.supplier || 'Inconnu';

          return {
              "ID Commande": order.id,
              "Date": new Date(order.createdAt).toLocaleDateString(),
              "Heure": new Date(order.createdAt).toLocaleTimeString(),
              "Produit": order.productName,
              "Prix": order.productPrice,
              "Fournisseur": supplier,
              "Nom Client": order.customer.fullName,
              "Téléphone": order.customer.phone,
              "Ville": order.customer.city,
              "Adresse": order.customer.address,
              "Variantes": attributesStr,
              "Statut": order.status === 'pending' ? 'En attente' : order.status === 'shipped' ? 'Expédié' : 'Terminé'
          };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Commandes");
      
      const fileName = `Commandes_${supplierFilter || 'Toutes'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Commandes reçues
          </h2>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
             {/* Supplier Filter */}
             <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-5 w-5 text-gray-400" />
                </div>
                <select
                    value={supplierFilter}
                    onChange={(e) => setSupplierFilter(e.target.value)}
                    className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2"
                >
                    <option value="">Tous les fournisseurs</option>
                    {uniqueSuppliers.map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
             </div>

             <button
                onClick={exportToExcel}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
             >
                <Download className="-ml-1 mr-2 h-5 w-5" />
                Exporter Excel {selectedOrders.size > 0 ? `(${selectedOrders.size})` : ''}
             </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {/* Selection Header */}
        {filteredOrders.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center">
                <input
                    type="checkbox"
                    checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-500">Tout sélectionner</span>
            </div>
        )}

        <ul role="list" className="divide-y divide-gray-200">
          {filteredOrders.length === 0 ? (
            <li className="px-6 py-12 text-center text-gray-500">
              Aucune commande trouvée.
            </li>
          ) : (
            filteredOrders.map((order) => (
              <li key={order.id} className="flex">
                <div className="flex items-center pl-4">
                    <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={() => toggleSelectOrder(order.id)}
                        className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                    />
                </div>
                <Link to={`/orders/${order.id}`} className="block flex-1 hover:bg-gray-50 transition duration-150 ease-in-out">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                          {!order.viewed && (
                              <Circle className="fill-blue-600 text-blue-600 w-2.5 h-2.5 mr-3" />
                          )}
                          <p className={`text-sm font-medium truncate mr-3 ${!order.viewed ? 'text-brand-700 font-bold' : 'text-gray-700'}`}>
                            {order.productName}
                          </p>
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-600">
                              {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex items-center">
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${order.status === 'completed' ? 'bg-green-100 text-green-800' : 
                              order.status === 'shipped' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {order.status === 'pending' ? 'En attente' : order.status === 'shipped' ? 'Expédié' : 'Terminé'}
                        </p>
                        <ChevronRight className="ml-2 h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <div className="mr-6 flex items-center text-sm text-gray-500">
                          <Package className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          {Object.entries(order.selectedAttributes).map(([key, val]) => `${key}: ${val}`).join(' | ')}
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          {order.customer.city}
                        </div>
                         {/* Display Supplier if available */}
                         {(order.productSupplier || products.find(p => p.id === order.productId)?.supplier) && (
                            <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-4 bg-purple-50 px-2 rounded">
                                <span className="text-purple-700 text-xs">
                                    {order.productSupplier || products.find(p => p.id === order.productId)?.supplier}
                                </span>
                            </div>
                        )}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        <Smartphone className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {order.customer.phone} - {order.customer.fullName}
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="flex items-center pr-4">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteOrder(order.id, order.productName);
                    }}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                    title="Supprimer la commande"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};