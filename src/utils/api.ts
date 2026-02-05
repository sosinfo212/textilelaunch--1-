// API utility functions for making HTTP requests

// Use relative URL when Vite proxy is configured, otherwise use full URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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
      // If response is not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
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
