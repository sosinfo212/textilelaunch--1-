import React, { useEffect, useRef } from 'react';
import { PageElement, Product, ProductAttribute, LandingPageTemplate } from '../types';
import { formatPrice } from '../src/utils/currency';
import { ShoppingBag, ChevronLeft, ChevronRight, Truck, ShieldCheck, Star, Check, AlertCircle } from 'lucide-react';

interface RendererProps {
    elements?: PageElement[]; // for visual mode
    templateMode?: 'visual' | 'code';
    htmlCode?: string; // for code mode
    product: Product;
    formState: {
        formData: any;
        setFormData: any;
        selectedAttributes: any;
        handleAttributeChange: any;
        handleSubmit: any;
        formError?: string;
        images: string[];
        currentImageIndex: number;
        setCurrentImageIndex: any;
        prevImage: any;
        nextImage: any;
        quantity?: number;
        setQuantity?: (n: number | ((prev: number) => number)) => void;
        paymentMethod?: 'cod' | 'stripe';
        setPaymentMethod?: (m: 'cod' | 'stripe') => void;
    };
}

export const LandingPageRenderer: React.FC<RendererProps> = ({ 
    elements = [], 
    templateMode = 'visual', 
    htmlCode = '', 
    product, 
    formState 
}) => {

    // --- CODE MODE RENDERER ---
    if (templateMode === 'code') {
        return <CustomCodeRenderer htmlCode={htmlCode} product={product} formState={formState} />;
    }

    // --- VISUAL MODE RENDERER ---
    return (
        <div className="w-full min-h-screen bg-white font-cairo flex flex-wrap content-start items-stretch">
            {elements.map((el) => {
                const style = {
                    ...el.style,
                    textAlign: el.style.textAlign as any,
                };

                // Classes for optional effects
                const shadowClass = style.boxShadow === 'lg' ? 'shadow-lg' : style.boxShadow === 'md' ? 'shadow-md' : style.boxShadow === 'sm' ? 'shadow-sm' : '';
                const animationClass = style.animation === 'pulse' ? 'animate-pulse' : style.animation === 'bounce' ? 'animate-bounce' : '';
                const widthStyle = style.width || '100%';
                
                // Wrapper for alignment and padding
                return (
                    <div 
                        key={el.id} 
                        style={{ 
                            width: widthStyle, 
                            padding: style.padding || '1rem', 
                            marginTop: style.marginTop,
                            marginBottom: style.marginBottom,
                            backgroundColor: style.backgroundColor,
                            borderRadius: style.borderRadius,
                            border: style.border,
                            borderTop: style.borderTop,
                            fontFamily: style.fontFamily,
                            fontStyle: style.fontStyle,
                        }} 
                        className={`relative flex flex-col ${shadowClass} ${animationClass} transition-all duration-300`}
                    >
                        
                        {el.type === 'heading' && (
                            <h2 style={{ color: style.color, textAlign: style.textAlign }} className={`font-bold leading-tight ${style.fontSize || 'text-3xl'}`}>
                                {el.content}
                            </h2>
                        )}

                        {el.type === 'text' && (
                            <p style={{ color: style.color, textAlign: style.textAlign }} className={`text-gray-700 ${style.fontSize || 'text-base'}`}>
                                {el.content}
                            </p>
                        )}

                        {el.type === 'feature-item' && (
                            <div className="flex flex-col items-center text-center p-4 border border-gray-100 rounded-xl bg-gray-50 h-full">
                                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mb-2">
                                    <Check size={20} />
                                </div>
                                <h4 className="font-bold text-gray-900 mb-1">{el.content}</h4>
                            </div>
                        )}

                        {el.type === 'image' && (
                            <div className="w-full h-full flex items-center justify-center">
                                <img src={el.content} alt="" style={{borderRadius: style.borderRadius}} className="max-w-full h-auto object-cover" />
                            </div>
                        )}

                        {el.type === 'separator' && <hr className="border-gray-200 my-2 w-full" />}

                        {/* Dynamic Product Blocks */}
                        
                        {el.type === 'product-title' && (
                            <h1 style={{ color: style.color, textAlign: style.textAlign }} className={`font-extrabold text-gray-900 ${style.fontSize || 'text-4xl'}`}>
                                {product.name}
                            </h1>
                        )}

                        {el.type === 'product-price' && (
                            <div style={{ color: style.color, textAlign: style.textAlign }} className={`flex flex-col ${style.fontSize || 'text-3xl'}`}>
                                {product.regularPrice && product.regularPrice > product.price && (
                                    <span className="text-gray-500 line-through text-lg mb-1 opacity-70">
                                        {product.regularPrice} €
                                    </span>
                                )}
                                <span className="font-bold">
                                    {product.price} €
                                </span>
                            </div>
                        )}

                        {el.type === 'product-description' && (
                             <div style={{ textAlign: style.textAlign }} className="w-full">
                                {/<[a-z][\s\S]*>/i.test(product.description) ? (
                                    <div 
                                        className={`prose max-w-none text-gray-600 ${style.fontSize || 'text-base'} font-cairo`}
                                        dangerouslySetInnerHTML={{__html: product.description}} 
                                    />
                                ) : (
                                    <div className={`prose max-w-none text-gray-600 whitespace-pre-line ${style.fontSize || 'text-base'} font-cairo`}>
                                        {product.description}
                                    </div>
                                )}
                            </div>
                        )}

                        {el.type === 'product-gallery' && (() => {
                            // Combine images and videos
                            const allMedia: Array<{ type: 'image' | 'video'; src: string }> = [];
                            product.images.forEach(img => allMedia.push({ type: 'image', src: img }));
                            if (product.videos) {
                              product.videos.forEach(video => allMedia.push({ type: 'video', src: video }));
                            }
                            const currentMedia = allMedia[formState.currentImageIndex] || allMedia[0];
                            
                            return (
                              <div className="relative rounded-2xl overflow-hidden bg-gray-100 w-full h-full min-h-[300px] border border-gray-100 shadow-sm group">
                                {currentMedia?.type === 'video' ? (
                                  <div className="w-full h-full absolute inset-0">
                                    {currentMedia.src.includes('youtube.com') || currentMedia.src.includes('youtu.be') ? (
                                      <iframe
                                        src={currentMedia.src.includes('youtube.com/watch') 
                                          ? currentMedia.src.replace('watch?v=', 'embed/')
                                          : currentMedia.src.replace('youtu.be/', 'youtube.com/embed/')}
                                        className="w-full h-full"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                      />
                                    ) : currentMedia.src.includes('vimeo.com') ? (
                                      <iframe
                                        src={currentMedia.src.replace('vimeo.com/', 'player.vimeo.com/video/')}
                                        className="w-full h-full"
                                        frameBorder="0"
                                        allow="autoplay; fullscreen; picture-in-picture"
                                        allowFullScreen
                                      />
                                    ) : (
                                      <video 
                                        src={currentMedia.src} 
                                        controls
                                        className="w-full h-full object-center object-cover"
                                        autoPlay
                                        loop
                                        muted
                                      />
                                    )}
                                  </div>
                                ) : (
                                  <img 
                                    src={currentMedia?.src || product.images[0]} 
                                    alt={product.name} 
                                    className="w-full h-full object-center object-cover absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      if (target.src.startsWith('blob:')) {
                                        target.src = 'https://picsum.photos/800/800';
                                      }
                                    }}
                                  />
                                )}
                                {allMedia.length > 1 && (
                                    <>
                                        <button onClick={formState.prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow hover:bg-white text-gray-800 transition-colors z-10">
                                            <ChevronLeft size={24} />
                                        </button>
                                        <button onClick={formState.nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow hover:bg-white text-gray-800 transition-colors z-10">
                                            <ChevronRight size={24} />
                                        </button>
                                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
                                            {allMedia.map((item, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className={`w-2 h-2 rounded-full transition-all shadow-sm ${idx === formState.currentImageIndex ? 'bg-brand-600 w-4' : 'bg-white'}`} 
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                              </div>
                            );
                        })()}

                        {el.type === 'trust-badges' && (
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <div className="flex flex-col items-center text-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <div className="text-green-600 mb-1">
                                        <Truck size={24} />
                                    </div>
                                    <div className="text-xs font-bold text-gray-700">Livraison<br/>Gratuite</div>
                                </div>
                                <div className="flex flex-col items-center text-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                                     <div className="text-blue-600 mb-1">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div className="text-xs font-bold text-gray-700">Paiement à<br/>la livraison</div>
                                </div>
                            </div>
                        )}

                        {el.type === 'order-form' && (
                            <div id="order-form-container" className="w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-6 relative overflow-hidden text-right" dir="rtl">
                                
                                <h3 className="text-lg font-bold text-center mb-6 text-gray-800 border-b pb-2">
                                    اضغط للطلب الآن 👇
                                </h3>

                                <form onSubmit={formState.handleSubmit} className="space-y-4">
                                    
                                    {product.attributes.map((attr) => (
                                        <div key={attr.name}>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">{attr.name}:</label>
                                            <div className="flex flex-wrap gap-2">
                                                {attr.options.map((option) => (
                                                    <label key={option} className={`
                                                        cursor-pointer px-4 py-2 rounded-lg border-2 text-sm font-bold transition-all
                                                        ${formState.selectedAttributes[attr.name] === option 
                                                            ? 'border-brand-600 bg-brand-50 text-brand-700' 
                                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}
                                                    `}>
                                                        <input 
                                                            type="radio" 
                                                            name={attr.name} 
                                                            value={option} 
                                                            className="sr-only" 
                                                            checked={formState.selectedAttributes[attr.name] === option}
                                                            onChange={() => formState.handleAttributeChange(attr.name, option)}
                                                        />
                                                        {option}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="space-y-3 mt-4">
                                        <input type="text" placeholder="الاسم الكامل" required value={formState.formData.fullName} onChange={e => formState.setFormData({...formState.formData, fullName: e.target.value})} className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 py-3 px-4 text-right bg-gray-50 focus:bg-white transition-colors" />
                                        <input type="tel" placeholder="رقم الهاتف" required value={formState.formData.phone} onChange={e => formState.setFormData({...formState.formData, phone: e.target.value})} className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 py-3 px-4 text-right bg-gray-50 focus:bg-white transition-colors" dir="ltr" style={{textAlign:'right'}} />
                                        <input type="text" placeholder="المدينة" required value={formState.formData.city} onChange={e => formState.setFormData({...formState.formData, city: e.target.value})} className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 py-3 px-4 text-right bg-gray-50 focus:bg-white transition-colors" />
                                        <input type="text" placeholder="العنوان" required value={formState.formData.address} onChange={e => formState.setFormData({...formState.formData, address: e.target.value})} className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 py-3 px-4 text-right bg-gray-50 focus:bg-white transition-colors" />
                                    </div>
                                    
                                    {formState.formError && (
                                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-start">
                                            <AlertCircle size={20} className="mt-0.5 ml-2 flex-shrink-0" />
                                            <span className="text-sm font-bold">{formState.formError}</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        className="mt-6 w-full bg-brand-600 border border-transparent rounded-xl py-4 px-8 flex items-center justify-center text-lg font-black text-white hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-200 shadow-lg transform transition-transform active:scale-95 animate-pulse"
                                        style={{ backgroundColor: style.color || undefined }} // Use element color for button if set
                                    >
                                        <ShoppingBag className="ml-2 h-6 w-6" />
                                        تأكيد الطلب
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// --- HELPER COMPONENT FOR CUSTOM CODE ---
const CustomCodeRenderer: React.FC<{ htmlCode: string; product: Product; formState: any }> = ({ htmlCode, product, formState }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // 1. Process simple tags
    let processedHtml = htmlCode
        .replace(/{product_name}/g, product.name)
        .replace(/{product_price}/g, formatPrice(product.price, product.currency))
        .replace(/{product_regular_price}/g, product.regularPrice ? formatPrice(product.regularPrice, product.currency) : '')
        .replace(/{product_description}/g, product.description)
        .replace(/{product_sku}/g, (product.showSku && product.sku) ? product.sku : '')
        .replace(/{product_image_0}/g, product.images[0] || '')
        .replace(/{product_image_1}/g, product.images[1] || '')
        .replace(/{product_image_2}/g, product.images[2] || '')
        .replace(/{product_image_3}/g, product.images[3] || '');

    // --- Component shortcodes (build your own layout) ---
    const notificationBarHtml = `<div class="tl-notification-bar bg-red-600 text-white text-center py-2 px-4 text-sm sm:text-base font-bold sticky top-0 z-50 shadow-md" dir="rtl">🚚 التوصيل بالمجان على جميع المنتجات - والدفع عند الاستلام</div>`;
    processedHtml = processedHtml.replace(/{notification_bar}/g, notificationBarHtml);

    const breadcrumbHtml = `<div class="tl-breadcrumb bg-gray-50 border-b border-gray-200 py-3" dir="rtl"><div class="max-w-7xl mx-auto px-4 flex items-center text-sm text-gray-500"><a href="/" class="hover:text-gray-700">الرئيسية</a><span class="mx-2">/</span><span class="text-gray-900 font-medium truncate">${product.name}</span></div></div>`;
    processedHtml = processedHtml.replace(/{breadcrumb}/g, breadcrumbHtml);

    const priceBlockHtml = `<div class="tl-product-price-block flex items-center gap-4" dir="rtl"><span class="text-3xl font-black text-red-600">${formatPrice(product.price, product.currency)}</span>${product.regularPrice && product.regularPrice > product.price ? `<span class="text-lg text-gray-400 line-through">${formatPrice(product.regularPrice, product.currency)}</span>` : ''}</div>`;
    processedHtml = processedHtml.replace(/{product_price_block}/g, priceBlockHtml);

    const qty = typeof formState.quantity === 'number' ? formState.quantity : 1;
    const quantitySelectorHtml = `<div class="tl-quantity-selector flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200" dir="rtl"><span class="font-bold text-gray-700">الكمية:</span><div class="flex items-center gap-4"><button type="button" class="tl-qty-minus w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-red-600">−</button><span class="tl-qty-value font-black text-xl w-6 text-center">${qty}</span><button type="button" class="tl-qty-plus w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-green-600">+</button></div></div>`;
    processedHtml = processedHtml.replace(/{quantity_selector}/g, quantitySelectorHtml);

    const payOpts = (product as any).paymentOptions || 'cod_only';
    const isStripe = formState.paymentMethod === 'stripe';
    const paymentSelectorHtml = payOpts === 'both' ? `<div class="tl-payment-selector" dir="rtl"><label class="block text-sm font-bold text-gray-700 mb-2">طريقة الدفع</label><div class="flex gap-3"><label class="tl-pay-cod flex-1 cursor-pointer px-4 py-3 rounded-lg border-2 text-sm font-bold transition-all ${!isStripe ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-600'}"><input type="radio" name="tl-pay-method" value="cod" class="sr-only" ${!isStripe ? 'checked' : ''}> دفع عند الاستلام (COD)</label><label class="tl-pay-stripe flex-1 cursor-pointer px-4 py-3 rounded-lg border-2 text-sm font-bold transition-all ${isStripe ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-600'}"><input type="radio" name="tl-pay-method" value="stripe" class="sr-only" ${isStripe ? 'checked' : ''}> دفع عبر الإنترنت</label></div></div>` : '';
    processedHtml = processedHtml.replace(/{payment_selector}/g, paymentSelectorHtml);

    const trustBadgesHtml = `<div class="tl-trust-badges grid grid-cols-2 gap-4" dir="rtl"><div class="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm"><div class="bg-green-100 p-2 rounded-full text-green-600"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg></div><div class="text-xs font-bold text-gray-700">توصيل سريع<br/>لجميع المدن</div></div><div class="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm"><div class="bg-blue-100 p-2 rounded-full text-blue-600"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg></div><div class="text-xs font-bold text-gray-700">الدفع عند<br/>الاستلام</div></div></div>`;
    processedHtml = processedHtml.replace(/{trust_badges}/g, trustBadgesHtml);

    const descSectionHtml = `<div class="tl-product-description-section mt-12 bg-gray-50 p-6 sm:p-8 rounded-xl border border-gray-100 shadow-sm" dir="rtl"><h3 class="text-2xl font-bold mb-6 text-gray-800 border-b border-gray-200 pb-4">وصف المنتج</h3><div class="prose prose-lg max-w-none text-gray-600 leading-relaxed font-cairo">${product.description}</div></div>`;
    processedHtml = processedHtml.replace(/{product_description_section}/g, descSectionHtml);

    const totalPrice = formatPrice(product.price * qty, product.currency);
    const stickyCtaHtml = `<div class="tl-sticky-cta fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-40 flex items-center gap-4" dir="rtl"><div class="flex-1"><div class="text-xs text-gray-500 mb-1">السعر الإجمالي:</div><div class="text-xl font-black text-red-600 tl-total-price">${totalPrice}</div></div><button type="button" class="tl-scroll-to-form flex-1 bg-red-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg">اطلب الآن</button></div><div class="tl-sticky-cta-spacer h-24"></div>`;
    processedHtml = processedHtml.replace(/{sticky_cta}/g, stickyCtaHtml);

    // Combine images and videos
    const allMedia: Array<{ type: 'image' | 'video'; src: string }> = [];
    product.images.forEach(img => allMedia.push({ type: 'image', src: img }));
    if (product.videos) {
        product.videos.forEach(video => allMedia.push({ type: 'video', src: video }));
    }

    // Generate Image Gallery HTML with Thumbnail Navigation (including videos)
    const galleryHtml = `
        <div class="tl-gallery-container w-full bg-white rounded-lg overflow-hidden" data-total="${allMedia.length}">
            <!-- Main Media Display -->
            <div class="tl-gallery-main relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
                <div id="tl-gallery-main-content" class="w-full h-full">
                    ${allMedia.length > 0 ? (() => {
                        const firstMedia = allMedia[0];
                        if (firstMedia.type === 'video') {
                            if (firstMedia.src.includes('youtube.com') || firstMedia.src.includes('youtu.be')) {
                                const embedUrl = firstMedia.src.includes('youtube.com/watch') 
                                    ? firstMedia.src.replace('watch?v=', 'embed/')
                                    : firstMedia.src.replace('youtu.be/', 'youtube.com/embed/');
                                return `<iframe src="${embedUrl}" class="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>`;
                            } else if (firstMedia.src.includes('vimeo.com')) {
                                return `<iframe src="${firstMedia.src.replace('vimeo.com/', 'player.vimeo.com/video/')}" class="w-full h-full" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen></iframe>`;
                            } else {
                                return `<video src="${firstMedia.src}" controls class="w-full h-full object-cover" autoplay loop muted></video>`;
                            }
                        } else {
                            return `<img src="${firstMedia.src}" alt="${product.name}" class="w-full h-full object-cover transition-opacity duration-300" />`;
                        }
                    })() : ''}
                </div>
            </div>
            <!-- Thumbnail Navigation -->
            ${allMedia.length > 1 ? `
                <div class="tl-gallery-thumbnails flex gap-2 overflow-x-auto pb-2" style="scrollbar-width: thin;">
                    ${allMedia.map((media, i) => `
                        <button 
                            class="tl-gallery-thumb flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all cursor-pointer relative ${
                                i === 0 ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                            }" 
                            data-index="${i}"
                            data-type="${media.type}"
                            data-src="${media.src}"
                            aria-label="Voir ${media.type === 'video' ? 'la vidéo' : 'l\'image'} ${i + 1}"
                        >
                            ${media.type === 'video' ? `
                                <div class="w-full h-full bg-gray-900 flex items-center justify-center">
                                    <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z"/>
                                    </svg>
                                </div>
                            ` : `
                                <img 
                                    src="${media.src}" 
                                    alt="${product.name} - ${i + 1}" 
                                    class="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            `}
                        </button>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;

    processedHtml = processedHtml.replace(/{product_image_carousel}/g, galleryHtml);

    // 2. Generate Attribute HTML
    const attributesHtml = product.attributes.map(attr => `
        <div class="tl-attribute-group mb-4">
            <label class="block text-sm font-bold text-gray-700 mb-2">${attr.name}</label>
            <div class="flex flex-wrap gap-2">
                ${attr.options.map(opt => `
                    <label class="cursor-pointer">
                        <input type="radio" name="tl-attr-${attr.name}" value="${opt}" class="tl-attribute-input sr-only" ${formState.selectedAttributes[attr.name] === opt ? 'checked' : ''}>
                        <span class="px-3 py-1 border rounded hover:bg-gray-50 ${formState.selectedAttributes[attr.name] === opt ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300'}">${opt}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `).join('');

    processedHtml = processedHtml.replace(/{attributes_selector}/g, attributesHtml);

    // 3. Generate order form (wrapped in container for scroll target)
    const defaultFormHtml = `
        <div id="order-form-container" class="tl-order-form space-y-4">
            <input type="text" id="tl-full-name" placeholder="الاسم الكامل" class="w-full p-3 border rounded-lg text-right bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none" required>
            <input type="tel" id="tl-phone" placeholder="رقم الهاتف" class="w-full p-3 border rounded-lg text-right bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none" required>
            <input type="text" id="tl-city" placeholder="المدينة" class="w-full p-3 border rounded-lg text-right bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none" required>
            <input type="text" id="tl-address" placeholder="العنوان" class="w-full p-3 border rounded-lg text-right bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none" required>
            <button type="button" id="tl-btn-submit" class="w-full bg-blue-600 text-white p-4 font-bold rounded-xl hover:bg-blue-700 transition shadow-lg transform hover:scale-[1.02] active:scale-95">تأكيد الطلب</button>
        </div>
    `;
    processedHtml = processedHtml.replace(/{order_form}/g, defaultFormHtml);


    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;

        // BIND IMAGE GALLERIES (with video support)
        const galleries = container.querySelectorAll('.tl-gallery-container');
        galleries.forEach((gallery) => {
            const mainContent = gallery.querySelector('#tl-gallery-main-content') as HTMLElement;
            const thumbnails = gallery.querySelectorAll('.tl-gallery-thumb');
            const total = parseInt(gallery.getAttribute('data-total') || '0');

            const updateMainMedia = (index: number) => {
                const thumb = thumbnails[index] as HTMLElement;
                if (!thumb || !mainContent) return;

                const mediaType = thumb.getAttribute('data-type');
                const mediaSrc = thumb.getAttribute('data-src') || '';

                // Fade out
                mainContent.style.opacity = '0';
                
                setTimeout(() => {
                    if (mediaType === 'video') {
                        let videoHtml = '';
                        if (mediaSrc.includes('youtube.com') || mediaSrc.includes('youtu.be')) {
                            const embedUrl = mediaSrc.includes('youtube.com/watch') 
                                ? mediaSrc.replace('watch?v=', 'embed/')
                                : mediaSrc.replace('youtu.be/', 'youtube.com/embed/');
                            videoHtml = `<iframe src="${embedUrl}" class="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>`;
                        } else if (mediaSrc.includes('vimeo.com')) {
                            videoHtml = `<iframe src="${mediaSrc.replace('vimeo.com/', 'player.vimeo.com/video/')}" class="w-full h-full" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen></iframe>`;
                        } else {
                            videoHtml = `<video src="${mediaSrc}" controls class="w-full h-full object-cover" autoplay loop muted></video>`;
                        }
                        mainContent.innerHTML = videoHtml;
                    } else {
                        mainContent.innerHTML = `<img src="${mediaSrc}" alt="${product.name} - ${index + 1}" class="w-full h-full object-cover transition-opacity duration-300" />`;
                    }
                    
                    // Fade in
                    mainContent.style.opacity = '1';
                }, 150);
            };

            // Update thumbnail active state
            const updateThumbnailState = (activeIndex: number) => {
                thumbnails.forEach((thumb, i) => {
                    if (i === activeIndex) {
                        thumb.classList.add('border-blue-500', 'ring-2', 'ring-blue-200');
                        thumb.classList.remove('border-gray-200', 'hover:border-gray-300');
                    } else {
                        thumb.classList.remove('border-blue-500', 'ring-2', 'ring-blue-200');
                        thumb.classList.add('border-gray-200', 'hover:border-gray-300');
                    }
                });
            };

            // Bind thumbnail clicks
            thumbnails.forEach((thumb, index) => {
                thumb.addEventListener('click', () => {
                    updateMainMedia(index);
                    updateThumbnailState(index);
                });
            });

            // Initialize with first media
            if (thumbnails.length > 0) {
                updateThumbnailState(0);
            }
        });

        // BINDING INPUTS
        const inputs = {
            fullName: container.querySelector('#tl-full-name') as HTMLInputElement,
            phone: container.querySelector('#tl-phone') as HTMLInputElement,
            city: container.querySelector('#tl-city') as HTMLInputElement,
            address: container.querySelector('#tl-address') as HTMLInputElement,
        };

        const updateForm = () => {
             formState.setFormData({
                 fullName: inputs.fullName?.value || '',
                 phone: inputs.phone?.value || '',
                 city: inputs.city?.value || '',
                 address: inputs.address?.value || '',
             });
        };

        Object.values(inputs).forEach(input => {
            if (input) {
                input.addEventListener('input', updateForm);
                // Pre-fill if React state has data
                if (input.id === 'tl-full-name') input.value = formState.formData.fullName;
                if (input.id === 'tl-phone') input.value = formState.formData.phone;
                if (input.id === 'tl-city') input.value = formState.formData.city;
                if (input.id === 'tl-address') input.value = formState.formData.address;
            }
        });

        // BINDING SUBMIT
        const submitBtn = container.querySelector('#tl-btn-submit');
        const handleSubmitClick = (e: Event) => {
            e.preventDefault();
            formState.handleSubmit(e);
        };

        if (submitBtn) {
            submitBtn.addEventListener('click', handleSubmitClick);
        }

        // BINDING ATTRIBUTES (Delegate listener)
        const handleAttrChange = (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target && target.classList.contains('tl-attribute-input')) {
                const attrName = target.name.replace('tl-attr-', '');
                formState.handleAttributeChange(attrName, target.value);
                
                const allInputs = container.querySelectorAll(`input[name="${target.name}"]`);
                allInputs.forEach((inp: any) => {
                    const span = inp.nextElementSibling;
                    if (inp.checked) {
                        span.classList.add('bg-blue-50', 'border-blue-500', 'text-blue-700');
                        span.classList.remove('border-gray-300');
                    } else {
                        span.classList.remove('bg-blue-50', 'border-blue-500', 'text-blue-700');
                        span.classList.add('border-gray-300');
                    }
                });
            }
        };
        container.addEventListener('change', handleAttrChange);

        // Quantity selector
        const qtyMinus = container.querySelector('.tl-qty-minus');
        const qtyPlus = container.querySelector('.tl-qty-plus');
        const setQty = formState.setQuantity;
        const onQtyMinus = () => setQty?.((prev: number) => Math.max(1, prev - 1));
        const onQtyPlus = () => setQty?.((prev: number) => prev + 1);
        qtyMinus?.addEventListener('click', onQtyMinus);
        qtyPlus?.addEventListener('click', onQtyPlus);

        // Payment selector
        const payRadios = container.querySelectorAll('input[name="tl-pay-method"]');
        const payCodLabel = container.querySelector('.tl-pay-cod');
        const payStripeLabel = container.querySelector('.tl-pay-stripe');
        const setPay = formState.setPaymentMethod;
        const updatePayDisplay = () => {
            const isStripe = formState.paymentMethod === 'stripe';
            payCodLabel?.classList.toggle('border-red-600', !isStripe); payCodLabel?.classList.toggle('bg-red-50', !isStripe); payCodLabel?.classList.toggle('text-red-700', !isStripe);
            payCodLabel?.classList.toggle('border-gray-200', isStripe); payCodLabel?.classList.toggle('bg-white', isStripe); payCodLabel?.classList.toggle('text-gray-600', isStripe);
            payStripeLabel?.classList.toggle('border-red-600', isStripe); payStripeLabel?.classList.toggle('bg-red-50', isStripe); payStripeLabel?.classList.toggle('text-red-700', isStripe);
            payStripeLabel?.classList.toggle('border-gray-200', !isStripe); payStripeLabel?.classList.toggle('bg-white', !isStripe); payStripeLabel?.classList.toggle('text-gray-600', !isStripe);
        };
        const onPayChange = (e: Event) => {
            const v = (e.target as HTMLInputElement).value as 'cod' | 'stripe';
            setPay?.(v);
            updatePayDisplay();
        };
        payRadios.forEach((radio) => radio.addEventListener('change', onPayChange));

        // Scroll to form (sticky CTA button)
        const scrollBtn = container.querySelector('.tl-scroll-to-form');
        const onScrollToForm = () => document.getElementById('order-form-container')?.scrollIntoView({ behavior: 'smooth' });
        scrollBtn?.addEventListener('click', onScrollToForm);

        return () => {
            Object.values(inputs).forEach(input => input?.removeEventListener('input', updateForm));
            submitBtn?.removeEventListener('click', handleSubmitClick);
            container.removeEventListener('change', handleAttrChange);
            qtyMinus?.removeEventListener('click', onQtyMinus);
            qtyPlus?.removeEventListener('click', onQtyPlus);
            payRadios.forEach((r) => r.removeEventListener('change', onPayChange));
            scrollBtn?.removeEventListener('click', onScrollToForm);
        };
    }, [htmlCode, formState.formData, formState.quantity, formState.paymentMethod]);

    return <div ref={containerRef} dangerouslySetInnerHTML={{ __html: processedHtml }} />;
};