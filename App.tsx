import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { SellerDashboard } from './pages/SellerDashboard';
import { AddProduct } from './pages/AddProduct';
import { EditProduct } from './pages/EditProduct';
import { OrderList } from './pages/OrderList';
import { OrderDetails } from './pages/OrderDetails';
import { TemplateList } from './pages/TemplateList';
import { TemplateBuilder } from './pages/TemplateBuilder';
import { CategoryList } from './pages/CategoryList';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/SettingsPage';

// Lazy-load landing page so product/:id only loads this chunk (reduces initial JS)
const ProductLanding = lazy(() => import('./pages/ProductLanding').then(m => ({ default: m.ProductLanding })));

// Guard Component
const RequireAuth = ({ children }: { children: React.ReactElement }) => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    // Wait for auth check to complete before redirecting
    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <Router>
          <Layout>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50">Chargement...</div>}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/product/:productId" element={<ProductLanding />} />

              {/* Protected Routes */}
              <Route path="/" element={<RequireAuth><SellerDashboard /></RequireAuth>} />
              <Route path="/add-product" element={<RequireAuth><AddProduct /></RequireAuth>} />
              <Route path="/edit-product/:productId" element={<RequireAuth><EditProduct /></RequireAuth>} />
              <Route path="/categories" element={<RequireAuth><CategoryList /></RequireAuth>} />
              <Route path="/orders" element={<RequireAuth><OrderList /></RequireAuth>} />
              <Route path="/orders/:orderId" element={<RequireAuth><OrderDetails /></RequireAuth>} />
              <Route path="/templates" element={<RequireAuth><TemplateList /></RequireAuth>} />
              <Route path="/builder/:templateId" element={<RequireAuth><TemplateBuilder /></RequireAuth>} />
              <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
            </Routes>
            </Suspense>
          </Layout>
        </Router>
      </StoreProvider>
    </AuthProvider>
  );
}

export default App;