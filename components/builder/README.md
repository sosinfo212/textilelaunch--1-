# Drag & Drop Template Builder

## Architecture

Un éditeur de templates drag-and-drop similaire à Elementor/Webflow, construit avec React, TypeScript, et `react-dnd`.

### Structure des Composants

```
components/builder/
├── DragDropBuilder.tsx    # Composant principal (orchestrateur)
├── BuilderSidebar.tsx     # Barre latérale avec éléments draggables
├── BuilderCanvas.tsx      # Zone de drop principale
├── CanvasElement.tsx      # Élément individuel dans le canvas
├── ElementRenderer.tsx    # Rendu visuel des éléments
└── PropertiesPanel.tsx    # Panneau de propriétés (édition)
```

## Fonctionnalités

### ✅ Implémenté

1. **Drag & Drop**
   - Glisser des éléments depuis la sidebar
   - Déposer dans le canvas ou dans des containers
   - Réorganiser les éléments par drag

2. **Composants Disponibles**
   - **Layout**: Section, Container
   - **Content**: Heading, Text, Image, Button, HTML Block
   - **Product**: Product Title, Price, Description, Gallery
   - **Form**: Order Form, Trust Badges

3. **Édition**
   - Sélection d'éléments (clic)
   - Panneau de propriétés pour éditer
   - Modification du contenu, styles, couleurs
   - Support des éléments imbriqués (containers)

4. **Sauvegarde**
   - Sauvegarde en JSON dans la base de données
   - Colonne `layout` pour positions/taille
   - Colonne `elements` pour la structure
   - Mode `drag-drop` pour distinguer des autres modes

### 🔄 À Améliorer

1. **Resize** - Redimensionnement visuel des éléments
2. **Move** - Déplacement précis avec grille
3. **Undo/Redo** - Historique des actions
4. **Copy/Paste** - Duplication d'éléments
5. **Responsive Preview** - Aperçu mobile/tablet/desktop

## Utilisation

### Dans TemplateBuilder.tsx

Le mode `drag-drop` est automatiquement activé. L'utilisateur peut basculer entre:
- **Drag & Drop**: Interface visuelle drag-and-drop
- **Visuel**: Mode original (liste d'éléments)
- **Code**: Mode HTML/CSS personnalisé

### Sauvegarde

Les templates sont sauvegardés avec:
```typescript
{
  id: string;
  name: string;
  mode: 'drag-drop';
  elements: PageElement[];  // Structure des éléments
  layout: {                 // Positions, tailles, etc.
    [elementId]: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    }
  };
}
```

## Types de Données

### PageElement
```typescript
{
  id: string;
  type: ElementType;
  content?: string;
  style: ElementStyle;
  children?: PageElement[];  // Pour containers/sections
  props?: Record<string, any>;  // Propriétés spécifiques
}
```

## Intégration Backend

Le backend (`server/routes/templates.js`) gère:
- Création avec `layout` JSON
- Mise à jour avec `layout` JSON
- Parsing automatique du JSON depuis MySQL

## Base de Données

Colonne `layout` ajoutée à `landing_page_templates`:
```sql
ALTER TABLE landing_page_templates 
ADD COLUMN layout JSON AFTER elements;
```
