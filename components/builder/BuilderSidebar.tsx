/**
 * BuilderSidebar - Sidebar with draggable component library
 * Users can drag elements from here into the canvas
 */

import React from 'react';
import { useDrag } from 'react-dnd';
import {
  Heading,
  Type,
  Image as ImageIcon,
  Box,
  MousePointerClick,
  Code,
  Layout,
  Container,
  MessageSquare,
} from 'lucide-react';
import { ElementType } from '../../types';

interface BuilderSidebarProps {
  onAddElement: (type: ElementType) => void;
}

interface DraggableItemProps {
  type: ElementType;
  label: string;
  icon: React.ReactNode;
  onAdd: (type: ElementType) => void;
}

// Component library definition
const COMPONENT_LIBRARY: Array<{
  type: ElementType;
  label: string;
  icon: React.ReactNode;
  category: 'layout' | 'content' | 'product' | 'form';
}> = [
  // Layout
  { type: 'section', label: 'Section', icon: <Layout size={18} />, category: 'layout' },
  { type: 'container', label: 'Container', icon: <Container size={18} />, category: 'layout' },
  
  // Content
  { type: 'heading', label: 'Titre', icon: <Heading size={18} />, category: 'content' },
  { type: 'text', label: 'Texte', icon: <Type size={18} />, category: 'content' },
  { type: 'image', label: 'Image', icon: <ImageIcon size={18} />, category: 'content' },
  { type: 'button', label: 'Bouton', icon: <MousePointerClick size={18} />, category: 'content' },
  { type: 'html-block', label: 'HTML Personnalisé', icon: <Code size={18} />, category: 'content' },
  
  // Product
  { type: 'product-title', label: 'Nom Produit', icon: <Box size={18} />, category: 'product' },
  { type: 'product-price', label: 'Prix', icon: <Box size={18} />, category: 'product' },
  { type: 'product-description', label: 'Description', icon: <Box size={18} />, category: 'product' },
  { type: 'product-gallery', label: 'Galerie', icon: <ImageIcon size={18} />, category: 'product' },
  { type: 'product-reviews', label: 'Avis clients', icon: <MessageSquare size={18} />, category: 'product' },
];

/**
 * DraggableItem - Individual draggable component in sidebar
 */
const DraggableItem: React.FC<DraggableItemProps> = ({ type, label, icon, onAdd }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'builder-element',
    item: { type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      onClick={() => onAdd(type)}
      className={`
        flex items-center gap-3 px-4 py-3 mb-2 
        bg-white border border-gray-200 rounded-lg 
        cursor-move hover:bg-gray-50 hover:border-blue-300 
        transition-all
        ${isDragging ? 'opacity-50' : 'opacity-100'}
      `}
    >
      <div className="text-gray-600">{icon}</div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
  );
};

export const BuilderSidebar: React.FC<BuilderSidebarProps> = ({ onAddElement }) => {
  const categories = {
    layout: COMPONENT_LIBRARY.filter(c => c.category === 'layout'),
    content: COMPONENT_LIBRARY.filter(c => c.category === 'content'),
    product: COMPONENT_LIBRARY.filter(c => c.category === 'product'),
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto p-4" dir="ltr">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Composants
      </h3>

      {/* Layout Components */}
      <div className="mb-6">
        <h4 className="text-xs font-medium text-gray-400 mb-2">Mise en page</h4>
        {categories.layout.map((comp) => (
          <DraggableItem
            key={comp.type}
            type={comp.type}
            label={comp.label}
            icon={comp.icon}
            onAdd={onAddElement}
          />
        ))}
      </div>

      {/* Content Components */}
      <div className="mb-6">
        <h4 className="text-xs font-medium text-gray-400 mb-2">Contenu</h4>
        {categories.content.map((comp) => (
          <DraggableItem
            key={comp.type}
            type={comp.type}
            label={comp.label}
            icon={comp.icon}
            onAdd={onAddElement}
          />
        ))}
      </div>

      {/* Product Components */}
      <div className="mb-6">
        <h4 className="text-xs font-medium text-gray-400 mb-2">Produit</h4>
        {categories.product.map((comp) => (
          <DraggableItem
            key={comp.type}
            type={comp.type}
            label={comp.label}
            icon={comp.icon}
            onAdd={onAddElement}
          />
        ))}
      </div>
    </div>
  );
};
