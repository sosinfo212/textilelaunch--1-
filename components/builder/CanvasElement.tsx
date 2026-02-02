/**
 * CanvasElement - Renders a single element in the canvas
 * Handles selection, editing, and nested elements
 */

import React from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { PageElement } from '../../types';
import { GripVertical, Plus } from 'lucide-react';
import { ElementRenderer } from './ElementRenderer';

interface CanvasElementProps {
  element: PageElement;
  layout: any;
  isSelected: boolean;
  selectedElementId: string | null;
  onSelect: () => void;
  onUpdate: (updates: Partial<PageElement>) => void;
  onDelete: () => void;
  onMove: (dragId: string, hoverId: string, position: 'before' | 'after' | 'inside') => void;
  onLayoutUpdate: (layoutData: any) => void;
  onAddElement?: (type: PageElement['type'], targetId?: string) => void;
  depth: number;
}

export const CanvasElement: React.FC<CanvasElementProps> = ({
  element,
  layout,
  isSelected,
  selectedElementId,
  onSelect,
  onUpdate,
  onDelete,
  onMove,
  onLayoutUpdate,
  onAddElement,
  depth,
}) => {
  // Drag handler for reordering
  const [{ isDragging }, drag] = useDrag({
    type: 'canvas-element',
    item: { id: element.id, type: element.type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Drop handler for nested elements
  const [{ isOver }, drop] = useDrop({
    accept: ['builder-element', 'canvas-element'],
    drop: (item: { type?: PageElement['type']; id?: string }) => {
      if (item.id && item.id !== element.id) {
        // Move existing element
        onMove(item.id, element.id, 'inside');
      } else if (item.type && (element.type === 'section' || element.type === 'container')) {
        // Add new element to container
        if (onAddElement) {
          onAddElement(item.type, element.id);
        }
      }
      return { name: element.id };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const canContainChildren = element.type === 'section' || element.type === 'container';

  return (
    <div
      ref={(node) => {
        drag(node);
        if (canContainChildren) {
          drop(node);
        }
      }}
      className={`
        relative group transition-all
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        ${isOver && canContainChildren ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : ''}
      `}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{
        marginLeft: `${depth * 20}px`,
        ...element.style,
      }}
    >
      {/* Element Controls */}
      {isSelected && (
        <div className="absolute -left-8 top-0 flex items-center gap-1 z-10">
          <div className="bg-blue-500 text-white p-1 rounded cursor-move">
            <GripVertical size={12} />
          </div>
        </div>
      )}

      {/* Element Content */}
      <div className="relative">
        <ElementRenderer element={element} />
        
        {/* Add Button for Containers */}
        {canContainChildren && isSelected && (
          <div className="absolute inset-0 border-2 border-dashed border-blue-300 bg-blue-50/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <Plus size={16} />
              <span>Glissez des éléments ici</span>
            </div>
          </div>
        )}
      </div>

      {/* Nested Children */}
      {element.children && element.children.length > 0 && (
        <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-200">
          {element.children.map((child) => (
            <CanvasElement
              key={child.id}
              element={child}
              layout={layout?.[child.id]}
              isSelected={selectedElementId === child.id}
              selectedElementId={selectedElementId}
              onSelect={() => onSelect()}
              onUpdate={(updates) => onUpdate({ children: element.children?.map(c => c.id === child.id ? { ...c, ...updates } : c) })}
              onDelete={() => onUpdate({ children: element.children?.filter(c => c.id !== child.id) })}
              onMove={onMove}
              onLayoutUpdate={onLayoutUpdate}
              onAddElement={onAddElement}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
