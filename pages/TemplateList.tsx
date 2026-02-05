import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Plus, Edit3, Trash2, LayoutTemplate, Copy, X, Check, Filter } from 'lucide-react';
import { TEMPLATE_LIBRARY, TemplatePreset } from '../constants/templateLibrary';
import { LandingPageTemplate } from '../types';

export const TemplateList: React.FC = () => {
  const { templates, deleteTemplate, addTemplate } = useStore();
  const navigate = useNavigate();
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tout');
  const [isAdding, setIsAdding] = useState<string | null>(null);

  // Extract unique categories
  const categories = ['Tout', ...Array.from(new Set(TEMPLATE_LIBRARY.map(t => t.category)))];

  const handleUseTemplate = async (preset: TemplatePreset) => {
      if (isAdding) return; // Prevent double clicks
      
      try {
          setIsAdding(preset.id);
          
          // Create a fresh copy of the elements with new IDs to avoid conflicts if used multiple times
          // and ensure styling is isolated
          const freshElements = preset.elements.map(el => ({
              ...el,
              id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }));

          const newTemplate: LandingPageTemplate = {
              id: `tmpl_${Date.now()}`,
              ownerId: '', // Will be assigned by context
              name: `${preset.name} (Copie)`,
              mode: preset.mode,
              elements: freshElements,
              htmlCode: preset.htmlCode,
              createdAt: Date.now()
          };

          await addTemplate(newTemplate);
          
          // Small delay to show feedback
          setTimeout(() => {
              setIsGalleryOpen(false);
              setIsAdding(null);
          }, 500);
          
      } catch (error) {
          console.error('Error adding template:', error);
          setIsAdding(null);
          alert('❌ Erreur lors de l\'ajout du modèle. Veuillez réessayer.');
      }
  };

  const filteredLibrary = selectedCategory === 'Tout' 
    ? TEMPLATE_LIBRARY 
    : TEMPLATE_LIBRARY.filter(t => t.category === selectedCategory);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modèles de Landing Page</h1>
          <p className="mt-1 text-sm text-gray-500">Gérez vos designs personnalisés.</p>
        </div>
        <div className="flex gap-2">
            <Link
            to="/builder/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 transition-colors"
            >
            <Plus className="mr-2 h-4 w-4" />
            Créer un modèle
            </Link>
        </div>
      </div>

      {/* User's Templates */}
      {templates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <LayoutTemplate className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun modèle personnalisé</h3>
          <p className="mt-1 text-sm text-gray-500">Commencez par choisir un modèle dans la bibliothèque.</p>
          <button 
            onClick={() => setIsGalleryOpen(true)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-brand-700 bg-brand-100 hover:bg-brand-200"
          >
            Ouvrir la galerie
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div key={template.id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 hover:shadow-md transition-all duration-200 group">
              <div className="h-32 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border-b border-gray-100 relative overflow-hidden">
                  {/* Abstract Preview based on content */}
                  <div className="space-y-2 w-1/2 opacity-40 transform group-hover:scale-105 transition-transform duration-300">
                      <div className="h-2 bg-gray-400 rounded w-full"></div>
                      <div className="h-2 bg-gray-400 rounded w-2/3 mx-auto"></div>
                      <div className="h-8 bg-gray-300 rounded w-full mt-2 shadow-sm"></div>
                  </div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 truncate">
                  {template.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-green-400 mr-2"></span>
                    {template.elements.length} éléments • {new Date(template.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-4 flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link 
                        to={`/builder/${template.id}`} 
                        className="flex-1 inline-flex justify-center items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                        <Edit3 className="mr-1 h-3 w-3" /> Éditer
                    </Link>
                    <button 
                        onClick={async () => {
                            if (window.confirm('Êtes-vous sûr de vouloir supprimer ce modèle ?')) {
                                try {
                                    await deleteTemplate(template.id);
                                } catch (error) {
                                    alert('Erreur lors de la suppression. Veuillez réessayer.');
                                    console.error(error);
                                }
                            }
                        }}
                        className="inline-flex justify-center items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Gallery Modal */}
      {isGalleryOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white z-10">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                        <LayoutTemplate className="mr-2 text-brand-600" />
                        Bibliothèque de Modèles
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Choisissez une base professionnelle pour commencer.</p>
                </div>
                <button onClick={() => setIsGalleryOpen(false)} className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors">
                    <X size={24} />
                </button>
            </div>

            {/* Filter Bar */}
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 overflow-x-auto flex-shrink-0">
                <div className="flex space-x-2">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200
                                ${selectedCategory === cat 
                                    ? 'bg-brand-600 text-white shadow-md transform scale-105' 
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 hover:border-gray-300'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Gallery Grid */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
                {filteredLibrary.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-16">
                        <LayoutTemplate className="h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucun modèle disponible</h3>
                        <p className="text-sm text-gray-500 mb-6">Créez vos propres modèles personnalisés.</p>
                        <Link
                            to="/builder/new"
                            onClick={() => setIsGalleryOpen(false)}
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 transition-colors"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Créer un modèle
                        </Link>
                    </div>
                ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredLibrary.map(preset => (
                        <div 
                            key={preset.id} 
                            onClick={() => handleUseTemplate(preset)}
                            className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-xl hover:border-brand-300 hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full relative ${
                                isAdding === preset.id ? 'opacity-50 pointer-events-none' : ''
                            }`}
                        >
                            {/* Visual Mockup */}
                            <div className="h-40 bg-gray-50 relative border-b border-gray-100 p-4 overflow-hidden">
                                {/* Simulated Content */}
                                <div className="absolute inset-0 flex flex-col items-center justify-start pt-6 px-6 opacity-60 group-hover:opacity-80 transition-opacity">
                                    {/* Header Simulation */}
                                    {preset.elements.find(el => el.type === 'heading' && el.style.backgroundColor) && (
                                        <div className="w-full h-3 mb-3 rounded-sm absolute top-0 left-0 right-0" style={{ backgroundColor: preset.elements.find(el => el.type === 'heading')?.style.backgroundColor }}></div>
                                    )}
                                    
                                    <div className="w-3/4 h-2 bg-gray-300 rounded mb-2"></div>
                                    <div className="w-1/2 h-2 bg-gray-300 rounded mb-4"></div>
                                    
                                    {/* Image Simulation */}
                                    <div className="w-full h-12 bg-indigo-50 rounded-md border border-indigo-100 flex items-center justify-center">
                                        <div className="w-8 h-8 rounded-full bg-indigo-200 opacity-50"></div>
                                    </div>
                                    
                                    {/* Button Simulation */}
                                    <div className="mt-3 w-2/3 h-6 bg-gray-800 rounded-md opacity-20"></div>
                                </div>

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-brand-900 bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center backdrop-blur-[1px] opacity-0 group-hover:opacity-100">
                                    <span className="bg-white text-brand-700 px-4 py-2 rounded-full font-bold shadow-lg transform scale-90 group-hover:scale-100 transition-all flex items-center">
                                        {isAdding === preset.id ? (
                                            <>⏳ Ajout...</>
                                        ) : (
                                            <>
                                                <Check size={16} className="mr-1" /> Choisir
                                            </>
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-4 flex flex-col flex-1 justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-gray-900 leading-tight">{preset.name}</h3>
                                    </div>
                                    <p className="text-xs text-gray-500">{preset.elements.length} composants</p>
                                </div>
                                <div className="mt-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                                        ${preset.category === 'Classique' ? 'bg-blue-50 text-blue-700' : 
                                          preset.category === 'Moderne' ? 'bg-gray-100 text-gray-700' :
                                          preset.category === 'Luxe' ? 'bg-yellow-50 text-yellow-700' :
                                          preset.category === 'Urgence' ? 'bg-red-50 text-red-700' :
                                          preset.category === 'Niche' ? 'bg-purple-50 text-purple-700' :
                                          'bg-green-50 text-green-700'
                                        }`}>
                                        {preset.category}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};