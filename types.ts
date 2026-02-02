
export interface ProductAttribute {
  name: string; // e.g., "Taille", "Couleur"
  options: string[]; // e.g., ["S", "M", "L"]
}

export interface Product {
  id: string;
  ownerId: string; // NEW: Link to specific seller
  name: string;
  description: string;
  price: number; // This is the Selling Price
  regularPrice?: number; // This is the Original/Regular Price (optional)
  currency?: string; // Currency code (e.g., 'MAD', 'EUR', 'USD', 'DH')
  sku?: string; // Stock Keeping Unit
  showSku?: boolean; // Whether to display SKU on landing page
  images: string[];
  videos?: string[]; // Base64 encoded videos
  attributes: ProductAttribute[];
  category?: string;
  supplier?: string;
  createdAt: number;
  landingPageTemplateId?: string; // Link to a custom design
}

export interface CustomerInfo {
  fullName: string;
  address: string;
  city: string;
  phone: string;
}

export interface OrderItem {
  attributeName: string;
  selectedOption: string;
}

export interface Order {
  id: string;
  sellerId: string; // NEW: Link to specific seller
  productId: string;
  productName: string;
  productPrice: number;
  productSupplier?: string; // Snapshot of supplier at time of order
  customer: CustomerInfo;
  selectedAttributes: Record<string, string>;
  createdAt: number;
  status: 'pending' | 'shipped' | 'completed';
  viewed: boolean;
}

// --- Builder Types ---

export type ElementType = 
  | 'heading' 
  | 'text' 
  | 'image' 
  | 'product-title' 
  | 'product-price' 
  | 'product-description' 
  | 'product-gallery' 
  | 'order-form' 
  | 'separator'
  | 'container'
  | 'section'
  | 'button'
  | 'html-block'
  | 'trust-badges'
  | 'feature-item'; // New type for small grid items

export interface ElementStyle {
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: string; // "text-xl", "text-sm", etc. or raw pixel
  color?: string;
  padding?: string;
  backgroundColor?: string;
  borderRadius?: string;
  width?: string; // "100%", "50%", "33%"
  boxShadow?: string; // "none", "sm", "md", "lg"
  animation?: string; // "none", "pulse", "bounce", "fade-in"
  border?: string;
  marginTop?: string;
  marginBottom?: string;
  borderTop?: string;
  fontFamily?: string;
  fontStyle?: string;
}

export interface PageElement {
  id: string;
  type: ElementType;
  content?: string; // For static text or image URL
  style: ElementStyle;
  children?: PageElement[]; // For containers/sections
  props?: Record<string, any>; // Additional properties (e.g., button text, image URL, HTML content)
}

export interface LandingPageTemplate {
  id: string;
  ownerId: string; // NEW: Link to specific seller
  name: string;
  mode: 'visual' | 'code' | 'drag-drop'; // NEW: Distinguish between drag-drop and custom code
  elements: PageElement[]; // Used if mode === 'visual' or 'drag-drop'
  layout?: any; // JSON layout for drag-drop mode (stores position, size, etc.)
  htmlCode?: string; // NEW: Used if mode === 'code'
  createdAt: number;
}

// --- User & Settings Types ---

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: 'admin' | 'user';
}

export interface AppSettings {
  userId: string;
  shopName: string;
  logoUrl: string;
  geminiApiKey: string;
}
