import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { ArrowLeft, User, MapPin, Phone, Box, Calendar, CreditCard } from 'lucide-react';

export const OrderDetails: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { orders, markOrderAsViewed, updateOrderStatus } = useStore();
  const navigate = useNavigate();

  const order = orders.find(o => o.id === orderId);

  useEffect(() => {
    if (order && !order.viewed) {
      markOrderAsViewed(order.id).catch(console.error);
    }
  }, [order, markOrderAsViewed]);

  if (!order) {
    return (
        <div className="text-center py-10">
            <h2 className="text-xl font-bold">Commande introuvable</h2>
            <Link to="/orders" className="text-brand-600 hover:text-brand-500 mt-2 block">Retour à la liste</Link>
        </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
         <div className="flex items-center">
            <button onClick={() => navigate('/orders')} className="mr-4 text-gray-500 hover:text-gray-900">
                <ArrowLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Détails de la commande</h1>
         </div>
         <span className="text-sm text-gray-500">ID: {order.id}</span>
      </div>

      {/* Status Card */}
      <div className="bg-white shadow rounded-lg p-6 border-l-4 border-brand-500 flex justify-between items-center">
         <div>
             <p className="text-sm text-gray-500 font-medium">Statut actuel</p>
             <p className={`mt-1 text-lg font-bold
                ${order.status === 'completed' ? 'text-green-600' : 
                  order.status === 'shipped' ? 'text-blue-600' : 'text-yellow-600'}`}>
                {order.status === 'pending' ? 'En attente' : order.status === 'shipped' ? 'Expédié' : 'Terminé'}
             </p>
         </div>
         <div className="flex items-center space-x-2">
             <label className="text-sm text-gray-700 mr-2">Changer statut:</label>
             <select 
                value={order.status}
                onChange={async (e) => {
                  try {
                    await updateOrderStatus(order.id, e.target.value as any);
                  } catch (error) {
                    alert('Erreur lors de la mise à jour du statut. Veuillez réessayer.');
                    console.error(error);
                  }
                }}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md"
             >
                 <option value="pending">En attente</option>
                 <option value="shipped">Expédié</option>
                 <option value="completed">Terminé</option>
             </select>
         </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Customer Info */}
          <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <User size={20} className="mr-2 text-gray-400" />
                  Client
              </h3>
              <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-900">{order.customer.fullName}</p>
                  <div className="flex items-start text-sm text-gray-500">
                      <MapPin size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                      <span>{order.customer.address}, {order.customer.city}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                      <Phone size={16} className="mr-2 flex-shrink-0" />
                      <span>{order.customer.phone}</span>
                  </div>
              </div>
          </div>

          {/* Product Info */}
          <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Box size={20} className="mr-2 text-gray-400" />
                  Produit
              </h3>
              <div className="space-y-3">
                  <div className="flex justify-between">
                    <p className="text-base font-bold text-gray-900">{order.productName}</p>
                    <p className="text-base font-bold text-brand-600">{order.productPrice} €</p>
                  </div>
                  <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs text-gray-500 uppercase font-bold mb-2">Options choisies</p>
                      <ul className="space-y-1">
                          {Object.entries(order.selectedAttributes).map(([key, val]) => (
                              <li key={key} className="text-sm text-gray-700 flex justify-between">
                                  <span>{key}:</span>
                                  <span className="font-medium">{val}</span>
                              </li>
                          ))}
                      </ul>
                  </div>
              </div>
          </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
         <div className="flex items-center text-sm text-gray-500">
             <Calendar size={16} className="mr-2" />
             Commandé le {new Date(order.createdAt).toLocaleDateString()} à {new Date(order.createdAt).toLocaleTimeString()}
         </div>
         <div className="flex items-center text-sm text-gray-500 mt-2">
             <CreditCard size={16} className="mr-2" />
             Méthode: Paiement à la livraison (Standard)
         </div>
      </div>

    </div>
  );
};