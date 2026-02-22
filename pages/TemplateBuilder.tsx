import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { LandingPageTemplate } from '../types';
import { 
    Save, ArrowLeft, CheckCircle, ChevronDown, ChevronUp, Copy
} from 'lucide-react';
import { LandingPageRenderer } from '../components/LandingPageRenderer';

const AVAILABLE_TAGS = [
    { tag: '{notification_bar}', desc: 'Bandeau sticky. Option: {notification_bar|Votre texte}' },
    { tag: '{breadcrumb}', desc: 'Fil d’Ariane (Accueil / Produit)' },
    { tag: '{product_name}', desc: 'Nom du produit' },
    { tag: '{product_price}', desc: 'Prix de vente' },
    { tag: '{product_regular_price}', desc: 'Prix barré' },
    { tag: '{product_price_block}', desc: 'Bloc prix + ancien prix (si défini)' },
    { tag: '{product_sku}', desc: 'SKU (si affiché)' },
    { tag: '{product_image_0}', desc: 'URL image 1' },
    { tag: '{product_image_carousel}', desc: 'Galerie avec miniatures (images + vidéos)' },
    { tag: '{attributes_selector}', desc: 'Sélecteur variantes (taille, couleur…)' },
    { tag: '{quantity_selector}', desc: 'Sélecteur quantité (+ / −)' },
    { tag: '{payment_selector}', desc: 'Choix COD / Paiement en ligne (si les deux activés)' },
    { tag: '{order_form}', desc: 'Formulaire (nom, tél, ville, adresse + bouton)' },
    { tag: '{trust_badges}', desc: 'Badges confiance (livraison, paiement)' },
    { tag: '{product_description}', desc: 'Description brute (HTML ou texte)' },
    { tag: '{product_description_section}', desc: 'Section « Description » avec titre' },
    { tag: '{sticky_cta}', desc: 'Barre fixe bas. Option: {sticky_cta|Order Now}' },
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
    const [htmlCode, setHtmlCode] = useState(DEFAULT_CODE_BOILERPLATE);
    const [copiedTag, setCopiedTag] = useState<string | null>(null);
    const [shortcodesOpen, setShortcodesOpen] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

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
                if (tmpl.htmlCode) setHtmlCode(tmpl.htmlCode);
            }
        }
    }, [templateId, getTemplate]);

    const handleSave = async () => {
        const trimmedName = (name || '').trim();
        if (!trimmedName) {
            setSaveError('Donnez un nom au modèle.');
            return;
        }
        setSaveError(null);
        setSaving(true);
        try {
            const newTemplate: LandingPageTemplate = {
                id: templateId === 'new' ? `tmpl_${Date.now()}` : templateId!,
                ownerId: '',
                name: trimmedName,
                mode: 'code',
                elements: [],
                htmlCode: htmlCode,
                createdAt: Date.now()
            };
            if (templateId === 'new') {
                await addTemplate(newTemplate);
            } else {
                await updateTemplate(newTemplate);
            }
            navigate('/templates');
        } catch (err: any) {
            setSaveError(err?.message || 'Erreur lors de la sauvegarde. Réessayez.');
        } finally {
            setSaving(false);
        }
    };


    return (
        <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-100 font-cairo" dir="rtl">
            {/* Top Bar */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm z-10" dir="ltr">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <button type="button" onClick={() => navigate('/templates')} className="text-gray-500 hover:text-gray-700 flex-shrink-0">
                        <ArrowLeft size={20} />
                    </button>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={e => { setName(e.target.value); setSaveError(null); }} 
                        className="font-bold text-lg border-none focus:ring-0 text-gray-800 bg-transparent placeholder-gray-400 flex-1 min-w-0"
                        placeholder="Nom du modèle (obligatoire)"
                    />
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    {saveError && (
                        <span className="text-sm text-red-600 max-w-[200px] truncate" title={saveError}>{saveError}</span>
                    )}
                    <button 
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Tags (LTR) */}
                <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto p-4 z-20 hidden md:block" dir="ltr">
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
                </div>

                {/* Code Editor and Preview */}
                <div className="flex-1 overflow-hidden relative flex flex-col">
                    {/* Shortcodes panel - visible on all screens */}
                    <div className="bg-white border-b border-gray-200 flex-shrink-0" dir="ltr">
                        <button
                            type="button"
                            onClick={() => setShortcodesOpen(!shortcodesOpen)}
                            className="w-full px-4 py-3 flex items-center justify-between text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            <span className="flex items-center gap-2">
                                <Copy size={16} className="text-brand-600" />
                                Shortcodes (cliquez pour copier)
                            </span>
                            {shortcodesOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        {shortcodesOpen && (
                            <div className="px-4 pb-3 pt-0 max-h-48 overflow-y-auto border-t border-gray-100">
                                <div className="flex flex-wrap gap-2 pt-3">
                                    {AVAILABLE_TAGS.map((tag) => (
                                        <button
                                            key={tag.tag}
                                            type="button"
                                            onClick={async () => {
                                                try {
                                                    await navigator.clipboard.writeText(tag.tag);
                                                    setCopiedTag(tag.tag);
                                                    setTimeout(() => setCopiedTag(null), 2000);
                                                } catch {
                                                    const ta = document.createElement('textarea');
                                                    ta.value = tag.tag;
                                                    ta.style.position = 'fixed';
                                                    ta.style.opacity = '0';
                                                    document.body.appendChild(ta);
                                                    ta.select();
                                                    try {
                                                        document.execCommand('copy');
                                                        setCopiedTag(tag.tag);
                                                        setTimeout(() => setCopiedTag(null), 2000);
                                                    } finally {
                                                        document.body.removeChild(ta);
                                                    }
                                                }
                                            }}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono border transition-all ${
                                                copiedTag === tag.tag
                                                    ? 'bg-green-50 border-green-300 text-green-700'
                                                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-brand-50 hover:border-brand-200'
                                            }`}
                                            title={tag.desc}
                                        >
                                            {tag.tag}
                                            {copiedTag === tag.tag && <CheckCircle size={12} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
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

                    <div className="h-1/2 overflow-y-auto bg-gray-100 p-8 relative">
                        <div className="w-full min-h-full bg-white shadow-xl transition-all relative border border-gray-200 mx-auto max-w-6xl">
                            <LandingPageRenderer templateMode="code" htmlCode={htmlCode} product={MOCK_PRODUCT} formState={formState} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};