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

export const TEMPLATE_LIBRARY: TemplatePreset[] = [];
