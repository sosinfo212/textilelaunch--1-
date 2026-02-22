import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, PlusCircle, ClipboardList, Package, LayoutTemplate, Layers, LogOut, Settings } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadOrderCount, settings } = useStore();
  const { user, logout } = useAuth();
  
  const isAnalyticsPage = location.pathname.endsWith('/analytics');
  const isLandingPage = location.pathname.startsWith('/product/') && !isAnalyticsPage;
  const isLoginPage = location.pathname === '/login';
  const isAffiliateConnectBridge = location.pathname === '/integrations/affiliate/connect';

  const handleLogout = () => {
      logout();
      navigate('/login');
  };

  if (isLandingPage || isLoginPage || isAffiliateConnectBridge) {
    return <main className="min-h-screen bg-gray-50">{children}</main>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="flex items-center gap-2">
                  {settings.logoUrl ? (
                      <img src={settings.logoUrl} alt="Logo" className="h-8 w-auto rounded" />
                  ) : (
                    <div className="bg-brand-600 text-white p-2 rounded-lg">
                        <ShoppingBag size={20} />
                    </div>
                  )}
                  <span className="font-bold text-xl text-gray-900 tracking-tight">{settings.shopName || 'Trendy Cosmetix'}</span>
                </Link>
              </div>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                <Link
                  to="/"
                  className={`${location.pathname === '/' ? 'border-brand-500 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  <Package className="mr-2" size={16} />
                  Produits
                </Link>
                <Link
                  to="/categories"
                  className={`${location.pathname === '/categories' ? 'border-brand-500 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  <Layers className="mr-2" size={16} />
                  Catégories
                </Link>
                <Link
                  to="/templates"
                  className={`${location.pathname.startsWith('/templates') ? 'border-brand-500 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  <LayoutTemplate className="mr-2" size={16} />
                  Modèles
                </Link>
                <Link
                  to="/orders"
                  className={`${location.pathname.startsWith('/orders') ? 'border-brand-500 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium relative`}
                >
                  <ClipboardList className="mr-2" size={16} />
                  Commandes
                  {unreadOrderCount > 0 && (
                    <span className="absolute -top-0 -right-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full transform translate-x-1/4 -translate-y-1/4">
                      {unreadOrderCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/add-product"
                className="hidden md:inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
              >
                <PlusCircle className="mr-2 -ml-1" size={16} />
                Nouveau Produit
              </Link>
              
              <div className="h-6 w-px bg-gray-200 mx-2 hidden md:block"></div>
              
              <div className="flex items-center gap-2">
                  <div className="hidden md:flex flex-col items-end mr-1">
                      <span className="text-xs font-medium text-gray-700">{user?.name}</span>
                      <span className="text-[10px] text-gray-500">{user?.email}</span>
                  </div>
                  
                  <Link 
                    to="/settings"
                    className="p-2 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded-full transition-colors"
                    title="Paramètres"
                  >
                      <Settings size={20} />
                  </Link>

                  <button 
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="Se déconnecter"
                  >
                      <LogOut size={20} />
                  </button>
              </div>
            </div>
          </div>
        </div>
        {/* Mobile menu */}
        <div className="sm:hidden flex justify-around border-t border-gray-100 py-2">
           <Link to="/" className="flex flex-col items-center text-xs text-gray-600">
             <Package size={20} />
             <span>Produits</span>
           </Link>
           <Link to="/categories" className="flex flex-col items-center text-xs text-gray-600">
             <Layers size={20} />
             <span>Catégories</span>
           </Link>
           <Link to="/templates" className="flex flex-col items-center text-xs text-gray-600">
             <LayoutTemplate size={20} />
             <span>Modèles</span>
           </Link>
           <Link to="/settings" className="flex flex-col items-center text-xs text-gray-600">
             <Settings size={20} />
             <span>Paramètres</span>
           </Link>
        </div>
      </nav>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};