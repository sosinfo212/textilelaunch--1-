import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { LandingPageTemplate, PageElement, ElementType } from '../types';
import { 
    Save, ArrowLeft, Type, Image as ImageIcon, Heading, 
    Box, DollarSign, List, ShoppingBag, Minus, Move, Trash2, Settings, ShieldCheck,
    ChevronLeft, ChevronRight, Truck, Star, Plus, CheckCircle, Layout, Code, Eye
} from 'lucide-react';
import { LandingPageRenderer } from '../components/LandingPageRenderer';
import { DragDropBuilder } from '../components/builder/DragDropBuilder';

const COMPONENT_TYPES: { type: ElementType; label: string; icon: React.ReactNode }[] = [
    { type: 'heading', label: 'Titre', icon: <Heading size={16} /> },
    { type: 'text', label: 'Paragraphe', icon: <Type size={16} /> },
    { type: 'image', label: 'Image URL', icon: <ImageIcon size={16} /> },
    { type: 'separator', label: 'Séparateur', icon: <Minus size={16} /> },
    { type: 'feature-item', label: 'Caractéristique', icon: <CheckCircle size={16} /> },
    { type: 'product-title', label: 'Nom Produit (Dyn)', icon: <Box size={16} /> },
    { type: 'product-price', label: 'Prix (Dyn)', icon: <DollarSign size={16} /> },
    { type: 'product-description', label: 'Description (Dyn)', icon: <List size={16} /> },
    { type: 'product-gallery', label: 'Galerie (Dyn)', icon: <ImageIcon size={16} /> },
    { type: 'trust-badges', label: 'Badges Confiance', icon: <ShieldCheck size={16} /> },
    { type: 'order-form', label: 'Formulaire Commande', icon: <ShoppingBag size={16} /> },
];

const AVAILABLE_TAGS = [
    { tag: '{product_name}', desc: 'Nom du produit' },
    { tag: '{product_price}', desc: 'Prix de vente' },
    { tag: '{product_regular_price}', desc: 'Prix barré' },
    { tag: '{product_description}', desc: 'Description complète' },
    { tag: '{product_image_0}', desc: 'URL Image 1' },
    { tag: '{product_image_carousel}', desc: 'Galerie Images avec Miniatures' },
    { tag: '{attributes_selector}', desc: 'Sélecteur Variantes (Radio)' },
    { tag: '{order_form}', desc: 'Formulaire de commande complet' },
];

const DEFAULT_CODE_BOILERPLATE = `
<div class="p-6 max-w-2xl mx-auto font-sans" dir="rtl">
    <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-800">{product_name}</h1>
        <div class="text-2xl text-red-600 font-bold mt-2">{product_price} درهم</div>
    </div>
    
    <!-- Carrousel d'images -->
    <div class="mb-6 rounded-2xl overflow-hidden shadow-lg border border-gray-100">
        {product_image_carousel}
    </div>

    <div class="prose max-w-none text-gray-600 mb-8 px-2">
        {product_description}
    </div>

    <div class="bg-gray-50 p-6 rounded-2xl border border-gray-200 shadow-sm">
        <h3 class="text-xl font-bold mb-4 text-center text-gray-900 border-b pb-2">اطلب الآن 👇</h3>
        
        <!-- Sélecteur de variantes (Taille, Couleur...) -->
        {attributes_selector}

        <!-- Formulaire (Inputs + Bouton) -->
        {order_form}
    </div>
</div>

<!-- Vous pouvez ajouter du CSS personnalisé ici -->
<style>
    .prose strong { color: #000; }
    .tl-attribute-group label { margin-bottom: 0.5rem; display: block; }
</style>
`;

const MOCK_PRODUCT = {
    id: "mock_1",
    ownerId: "mock_owner",
    name: "Montre Connectée Sport Pro",
    price: 499.00,
    regularPrice: 699.00,
    description: "<p>Découvrez la performance ultime avec notre Montre Connectée Sport Pro. <br/>Conçue pour les athlètes exigeants, elle offre un suivi précis de vos performances.</p><ul><li>GPS Intégré</li><li>Autonomie 7 jours</li><li>Étanche 50m</li></ul>",
    images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=800&q=80"],
    attributes: [
        { name: "Couleur", options: ["Noir", "Argent", "Or Rose"] },
        { name: "Bracelet", options: ["Silicone", "Cuir"] }
    ],
    createdAt: Date.now(),
    category: "Electronique",
    supplier: "TechWorld"
};

export const TemplateBuilder: React.FC = () => {
    const { templateId } = useParams<{ templateId: string }>();
    const navigate = useNavigate();
    const { getTemplate, addTemplate, updateTemplate } = useStore();

    const [name, setName] = useState('Nouveau Modèle');
    const [mode, setMode] = useState<'visual' | 'code' | 'drag-drop'>('drag-drop');
    const [elements, setElements] = useState<PageElement[]>([]);
    const [htmlCode, setHtmlCode] = useState(DEFAULT_CODE_BOILERPLATE);
    const [layout, setLayout] = useState<any>({});
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [copiedTag, setCopiedTag] = useState<string | null>(null);

    // Mock Form State for Renderer
    const formState = {
        formData: { fullName: '', phone: '', city: '', address: '' },
        setFormData: () => {},
        selectedAttributes: { "Couleur": "Noir" },
        handleAttributeChange: () => {},
        handleSubmit: (e: any) => e.preventDefault(),
        images: MOCK_PRODUCT.images,
        currentImageIndex: 0,
        setCurrentImageIndex: () => {},
        prevImage: () => {},
        nextImage: () => {}
    };

    useEffect(() => {
        if (templateId && templateId !== 'new') {
            const tmpl = getTemplate(templateId);
            if (tmpl) {
                setName(tmpl.name);
                setMode(tmpl.mode || 'drag-drop'); // Restore mode
                if (tmpl.elements) setElements(tmpl.elements);
                if (tmpl.htmlCode) setHtmlCode(tmpl.htmlCode);
                if (tmpl.layout) setLayout(tmpl.layout);
            }
        }
    }, [templateId, getTemplate]);

    const handleSave = () => {
        const newTemplate: LandingPageTemplate = {
            id: templateId === 'new' ? `tmpl_${Date.now()}` : templateId!,
            ownerId: '',
            name,
            mode,
            elements: mode === 'code' ? [] : elements,
            layout: mode === 'drag-drop' ? layout : undefined,
            htmlCode: mode === 'code' ? htmlCode : undefined,
            createdAt: Date.now()
        };
        
        if (templateId === 'new') {
            addTemplate(newTemplate);
        } else {
            updateTemplate(newTemplate);
        }
        navigate('/templates');
    };

    const handleDragDropSave = (savedElements: PageElement[], savedLayout: any) => {
        setElements(savedElements);
        setLayout(savedLayout);
        // Save template with drag-drop data
        const newTemplate: LandingPageTemplate = {
            id: templateId === 'new' ? `tmpl_${Date.now()}` : templateId!,
            ownerId: '',
            name,
            mode: 'drag-drop',
            elements: savedElements,
            layout: savedLayout,
            createdAt: Date.now()
        };
        
        if (templateId === 'new') {
            addTemplate(newTemplate).then(() => {
                navigate('/templates');
            });
        } else {
            updateTemplate(newTemplate).then(() => {
                navigate('/templates');
            });
        }
    };

    const addElement = (type: ElementType) => {
        const newEl: PageElement = {
            id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            content: type === 'heading' ? 'Votre Titre Ici' : type === 'text' ? 'Votre texte ici...' : type === 'feature-item' ? 'Caractéristique clé' : type === 'image' ? 'https://via.placeholder.com/600x200' : '',
            style: { textAlign: 'left', padding: '10px', width: '100%' }
        };
        setElements([...elements, newEl]);
    };

    const removeElement = (id: string) => {
        setElements(elements.filter(el => el.id !== id));
        if (selectedElementId === id) setSelectedElementId(null);
    };

    const updateElementStyle = (id: string, styleUpdate: Partial<any>) => {
        setElements(elements.map(el => el.id === id ? { ...el, style: { ...el.style, ...styleUpdate } } : el));
    };
    
    const updateElementContent = (id: string, content: string) => {
        setElements(elements.map(el => el.id === id ? { ...el, content } : el));
    };

    const selectedElement = elements.find(el => el.id === selectedElementId);

    // Swap elements functionality
    const moveElement = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === elements.length - 1)) return;
        const newElements = [...elements];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newElements[index], newElements[swapIndex]] = [newElements[swapIndex], newElements[index]];
        setElements(newElements);
    };

    // Render drag-drop builder if mode is drag-drop
    if (mode === 'drag-drop') {
        return (
            <DragDropBuilder
                templateId={templateId || 'new'}
                initialElements={elements}
                onSave={handleDragDropSave}
                templateName={name}
                onNameChange={setName}
            />
        );
    }

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-100 font-cairo" dir="rtl">
            {/* Top Bar */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm z-10" dir="ltr">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/templates')} className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft size={20} />
                    </button>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        className="font-bold text-lg border-none focus:ring-0 text-gray-800 bg-transparent placeholder-gray-400"
                        placeholder="Nom du modèle"
                    />
                    
                    {/* Mode Switcher */}
                    <div className="bg-gray-100 p-1 rounded-lg flex text-sm">
                        <button 
                            onClick={() => setMode('drag-drop')} 
                            className={`px-3 py-1.5 rounded-md flex items-center transition-all ${mode === 'drag-drop' ? 'bg-white shadow text-brand-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Layout size={14} className="mr-2" /> Drag & Drop
                        </button>
                        <button 
                            onClick={() => setMode('visual')} 
                            className={`px-3 py-1.5 rounded-md flex items-center transition-all ${mode === 'visual' ? 'bg-white shadow text-brand-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Layout size={14} className="mr-2" /> Visuel
                        </button>
                        <button 
                            onClick={() => setMode('code')} 
                            className={`px-3 py-1.5 rounded-md flex items-center transition-all ${mode === 'code' ? 'bg-white shadow text-indigo-600 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Code size={14} className="mr-2" /> Code
                        </button>
                    </div>
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
                {/* Sidebar Components (LTR) */}
                <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto p-4 z-20 hidden md:block" dir="ltr">
                    
                    {mode === 'visual' ? (
                        <>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Composants</h3>
                            <div className="space-y-2">
                                {COMPONENT_TYPES.map((comp) => (
                                    <button
                                        key={comp.type}
                                        onClick={() => addElement(comp.type)}
                                        className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors"
                                    >
                                        <span className="mr-3 text-gray-400">{comp.icon}</span>
                                        {comp.label}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="mt-8">
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Structure</h3>
                                <div className="space-y-1">
                                    {elements.map((el, idx) => (
                                        <div key={el.id} 
                                            className={`flex items-center justify-between text-xs p-2 rounded border ${selectedElementId === el.id ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-gray-100 text-gray-600'} cursor-pointer`}
                                            onClick={() => setSelectedElementId(el.id)}
                                        >
                                            <span className="truncate w-24">{el.type}</span>
                                            <div className="flex">
                                                <button onClick={(e) => { e.stopPropagation(); moveElement(idx, 'up'); }} className="p-1 hover:text-brand-600"><ArrowLeft size={10} className="rotate-90" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); moveElement(idx, 'down'); }} className="p-1 hover:text-brand-600"><ArrowLeft size={10} className="-rotate-90" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); removeElement(el.id); }} className="p-1 hover:text-red-600"><Trash2 size={10} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Tags Disponibles</h3>
                            <p className="text-xs text-gray-400 mb-4">Cliquez pour copier</p>
                            <div className="space-y-2">
                                {AVAILABLE_TAGS.map((tag) => (
                                    <button
                                        key={tag.tag}
                                        onClick={async () => {
                                            try {
                                                await navigator.clipboard.writeText(tag.tag);
                                                setCopiedTag(tag.tag);
                                                // Reset after 2 seconds
                                                setTimeout(() => setCopiedTag(null), 2000);
                                            } catch (err) {
                                                // Fallback for older browsers
                                                const textArea = document.createElement('textarea');
                                                textArea.value = tag.tag;
                                                textArea.style.position = 'fixed';
                                                textArea.style.opacity = '0';
                                                document.body.appendChild(textArea);
                                                textArea.select();
                                                try {
                                                    document.execCommand('copy');
                                                    setCopiedTag(tag.tag);
                                                    setTimeout(() => setCopiedTag(null), 2000);
                                                } catch (fallbackErr) {
                                                    console.error('Failed to copy:', fallbackErr);
                                                }
                                                document.body.removeChild(textArea);
                                            }
                                        }}
                                        className={`w-full text-left px-3 py-2 text-xs border rounded-md transition-all group relative ${
                                            copiedTag === tag.tag 
                                                ? 'bg-green-50 border-green-300 shadow-sm' 
                                                : 'border-gray-200 hover:bg-indigo-50 hover:border-indigo-200'
                                        }`}
                                    >
                                        <div className={`font-mono font-bold ${
                                            copiedTag === tag.tag ? 'text-green-600' : 'text-indigo-600'
                                        }`}>
                                            {tag.tag}
                                        </div>
                                        <div className="text-gray-500">{tag.desc}</div>
                                        {copiedTag === tag.tag && (
                                            <div className="absolute top-1 right-1 text-green-600">
                                                <CheckCircle size={14} />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-6 text-xs text-gray-500">
                                <strong>Note:</strong> Vous pouvez utiliser du HTML, CSS (&lt;style&gt;) et JS (&lt;script&gt;) brut.
                                Pour le formulaire, utilisez le tag <code>{`{order_form}`}</code> ou créez vos inputs avec les IDs: <code>tl-full-name</code>, <code>tl-phone</code>, <code>tl-city</code>, <code>tl-address</code>, <code>tl-btn-submit</code>.
                            </div>
                        </>
                    )}
                </div>

                {/* Canvas / Editor */}
                <div className="flex-1 overflow-hidden relative flex flex-col">
                    {mode === 'code' && (
                         <div className="h-1/2 border-b border-gray-200 flex flex-col" dir="ltr">
                             <div className="bg-gray-800 text-white text-xs px-4 py-2 flex justify-between">
                                 <span>Éditeur HTML/CSS</span>
                             </div>
                             <textarea 
                                className="flex-1 w-full p-4 font-mono text-sm bg-gray-900 text-gray-100 focus:outline-none resize-none"
                                value={htmlCode}
                                onChange={(e) => setHtmlCode(e.target.value)}
                                spellCheck={false}
                             />
                         </div>
                    )}

                    <div className={`${mode === 'code' ? 'h-1/2' : 'h-full'} overflow-y-auto bg-gray-100 p-8 relative`}>
                         {/* Overlay for selection in Visual Mode */}
                         <div className="w-full min-h-full bg-white shadow-xl transition-all relative border border-gray-200 mx-auto max-w-6xl" onClick={() => setSelectedElementId(null)}>
                             {mode === 'visual' ? (
                                 <div className="w-full flex flex-wrap content-start items-stretch">
                                    {elements.map((el) => {
                                        const isSelected = selectedElementId === el.id;
                                        const width = el.style.width || '100%';
                                        
                                        return (
                                            <div 
                                                key={el.id}
                                                style={{ width: width }}
                                                className={`relative group ${isSelected ? 'ring-2 ring-brand-500 z-10' : 'hover:ring-1 hover:ring-gray-300'}`}
                                                onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); }}
                                            >
                                                <div style={{ pointerEvents: 'none' }}>
                                                    <LandingPageRenderer elements={[el]} product={MOCK_PRODUCT} formState={formState} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {elements.length === 0 && (
                                        <div className="w-full h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 m-8 rounded-lg" dir="ltr">
                                            <p>Ajoutez des composants depuis la gauche</p>
                                        </div>
                                    )}
                                 </div>
                             ) : (
                                 <LandingPageRenderer templateMode="code" htmlCode={htmlCode} product={MOCK_PRODUCT} formState={formState} />
                             )}
                         </div>
                    </div>
                </div>

                {/* Properties Panel (Visual Mode Only) */}
                {mode === 'visual' && selectedElement && (
                    <div className="w-72 bg-white border-l border-gray-200 p-4 overflow-y-auto shadow-xl z-20" dir="ltr">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-800 flex items-center">
                                <Settings size={16} className="mr-2" />
                                Propriétés
                            </h3>
                            <button onClick={() => setSelectedElementId(null)} className="text-xs text-gray-500 hover:text-gray-800">Fermer</button>
                        </div>
                        
                        <div className="space-y-4">
                            {/* Content Editing */}
                            {(selectedElement.type === 'heading' || selectedElement.type === 'text' || selectedElement.type === 'feature-item') && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Contenu</label>
                                    <textarea 
                                        rows={3}
                                        value={selectedElement.content} 
                                        onChange={e => updateElementContent(selectedElement.id, e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                                    />
                                </div>
                            )}

                            {/* Layout Width */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center"><Layout size={12} className="mr-1"/> Largeur (Layout)</label>
                                <div className="grid grid-cols-4 gap-1">
                                    {['100%', '75%', '66%', '50%', '33%', '25%'].map((w) => (
                                        <button
                                            key={w}
                                            onClick={() => updateElementStyle(selectedElement.id, { width: w })}
                                            className={`py-1 text-[10px] rounded border ${selectedElement.style.width === w ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200'}`}
                                        >
                                            {w}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Alignment */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Alignement Texte</label>
                                <div className="flex border border-gray-300 rounded-md overflow-hidden">
                                    {['left', 'center', 'right'].map((align) => (
                                        <button
                                            key={align}
                                            onClick={() => updateElementStyle(selectedElement.id, { textAlign: align })}
                                            className={`flex-1 py-1.5 text-xs ${selectedElement.style.textAlign === align ? 'bg-brand-100 text-brand-700' : 'bg-white hover:bg-gray-50'}`}
                                        >
                                            {align === 'left' ? 'G' : align === 'center' ? 'C' : 'D'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Colors */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Texte</label>
                                    <input 
                                        type="color"
                                        value={selectedElement.style.color || '#000000'}
                                        onChange={e => updateElementStyle(selectedElement.id, { color: e.target.value })}
                                        className="w-full h-8 p-1 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Fond</label>
                                    <input 
                                        type="color"
                                        value={selectedElement.style.backgroundColor || '#ffffff'}
                                        onChange={e => updateElementStyle(selectedElement.id, { backgroundColor: e.target.value })}
                                        className="w-full h-8 p-1 border border-gray-300 rounded-md"
                                    />
                                </div>
                            </div>
                            
                            {/* Effects */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Effets</label>
                                <div className="flex gap-2 text-xs">
                                     <label className="flex items-center">
                                         <input 
                                            type="checkbox" 
                                            checked={selectedElement.style.boxShadow === 'lg'}
                                            onChange={(e) => updateElementStyle(selectedElement.id, { boxShadow: e.target.checked ? 'lg' : 'none' })}
                                            className="mr-1"
                                        /> Ombre
                                     </label>
                                     <label className="flex items-center">
                                         <input 
                                            type="checkbox" 
                                            checked={selectedElement.style.animation === 'pulse'}
                                            onChange={(e) => updateElementStyle(selectedElement.id, { animation: e.target.checked ? 'pulse' : 'none' })}
                                            className="mr-1"
                                        /> Animation
                                     </label>
                                </div>
                            </div>

                             <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Padding</label>
                                <select 
                                    value={selectedElement.style.padding || '1rem'}
                                    onChange={e => updateElementStyle(selectedElement.id, { padding: e.target.value })}
                                    className="w-full text-sm border-gray-300 rounded-md"
                                >
                                    <option value="0">0</option>
                                    <option value="1rem">1rem</option>
                                    <option value="2rem">2rem</option>
                                    <option value="3rem">3rem</option>
                                    <option value="5rem">5rem</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};