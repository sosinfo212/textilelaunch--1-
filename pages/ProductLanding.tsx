import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Order, Product } from '../types';
import { isVideo, isImage } from '../src/utils/imageUtils';
import { formatPrice } from '../src/utils/currency';
import { CheckCircle, ArrowLeft, Phone, MapPin, Truck, ShieldCheck, Star, ShoppingCart, Plus, Minus, Home, AlertCircle, Video } from 'lucide-react';
import { LandingPageRenderer } from '../components/LandingPageRenderer';

export const ProductLanding: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { getProduct, addOrder, getTemplate } = useStore();
  const [product, setProduct] = useState<Product | undefined>(undefined);
  
  // Form State
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    city: '',
    phone: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // Combine images and videos into a single media array
  const media = useMemo(() => {
    if (!product) return [];
    const allMedia: Array<{ type: 'image' | 'video'; src: string }> = [];
    product.images.forEach(img => allMedia.push({ type: 'image', src: img }));
    if (product.videos) {
      product.videos.forEach(video => allMedia.push({ type: 'video', src: video }));
    }
    return allMedia;
  }, [product]);

  // Refs for scrolling
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (productId) {
      const p = getProduct(productId);
      setProduct(p);
      if (p && Array.isArray(p.attributes) && p.attributes.length > 0) {
        // Pre-select first options
        const initialAttrs: Record<string, string> = {};
        p.attributes.forEach(attr => {
            if (attr.options.length > 0) initialAttrs[attr.name] = attr.options[0];
        });
        setSelectedAttributes(initialAttrs);
      }
    }
  }, [productId, getProduct]);

  if (!product) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 font-cairo" dir="rtl">
            <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">المنتج غير موجود</h2>
                <Link to="/" className="mt-4 text-brand-600 hover:text-brand-500">العودة للمتجر</Link>
            </div>
        </div>
    );
  }

  const handleAttributeChange = (name: string, value: string) => {
    setSelectedAttributes(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // 1. Mandatory Fields Check
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.city.trim() || !formData.address.trim()) {
        setFormError('المرجو ملأ جميع الخانات (الاسم، الهاتف، المدينة، والعنوان).');
        return;
    }

    // 2. Phone Validation (Allow digits, spaces, +, -)
    // Minimum 8 digits to be considered roughly valid
    const phoneRegex = /^[\d\s\+\-]{8,}$/;
    if (!phoneRegex.test(formData.phone.trim())) {
        setFormError('المرجو إدخال رقم هاتف صحيح.');
        return;
    }

    const newOrder: Order = {
        id: `ord_${Date.now()}`,
        sellerId: product.ownerId,
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
        productSupplier: product.supplier, // Added supplier to order
        customer: formData,
        selectedAttributes: { ...selectedAttributes, 'Quantité': quantity.toString() },
        createdAt: Date.now(),
        status: 'pending',
        viewed: false
    };
    try {
      await addOrder(newOrder);
      setSubmitted(true);
    } catch (error) {
      setFormError('Une erreur est survenue. Veuillez réessayer.');
      console.error(error);
    }
  };

  const scrollToForm = () => {
     // Try to find form inside renderer or default layout
     const element = document.getElementById('order-form-container') || formRef.current;
     element?.scrollIntoView({ behavior: 'smooth' });
  };

  // Helper for Template Renderer (Keep generic logic for compatibility)
  const formState = {
      formData, setFormData,
      selectedAttributes, handleAttributeChange,
      handleSubmit,
      formError, // Pass error state to renderer
      images: product.images,
      currentImageIndex: currentMediaIndex, 
      setCurrentImageIndex: setCurrentMediaIndex,
      prevImage: () => setCurrentMediaIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1)),
      nextImage: () => setCurrentMediaIndex((prev) => (prev + 1) % media.length)
  };

  // Ensure attributes is an array to avoid crashes
  const attributes = Array.isArray(product.attributes) ? product.attributes : [];

  // Check if description contains HTML tags
  const isHtmlDescription = /<[a-z][\s\S]*>/i.test(product.description);

  // --- RENDER LOGIC ---

  if (submitted) {
      return (
          <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 font-cairo" dir="rtl">
              <div className="bg-green-50 rounded-full p-6 mb-6">
                  <CheckCircle className="h-16 w-16 text-green-600" />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-2">شكراً لك!</h1>
              <p className="text-lg text-gray-600 text-center max-w-md">
                  تم استلام طلبك بنجاح. سنقوم بالاتصال بك قريباً لتأكيد الطلب.
              </p>
          </div>
      );
  }

  // 1. Check for Custom Template (Legacy Builder)
  if (product.landingPageTemplateId) {
      const template = getTemplate(product.landingPageTemplateId);
      if (template) {
          return (
              <div className="min-h-screen bg-white font-cairo" dir="rtl">
                  <main className="w-full">
                      <LandingPageRenderer 
                        elements={template.elements} 
                        templateMode={template.mode}
                        htmlCode={template.htmlCode}
                        product={product} 
                        formState={formState} 
                      />
                  </main>

                  {/* Sticky Mobile CTA for Template Mode */}
                  <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 flex items-center gap-4">
                      <div className="flex-1">
                         <div className="text-xs text-gray-500 mb-1">السعر الإجمالي:</div>
                         <div className="text-xl font-black text-red-600">{formatPrice(product.price, product.currency)}</div>
                      </div>
                      <button 
                        onClick={scrollToForm}
                        className="flex-1 bg-red-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center justify-center animate-pulse"
                      >
                         اطلب الآن
                      </button>
                  </div>
                  <div className="h-24"></div>
              </div>
          );
      }
  }

  // 2. High-Converting Moroccan COD Layout (Default)
  return (
    <div className="min-h-screen bg-white font-cairo text-gray-900" dir="rtl">
      
      {/* Top Notification Bar */}
      <div className="bg-red-600 text-white text-center py-2 px-4 text-sm sm:text-base font-bold sticky top-0 z-50 shadow-md">
        🚚 التوصيل بالمجان على جميع المنتجات - والدفع عند الاستلام
      </div>

      {/* Breadcrumb / Header */}
      <div className="bg-gray-50 border-b border-gray-200 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center text-sm text-gray-500">
            <Link to="/" className="hover:text-gray-700 flex items-center">
                 <Home size={14} className="ml-1"/> الرئيسية
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium truncate">{product.name}</span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12 lg:items-start">
          
          {/* Right Column: Gallery (In RTL this is visually Right) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="w-full max-w-[600px] mx-auto relative rounded-2xl overflow-hidden shadow-lg border border-gray-100 bg-white">
               {/* Product Media (Image or Video) */}
               <div className="aspect-square">
                 {media[currentMediaIndex]?.type === 'video' ? (
                   <div className="w-full h-full">
                     {media[currentMediaIndex].src.includes('youtube.com') || media[currentMediaIndex].src.includes('youtu.be') ? (
                       <iframe
                         src={media[currentMediaIndex].src.includes('youtube.com/watch') 
                           ? media[currentMediaIndex].src.replace('watch?v=', 'embed/')
                           : media[currentMediaIndex].src.replace('youtu.be/', 'youtube.com/embed/')}
                         className="w-full h-full"
                         frameBorder="0"
                         allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                         allowFullScreen
                       />
                     ) : media[currentMediaIndex].src.includes('vimeo.com') ? (
                       <iframe
                         src={media[currentMediaIndex].src.replace('vimeo.com/', 'player.vimeo.com/video/')}
                         className="w-full h-full"
                         frameBorder="0"
                         allow="autoplay; fullscreen; picture-in-picture"
                         allowFullScreen
                       />
                     ) : (
                       <video 
                         src={media[currentMediaIndex].src} 
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
                     src={media[currentMediaIndex]?.src || product.images[0]} 
                     alt={product.name} 
                     className="w-full h-full object-center object-cover"
                     onError={(e) => {
                       const target = e.target as HTMLImageElement;
                       if (target.src.startsWith('blob:')) {
                         target.src = 'https://picsum.photos/800/800';
                       }
                     }}
                   />
                 )}
               </div>
               <div className="absolute top-4 right-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                   عرض خاص
               </div>
            </div>

            {/* Thumbnails */}
            {media.length > 1 && (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-w-[600px] mx-auto w-full">
                    {media.map((item, idx) => (
                        <button 
                            key={idx}
                            onClick={() => setCurrentMediaIndex(idx)}
                            className={`relative rounded-xl overflow-hidden border-2 transition-all ${currentMediaIndex === idx ? 'border-red-600 opacity-100' : 'border-transparent opacity-70 hover:opacity-100'}`}
                        >
                            <div className="aspect-square">
                                {item.type === 'video' ? (
                                    <div className="relative w-full h-full bg-gray-900">
                                        {item.src.includes('youtube.com') || item.src.includes('youtu.be') || item.src.includes('vimeo.com') ? (
                                          <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                            <Video className="h-6 w-6 text-white opacity-50" />
                                          </div>
                                        ) : (
                                          <video src={item.src} className="w-full h-full object-cover" muted />
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                                            <div className="w-8 h-8 rounded-full bg-white bg-opacity-80 flex items-center justify-center">
                                                <svg className="w-4 h-4 text-gray-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z"/>
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <img 
                                      src={item.src} 
                                      alt="" 
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (target.src.startsWith('blob:')) {
                                          target.src = 'https://picsum.photos/200/200';
                                        }
                                      }}
                                    />
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
          </div>

          {/* Left Column: Form & Info (In RTL this is visually Left) */}
          <div className="lg:col-span-5 mt-8 lg:mt-0">
             <div className="sticky top-20 space-y-6">
                
                {/* Title & Price */}
                <div className="text-center lg:text-right">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight mb-2">
                        {product.name}
                    </h1>
                    {product.showSku && product.sku && (
                        <div className="mb-2 text-sm text-gray-500 text-center lg:text-left">
                            SKU: <span className="font-mono font-semibold">{product.sku}</span>
                        </div>
                    )}
                    <div className="mt-2 flex items-center justify-center lg:justify-start gap-4">
                        <div className="text-3xl font-black text-red-600">
                            {formatPrice(product.price, product.currency)}
                        </div>
                        {product.regularPrice && product.regularPrice > product.price && (
                             <div className="text-lg text-gray-400 line-through decoration-red-400 font-semibold">
                                {formatPrice(product.regularPrice, product.currency)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Form Container */}
                <div id="order-form-container" ref={formRef} className="bg-white rounded-2xl shadow-xl border-2 border-dashed border-red-200 p-6 sm:p-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"></div>
                    
                    <h3 className="text-lg font-bold text-center mb-6 text-gray-800">
                        لطلب المنتج، المرجو ملأ الاستمارة التالية:
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Attributes */}
                        {attributes.map((attr) => (
                            <div key={attr.name}>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{attr.name}:</label>
                                <div className="flex flex-wrap gap-2">
                                    {attr.options.map((option) => (
                                        <label key={option} className={`
                                            cursor-pointer px-4 py-2 rounded-lg border-2 text-sm font-bold transition-all
                                            ${selectedAttributes[attr.name] === option 
                                                ? 'border-red-600 bg-red-50 text-red-700' 
                                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}
                                        `}>
                                            <input 
                                                type="radio" 
                                                name={attr.name} 
                                                value={option} 
                                                className="sr-only" 
                                                checked={selectedAttributes[attr.name] === option}
                                                onChange={() => handleAttributeChange(attr.name, option)}
                                            />
                                            {option}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Quantity */}
                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <span className="font-bold text-gray-700">الكمية:</span>
                            <div className="flex items-center gap-4">
                                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-red-600">
                                    <Minus size={16} />
                                </button>
                                <span className="font-black text-xl w-6 text-center">{quantity}</span>
                                <button type="button" onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-green-600">
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Inputs */}
                        <div className="space-y-3">
                            <div>
                                <input 
                                    type="text" 
                                    placeholder="الاسم الكامل" 
                                    required 
                                    value={formData.fullName} 
                                    onChange={e => setFormData({...formData, fullName: e.target.value})} 
                                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-right bg-gray-50 focus:bg-white transition-colors" 
                                />
                            </div>
                            <div>
                                <input 
                                    type="tel" 
                                    placeholder="رقم الهاتف (ضروري)" 
                                    required 
                                    value={formData.phone} 
                                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-right bg-gray-50 focus:bg-white transition-colors" 
                                    dir="ltr"
                                    style={{ textAlign: 'right' }}
                                />
                            </div>
                            <div>
                                <input 
                                    type="text" 
                                    placeholder="المدينة" 
                                    required 
                                    value={formData.city} 
                                    onChange={e => setFormData({...formData, city: e.target.value})} 
                                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-right bg-gray-50 focus:bg-white transition-colors" 
                                />
                            </div>
                            <div>
                                <input 
                                    type="text" 
                                    placeholder="العنوان" 
                                    required
                                    value={formData.address} 
                                    onChange={e => setFormData({...formData, address: e.target.value})} 
                                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-right bg-gray-50 focus:bg-white transition-colors" 
                                />
                            </div>
                        </div>

                        {formError && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-start">
                                <AlertCircle size={20} className="mt-0.5 ml-2 flex-shrink-0" />
                                <span className="text-sm font-bold">{formError}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="w-full bg-red-600 border border-transparent rounded-xl py-4 px-8 flex items-center justify-center text-lg font-black text-white hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200 shadow-lg transform transition-transform active:scale-95"
                        >
                            <ShoppingCart className="ml-2 h-6 w-6" />
                            اطلب الآن - {formatPrice(product.price * quantity, product.currency)}
                        </button>
                    </form>
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                        <div className="bg-green-100 p-2 rounded-full text-green-600">
                            <Truck size={20} />
                        </div>
                        <div className="text-xs font-bold text-gray-700">توصيل سريع<br/>لجميع المدن</div>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                         <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                            <ShieldCheck size={20} />
                        </div>
                        <div className="text-xs font-bold text-gray-700">الدفع عند<br/>الاستلام</div>
                    </div>
                </div>

             </div>
          </div>

        </div>

        {/* Full Width Description Section */}
        <div className="mt-12 bg-gray-50 p-6 sm:p-8 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-2xl font-bold mb-6 flex items-center text-gray-800 border-b border-gray-200 pb-4">
                <Star className="ml-2 text-yellow-500 fill-yellow-500" size={24}/>
                وصف المنتج
            </h3>
            {isHtmlDescription ? (
                <div 
                    className="prose prose-lg max-w-none text-gray-600 leading-relaxed font-cairo"
                    dangerouslySetInnerHTML={{__html: product.description}} 
                />
            ) : (
                <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed whitespace-pre-line font-cairo">
                    {product.description}
                </div>
            )}
        </div>

      </main>

      {/* Sticky Mobile CTA - Now visible on all devices */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 flex items-center gap-4">
          <div className="flex-1">
             <div className="text-xs text-gray-500 mb-1">السعر الإجمالي:</div>
             <div className="text-xl font-black text-red-600">{formatPrice(product.price * quantity, product.currency)}</div>
          </div>
          <button 
            onClick={scrollToForm}
            className="flex-1 bg-red-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center justify-center animate-pulse"
          >
             اطلب الآن
          </button>
      </div>
      
      {/* Spacer for bottom bar - visible on all devices */}
      <div className="h-24"></div>

    </div>
  );
};