import { PageElement } from '../types';

const createId = () => `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper to quickly build elements with specific Layouts
const el = (type: PageElement['type'], width = '100%', props: Partial<PageElement['style']> = {}, content = ''): PageElement => ({
    id: createId(),
    type,
    content,
    style: { width, padding: '1rem', ...props }
});

export interface TemplatePreset {
    id: string;
    name: string;
    category: 'Classique' | 'Moderne' | 'Luxe' | 'Urgence' | 'Niche' | 'Experimental';
    mode: 'visual' | 'code';
    elements: PageElement[];
    htmlCode?: string;
}

export const TEMPLATE_LIBRARY: TemplatePreset[] = [
    // ==========================================================================================
    // 1. CLASSIC STACK (Safe, Vertical)
    // ==========================================================================================
    {
        id: 't_01', name: 'Maroc Standard', category: 'Classique', mode: 'visual',
        elements: [
            el('heading', '100%', { backgroundColor: '#dc2626', color: '#fff', textAlign: 'center', fontSize: 'text-xl' }, '🔥 PROMO : LIVRAISON GRATUITE 🔥'),
            el('product-title', '100%', { textAlign: 'center' }),
            el('product-gallery', '100%', { padding: '0 1rem' }),
            el('product-price', '100%', { textAlign: 'center', color: '#dc2626', fontSize: 'text-4xl' }),
            el('trust-badges', '100%'),
            el('product-description', '100%'),
            el('order-form', '100%', { boxShadow: 'lg', border: '2px dashed #dc2626' })
        ]
    },
    {
        id: 't_02', name: 'Clean Blue', category: 'Classique', mode: 'visual',
        elements: [
            el('heading', '100%', { backgroundColor: '#eff6ff', color: '#1e40af', textAlign: 'center' }, 'Satisfait ou Remboursé'),
            el('product-title', '100%', { textAlign: 'center', color: '#1e40af' }),
            el('product-gallery', '100%'),
            el('product-price', '100%', { textAlign: 'center', color: '#2563eb' }),
            el('product-description', '100%'),
            el('order-form', '100%', { backgroundColor: '#f9fafb', borderRadius: '1rem' })
        ]
    },
    {
        id: 't_03', name: 'Simple White', category: 'Classique', mode: 'visual',
        elements: [
            el('product-gallery', '100%', { padding: '2rem 1rem' }),
            el('product-title', '100%', { textAlign: 'left', fontSize: 'text-2xl' }),
            el('product-price', '100%', { textAlign: 'left', color: '#333' }),
            el('product-description', '100%', { textAlign: 'left' }),
            el('order-form', '100%')
        ]
    },
    {
        id: 't_04', name: 'Elegant Serif', category: 'Classique', mode: 'visual',
        elements: [
            el('heading', '100%', { textAlign: 'center', color: '#4b5563', fontSize: 'text-sm' }, 'COLLECTION 2024'),
            el('product-title', '100%', { textAlign: 'center', fontSize: 'text-5xl', fontFamily: 'serif' }),
            el('separator', '100%'),
            el('product-gallery', '100%'),
            el('product-price', '100%', { textAlign: 'center', fontSize: 'text-3xl' }),
            el('product-description', '100%', { textAlign: 'center', fontFamily: 'serif' }),
            el('order-form', '100%')
        ]
    },
    {
        id: 't_05', name: 'Compact Mobile', category: 'Classique', mode: 'visual',
        elements: [
            el('product-title', '100%', { fontSize: 'text-xl', textAlign: 'center' }),
            el('product-gallery', '100%', { padding: '0' }),
            el('product-price', '100%', { textAlign: 'center', backgroundColor: '#f3f4f6', padding: '1rem' }),
            el('product-description', '100%', { fontSize: 'text-sm' }),
            el('order-form', '100%')
        ]
    },

    // ==========================================================================================
    // 2. MODERNE (Split & Grid)
    // ==========================================================================================
    {
        id: 't_06', name: 'Split Content', category: 'Moderne', mode: 'visual',
        elements: [
            el('product-gallery', '50%', { padding: '1rem' }),
            el('product-title', '50%', { padding: '2rem 1rem 0 1rem', textAlign: 'left', fontSize: 'text-3xl' }),
            el('text', '50%', { textAlign: 'left', color: '#666', fontSize: 'text-sm' }, 'Découvrez la qualité exceptionnelle.'),
            el('product-price', '50%', { padding: '0 1rem', textAlign: 'left', fontSize: 'text-2xl', color: '#2563eb' }),
            el('product-description', '100%', { padding: '2rem', backgroundColor: '#f9fafb' }),
            el('order-form', '100%', { padding: '2rem' })
        ]
    },
    {
        id: 't_07', name: 'Zig Zag', category: 'Moderne', mode: 'visual',
        elements: [
            el('product-title', '100%', { textAlign: 'center', fontSize: 'text-4xl', marginBottom: '1rem' }),
            el('product-gallery', '50%', { padding: '0' }),
            el('product-price', '50%', { backgroundColor: '#f3f4f6', padding: '3rem', fontSize: 'text-4xl', textAlign: 'center' }),
            el('product-description', '50%', { backgroundColor: '#f3f4f6', padding: '2rem' }),
            el('order-form', '50%', { backgroundColor: '#fff', padding: '2rem' })
        ]
    },
    {
        id: 't_08', name: 'Asymmetric Focus', category: 'Moderne', mode: 'visual',
        elements: [
            el('product-gallery', '66%', { padding: '0' }),
            el('product-title', '33%', { backgroundColor: '#000', color: '#fff', padding: '2rem', textAlign: 'center' }),
            el('product-description', '66%', { padding: '3rem' }),
            el('product-price', '33%', { backgroundColor: '#111', color: '#fff', textAlign: 'center', fontSize: 'text-3xl' }),
            el('order-form', '100%', { backgroundColor: '#f9fafb' })
        ]
    },
    {
        id: 't_09', name: 'Modern Grid', category: 'Moderne', mode: 'visual',
        elements: [
            el('product-title', '100%', { textAlign: 'center' }),
            el('product-price', '100%', { textAlign: 'center', color: '#059669', fontSize: 'text-2xl' }),
            el('product-gallery', '100%', { padding: '1rem 5rem' }),
            el('feature-item', '33%', { backgroundColor: '#f0fdf4' }, 'Eco-friendly'),
            el('feature-item', '33%', { backgroundColor: '#eff6ff' }, 'Durable'),
            el('feature-item', '33%', { backgroundColor: '#fef2f2' }, 'Premium'),
            el('product-description', '100%', { padding: '2rem' }),
            el('order-form', '100%', { maxWidth: '600px', margin: '0 auto' } as any)
        ]
    },
    {
        id: 't_10', name: 'Minimalist Split', category: 'Moderne', mode: 'visual',
        elements: [
            el('product-gallery', '50%', { padding: '0' }),
            el('product-title', '50%', { padding: '4rem 2rem 0', textAlign: 'left', fontSize: 'text-4xl' }),
            el('product-price', '50%', { padding: '0 2rem', textAlign: 'left', fontSize: 'text-2xl' }),
            el('product-description', '50%', { padding: '1rem 2rem', textAlign: 'left' }),
            el('order-form', '100%', { padding: '2rem', borderTop: '1px solid #eee' })
        ]
    },

    // ==========================================================================================
    // 3. LUXE & DARK (High Contrast)
    // ==========================================================================================
    {
        id: 't_11', name: 'Dark Mode Gold', category: 'Luxe', mode: 'visual',
        elements: [
            el('heading', '100%', { backgroundColor: '#000', color: '#d4af37', textAlign: 'center', fontSize: 'text-sm' }, 'PRESTIGE COLLECTION'),
            el('product-gallery', '50%', { backgroundColor: '#111' }),
            el('product-title', '50%', { backgroundColor: '#111', color: '#fff', padding: '3rem 2rem 1rem' }),
            el('product-description', '50%', { backgroundColor: '#111', color: '#ccc', textAlign: 'left', padding: '0 2rem' }),
            el('product-price', '50%', { backgroundColor: '#111', color: '#d4af37', padding: '0 2rem', fontSize: 'text-3xl' }),
            el('order-form', '100%', { backgroundColor: '#1c1c1c', border: '1px solid #333' })
        ]
    },
    {
        id: 't_12', name: 'Full Image Hero', category: 'Luxe', mode: 'visual',
        elements: [
            el('product-gallery', '100%', { padding: '0', height: '50vh' } as any),
            el('product-title', '100%', { textAlign: 'center', fontSize: 'text-4xl', marginTop: '-2rem', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)' } as any),
            el('product-price', '100%', { textAlign: 'center', fontSize: 'text-3xl', marginTop: '1rem' }),
            el('product-description', '100%', { padding: '2rem 4rem', textAlign: 'center' }),
            el('order-form', '100%', { maxWidth: '600px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '1rem', boxShadow: 'lg' } as any)
        ]
    },
    {
        id: 't_13', name: 'Royal Purple', category: 'Luxe', mode: 'visual',
        elements: [
            el('product-gallery', '60%', { padding: '1rem' }),
            el('product-title', '40%', { backgroundColor: '#581c87', color: '#fff', padding: '2rem' }),
            el('product-price', '40%', { backgroundColor: '#581c87', color: '#e9d5ff', fontSize: 'text-3xl' }),
            el('product-description', '40%', { backgroundColor: '#6b21a8', color: '#fff', padding: '2rem' }),
            el('order-form', '100%', { backgroundColor: '#f3e8ff' })
        ]
    },
    {
        id: 't_14', name: 'High End Clean', category: 'Luxe', mode: 'visual',
        elements: [
            el('heading', '100%', { textAlign: 'center', fontSize: 'text-xs', color: '#999' }, 'AUTHENTIC QUALITY'),
            el('product-title', '100%', { textAlign: 'center', fontSize: 'text-5xl', fontFamily: 'serif' }),
            el('product-price', '100%', { textAlign: 'center', fontSize: 'text-2xl', color: '#444' }),
            el('separator', '50%', { margin: '0 auto' } as any),
            el('product-gallery', '50%'),
            el('product-description', '50%', { padding: '3rem', textAlign: 'left' }),
            el('order-form', '100%', { backgroundColor: '#f8f8f8' })
        ]
    },
    {
        id: 't_15', name: 'Vibrant Pop', category: 'Luxe', mode: 'visual',
        elements: [
            el('product-gallery', '50%', { backgroundColor: '#fdf2f8' }),
            el('product-title', '50%', { backgroundColor: '#fce7f3', color: '#be185d', padding: '4rem 2rem 1rem' }),
            el('product-price', '50%', { backgroundColor: '#fce7f3', color: '#be185d', fontSize: 'text-5xl' }),
            el('product-description', '50%', { backgroundColor: '#fff', padding: '2rem' }),
            el('order-form', '50%', { backgroundColor: '#fff' })
        ]
    },

    // ==========================================================================================
    // 4. URGENCY & SALES
    // ==========================================================================================
    {
        id: 't_16', name: 'Urgency: Sidebar Form', category: 'Urgence', mode: 'visual',
        elements: [
            el('heading', '100%', { backgroundColor: '#ef4444', color: '#fff', textAlign: 'center' }, '🚨 OFFRE EXPIRANT BIENTÔT'),
            el('product-gallery', '66%'),
            el('order-form', '33%', { border: '4px solid #ef4444', animation: 'pulse' }),
            el('product-title', '66%', { fontSize: 'text-2xl' }),
            el('product-price', '66%', { color: '#ef4444', fontSize: 'text-4xl' }),
            el('product-description', '100%', { padding: '1rem' })
        ]
    },
    {
        id: 't_17', name: 'Black Friday Grid', category: 'Urgence', mode: 'visual',
        elements: [
            el('heading', '100%', { backgroundColor: '#000', color: '#fff', fontSize: 'text-3xl', textAlign: 'center' }, 'BLACK FRIDAY'),
            el('product-title', '50%', { backgroundColor: '#000', color: '#fff', padding: '2rem' }),
            el('product-price', '50%', { backgroundColor: '#000', color: '#fbbf24', fontSize: 'text-4xl', padding: '2rem' }),
            el('product-gallery', '100%', { padding: '0' }),
            el('product-description', '100%', { padding: '2rem', backgroundColor: '#fef3c7' }),
            el('order-form', '100%', { backgroundColor: '#fff' })
        ]
    },
    {
        id: 't_18', name: 'Flash Deal Split', category: 'Urgence', mode: 'visual',
        elements: [
            el('product-gallery', '50%'),
            el('heading', '50%', { color: '#dc2626', fontSize: 'text-2xl', padding: '2rem 1rem 0' }, '⚡ VENTE FLASH'),
            el('product-title', '50%', { textAlign: 'left', padding: '0 1rem' }),
            el('product-price', '50%', { textAlign: 'left', padding: '0 1rem', fontSize: 'text-5xl', color: '#dc2626' }),
            el('product-description', '50%', { padding: '1rem', textAlign: 'left' }),
            el('order-form', '100%', { padding: '1rem', backgroundColor: '#fef2f2' })
        ]
    },
    {
        id: 't_19', name: 'Timer Focus', category: 'Urgence', mode: 'visual',
        elements: [
            el('heading', '100%', { textAlign: 'center', backgroundColor: '#fee2e2', color: '#991b1b' }, 'Stock Faible : Commandez maintenant'),
            el('product-title', '100%', { textAlign: 'center' }),
            el('product-gallery', '100%', { padding: '0 5rem' }),
            el('product-price', '100%', { textAlign: 'center', animation: 'bounce', fontSize: 'text-4xl', color: '#dc2626' }),
            el('product-description', '100%', { textAlign: 'center' }),
            el('order-form', '100%', { maxWidth: '500px', margin: '0 auto' } as any)
        ]
    },
    {
        id: 't_20', name: 'Sticky Action', category: 'Urgence', mode: 'visual',
        elements: [
            el('product-title', '60%', { fontSize: 'text-3xl', padding: '1rem' }),
            el('product-price', '40%', { fontSize: 'text-3xl', padding: '1rem', color: '#dc2626', textAlign: 'right' }),
            el('product-gallery', '60%'),
            el('product-description', '40%', { backgroundColor: '#f3f4f6' }),
            el('order-form', '100%', { position: 'sticky', bottom: '0', backgroundColor: '#fff', zIndex: '50', boxShadow: 'lg', padding: '1rem' } as any)
        ]
    },

    // ==========================================================================================
    // 5. NICHE
    // ==========================================================================================
    {
        id: 't_21', name: 'Tech Specs Grid', category: 'Niche', mode: 'visual',
        elements: [
            el('product-title', '70%', { textAlign: 'left', fontSize: 'text-3xl' }),
            el('product-price', '30%', { textAlign: 'right', fontSize: 'text-3xl', color: '#2563eb' }),
            el('product-gallery', '50%'),
            el('product-description', '50%', { fontSize: 'text-sm' }),
            el('feature-item', '25%', {}, '4K HDR'),
            el('feature-item', '25%', {}, '5G Ready'),
            el('feature-item', '25%', {}, '120Hz'),
            el('feature-item', '25%', {}, '5000mAh'),
            el('order-form', '100%')
        ]
    },
    {
        id: 't_22', name: 'Beauty Soft', category: 'Niche', mode: 'visual',
        elements: [
            el('product-gallery', '50%', { borderRadius: '0 50% 50% 0' }),
            el('product-title', '50%', { padding: '4rem 1rem 0' }),
            el('product-price', '50%', { padding: '0 1rem', color: '#db2777', fontSize: 'text-3xl' }),
            el('product-description', '50%', { padding: '1rem' }),
            el('order-form', '50%', { backgroundColor: '#fdf2f8' })
        ]
    },
    {
        id: 't_23', name: 'Home Decor Wide', category: 'Niche', mode: 'visual',
        elements: [
            el('product-gallery', '75%', { padding: '0' }),
            el('product-price', '25%', { backgroundColor: '#78350f', color: '#fff', fontSize: 'text-2xl', padding: '3rem 1rem' }),
            el('product-title', '75%', { fontSize: 'text-3xl', padding: '2rem' }),
            el('product-description', '25%', { backgroundColor: '#fff8f1', padding: '1rem' }),
            el('order-form', '100%', { backgroundColor: '#fff' })
        ]
    },
    {
        id: 't_24', name: 'Kids Fun', category: 'Niche', mode: 'visual',
        elements: [
            el('heading', '100%', { textAlign: 'center', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '0 0 50% 50%' }, 'POUR LES PETITS'),
            el('product-gallery', '100%', { padding: '1rem 3rem' }),
            el('product-title', '100%', { textAlign: 'center', color: '#0ea5e9', fontSize: 'text-3xl' }),
            el('product-price', '100%', { textAlign: 'center', fontSize: 'text-2xl' }),
            el('product-description', '100%', { textAlign: 'center' }),
            el('order-form', '100%', { border: '3px solid #0ea5e9', borderRadius: '1rem' })
        ]
    },
    {
        id: 't_25', name: 'Fitness Bold', category: 'Niche', mode: 'visual',
        elements: [
            el('product-title', '50%', { backgroundColor: '#000', color: '#eab308', padding: '3rem', fontSize: 'text-4xl', fontStyle: 'italic' }),
            el('product-price', '50%', { backgroundColor: '#000', color: '#fff', fontSize: 'text-4xl', padding: '3rem' }),
            el('product-gallery', '50%', { backgroundColor: '#000' }),
            el('product-description', '50%', { backgroundColor: '#111', color: '#fff', padding: '2rem' }),
            el('order-form', '100%', { backgroundColor: '#eab308' })
        ]
    },

    // ==========================================================================================
    // 6. EXPERIMENTAL
    // ==========================================================================================
    {
        id: 't_26', name: 'The Mosaic', category: 'Experimental', mode: 'visual',
        elements: [
            el('product-gallery', '33%', { padding: '0' }),
            el('product-title', '33%', { backgroundColor: '#f3f4f6', padding: '2rem' }),
            el('product-gallery', '33%', { padding: '0' }), 
            el('product-price', '33%', { backgroundColor: '#f3f4f6', padding: '2rem', fontSize: 'text-2xl' }),
            el('product-description', '33%', { padding: '1rem' }),
            el('order-form', '33%', { backgroundColor: '#fff', border: '1px solid #eee' })
        ]
    },
    {
        id: 't_27', name: 'Center Stage', category: 'Experimental', mode: 'visual',
        elements: [
            el('product-gallery', '33%'),
            el('order-form', '34%', { boxShadow: 'xl', zIndex: '10' } as any),
            el('product-gallery', '33%'),
            el('product-title', '100%', { textAlign: 'center', marginTop: '-1rem' }),
            el('product-price', '100%', { textAlign: 'center', fontSize: 'text-3xl' }),
            el('product-description', '100%', { textAlign: 'center' })
        ]
    },
    {
        id: 't_28', name: 'Inverted', category: 'Experimental', mode: 'visual',
        elements: [
            el('order-form', '100%', { backgroundColor: '#f8fafc', padding: '2rem' }),
            el('heading', '100%', { textAlign: 'center', fontSize: 'text-xs' }, 'DÉTAILS CI-DESSOUS'),
            el('product-title', '50%', { textAlign: 'right' }),
            el('product-price', '50%', { textAlign: 'left', fontSize: 'text-2xl' }),
            el('product-description', '100%'),
            el('product-gallery', '100%')
        ]
    },
    {
        id: 't_29', name: 'Magazine Layout', category: 'Experimental', mode: 'visual',
        elements: [
            el('heading', '25%', { fontSize: 'text-6xl', color: '#e5e5e5', padding: '0' }, '01'),
            el('product-title', '75%', { fontSize: 'text-5xl', textAlign: 'left', padding: '2rem 0' }),
            el('separator', '100%'),
            el('product-price', '33%', { fontSize: 'text-3xl' }),
            el('text', '33%', {}, 'Un produit révolutionnaire.'),
            el('product-description', '33%', {}),
            el('product-gallery', '100%'),
            el('order-form', '100%')
        ]
    },
    {
        id: 't_30', name: 'Card Style', category: 'Experimental', mode: 'visual',
        elements: [
            el('heading', '100%', { backgroundColor: '#e5e7eb', padding: '1rem', color: '#444' }, 'OFFRE SPÉCIALE'),
            el('product-gallery', '50%', { backgroundColor: '#fff', padding: '0' }),
            el('product-title', '50%', { backgroundColor: '#fff', padding: '2rem 1rem 0' }),
            el('product-price', '50%', { backgroundColor: '#fff', fontSize: 'text-3xl', padding: '0 1rem' }),
            el('product-description', '100%', { backgroundColor: '#fff', padding: '2rem' }),
            el('order-form', '100%', { backgroundColor: '#f9fafb', padding: '2rem' })
        ]
    }
];