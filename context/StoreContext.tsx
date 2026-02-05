import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Order, LandingPageTemplate, AppSettings } from '../types';
import { useAuth } from './AuthContext';
import { productsAPI, ordersAPI, templatesAPI, settingsAPI } from '../src/utils/api';

interface StoreContextType {
  // Global Data (Internal use)
  allProducts: Product[];
  
  // Scoped Data (For current user)
  products: Product[];
  orders: Order[];
  templates: LandingPageTemplate[];
  categories: string[];
  settings: AppSettings;
  unreadOrderCount: number;
  
  // Actions
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addOrder: (order: Order) => Promise<void>;
  getProduct: (id: string) => Product | undefined; // Searches globally
  
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>;
  markOrderAsViewed: (id: string) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;

  addCategory: (category: string) => void;

  addTemplate: (template: LandingPageTemplate) => Promise<void>;
  updateTemplate: (template: LandingPageTemplate) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  getTemplate: (id: string) => LandingPageTemplate | undefined;

  // Settings
  updateSettings: (newSettings: AppSettings) => Promise<void>;
  getSettingsForUser: (userId: string) => AppSettings | undefined;
  
  // Loading states
  loading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AppSettings = {
    userId: '',
    shopName: 'Trendy Cosmetix Store',
    logoUrl: '',
    geminiApiKey: '',
    facebookPixelCode: ''
};

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  // Raw Global Data
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allTemplates, setAllTemplates] = useState<LandingPageTemplate[]>([]);
  const [allSettings, setAllSettings] = useState<Record<string, AppSettings>>({});
  
  // Scoped Data
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [templates, setTemplates] = useState<LandingPageTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(false);

  // Load Data from API when user changes
  useEffect(() => {
    // Don't load data if auth is still loading
    if (isLoading) {
      return;
    }
    
    if (!user) {
          setProducts([]);
          setOrders([]);
          setTemplates([]);
          setCategories([]);
          setSettings(DEFAULT_SETTINGS);
      setAllProducts([]);
      setAllOrders([]);
      setAllTemplates([]);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        // Load products
        const productsRes = await productsAPI.getAll();
        const userProducts = productsRes.products.filter((p: Product) => p.ownerId === user.id);
        setProducts(userProducts);
        setAllProducts(productsRes.products);

        // Load orders
        const ordersRes = await ordersAPI.getAll();
        setOrders(ordersRes.orders);
        setAllOrders(ordersRes.orders);

        // Load templates
        const templatesRes = await templatesAPI.getAll();
        setTemplates(templatesRes.templates);
        setAllTemplates(templatesRes.templates);

        // Derive categories
        const uniqueCats = Array.from(
          new Set(userProducts.map((p: Product) => p.category).filter(Boolean) as string[])
        );
        setCategories(uniqueCats);

        // Load settings
        const settingsRes = await settingsAPI.get();
        const userSettings = {
          ...DEFAULT_SETTINGS,
          ...settingsRes.settings,
          userId: user.id
        };
        setSettings(userSettings);
        setAllSettings({ [user.id]: userSettings });
      } catch (error: any) {
        console.error('Error loading data:', error);
        // Check if it's an authentication error
        const errorMessage = error?.message || '';
        if (errorMessage.includes('401') || errorMessage.includes('Authentication')) {
          // Session invalid - redirect to login (backend handles cookie cleanup)
          window.location.href = '/#/login';
          return;
        }
        // Show error to user
        alert('Erreur lors du chargement des données. Vérifiez que le serveur backend est démarré.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // --- ACTIONS ---

  const addProduct = async (product: Product) => {
    if (!user) return;
    try {
      const productData: any = {
        name: product.name,
        description: product.description || '',
        price: product.price,
        regularPrice: product.regularPrice,
        currency: product.currency || 'MAD',
        sku: product.sku,
        showSku: product.showSku || false,
        images: product.images || [],
        videos: product.videos || [], // Always include videos array
        attributes: product.attributes || [],
        category: product.category,
        supplier: product.supplier,
        landingPageTemplateId: product.landingPageTemplateId
      };
      
      // Only include optional fields if they have values
      if (product.regularPrice) productData.regularPrice = product.regularPrice;
      if (product.category) productData.category = product.category;
      if (product.supplier) productData.supplier = product.supplier;
      if (product.landingPageTemplateId) productData.landingPageTemplateId = product.landingPageTemplateId;
      const res = await productsAPI.create(productData);
      const newProduct = res.product;
      setAllProducts([newProduct, ...allProducts]);
      if (newProduct.ownerId === user.id) {
        setProducts([newProduct, ...products]);
        // Update categories
        if (newProduct.category && !categories.includes(newProduct.category)) {
          setCategories([...categories, newProduct.category].sort());
        }
      }
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  };

  const updateProduct = async (product: Product) => {
    if (!user) return;
    try {
      const productData: any = {
        name: product.name,
        description: product.description || '',
        price: product.price,
        regularPrice: product.regularPrice,
        currency: product.currency || 'MAD',
        sku: product.sku,
        showSku: product.showSku || false,
        images: product.images || [],
        videos: product.videos || [], // Always include videos array
        attributes: product.attributes || [],
        category: product.category,
        supplier: product.supplier,
        landingPageTemplateId: product.landingPageTemplateId
      };
      
      // Only include optional fields if they have values
      if (product.regularPrice) productData.regularPrice = product.regularPrice;
      if (product.category) productData.category = product.category;
      if (product.supplier) productData.supplier = product.supplier;
      if (product.landingPageTemplateId) productData.landingPageTemplateId = product.landingPageTemplateId;
      
      const res = await productsAPI.update(product.id, productData);
      const updatedProduct = res.product;
      setAllProducts(allProducts.map(p => p.id === updatedProduct.id ? updatedProduct : p));
      if (updatedProduct.ownerId === user.id) {
        setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        // Update categories
        const uniqueCats = Array.from(
          new Set(products.map(p => p.category).filter(Boolean) as string[])
        );
        setCategories(uniqueCats);
      }
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    if (!user) return;
    try {
      await productsAPI.delete(id);
      setAllProducts(allProducts.filter(p => p.id !== id));
      setProducts(products.filter(p => p.id !== id));
      // Update categories
      const uniqueCats = Array.from(
        new Set(products.filter(p => p.id !== id).map(p => p.category).filter(Boolean) as string[])
      );
      setCategories(uniqueCats);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  const addOrder = async (order: Order) => {
    try {
      const orderData = {
        productId: order.productId,
        productName: order.productName,
        productPrice: order.productPrice,
        productSupplier: order.productSupplier,
        customer: order.customer,
        selectedAttributes: order.selectedAttributes
      };
      const res = await ordersAPI.create(orderData);
      const newOrder = res.order;
      setAllOrders([newOrder, ...allOrders]);
      if (newOrder.sellerId === user?.id) {
        setOrders([newOrder, ...orders]);
      }
    } catch (error) {
      console.error('Error adding order:', error);
      throw error;
    }
  };

  const updateOrderStatus = async (id: string, status: Order['status']) => {
    try {
      const res = await ordersAPI.updateStatus(id, status);
      const updatedOrder = res.order;
      setAllOrders(allOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      if (updatedOrder.sellerId === user?.id) {
        setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  };

  const markOrderAsViewed = async (id: string) => {
    try {
      await ordersAPI.markViewed(id);
      setAllOrders(allOrders.map(o => o.id === id ? { ...o, viewed: true } : o));
      if (user) {
        setOrders(orders.map(o => o.id === id ? { ...o, viewed: true } : o));
      }
    } catch (error) {
      console.error('Error marking order as viewed:', error);
      throw error;
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      await ordersAPI.delete(id);
      setAllOrders(allOrders.filter(o => o.id !== id));
      if (user) {
        setOrders(orders.filter(o => o.id !== id));
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
  };

  const getProduct = (id: string) => allProducts.find(p => p.id === id);

  const addCategory = (category: string) => {
     // Categories are currently derived dynamically from products.
     // To "add" an empty category, we usually just update the UI state, 
     // but in this persistent model, we only really save it if a product uses it.
     // However, to satisfy the UI "Add Category" feature, we can just add it to local state temporarily
     // or check if we should persist a separate list. 
     // For now, we'll append to the local state so it appears in dropdowns immediately.
     if (!categories.includes(category)) {
         setCategories([...categories, category].sort());
     }
  };

  const addTemplate = async (template: LandingPageTemplate) => {
    if (!user) return;
    try {
      const templateData = {
        name: template.name,
        mode: template.mode,
        elements: template.elements,
        layout: template.layout,
        htmlCode: template.htmlCode
      };
      const res = await templatesAPI.create(templateData);
      const newTemplate = res.template;
      setAllTemplates([...allTemplates, newTemplate]);
      if (newTemplate.ownerId === user.id) {
        setTemplates([...templates, newTemplate]);
      }
    } catch (error) {
      console.error('Error adding template:', error);
      throw error;
    }
  };

  const updateTemplate = async (template: LandingPageTemplate) => {
    try {
      const templateData = {
        name: template.name,
        mode: template.mode,
        elements: template.elements,
        layout: template.layout,
        htmlCode: template.htmlCode
      };
      const res = await templatesAPI.update(template.id, templateData);
      const updatedTemplate = res.template;
      setAllTemplates(allTemplates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
      if (updatedTemplate.ownerId === user?.id) {
        setTemplates(templates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
      }
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      await templatesAPI.delete(id);
      setAllTemplates(allTemplates.filter(t => t.id !== id));
      if (user) {
        setTemplates(templates.filter(t => t.id !== id));
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  };

  const getTemplate = (id: string) => allTemplates.find(t => t.id === id);

  // Settings Logic
  const updateSettings = async (newSettings: AppSettings) => {
      if (!user) return;
      try {
        const settingsData = {
          shopName: newSettings.shopName,
          logoUrl: newSettings.logoUrl,
          geminiApiKey: newSettings.geminiApiKey
        };
        const res = await settingsAPI.update(settingsData);
        const updatedSettings = { ...res.settings, userId: user.id };
        setAllSettings({ ...allSettings, [user.id]: updatedSettings });
        setSettings(updatedSettings);
      } catch (error) {
        console.error('Error updating settings:', error);
        throw error;
      }
  };

  const getSettingsForUser = (userId: string) => {
      return allSettings[userId] || { ...DEFAULT_SETTINGS, userId };
  };

  const unreadOrderCount = orders.filter(o => !o.viewed).length;

  return (
    <StoreContext.Provider value={{ 
      allProducts, products, orders, templates, categories, unreadOrderCount, settings, loading,
      addProduct, updateProduct, deleteProduct, addOrder, getProduct, updateOrderStatus, markOrderAsViewed, deleteOrder,
      addCategory,
      addTemplate, updateTemplate, deleteTemplate, getTemplate,
      updateSettings, getSettingsForUser
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};