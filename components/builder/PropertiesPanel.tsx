/**
 * PropertiesPanel - Right sidebar for editing selected element properties
 * Similar to Elementor/Webflow properties panel
 */

import React from 'react';
import { PageElement } from '../../types';
import { Settings, X } from 'lucide-react';

interface PropertiesPanelProps {
  element: PageElement;
  onUpdate: (updates: Partial<PageElement>) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ element, onUpdate }) => {
  const handleUpdate = (updates: Partial<PageElement>) => {
    onUpdate(updates);
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto p-4" dir="ltr">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800 flex items-center">
          <Settings size={16} className="mr-2" />
          Propriétés
        </h3>
        <button className="text-xs text-gray-500 hover:text-gray-800">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-6">
        {/* Content Section */}
        {(element.type === 'heading' || element.type === 'text' || element.type === 'button') && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Contenu</label>
            <textarea
              value={element.content || ''}
              onChange={(e) => handleUpdate({ content: e.target.value })}
              rows={3}
              className="w-full text-sm border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        )}

        {/* Image URL */}
        {element.type === 'image' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">URL de l'image</label>
            <input
              type="text"
              value={element.content || ''}
              onChange={(e) => handleUpdate({ content: e.target.value })}
              className="w-full text-sm border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
              placeholder="https://..."
            />
            <label className="block text-xs font-medium text-gray-700 mb-2 mt-2">Texte alternatif</label>
            <input
              type="text"
              value={element.props?.alt || ''}
              onChange={(e) => handleUpdate({ props: { ...element.props, alt: e.target.value } })}
              className="w-full text-sm border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        )}

        {/* Button Properties */}
        {element.type === 'button' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Lien (URL)</label>
              <input
                type="text"
                value={element.props?.href || ''}
                onChange={(e) => handleUpdate({ props: { ...element.props, href: e.target.value } })}
                className="w-full text-sm border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                placeholder="# ou https://..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Cible</label>
              <select
                value={element.props?.target || '_self'}
                onChange={(e) => handleUpdate({ props: { ...element.props, target: e.target.value } })}
                className="w-full text-sm border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="_self">Même fenêtre</option>
                <option value="_blank">Nouvelle fenêtre</option>
              </select>
            </div>
          </>
        )}

        {/* Heading Level */}
        {element.type === 'heading' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Niveau</label>
            <select
              value={element.props?.level || 1}
              onChange={(e) => handleUpdate({ props: { ...element.props, level: parseInt(e.target.value) } })}
              className="w-full text-sm border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
            >
              <option value={1}>H1</option>
              <option value={2}>H2</option>
              <option value={3}>H3</option>
              <option value={4}>H4</option>
              <option value={5}>H5</option>
              <option value={6}>H6</option>
            </select>
          </div>
        )}

        {/* HTML Block */}
        {element.type === 'html-block' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">HTML Personnalisé</label>
            <textarea
              value={element.content || ''}
              onChange={(e) => handleUpdate({ content: e.target.value })}
              rows={10}
              className="w-full text-sm font-mono border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
              placeholder="<div>Votre HTML</div>"
            />
          </div>
        )}

        {/* Style Section */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-xs font-semibold text-gray-700 mb-3">Style</h4>

          {/* Text Alignment */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-2">Alignement</label>
            <div className="flex border border-gray-300 rounded-md overflow-hidden">
              {['left', 'center', 'right'].map((align) => (
                <button
                  key={align}
                  onClick={() => handleUpdate({ style: { ...element.style, textAlign: align as any } })}
                  className={`flex-1 py-1.5 text-xs ${
                    element.style.textAlign === align
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  {align === 'left' ? 'G' : align === 'center' ? 'C' : 'D'}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Couleur Texte</label>
              <input
                type="color"
                value={element.style.color || '#000000'}
                onChange={(e) => handleUpdate({ style: { ...element.style, color: e.target.value } })}
                className="w-full h-8 p-1 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Couleur Fond</label>
              <input
                type="color"
                value={element.style.backgroundColor || '#ffffff'}
                onChange={(e) => handleUpdate({ style: { ...element.style, backgroundColor: e.target.value } })}
                className="w-full h-8 p-1 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* Padding */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-2">Padding</label>
            <input
              type="text"
              value={element.style.padding || ''}
              onChange={(e) => handleUpdate({ style: { ...element.style, padding: e.target.value } })}
              className="w-full text-sm border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
              placeholder="1rem ou 10px"
            />
          </div>

          {/* Font Size */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-2">Taille Police</label>
            <input
              type="text"
              value={element.style.fontSize || ''}
              onChange={(e) => handleUpdate({ style: { ...element.style, fontSize: e.target.value } })}
              className="w-full text-sm border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
              placeholder="1rem ou 16px"
            />
          </div>

          {/* Border Radius */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-2">Coins Arrondis</label>
            <input
              type="text"
              value={element.style.borderRadius || ''}
              onChange={(e) => handleUpdate({ style: { ...element.style, borderRadius: e.target.value } })}
              className="w-full text-sm border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
              placeholder="0.5rem ou 8px"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
