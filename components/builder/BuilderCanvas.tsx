/**
 * BuilderCanvas - Main canvas area where elements are dropped and arranged
 * Supports drag-and-drop, selection, and visual editing
 */

import React from 'react';
import { useDrop } from 'react-dnd';
import { PageElement } from '../../types';
import { CanvasElement } from './CanvasElement';
import { Trash2 } from 'lucide-react';

interface BuilderCanvasProps {
  elements: PageElement[];
  layout: any;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<PageElement>) => void;
  onDeleteElement: (id: string) => void;
  onMoveElement: (dragId: string, hoverId: string, position: 'before' | 'after' | 'inside') => void;
  onLayoutUpdate: (id: string, layoutData: any) => void;
  onAddElement: (type: PageElement['type'], targetId?: string) => void;
}

export const BuilderCanvas: React.FC<BuilderCanvasProps> = ({
  elements,
  layout,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onMoveElement,
  onLayoutUpdate,
  onAddElement,
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'builder-element',
    drop: (item: { type: PageElement['type'] }) => {
      // Handle drop from sidebar - trigger add element
      if (item.type && onAddElement) {
        onAddElement(item.type);
      }
      return { name: 'canvas', type: item.type };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={drop}
      className={`
        min-h-full p-8 transition-colors
        ${isOver ? 'bg-blue-50' : 'bg-gray-50'}
      `}
      onClick={(e) => {
        // Deselect when clicking on canvas background
        if (e.target === e.currentTarget) {
          onSelectElement(null);
        }
      }}
    >
      <div className="max-w-6xl mx-auto bg-white shadow-lg min-h-[600px] rounded-lg p-8">
        {elements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-gray-400">
            <p className="text-lg mb-2">Canvas vide</p>
            <p className="text-sm">Glissez des composants depuis la barre latérale</p>
          </div>
        ) : (
          <div className="space-y-4">
            {elements.map((element) => (
              <CanvasElement
                key={element.id}
                element={element}
                layout={layout[element.id]}
                isSelected={selectedElementId === element.id}
                selectedElementId={selectedElementId}
                onSelect={() => onSelectElement(element.id)}
                onUpdate={(updates) => onUpdateElement(element.id, updates)}
                onDelete={() => onDeleteElement(element.id)}
                onMove={onMoveElement}
                onLayoutUpdate={(layoutData) => onLayoutUpdate(element.id, layoutData)}
                onAddElement={onAddElement}
                depth={0}
              />
            ))}
          </div>
        )}

        {/* Delete Zone */}
        {selectedElementId && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
            <button
              onClick={() => onDeleteElement(selectedElementId)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-colors"
            >
              <Trash2 size={16} />
              Supprimer l'élément
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
