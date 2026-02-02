/**
 * DragDropBuilder - Main component for drag-and-drop template builder
 * Similar to Elementor/Webflow interface
 */

import React, { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { PageElement } from '../../types';
import { BuilderSidebar } from './BuilderSidebar';
import { BuilderCanvas } from './BuilderCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DragDropBuilderProps {
  templateId: string;
  initialElements?: PageElement[];
  onSave: (elements: PageElement[], layout: any) => void;
  templateName: string;
  onNameChange: (name: string) => void;
}

export const DragDropBuilder: React.FC<DragDropBuilderProps> = ({
  templateId,
  initialElements = [],
  onSave,
  templateName,
  onNameChange,
}) => {
  const [elements, setElements] = useState<PageElement[]>(initialElements);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [layout, setLayout] = useState<any>({}); // Stores position, size, etc.
  const navigate = useNavigate();

  // Initialize with sections if empty
  useEffect(() => {
    if (elements.length === 0) {
      const defaultSection: PageElement = {
        id: `section_${Date.now()}`,
        type: 'section',
        style: {
          padding: '2rem',
          backgroundColor: '#ffffff',
          width: '100%',
        },
        children: [],
      };
      setElements([defaultSection]);
    }
  }, []);

  // Add new element to canvas
  const handleAddElement = (type: PageElement['type'], targetId?: string) => {
    const newElement: PageElement = createDefaultElement(type);
    
    if (targetId) {
      // Add to specific container/section
      setElements(prev => addElementToContainer(prev, targetId, newElement));
    } else {
      // Add to root level - if no sections exist, create one first
      setElements(prev => {
        if (prev.length === 0) {
          const defaultSection: PageElement = {
            id: `section_${Date.now()}`,
            type: 'section',
            style: {
              padding: '2rem',
              backgroundColor: '#ffffff',
              width: '100%',
            },
            children: [newElement],
          };
          return [defaultSection];
        }
        return [...prev, newElement];
      });
    }
    
    setSelectedElementId(newElement.id);
  };

  // Update element properties
  const handleUpdateElement = (id: string, updates: Partial<PageElement>) => {
    setElements(prev => updateElementInTree(prev, id, updates));
  };

  // Delete element
  const handleDeleteElement = (id: string) => {
    setElements(prev => removeElementFromTree(prev, id));
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  };

  // Move element (reorder)
  const handleMoveElement = (dragId: string, hoverId: string, position: 'before' | 'after' | 'inside') => {
    setElements(prev => moveElementInTree(prev, dragId, hoverId, position));
  };

  // Update layout (position, size)
  const handleLayoutUpdate = (id: string, layoutData: any) => {
    setLayout(prev => ({
      ...prev,
      [id]: layoutData,
    }));
  };

  // Save template
  const handleSave = () => {
    onSave(elements, layout);
  };

  const selectedElement = findElementById(elements, selectedElementId);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col bg-gray-100">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm z-50">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/templates')}
              className="text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft size={20} />
            </button>
            <input
              type="text"
              value={templateName}
              onChange={(e) => onNameChange(e.target.value)}
              className="font-bold text-lg border-none focus:ring-0 text-gray-800 bg-transparent placeholder-gray-400"
              placeholder="Nom du modèle"
            />
          </div>
          <button
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700"
          >
            <Save className="mr-2 h-4 w-4" />
            Sauvegarder
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Draggable Elements */}
          <BuilderSidebar onAddElement={handleAddElement} />

          {/* Canvas - Drop Zone */}
          <div className="flex-1 overflow-auto bg-gray-50">
            <BuilderCanvas
              elements={elements}
              layout={layout}
              selectedElementId={selectedElementId}
              onSelectElement={setSelectedElementId}
              onUpdateElement={handleUpdateElement}
              onDeleteElement={handleDeleteElement}
              onMoveElement={handleMoveElement}
              onLayoutUpdate={handleLayoutUpdate}
            />
          </div>

          {/* Properties Panel */}
          {selectedElement && (
            <PropertiesPanel
              element={selectedElement}
              onUpdate={(updates) => handleUpdateElement(selectedElement.id, updates)}
            />
          )}
        </div>
      </div>
    </DndProvider>
  );
};

// Helper Functions

/**
 * Create default element based on type
 */
function createDefaultElement(type: PageElement['type']): PageElement {
  const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const defaults: Record<PageElement['type'], Partial<PageElement>> = {
    section: {
      style: { padding: '2rem', backgroundColor: '#ffffff', width: '100%' },
      children: [],
    },
    container: {
      style: { padding: '1rem', backgroundColor: 'transparent', width: '100%' },
      children: [],
    },
    heading: {
      content: 'Nouveau Titre',
      style: { fontSize: '2rem', fontWeight: 'bold', color: '#000000', padding: '0.5rem' },
    },
    text: {
      content: 'Votre texte ici...',
      style: { fontSize: '1rem', color: '#333333', padding: '0.5rem' },
    },
    image: {
      content: 'https://via.placeholder.com/600x400',
      style: { width: '100%', padding: '0.5rem' },
      props: { alt: 'Image' },
    },
    button: {
      content: 'Cliquez ici',
      style: {
        padding: '0.75rem 1.5rem',
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        borderRadius: '0.5rem',
        border: 'none',
        cursor: 'pointer',
      },
      props: { href: '#', target: '_self' },
    },
    'html-block': {
      content: '<div>Votre HTML personnalisé</div>',
      style: { padding: '1rem' },
    },
    separator: {
      style: { borderTop: '1px solid #e5e7eb', margin: '1rem 0', padding: '0' },
    },
    'product-title': {
      style: { fontSize: '2rem', fontWeight: 'bold', color: '#000000', padding: '0.5rem' },
    },
    'product-price': {
      style: { fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444', padding: '0.5rem' },
    },
    'product-description': {
      style: { fontSize: '1rem', color: '#333333', padding: '0.5rem' },
    },
    'product-gallery': {
      style: { width: '100%', padding: '0.5rem' },
    },
    'order-form': {
      style: { padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' },
    },
    'trust-badges': {
      style: { padding: '1rem', display: 'flex', gap: '1rem' },
    },
    'feature-item': {
      content: 'Caractéristique',
      style: { padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem' },
    },
  };

  return {
    id,
    type,
    ...defaults[type],
    style: defaults[type].style || {},
  } as PageElement;
}

/**
 * Find element by ID in tree structure
 */
function findElementById(elements: PageElement[], id: string): PageElement | null {
  for (const el of elements) {
    if (el.id === id) return el;
    if (el.children) {
      const found = findElementById(el.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Add element to container
 */
function addElementToContainer(
  elements: PageElement[],
  containerId: string,
  newElement: PageElement
): PageElement[] {
  return elements.map(el => {
    if (el.id === containerId) {
      return {
        ...el,
        children: [...(el.children || []), newElement],
      };
    }
    if (el.children) {
      return {
        ...el,
        children: addElementToContainer(el.children, containerId, newElement),
      };
    }
    return el;
  });
}

/**
 * Update element in tree
 */
function updateElementInTree(
  elements: PageElement[],
  id: string,
  updates: Partial<PageElement>
): PageElement[] {
  return elements.map(el => {
    if (el.id === id) {
      return { ...el, ...updates };
    }
    if (el.children) {
      return {
        ...el,
        children: updateElementInTree(el.children, id, updates),
      };
    }
    return el;
  });
}

/**
 * Remove element from tree
 */
function removeElementFromTree(elements: PageElement[], id: string): PageElement[] {
  return elements
    .filter(el => el.id !== id)
    .map(el => {
      if (el.children) {
        return {
          ...el,
          children: removeElementFromTree(el.children, id),
        };
      }
      return el;
    });
}

/**
 * Move element in tree
 */
function moveElementInTree(
  elements: PageElement[],
  dragId: string,
  hoverId: string,
  position: 'before' | 'after' | 'inside'
): PageElement[] {
  // Find and remove dragged element
  const dragged = findElementById(elements, dragId);
  if (!dragged) return elements;

  let newElements = removeElementFromTree(elements, dragId);

  // Insert at new position
  if (position === 'inside') {
    newElements = addElementToContainer(newElements, hoverId, dragged);
  } else {
    // Find hover element and insert before/after
    const insertIndex = newElements.findIndex(el => el.id === hoverId);
    if (insertIndex !== -1) {
      const insertPos = position === 'before' ? insertIndex : insertIndex + 1;
      newElements.splice(insertPos, 0, dragged);
    }
  }

  return newElements;
}
