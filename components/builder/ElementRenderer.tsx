/**
 * ElementRenderer - Renders the actual content of each element type
 * This is what users see in the canvas
 */

import React from 'react';
import { PageElement } from '../../types';

interface ElementRendererProps {
  element: PageElement;
}

export const ElementRenderer: React.FC<ElementRendererProps> = ({ element }) => {
  const style: React.CSSProperties = {
    textAlign: element.style.textAlign,
    fontSize: element.style.fontSize,
    color: element.style.color,
    padding: element.style.padding,
    backgroundColor: element.style.backgroundColor,
    borderRadius: element.style.borderRadius,
    width: element.style.width,
    boxShadow: element.style.boxShadow === 'lg' ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : 
                element.style.boxShadow === 'md' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' :
                element.style.boxShadow === 'sm' ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
    border: element.style.border,
    marginTop: element.style.marginTop,
    marginBottom: element.style.marginBottom,
    borderTop: element.style.borderTop,
    fontFamily: element.style.fontFamily,
    fontStyle: element.style.fontStyle,
  };

  switch (element.type) {
    case 'section':
      return (
        <div style={style} className="min-h-[200px]">
          {element.children && element.children.length === 0 && (
            <div className="text-gray-400 text-center py-8">
              Section vide - Ajoutez des éléments
            </div>
          )}
        </div>
      );

    case 'container':
      return (
        <div style={style} className="min-h-[100px]">
          {element.children && element.children.length === 0 && (
            <div className="text-gray-400 text-center py-4">
              Container vide
            </div>
          )}
        </div>
      );

    case 'heading':
      const headingLevel = element.props?.level || 1;
      const HeadingTag = `h${headingLevel}` as keyof JSX.IntrinsicElements;
      return (
        <HeadingTag style={style}>
          {element.content || 'Nouveau Titre'}
        </HeadingTag>
      );

    case 'text':
      return (
        <p style={style}>
          {element.content || 'Votre texte ici...'}
        </p>
      );

    case 'image':
      return (
        <img
          src={element.content || 'https://via.placeholder.com/600x400'}
          alt={element.props?.alt || 'Image'}
          style={{
            ...style,
            maxWidth: '100%',
            height: 'auto',
          }}
        />
      );

    case 'button':
      const ButtonTag = element.props?.href ? 'a' : 'button';
      return (
        <ButtonTag
          href={element.props?.href}
          target={element.props?.target}
          style={style}
          className="inline-block"
        >
          {element.content || 'Cliquez ici'}
        </ButtonTag>
      );

    case 'html-block':
      return (
        <div
          style={style}
          dangerouslySetInnerHTML={{ __html: element.content || '' }}
        />
      );

    case 'separator':
      return <hr style={style} />;

    case 'product-title':
      return (
        <h1 style={style} className="font-bold">
          {element.content || '{product_name}'}
        </h1>
      );

    case 'product-price':
      return (
        <div style={style} className="font-bold">
          {element.content || '{product_price}'}
        </div>
      );

    case 'product-description':
      return (
        <div style={style}>
          {element.content || '{product_description}'}
        </div>
      );

    case 'product-gallery':
      return (
        <div style={style} className="bg-gray-100 rounded-lg p-4 text-center text-gray-500">
          {element.content || '{product_image_carousel}'}
        </div>
      );

    case 'product-reviews':
      return (
        <div style={style} className="border border-dashed border-gray-300 rounded-lg p-4 bg-amber-50/50">
          <p className="text-sm font-medium text-gray-700">Avis clients</p>
          <p className="text-xs text-gray-500 mt-1">Remplacé par {'{product_reviews}'} sur la landing page</p>
        </div>
      );

    case 'order-form':
      return (
        <div style={style} className="border rounded-lg p-4">
          <p className="text-center font-bold mb-4">Formulaire de commande</p>
          <p className="text-sm text-gray-500 text-center">
            Le formulaire sera rendu dynamiquement
          </p>
        </div>
      );

    case 'trust-badges':
      return (
        <div style={style} className="flex gap-4">
          <div className="flex-1 text-center p-4 bg-gray-50 rounded">Badge 1</div>
          <div className="flex-1 text-center p-4 bg-gray-50 rounded">Badge 2</div>
        </div>
      );

    case 'feature-item':
      return (
        <div style={style}>
          {element.content || 'Caractéristique'}
        </div>
      );

    default:
      return (
        <div style={style} className="p-4 border border-gray-300 rounded">
          Type non reconnu: {element.type}
        </div>
      );
  }
};
