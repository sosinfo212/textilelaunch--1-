import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Order, Product } from '../types';
import { isVideo, isImage } from '../src/utils/imageUtils';
import { formatPrice } from '../src/utils/currency';
import { CheckCircle, ArrowLeft, Phone, MapPin, Truck, ShieldCheck, Star, ShoppingCart, Plus, Minus, Home, AlertCircle, Video } from 'lucide-react';
import { LandingPageRenderer } from '../components/LandingPageRenderer';
import { productsAPI, templatesAPI, settingsAPI, stripeAPI } from '../src/utils/api';
import { useProductAnalytics } from '../hooks/useProductAnalytics';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

function StripeConfirmForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || 'Erreur');
      setLoading(false);
      return;
    }
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}${window.location.pathname}?paid=1`,
        payment_method_data: {}
      }
    });
    if (confirmError) {
      setError(confirmError.message || 'Paiement refusé');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={!stripe || loading} className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-xl disabled:opacity-50">
        {loading ? 'Traitement...' : 'Payer'}
      </button>
    </form>
  );
}

export const ProductLanding: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { getProduct, addOrder, getTemplate } = useStore();
  const [product, setProduct] = useState<Product | undefined>(undefined);
  const [template, setTemplate] = useState<any>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
  const galleryTouchStartX = useRef(0);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'stripe'>('cod');
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripePublishableKey, setStripePublishableKey] = useState<string>('');
  const [stripeOrderId, setStripeOrderId] = useState<string | null>(null);

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

  // Stripe: must be at top level (same hook count every render)
  const stripePromise = useMemo(() => (stripePublishableKey ? loadStripe(stripePublishableKey) : null), [stripePublishableKey]);

  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // First try to get from store (if user is logged in)
        const storeProduct = getProduct(productId);
        if (storeProduct) {
          setProduct(storeProduct);
          if (Array.isArray(storeProduct.attributes) && storeProduct.attributes.length > 0) {
        const initialAttrs: Record<string, string> = {};
            storeProduct.attributes.forEach(attr => {
            if (attr.options.length > 0) initialAttrs[attr.name] = attr.options[0];
        });
        setSelectedAttributes(initialAttrs);
      }
          setLoading(false);
          return;
        }
        
        // If not in store, fetch from API (public access)
        const response = await productsAPI.getById(productId);
        if (response.product) {
          setProduct(response.product);
          if (Array.isArray(response.product.attributes) && response.product.attributes.length > 0) {
            const initialAttrs: Record<string, string> = {};
            response.product.attributes.forEach((attr: any) => {
              if (attr.options && attr.options.length > 0) initialAttrs[attr.name] = attr.options[0];
            });
            setSelectedAttributes(initialAttrs);
          }
        } else {
          setError('Product not found');
        }
      } catch (err: any) {
        console.error('Error loading product:', err);
        setError(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };
    
    loadProduct();
  }, [productId, getProduct]);

  // Sync payment method when product has stripe_only
  useEffect(() => {
    if (product && (product as any).paymentOptions === 'stripe_only') {
      setPaymentMethod('stripe');
    }
  }, [product]);

  // Stripe return_url: mark as submitted when coming back with ?paid=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') === '1') {
      setSubmitted(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Update page title when product is loaded
  useEffect(() => {
    if (product) {
      document.title = `${product.name} - Trendy Cosmetix`;
    } else {
      document.title = 'Trendy Cosmetix';
    }
    
    // Cleanup: reset title when component unmounts
    return () => {
      document.title = 'Trendy Cosmetix';
    };
  }, [product]);

  // Product analytics: CTA clicks + active time (Visibility API), sent to /api/analytics
  const { trackClick } = useProductAnalytics(product?.id, product?.id);

  // Load Facebook Pixel after first paint to avoid blocking LCP (deferred)
  useEffect(() => {
    if (!product?.ownerId) return;

    const schedule = (fn: () => void) => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(fn, { timeout: 2500 });
      } else {
        setTimeout(fn, 500);
      }
    };

    const loadAndInjectFacebookPixel = async () => {
      try {
        const response = await settingsAPI.getByUserId(product.ownerId);
        const pixelCode = response.settings?.facebookPixelCode;
        if (!pixelCode || (typeof pixelCode === 'string' && pixelCode.trim() === '')) return;

        // Check if Facebook Pixel is already injected (avoid duplicates)
        // Check by looking for fbq function or facebook pixel script
        const existingPixel = document.head.querySelector('script[data-facebook-pixel]') || 
                              document.head.querySelector('script[src*="facebook.net"]') ||
                              (window as any).fbq;
        if (existingPixel) return;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = pixelCode.trim();
        const scripts = tempDiv.querySelectorAll('script');
        
        scripts.forEach((script) => {
          const scriptSrc = script.getAttribute('src') || '';
          const scriptText = script.textContent || '';
          
          // Check for duplicate by src or content
          let isDuplicate = false;
          if (scriptSrc) {
            isDuplicate = Array.from(document.head.querySelectorAll('script[src]')).some(
              existing => existing.getAttribute('src') === scriptSrc
            );
          } else if (scriptText) {
            isDuplicate = Array.from(document.head.querySelectorAll('script')).some(
              existing => existing.textContent === scriptText
            );
          }

          if (!isDuplicate) {
            const newScript = document.createElement('script');
            newScript.setAttribute('data-facebook-pixel', 'true');
            
            // Copy all attributes from original script
            Array.from(script.attributes).forEach(attr => {
              newScript.setAttribute(attr.name, attr.value);
            });
            
            // Set script content
            if (script.textContent) {
              newScript.textContent = script.textContent;
            }
            
            document.head.appendChild(newScript);
          }
        });

        const noscripts = tempDiv.querySelectorAll('noscript');
        noscripts.forEach((noscript) => {
          const noscriptContent = noscript.innerHTML;
          
          // Check for duplicate in head
          let isDuplicateInHead = Array.from(document.head.querySelectorAll('noscript')).some(
            existing => existing.innerHTML === noscriptContent
          );
          
          // Check for duplicate in body
          let isDuplicateInBody = Array.from(document.body.querySelectorAll('noscript')).some(
            existing => existing.innerHTML === noscriptContent
          );

          if (!isDuplicateInHead && !isDuplicateInBody) {
            // Facebook Pixel noscript usually goes in body, but we'll put it in head first
            // If it contains an img tag, it should go in body
            if (noscriptContent.includes('<img')) {
              const newNoscript = document.createElement('noscript');
              newNoscript.setAttribute('data-facebook-pixel', 'true');
              newNoscript.innerHTML = noscriptContent;
              document.body.insertBefore(newNoscript, document.body.firstChild);
            } else {
              const newNoscript = document.createElement('noscript');
              newNoscript.setAttribute('data-facebook-pixel', 'true');
              newNoscript.innerHTML = noscriptContent;
              document.head.appendChild(newNoscript);
            }
          }
        });
      } catch (err) {
        console.error('Error loading/injecting Facebook Pixel code:', err);
      }
    };

    schedule(loadAndInjectFacebookPixel);
  }, [product?.ownerId]);

  // Load TikTok Pixel after first paint (deferred, same as Facebook)
  useEffect(() => {
    if (!product?.ownerId) return;

    const schedule = (fn: () => void) => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(fn, { timeout: 2500 });
      } else {
        setTimeout(fn, 500);
      }
    };

    const loadAndInjectTiktokPixel = async () => {
      try {
        const response = await settingsAPI.getByUserId(product.ownerId);
        const pixelCode = response.settings?.tiktokPixelCode;
        if (!pixelCode || (typeof pixelCode === 'string' && pixelCode.trim() === '')) return;

        const existingPixel = document.head.querySelector('script[data-tiktok-pixel]') ||
          document.head.querySelector('script[src*="analytics.tiktok.com"]') ||
          (window as any).ttq;
        if (existingPixel) return;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = pixelCode.trim();

        tempDiv.querySelectorAll('script').forEach((script) => {
          const scriptSrc = script.getAttribute('src') || '';
          const scriptText = script.textContent || '';
          const isDuplicate = scriptSrc
            ? Array.from(document.head.querySelectorAll('script[src]')).some((s) => s.getAttribute('src') === scriptSrc)
            : Array.from(document.head.querySelectorAll('script')).some((s) => s.textContent === scriptText);
          if (!isDuplicate) {
            const newScript = document.createElement('script');
            newScript.setAttribute('data-tiktok-pixel', 'true');
            Array.from(script.attributes).forEach((attr) => newScript.setAttribute(attr.name, attr.value));
            if (script.textContent) newScript.textContent = script.textContent;
            document.head.appendChild(newScript);
          }
        });

        tempDiv.querySelectorAll('noscript').forEach((noscript) => {
          const content = noscript.innerHTML;
          const exists = Array.from(document.head.querySelectorAll('noscript')).some((n) => n.innerHTML === content) ||
            Array.from(document.body.querySelectorAll('noscript')).some((n) => n.innerHTML === content);
          if (!exists) {
            const newNoscript = document.createElement('noscript');
            newNoscript.setAttribute('data-tiktok-pixel', 'true');
            newNoscript.innerHTML = content;
            if (content.includes('<img')) {
              document.body.insertBefore(newNoscript, document.body.firstChild);
            } else {
              document.head.appendChild(newNoscript);
            }
          }
        });
      } catch (err) {
        console.error('Error loading/injecting TikTok Pixel code:', err);
      }
    };
    schedule(loadAndInjectTiktokPixel);
  }, [product?.ownerId]);

  // Load template if product has one
  useEffect(() => {
    const loadTemplate = async () => {
      if (!product?.landingPageTemplateId) {
        setTemplate(undefined);
        return;
      }
      
      // Try to get from store first
      const storeTemplate = getTemplate(product.landingPageTemplateId);
      if (storeTemplate) {
        setTemplate(storeTemplate);
        return;
      }
      
      // If not in store, fetch from API (public access)
      try {
        const response = await templatesAPI.getById(product.landingPageTemplateId);
        if (response.template) {
          setTemplate(response.template);
        }
      } catch (err) {
        console.error('Error loading template:', err);
        // Continue without template - will use default layout
      }
    };
    
    loadTemplate();
  }, [product?.landingPageTemplateId, getTemplate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-cairo" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 font-cairo" dir="rtl">
            <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">المنتج غير موجود</h2>
          <p className="text-gray-600 mt-2">{error || 'لم يتم العثور على المنتج'}</p>
          <Link to="/" className="mt-4 inline-block text-brand-600 hover:text-brand-500">العودة للمتجر</Link>
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

    const selectedAttrs = { ...selectedAttributes, 'Quantité': quantity.toString() };

    if (paymentMethod === 'stripe') {
      try {
        const settingsRes = await settingsAPI.getByUserId(product.ownerId);
        const pk = settingsRes.settings?.stripePublishableKey;
        if (!pk) {
          setFormError('Le paiement en ligne n\'est pas configuré pour ce produit.');
          return;
        }
        const { clientSecret, orderId } = await stripeAPI.createPaymentIntent({
          productId: product.id,
          productName: product.name,
          productPrice: product.price,
          productSupplier: product.supplier,
          customer: formData,
          selectedAttributes: selectedAttrs
        });
        setStripePublishableKey(pk);
        setStripeClientSecret(clientSecret);
        setStripeOrderId(orderId);
      } catch (err: any) {
        setFormError(err?.message || 'Impossible de préparer le paiement. Réessayez ou choisissez COD.');
        console.error(err);
      }
      return;
    }

    const newOrder: Order = {
      id: `ord_${Date.now()}`,
      sellerId: product.ownerId,
      productId: product.id,
      productName: product.name,
      productPrice: product.price,
      productSupplier: product.supplier,
      customer: formData,
      selectedAttributes: selectedAttrs,
      createdAt: Date.now(),
      status: 'pending',
      viewed: false,
      paymentMethod: 'cod'
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
      formError,
      images: product.images,
      currentImageIndex: currentMediaIndex,
      setCurrentImageIndex: setCurrentMediaIndex,
      prevImage: () => setCurrentMediaIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1)),
      nextImage: () => setCurrentMediaIndex((prev) => (prev + 1) % media.length),
      quantity,
      setQuantity,
      paymentMethod,
      setPaymentMethod,
  };

  // Ensure attributes is an array to avoid crashes
  const attributes = Array.isArray(product.attributes) ? product.attributes : [];
  const payOpts = (product as any).paymentOptions || 'cod_only';

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
  if (product.landingPageTemplateId && template) {
          // Code templates: sticky CTA only when template includes {sticky_cta}. No hardcoded bar.
          const isCodeTemplate = template.mode === 'code';
          const showFallbackStickyCta = !isCodeTemplate; // visual mode: keep legacy sticky bar

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

                  {/* Sticky CTA: only for visual-mode templates. Code templates use {sticky_cta} in HTML. */}
                  {showFallbackStickyCta && (
                    <>
                      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 flex items-center gap-4">
                          <div className="flex-1">
                             <div className="text-xs text-gray-500 mb-1">السعر الإجمالي:</div>
                             <div className="text-xl font-black text-red-600">{formatPrice(product.price * quantity, product.currency)}</div>
                          </div>
                          <button 
                            onClick={() => { trackClick('cta_click'); scrollToForm(); }}
                            className="flex-1 bg-red-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center justify-center animate-pulse"
                          >
                             اطلب الآن
                          </button>
                      </div>
                      <div className="h-24"></div>
                    </>
                  )}
              </div>
          );
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
            <div
              className="w-full max-w-[600px] mx-auto relative rounded-2xl overflow-hidden shadow-lg border border-gray-100 bg-white touch-pan-y"
              onTouchStart={media.length > 1 ? (e) => { galleryTouchStartX.current = e.touches[0].clientX; } : undefined}
              onTouchEnd={media.length > 1 ? (e) => {
                const delta = e.changedTouches[0].clientX - galleryTouchStartX.current;
                if (Math.abs(delta) < 50) return;
                setCurrentMediaIndex((i) => delta > 0 ? Math.max(0, i - 1) : Math.min(media.length - 1, i + 1));
              } : undefined}
            >
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
                     className="w-full h-full object-center object-contain"
                     fetchPriority="high"
                     decoding="async"
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
                            onClick={() => { trackClick('cta_click'); setCurrentMediaIndex(idx); }}
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
                                      className="w-full h-full object-contain"
                                      loading="lazy"
                                      decoding="async"
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
                        {stripeClientSecret ? 'أكّد الدفع عبر البطاقة' : 'لطلب المنتج، المرجو ملأ الاستمارة التالية:'}
                    </h3>

                    {stripeClientSecret && stripePromise ? (
                      <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
                        <StripeConfirmForm onSuccess={() => setSubmitted(true)} />
                      </Elements>
                    ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Product attributes - separate section */}
                        {attributes.length > 0 && (
                            <div className="pb-4 border-b border-gray-200">
                                <h4 className="text-sm font-bold text-gray-800 mb-3">المواصفات</h4>
                                <div className="space-y-3">
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
                                </div>
                            </div>
                        )}

                        {/* Quantity - separate section */}
                        <div className="pb-4 border-b border-gray-200">
                            <h4 className="text-sm font-bold text-gray-800 mb-3">الكمية</h4>
                            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200">
                                <span className="font-bold text-gray-700">الكمية:</span>
                                <div className="flex items-center gap-4">
                                    <button type="button" onClick={() => { trackClick('cta_click'); setQuantity(Math.max(1, quantity - 1)); }} className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-red-600">
                                        <Minus size={16} />
                                    </button>
                                    <span className="font-black text-xl w-6 text-center">{quantity}</span>
                                    <button type="button" onClick={() => { trackClick('cta_click'); setQuantity(quantity + 1); }} className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-green-600">
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Payment method (when both COD and Stripe) */}
                        {payOpts === 'both' && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">طريقة الدفع</label>
                                <div className="flex gap-3">
                                    <label className={`flex-1 cursor-pointer px-4 py-3 rounded-lg border-2 text-sm font-bold transition-all ${paymentMethod === 'cod' ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-600'}`}>
                                        <input type="radio" name="pay" value="cod" className="sr-only" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                                        دفع عند الاستلام (COD)
                                    </label>
                                    <label className={`flex-1 cursor-pointer px-4 py-3 rounded-lg border-2 text-sm font-bold transition-all ${paymentMethod === 'stripe' ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-600'}`}>
                                        <input type="radio" name="pay" value="stripe" className="sr-only" checked={paymentMethod === 'stripe'} onChange={() => setPaymentMethod('stripe')} />
                                        دفع عبر الإنترنت
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Contact / delivery details - separate section */}
                        <div>
                            <h4 className="text-sm font-bold text-gray-800 mb-3">معلومات التوصيل</h4>
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
                            onClick={() => trackClick('cta_click')}
                            className="w-full bg-red-600 border border-transparent rounded-xl py-4 px-8 flex items-center justify-center text-lg font-black text-white hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200 shadow-lg transform transition-transform active:scale-95"
                        >
                            <ShoppingCart className="ml-2 h-6 w-6" />
                            {paymentMethod === 'stripe' ? 'الدفع عبر الإنترنت' : 'اطلب الآن'} - {formatPrice(product.price * quantity, product.currency)}
                        </button>
                    </form>
                    )}
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

        {/* Reviews Section - only if enabled and has reviews */}
        {product.showReviews !== false && product.reviews && product.reviews.length > 0 && (
            <div className="mt-12 bg-white p-6 sm:p-8 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-2xl font-bold mb-6 text-gray-800 border-b border-gray-200 pb-4">
                    التقييمات
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {product.reviews.map((r, idx) => (
                        <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-gray-800">{r.author}</span>
                                <span className="text-amber-500 flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <Star key={n} size={14} className={n <= (r.rating || 0) ? 'fill-amber-500 text-amber-500' : 'text-gray-200'} />
                                    ))}
                                </span>
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed">{r.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </main>

      {/* Sticky Mobile CTA - Now visible on all devices */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 flex items-center gap-4">
          <div className="flex-1">
             <div className="text-xs text-gray-500 mb-1">السعر الإجمالي:</div>
             <div className="text-xl font-black text-red-600">{formatPrice(product.price * quantity, product.currency)}</div>
          </div>
          <button 
            onClick={() => { trackClick('cta_click'); scrollToForm(); }}
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