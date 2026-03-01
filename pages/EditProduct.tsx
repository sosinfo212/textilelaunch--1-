import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Product, ProductAttribute, ProductReview } from '../types';
import { generateProductDescription } from '../services/geminiService';
import { fileToBase64, convertImagesToBase64, isVideo, isImage } from '../src/utils/imageUtils';
import { PRODUCT_CURRENCIES } from '../src/utils/currency';
import { Sparkles, Plus, Trash2, Image as ImageIcon, Loader2, Edit2, X, Eye, EyeOff, Video, Star, MessageSquare } from 'lucide-react';

export const EditProduct: React.FC = () => {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const { getProduct, updateProduct, templates, categories, settings } = useStore();
  
  const [product, setProduct] = useState<Product | undefined>(undefined);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(''); // Selling price
  const [regularPrice, setRegularPrice] = useState(''); // Regular price
  const [cost, setCost] = useState(''); // Cost price
  const [currency, setCurrency] = useState('MAD'); // Currency
  const [sku, setSku] = useState(''); // SKU
  const [showSku, setShowSku] = useState(false); // Show SKU on landing page
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]); // Now stores video URLs instead of base64
  const [videoUrl, setVideoUrl] = useState(''); // Input field for video URL
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [paymentOptions, setPaymentOptions] = useState<'cod_only' | 'stripe_only' | 'both'>('cod_only');
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [showReviews, setShowReviews] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // UI State
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // New Attribute State
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrOptions, setNewAttrOptions] = useState('');
  const [editIndex, setEditIndex] = useState<number | null>(null);

  useEffect(() => {
    if (productId) {
      const p = getProduct(productId);
      if (p) {
        setProduct(p);
        setName(p.name);
        setDescription(p.description);
        setPrice(p.price.toString());
        setRegularPrice(p.regularPrice ? p.regularPrice.toString() : '');
        setCost(p.cost != null ? String(p.cost) : '');
        setCurrency(p.currency || 'MAD');
        setSku(p.sku || '');
        setShowSku(p.showSku || false);
        setCategory(p.category || '');
        setSupplier(p.supplier || '');
        setImages(p.images);
        setVideos(p.videos || []);
        // Safely set attributes, default to empty array if missing
        setAttributes(Array.isArray(p.attributes) ? p.attributes : []);
        setSelectedTemplateId(p.landingPageTemplateId || '');
        setPaymentOptions(['cod_only', 'stripe_only', 'both'].includes((p as any).paymentOptions) ? (p as any).paymentOptions : 'cod_only');
        setReviews(Array.isArray(p.reviews) ? p.reviews : []);
        setShowReviews(p.showReviews !== false);
      } else {
        alert("Produit introuvable");
        navigate('/products');
      }
    }
  }, [productId, getProduct, navigate]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        // Convert file to base64 for persistent storage
        const base64 = await fileToBase64(file);
        setImages([...images, base64]);
      } catch (error) {
        console.error('Error converting image to base64:', error);
        alert('Erreur lors du chargement de l\'image');
      }
    }
  };

  const handleAddVideoUrl = () => {
    if (videoUrl.trim()) {
      // Basic URL validation
      try {
        new URL(videoUrl.trim());
        setVideos([...videos, videoUrl.trim()]);
        setVideoUrl('');
      } catch {
        alert('Veuillez entrer une URL valide (ex: https://youtube.com/watch?v=...)');
      }
    }
  };

  const handleAddAttribute = () => {
    if (newAttrName && newAttrOptions) {
      const optionsArray = newAttrOptions.split(',').map(s => s.trim()).filter(Boolean);
      if (optionsArray.length > 0) {
        if (editIndex !== null) {
            // Update existing attribute
            const updatedAttributes = [...attributes];
            updatedAttributes[editIndex] = { name: newAttrName, options: optionsArray };
            setAttributes(updatedAttributes);
            setEditIndex(null);
        } else {
            // Add new attribute
            setAttributes([...attributes, { name: newAttrName, options: optionsArray }]);
        }
        setNewAttrName('');
        setNewAttrOptions('');
      }
    }
  };

  const handleEditAttribute = (index: number) => {
    const attr = attributes[index];
    setNewAttrName(attr.name);
    setNewAttrOptions(attr.options.join(', '));
    setEditIndex(index);
  };

  const handleCancelEdit = () => {
      setEditIndex(null);
      setNewAttrName('');
      setNewAttrOptions('');
  };

  const removeAttribute = (index: number) => {
    const newAttrs = [...attributes];
    newAttrs.splice(index, 1);
    setAttributes(newAttrs);
    if (editIndex === index) {
        handleCancelEdit();
    }
  };

  const handleGenerateDescription = async () => {
    if (!name) return alert("Veuillez entrer un nom de produit d'abord.");
    setIsGenerating(true);
    // Pass the API Key from settings
    const desc = await generateProductDescription(name, "textile, mode, confort, qualité", settings.geminiApiKey);
    setDescription(desc);
    setIsGenerating(false);
    setIsPreviewMode(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    // Check if there is a pending attribute in the inputs that user forgot to add
    let finalAttributes = [...attributes];
    if (newAttrName && newAttrOptions) {
        const optionsArray = newAttrOptions.split(',').map(s => s.trim()).filter(Boolean);
        if (optionsArray.length > 0) {
             if (editIndex !== null) {
                 finalAttributes[editIndex] = { name: newAttrName, options: optionsArray };
             } else {
                 finalAttributes.push({ name: newAttrName, options: optionsArray });
             }
        }
    }

    // Convert any remaining blob URLs to base64 before saving
    let finalImages = images.length > 0 ? images : ['https://picsum.photos/800/800'];
    try {
      finalImages = await convertImagesToBase64(finalImages);
    } catch (error) {
      console.error('Error converting images to base64:', error);
      // Continue with original images if conversion fails
    }

    const updatedProduct: Product = {
      ...product,
      name,
      description,
      price: parseFloat(price),
      regularPrice: regularPrice ? parseFloat(regularPrice) : undefined,
      cost: cost ? parseFloat(cost) : undefined,
      currency: currency || 'MAD',
      sku: sku || undefined,
      showSku: showSku,
      category: category || undefined,
      supplier: supplier || undefined,
      images: finalImages,
      videos: videos.length > 0 ? videos : undefined,
      attributes: finalAttributes,
      landingPageTemplateId: selectedTemplateId || undefined,
      paymentOptions,
      reviews,
      showReviews
    };
    try {
      await updateProduct(updatedProduct);
      navigate('/products');
    } catch (error) {
      alert('Erreur lors de la mise à jour du produit. Veuillez réessayer.');
      console.error(error);
    }
  };

  if (!product) return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Modifier le produit
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200 bg-white shadow rounded-lg p-6">
        <div className="space-y-6">
          
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Nom du produit</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
              placeholder="Ex: Hoodie Oversize Beige"
            />
          </div>

          <div>
            <div className="flex justify-between items-end mb-1">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                        className="inline-flex items-center text-xs font-medium text-brand-600 hover:text-brand-700 underline"
                    >
                        {isPreviewMode ? (
                            <><EyeOff className="w-3 h-3 mr-1" /> Éditer</>
                        ) : (
                            <><Eye className="w-3 h-3 mr-1" /> Aperçu HTML</>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={handleGenerateDescription}
                        disabled={isGenerating || !name}
                        className="inline-flex items-center px-2 py-0.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 className="animate-spin h-3 w-3 mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                        Régénérer avec IA
                    </button>
                </div>
            </div>
            
             {isPreviewMode ? (
                 <div className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-3 px-4 bg-gray-50 min-h-[160px] prose prose-sm max-w-none">
                     {/<[a-z][\s\S]*>/i.test(description) ? (
                        <div dangerouslySetInnerHTML={{__html: description}} />
                    ) : (
                        <div className="whitespace-pre-line">{description || <span className="text-gray-400 italic">Aucune description...</span>}</div>
                    )}
                </div>
            ) : (
                <>
                    <textarea
                    required
                    rows={6}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm font-mono"
                    placeholder="Description du produit (HTML supporté ou texte simple)..."
                    />
                     <p className="mt-1 text-xs text-gray-500">
                        Vous pouvez utiliser des balises HTML pour la mise en forme (ex: &lt;b&gt;gras&lt;/b&gt;, &lt;br&gt;, &lt;ul&gt;...).
                    </p>
                </>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700">Prix &amp; devise</p>
            <p className="text-xs text-gray-500">Choisissez la devise du produit pour les prix sur la landing page.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700">Prix de vente</label>
                <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                placeholder="Ex: 99.00"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-500">Prix régulier (optionnel)</label>
                <input
                type="number"
                step="0.01"
                value={regularPrice}
                onChange={e => setRegularPrice(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                placeholder="Ex: 45.00 (Prix barré)"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-500">Coût (optionnel)</label>
                <input
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={e => setCost(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                placeholder="Ex: 15.00"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Devise</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                >
                  {PRODUCT_CURRENCIES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">SKU (Code produit)</label>
            <input
              type="text"
              value={sku}
              onChange={e => setSku(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
              placeholder="Ex: PROD-001"
            />
            <div className="mt-3 flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="showSku"
                  checked={showSku === true}
                  onChange={() => setShowSku(true)}
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Afficher sur la landing page</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="showSku"
                  checked={showSku === false}
                  onChange={() => setShowSku(false)}
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Masquer</span>
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Le SKU peut être affiché ou masqué sur la page de destination du produit.
            </p>
          </div>

          {/* New Fields: Category and Supplier */}
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700">Catégorie</label>
                <input
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    list="category-list"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                    placeholder="Sélectionner ou créer..."
                />
                <datalist id="category-list">
                    {categories.map(cat => (
                        <option key={cat} value={cat} />
                    ))}
                </datalist>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Fournisseur</label>
                <input
                    type="text"
                    value={supplier}
                    onChange={e => setSupplier(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                    placeholder="Ex: Grossiste A"
                />
             </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Modèle Landing Page</label>
            <select 
                value={selectedTemplateId}
                onChange={e => setSelectedTemplateId(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
            >
                <option value="">Layout par défaut</option>
                {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Paiement</label>
            <select
              value={paymentOptions}
              onChange={e => setPaymentOptions(e.target.value as 'cod_only' | 'stripe_only' | 'both')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
            >
              <option value="cod_only">COD uniquement (paiement à la livraison)</option>
              <option value="stripe_only">Stripe uniquement (paiement en ligne)</option>
              <option value="both">Les deux (le client choisit)</option>
            </select>
          </div>

          {/* Reviews */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={20} className="text-gray-500" />
              <label className="block text-sm font-medium text-gray-700">Avis clients</label>
            </div>
            <p className="text-xs text-gray-500 mb-3">Les avis s’affichent sur la landing page du produit. Utilisez le shortcode <code className="bg-gray-100 px-1 rounded">{'{product_reviews}'}</code> dans un modèle Code.</p>
            <label className="inline-flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showReviews}
                onChange={e => setShowReviews(e.target.checked)}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-700">Afficher la section avis sur la landing page</span>
            </label>
            <div className="space-y-3 mt-3">
              {reviews.map((rev, idx) => (
                <div key={idx} className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={rev.author}
                      onChange={e => {
                        const next = [...reviews];
                        next[idx] = { ...next[idx], author: e.target.value };
                        setReviews(next);
                      }}
                      placeholder="Nom"
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 text-sm"
                    />
                    <select
                      value={rev.rating}
                      onChange={e => {
                        const next = [...reviews];
                        next[idx] = { ...next[idx], rating: parseInt(e.target.value, 10) };
                        setReviews(next);
                      }}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 text-sm"
                    >
                      {[1, 2, 3, 4, 5].map(n => (
                        <option key={n} value={n}>{n} étoile{n > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 flex gap-2">
                    <textarea
                      value={rev.text}
                      onChange={e => {
                        const next = [...reviews];
                        next[idx] = { ...next[idx], text: e.target.value };
                        setReviews(next);
                      }}
                      placeholder="Avis..."
                      rows={2}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setReviews(reviews.filter((_, i) => i !== idx))}
                      className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-md"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setReviews([...reviews, { author: '', rating: 5, text: '' }])}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Plus size={16} />
                Ajouter un avis
              </button>
            </div>
          </div>

          {/* Image Upload */}
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">Photos du produit</label>
             <div className="flex items-center space-x-4">
                 <div className="flex-shrink-0 h-24 w-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 bg-gray-50 hover:bg-gray-100 cursor-pointer relative overflow-hidden">
                    <input type="file" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                    <ImageIcon className="h-8 w-8" />
                 </div>
                 <div className="flex space-x-2 overflow-x-auto py-2">
                     {images.map((img, idx) => (
                         <div key={idx} className="relative group">
                             <img src={img} alt="Preview" className="h-24 w-24 object-cover rounded-lg border border-gray-200" />
                             <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-lg transition-all flex items-center justify-center gap-2">
                                 <button
                                     type="button"
                                     onClick={async () => {
                                         // Replace image
                                         const fileInput = document.createElement('input');
                                         fileInput.type = 'file';
                                         fileInput.accept = 'image/*';
                                         fileInput.onchange = async (e) => {
                                             const file = (e.target as HTMLInputElement).files?.[0];
                                             if (file) {
                                                 try {
                                                     const base64 = await fileToBase64(file);
                                                     const newImages = [...images];
                                                     newImages[idx] = base64;
                                                     setImages(newImages);
                                                 } catch (error) {
                                                     console.error('Error replacing image:', error);
                                                     alert('Erreur lors du remplacement de l\'image');
                                                 }
                                             }
                                         };
                                         fileInput.click();
                                     }}
                                     className="opacity-0 group-hover:opacity-100 bg-white text-gray-700 p-1.5 rounded hover:bg-gray-100 transition-opacity"
                                     title="Remplacer"
                                 >
                                     <Edit2 size={14} />
                                 </button>
                                 <button
                                     type="button"
                                     onClick={() => {
                                         if (window.confirm('Supprimer cette image ?')) {
                                             setImages(images.filter((_, i) => i !== idx));
                                         }
                                     }}
                                     className="opacity-0 group-hover:opacity-100 bg-red-500 text-white p-1.5 rounded hover:bg-red-600 transition-opacity"
                                     title="Supprimer"
                                 >
                                     <X size={14} />
                                 </button>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
          </div>

          {/* Video URLs */}
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">Vidéos du produit (URLs)</label>
             <div className="flex gap-2 mb-2">
                 <input
                     type="text"
                     value={videoUrl}
                     onChange={(e) => setVideoUrl(e.target.value)}
                     onKeyPress={(e) => {
                         if (e.key === 'Enter') {
                             e.preventDefault();
                             handleAddVideoUrl();
                         }
                     }}
                     placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..."
                     className="flex-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                 />
                 <button
                     type="button"
                     onClick={handleAddVideoUrl}
                     className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                 >
                     <Plus className="h-4 w-4 mr-1" />
                     Ajouter
                 </button>
             </div>
             {videos.length > 0 && (
                 <div className="flex flex-wrap gap-2 mt-2">
                     {videos.map((video, idx) => (
                         <div key={idx} className="relative group inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                             <Video className="h-4 w-4 text-blue-600" />
                             <span className="text-sm text-blue-800 truncate max-w-xs">{video}</span>
                             <button
                                 type="button"
                                 onClick={() => {
                                     if (window.confirm('Supprimer cette vidéo ?')) {
                                         setVideos(videos.filter((_, i) => i !== idx));
                                     }
                                 }}
                                 className="text-red-600 hover:text-red-800 transition-colors"
                                 title="Supprimer"
                             >
                                 <X size={14} />
                             </button>
                         </div>
                     ))}
                 </div>
             )}
             <p className="mt-1 text-xs text-gray-500">Entrez l'URL d'une vidéo YouTube, Vimeo, ou autre service de streaming.</p>
          </div>

          {/* Dynamic Attributes */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Attributs (Variantes)</h3>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase">Nom (ex: Taille)</label>
                        <input 
                            type="text" 
                            value={newAttrName}
                            onChange={e => setNewAttrName(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 focus:ring-brand-500 focus:border-brand-500 sm:text-sm" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase">Options (séparées par virgule)</label>
                        <input 
                            type="text" 
                            value={newAttrOptions}
                            onChange={e => setNewAttrOptions(e.target.value)}
                            placeholder="S, M, L, XL"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-3 focus:ring-brand-500 focus:border-brand-500 sm:text-sm" 
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    <button 
                        type="button" 
                        onClick={handleAddAttribute}
                        disabled={!newAttrName || !newAttrOptions}
                        className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded disabled:opacity-50 ${editIndex !== null ? 'text-white bg-blue-600 hover:bg-blue-700' : 'text-brand-700 bg-brand-100 hover:bg-brand-200'}`}
                    >
                        {editIndex !== null ? (
                            <>
                                <Edit2 className="mr-1 h-3 w-3" /> Mettre à jour
                            </>
                        ) : (
                            <>
                                <Plus className="mr-1 h-3 w-3" /> Ajouter l'attribut
                            </>
                        )}
                    </button>
                    
                    {editIndex !== null && (
                        <button 
                            type="button" 
                            onClick={handleCancelEdit}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-gray-700 bg-gray-100 hover:bg-gray-200"
                        >
                            <X className="mr-1 h-3 w-3" /> Annuler
                        </button>
                    )}
                </div>

                {/* List of added attributes */}
                {attributes.length > 0 && (
                    <div className="mt-4 space-y-2">
                        {attributes.map((attr, idx) => (
                            <div key={idx} className={`flex justify-between items-center p-3 rounded border ${editIndex === idx ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300' : 'bg-white border-gray-200'}`}>
                                <div>
                                    <span className="font-medium text-gray-900">{attr.name}</span>: 
                                    <span className="text-gray-500 ml-2">{attr.options.join(', ')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => handleEditAttribute(idx)} className="text-blue-500 hover:text-blue-700">
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button type="button" onClick={() => removeAttribute(idx)} className="text-red-500 hover:text-red-700">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>

        </div>

        <div className="pt-5 flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
            >
              Enregistrer les modifications
            </button>
        </div>
      </form>
    </div>
  );
};