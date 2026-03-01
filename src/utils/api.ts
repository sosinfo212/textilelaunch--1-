// API utility functions for making HTTP requests
import { addLog } from './logStore';

// Use relative URL when Vite proxy is configured, otherwise use full URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/** Public URL to Swagger API documentation (same host as API). */
export const getApiDocsUrl = (): string => {
  const base = import.meta.env.VITE_API_URL || '/api';
  if (typeof base === 'string' && base.startsWith('http')) {
    return base.replace(/\/api\/?$/, '') + '/api-docs';
  }
  return '/api-docs';
};

// Get auth headers
// No longer using localStorage - authentication is handled via HTTP-only cookies
export const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // Authentication is handled via HTTP-only cookies (sessionId)
  // No need to send token in headers
  
  return headers;
};

// Generic fetch wrapper
export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();

  addLog({ level: 'request', method, url, message: `${method} ${endpoint}` });

  // For login, don't include auth headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Only add auth header if not logging in
  if (!endpoint.includes('/auth/login')) {
    const authHeaders = getAuthHeaders();
    Object.assign(headers, authHeaders);
  }

  try {
    // Include credentials for cookies
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Important for cookies
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      addLog({
        level: 'error',
        method,
        url,
        status: response.status,
        message: errorMessage,
      });
      throw new Error(errorMessage);
    }

    addLog({
      level: 'response',
      method,
      url,
      status: response.status,
      message: `${response.status} ${endpoint}`,
    });
    return response.json();
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (err?.message && !msg.includes('HTTP error')) {
      addLog({
        level: 'error',
        method,
        url,
        message: msg,
        details: err?.stack,
      });
    }
    throw err;
  }
};

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const data = await apiRequest<{ user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    // Session is stored in database and cookie - no localStorage needed
    return data;
  },
  
  logout: async () => {
    try {
      await apiRequest<{ success: boolean }>('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    // Session is removed from database and cookie by backend
  },
  
  getMe: async () => {
    return apiRequest<{ user: any }>('/auth/me');
  },
  
  getUsers: async () => {
    return apiRequest<{ users: any[] }>('/auth/users');
  },
  
  addUser: async (user: any) => {
    return apiRequest<{ user: any }>('/auth/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },
  
  updateUser: async (id: string, user: any) => {
    return apiRequest<{ user: any }>(`/auth/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  },
  
  deleteUser: async (id: string) => {
    return apiRequest<{ success: boolean }>(`/auth/users/${id}`, {
      method: 'DELETE',
    });
  },
};

// Products API
export const productsAPI = {
  getAll: async () => {
    return apiRequest<{ products: any[] }>('/products');
  },
  
  getById: async (id: string) => {
    return apiRequest<{ product: any }>(`/products/${id}`);
  },
  
  create: async (product: any) => {
    return apiRequest<{ product: any }>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  },
  
  update: async (id: string, product: any) => {
    return apiRequest<{ product: any }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  },
  
  delete: async (id: string) => {
    return apiRequest<{ success: boolean }>(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  deleteMany: async (ids: string[]) => {
    return apiRequest<{ deleted: string[]; message: string }>('/products/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },

  recordView: async (
    productId: string,
    sessionId: string,
    device?: string,
    browser?: string
  ) => {
    const url = `${API_BASE_URL}/products/${productId}/view`;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({ sessionId, device, browser }),
    }).then((r) => (r.ok ? { ok: true } : Promise.reject(new Error(String(r.status)))));
  },

  recordLeave: async (
    productId: string,
    sessionId: string,
    timeSpentSeconds: number,
    device?: string,
    browser?: string
  ) => {
    const url = `${API_BASE_URL}/products/${productId}/view/leave`;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({ sessionId, timeSpentSeconds, device, browser }),
    }).then((r) => (r.ok ? { ok: true } : Promise.reject(new Error(String(r.status)))));
  },

  getAnalytics: async (
    productId: string,
    options?: { dateFrom?: string; dateTo?: string }
  ) => {
    const params = new URLSearchParams();
    if (options?.dateFrom) params.set('dateFrom', options.dateFrom);
    if (options?.dateTo) params.set('dateTo', options.dateTo);
    const qs = params.toString();
    return apiRequest<{
      analytics: {
        uniqueClicks: number;
        totalOrders: number;
        totalTimeSpentSeconds: number;
        deviceBreakdown?: Record<string, number>;
        browserBreakdown?: Record<string, number>;
        clickCount?: number;
        totalTimeSpentSecondsFromEvents?: number;
      };
      timeSeries?: { date: string; visitors: number; clicks: number; timeSpentSeconds: number; orders: number }[];
    }>(`/products/${productId}/analytics${qs ? `?${qs}` : ''}`);
  },
};

// Orders API
export const ordersAPI = {
  getAll: async () => {
    return apiRequest<{ orders: any[] }>('/orders');
  },
  
  getById: async (id: string) => {
    return apiRequest<{ order: any }>(`/orders/${id}`);
  },
  
  create: async (order: any) => {
    return apiRequest<{ order: any }>('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  },
  
  updateStatus: async (id: string, status: string) => {
    return apiRequest<{ order: any }>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
  
  markViewed: async (id: string) => {
    return apiRequest<{ success: boolean }>(`/orders/${id}/viewed`, {
      method: 'PATCH',
    });
  },
  
  delete: async (id: string) => {
    return apiRequest<{ success: boolean }>(`/orders/${id}`, {
      method: 'DELETE',
    });
  },
};

// Templates API
export const templatesAPI = {
  getAll: async () => {
    return apiRequest<{ templates: any[] }>('/templates');
  },
  
  getById: async (id: string) => {
    return apiRequest<{ template: any }>(`/templates/${id}`);
  },
  
  create: async (template: any) => {
    return apiRequest<{ template: any }>('/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  },
  
  update: async (id: string, template: any) => {
    return apiRequest<{ template: any }>(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    });
  },
  
  delete: async (id: string) => {
    return apiRequest<{ success: boolean }>(`/templates/${id}`, {
      method: 'DELETE',
    });
  },
};

// Settings API
export const settingsAPI = {
  get: async () => {
    return apiRequest<{ settings: any }>('/settings');
  },
  
  getByUserId: async (userId: string) => {
    return apiRequest<{ settings: any }>(`/settings/${userId}`);
  },
  
  update: async (settings: any) => {
    return apiRequest<{ settings: any }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },
  
  /** Generate or regenerate API key. Saves to DB; can be viewed later. */
  generateApiKey: async () => {
    return apiRequest<{ apiKey: string; message: string }>('/settings/generate-api-key', {
      method: 'POST',
    });
  },

  /** Get stored API key for viewing (authenticated owner only). */
  getApiKey: async () => {
    return apiRequest<{ apiKey: string | null }>('/settings/api-key');
  },
};

// Analytics API (public endpoints - use fetch with credentials: 'omit' for visitors)
export const analyticsAPI = {
  trackEvent: (productId: string, productSlug: string, eventType: string, sessionId: string, timestamp?: number) => {
    const url = `${API_BASE_URL}/analytics/events`;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({
        productId,
        productSlug,
        eventType,
        sessionId,
        timestamp: timestamp ?? Date.now(),
      }),
    });
  },
  trackTime: (productId: string, sessionId: string, timeSpentSeconds: number) => {
    const url = `${API_BASE_URL}/analytics/time`;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({ productId, sessionId, timeSpentSeconds }),
    });
  },
  getSummary: (productId: string) => {
    return apiRequest<{ productId: string; clickCount: number; totalTimeSpentSeconds: number }>(
      `/analytics/summary/${productId}`
    );
  },
};

// Tracking pixel API (public). Use for img src or sendBeacon.
export const trackingAPI = {
  getPixelUrl: (productId: string, sessionId: string, timeSpentSeconds = 0) => {
    const base = API_BASE_URL.replace(/\/$/, '');
    const params = new URLSearchParams({
      productId,
      sessionId,
      timeSpent: String(timeSpentSeconds),
    });
    return `${base}/tracking/pixel?${params.toString()}`;
  },
  trackBeacon: (
    productId: string,
    sessionId: string,
    timeSpentSeconds: number,
    device?: string,
    browser?: string
  ) => {
    const url = `${API_BASE_URL.replace(/\/$/, '')}/tracking/pixel`;
    const blob = new Blob(
      [
        JSON.stringify({
          productId,
          sessionId,
          timeSpentSeconds,
          device,
          browser,
        }),
      ],
      { type: 'application/json' }
    );
    navigator.sendBeacon?.(url, blob);
  },
};

// Gemini API
export const geminiAPI = {
  generate: async (prompt: string, productName?: string, keywords?: string) => {
    return apiRequest<{ text: string }>('/gemini/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, productName, keywords }),
    });
  },
};

// Integrations API (affiliate networks)
export const integrationsAPI = {
  getAffiliateConnections: async () => {
    return apiRequest<{ connections: { id: string; name: string; loginUrl: string; createdAt: string }[] }>('/integrations/affiliate');
  },
  getAffiliateConnectionCredentials: async (id: string) => {
    return apiRequest<{ loginUrl: string; email: string; password: string }>(`/integrations/affiliate/${encodeURIComponent(id)}/credentials`);
  },
  saveAffiliateConnection: async (data: { id?: string; name: string; loginUrl: string; email: string; password: string }) => {
    return apiRequest<{ connection: { id: string; name: string; loginUrl: string; createdAt: string } }>('/integrations/affiliate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  deleteAffiliateConnection: async (id: string) => {
    return apiRequest<{ success: boolean }>(`/integrations/affiliate/${id}`, { method: 'DELETE' });
  },
  createAffiliateLaunchUrl: async (connectionId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const data = await apiRequest<{ launchUrl: string }>(`/integrations/affiliate/${connectionId}/launch`, {
      method: 'POST',
      body: JSON.stringify({ origin }),
    });
    return data.launchUrl;
  },
  getLaunchCredentials: async (token: string) => {
    const url = `${API_BASE_URL}/integrations/affiliate/launch?token=${encodeURIComponent(token)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(url, { credentials: 'omit', signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('Invalid or expired link');
      return res.json() as Promise<{ loginUrl: string; email: string; password: string; loginFieldName?: string; passwordFieldName?: string }>;
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e?.name === 'AbortError') throw new Error('Server did not respond');
      throw e;
    }
  },
};

// Scraper (run Python scraper, stream output; pass signal to cancel and stop the script)
export const scraperAPI = {
  run: async (
    body: { url: string; email: string; password: string; apiKey?: string },
    onChunk: (text: string) => void,
    signal?: AbortSignal
  ): Promise<void> => {
    const url = `${API_BASE_URL}/scraper/run`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok) {
      let msg = `HTTP ${response.status}`;
      try {
        const data = await response.json();
        if (data.error) msg = data.error;
      } catch {
        const text = await response.text();
        if (text) msg = text;
      }
      throw new Error(msg);
    }
    const reader = response.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        onChunk(decoder.decode(value, { stream: true }));
      }
    } finally {
      reader.releaseLock();
    }
  },
};

// Stripe (public - for landing page payment)
export const stripeAPI = {
  createPaymentIntent: async (body: {
    productId: string;
    productName?: string;
    productPrice?: number;
    productSupplier?: string;
    customer: { fullName: string; address: string; city: string; phone: string };
    selectedAttributes: Record<string, string>;
  }) => {
    const data = await apiRequest<{ clientSecret: string; orderId: string }>('/stripe/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return data;
  },
};
