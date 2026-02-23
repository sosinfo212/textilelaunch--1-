import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Save, User, Settings as SettingsIcon, Plus, Trash2, Shield, Key, Image, ExternalLink, Copy, Check, Eye, RefreshCw } from 'lucide-react';
import { User as UserType } from '../types';

export const SettingsPage: React.FC = () => {
    const { settings, updateSettings, refreshSettings } = useStore();
    const { user, users, addUser, updateUser, deleteUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'general' | 'users'>('general');

    // API key (shown once after generate; view modal for stored key)
    const [newApiKey, setNewApiKey] = useState<string | null>(null);
    const [apiKeyGenerating, setApiKeyGenerating] = useState(false);
    const [apiKeyError, setApiKeyError] = useState('');
    const [apiKeyCopied, setApiKeyCopied] = useState(false);
    const [viewApiKeyModal, setViewApiKeyModal] = useState<string | null>(null); // key value when open, null when closed
    const [viewApiKeyLoading, setViewApiKeyLoading] = useState(false);

    // Settings Form
    const [shopName, setShopName] = useState(settings.shopName);
    const [logoUrl, setLogoUrl] = useState(settings.logoUrl);
    const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey);
    const [facebookPixelCode, setFacebookPixelCode] = useState(settings.facebookPixelCode || '');
    const [tiktokPixelCode, setTiktokPixelCode] = useState(settings.tiktokPixelCode || '');
    const [stripePublishableKey, setStripePublishableKey] = useState(settings.stripePublishableKey || '');
    const [stripeSecretKey, setStripeSecretKey] = useState(settings.stripeSecretKey || '');
    const [saveMessage, setSaveMessage] = useState('');

    // Update form when settings change
    useEffect(() => {
        setShopName(settings.shopName);
        setLogoUrl(settings.logoUrl);
        setGeminiApiKey(settings.geminiApiKey);
        setFacebookPixelCode(settings.facebookPixelCode || '');
        setTiktokPixelCode(settings.tiktokPixelCode || '');
        setStripePublishableKey(settings.stripePublishableKey || '');
        setStripeSecretKey(settings.stripeSecretKey || '');
    }, [settings]);

    // Users Form
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserType | null>(null);
    const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'user' });

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if(user) {
            try {
                await updateSettings({
                    userId: user.id,
                    shopName,
                    logoUrl,
                    geminiApiKey,
                    facebookPixelCode,
                    tiktokPixelCode,
                    stripePublishableKey,
                    stripeSecretKey
                });
                setSaveMessage('Paramètres sauvegardés avec succès !');
                setTimeout(() => setSaveMessage(''), 3000);
            } catch (error) {
                setSaveMessage('Erreur lors de la sauvegarde. Veuillez réessayer.');
                console.error(error);
            }
        }
    };

    const handleUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await updateUser({ ...editingUser, ...userForm } as UserType);
            } else {
                await addUser({
                    id: `usr_${Date.now()}`,
                    ...userForm
                } as UserType);
            }
            setIsUserModalOpen(false);
            setEditingUser(null);
            setUserForm({ name: '', email: '', password: '', role: 'user' });
        } catch (error) {
            alert('Erreur lors de l\'opération. Veuillez réessayer.');
            console.error(error);
        }
    };

    const openEditUser = (u: UserType) => {
        setEditingUser(u);
        setUserForm({ name: u.name, email: u.email, password: u.password || '', role: u.role });
        setIsUserModalOpen(true);
    };

    const handleDeleteUser = async (id: string) => {
        if(window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
            try {
                await deleteUser(id);
            } catch (error) {
                alert('Erreur lors de la suppression. Veuillez réessayer.');
                console.error(error);
            }
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
                <p className="mt-1 text-sm text-gray-500">Boutique, paiement, API et tracking.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <nav className="flex border-b border-gray-200 bg-gray-50/50">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`py-3.5 px-5 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'general' ? 'border-brand-500 text-brand-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                    >
                        <SettingsIcon size={18} />
                        Général
                    </button>
                    {user?.role === 'admin' && (
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`py-3.5 px-5 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'users' ? 'border-brand-500 text-brand-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                        >
                            <User size={18} />
                            Utilisateurs
                        </button>
                    )}
                </nav>

                <div className="p-6 md:p-8">
                    {activeTab === 'general' && (
                        <form onSubmit={handleSaveSettings} className="max-w-2xl space-y-10">
                            {/* Section: Boutique */}
                            <section className="space-y-4">
                                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">
                                    <Image size={18} className="text-gray-500" />
                                    Boutique
                                </h2>
                                <div className="grid gap-4 sm:grid-cols-1">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la boutique</label>
                                        <input
                                            type="text"
                                            value={shopName}
                                            onChange={e => setShopName(e.target.value)}
                                            className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-brand-500 focus:border-brand-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">URL du logo</label>
                                        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                                            <span className="inline-flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-300">
                                                <Image size={16} />
                                            </span>
                                            <input
                                                type="text"
                                                value={logoUrl}
                                                onChange={e => setLogoUrl(e.target.value)}
                                                className="flex-1 min-w-0 py-2 px-3 text-sm focus:ring-brand-500 focus:border-brand-500 border-0"
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Section: Paiement (Stripe) */}
                            <section className="space-y-4">
                                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">
                                    <Shield size={18} className="text-gray-500" />
                                    Paiement en ligne (Stripe)
                                </h2>
                                <div className="space-y-4 rounded-xl bg-gray-50/80 p-4 border border-gray-100">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Clé publique (publishable)</label>
                                        <input
                                            type="text"
                                            value={stripePublishableKey}
                                            onChange={e => setStripePublishableKey(e.target.value)}
                                            className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm font-mono focus:ring-brand-500 focus:border-brand-500"
                                            placeholder="pk_live_... ou pk_test_..."
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Affichée côté client pour Stripe.js sur les landing pages.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Clé secrète (secret)</label>
                                        <input
                                            type="password"
                                            value={stripeSecretKey}
                                            onChange={e => setStripeSecretKey(e.target.value)}
                                            className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm font-mono focus:ring-brand-500 focus:border-brand-500"
                                            placeholder="sk_live_... ou sk_test_..."
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Ne partagez jamais cette clé. Utilisez sk_test_ en développement.</p>
                                    </div>
                                </div>
                            </section>

                            {/* Section: Clés API */}
                            <section className="space-y-4">
                                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">
                                    <Key size={18} className="text-gray-500" />
                                    Clés API
                                </h2>
                                <div className="space-y-5 rounded-xl bg-gray-50/80 p-4 border border-gray-100">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Clé API Gemini (Google)</label>
                                        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                                            <span className="inline-flex items-center px-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-300">
                                                <Key size={16} />
                                            </span>
                                            <input
                                                type="password"
                                                value={geminiApiKey}
                                                onChange={e => setGeminiApiKey(e.target.value)}
                                                className="flex-1 min-w-0 py-2 px-3 text-sm focus:ring-brand-500 focus:border-brand-500 border-0"
                                                placeholder="AIzaSy..."
                                            />
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">Nécessaire pour la génération automatique de descriptions produit.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Clé API TextileLaunch</label>
                                        <p className="text-xs text-gray-500 mb-2">
                                            Pour appeler l’API (import produits, etc.) sans session. En-tête : <code className="bg-gray-200 px-1 rounded text-gray-700">Authorization: Bearer &lt;clé&gt;</code> ou <code className="bg-gray-200 px-1 rounded text-gray-700">X-API-Key: &lt;clé&gt;</code>.
                                        </p>
                                        {newApiKey ? (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={newApiKey}
                                                    className="flex-1 font-mono text-sm border border-amber-300 bg-amber-50 rounded-lg py-2 px-3"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        try {
                                                            await navigator.clipboard.writeText(newApiKey);
                                                            setApiKeyCopied(true);
                                                            setTimeout(() => setApiKeyCopied(false), 2000);
                                                        } catch {}
                                                    }}
                                                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium shrink-0"
                                                >
                                                    {apiKeyCopied ? <Check size={16} /> : <Copy size={16} />}
                                                    {apiKeyCopied ? 'Copié' : 'Copier'}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span className="text-sm text-gray-600">
                                                    {settings.hasApiKey ? 'Clé configurée (••••••••)' : 'Aucune clé'}
                                                </span>
                                                {settings.hasApiKey && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                setApiKeyError('');
                                                                setViewApiKeyLoading(true);
                                                                try {
                                                                    const res = await import('../src/utils/api').then(m => m.settingsAPI.getApiKey());
                                                                    if (res.apiKey) setViewApiKeyModal(res.apiKey);
                                                                    else setApiKeyError((res as { reason?: string }).reason === 'key_created_before_storage'
                                                                        ? 'key_created_before_storage'
                                                                        : 'Clé introuvable.');
                                                                } catch (e: any) {
                                                                    setApiKeyError(e?.message || 'Erreur.');
                                                                } finally {
                                                                    setViewApiKeyLoading(false);
                                                                }
                                                            }}
                                                            disabled={viewApiKeyLoading}
                                                            className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                                                            title="Voir la clé"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                if (!window.confirm('Remplacer la clé actuelle ? L’ancienne ne fonctionnera plus.')) return;
                                                                setApiKeyError('');
                                                                setApiKeyGenerating(true);
                                                                try {
                                                                    const res = await import('../src/utils/api').then(m => m.settingsAPI.generateApiKey());
                                                                    setNewApiKey(res.apiKey);
                                                                    setViewApiKeyModal(null);
                                                                    await refreshSettings();
                                                                } catch (e: any) {
                                                                    setApiKeyError(e?.message || 'Erreur lors de la régénération.');
                                                                } finally {
                                                                    setApiKeyGenerating(false);
                                                                }
                                                            }}
                                                            disabled={apiKeyGenerating}
                                                            className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                                                            title="Régénérer la clé"
                                                        >
                                                            <RefreshCw size={18} className={apiKeyGenerating ? 'animate-spin' : ''} />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        setApiKeyError('');
                                                        setApiKeyGenerating(true);
                                                        try {
                                                            const res = await import('../src/utils/api').then(m => m.settingsAPI.generateApiKey());
                                                            setNewApiKey(res.apiKey);
                                                            setViewApiKeyModal(null);
                                                            await refreshSettings();
                                                        } catch (e: any) {
                                                            setApiKeyError(e?.message || 'Erreur lors de la génération.');
                                                        } finally {
                                                            setApiKeyGenerating(false);
                                                        }
                                                    }}
                                                    disabled={apiKeyGenerating}
                                                    className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                                                >
                                                    {apiKeyGenerating ? 'Génération...' : 'Générer une clé'}
                                                </button>
                                            </div>
                                        )}
                                        {viewApiKeyModal !== null && (
                                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setViewApiKeyModal(null)}>
                                                <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Clé API</h3>
                                                    <div className="flex gap-2 mb-4">
                                                        <input type="text" readOnly value={viewApiKeyModal} className="flex-1 font-mono text-sm border border-gray-300 rounded-lg py-2 px-3 bg-gray-50" />
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                try {
                                                                    await navigator.clipboard.writeText(viewApiKeyModal);
                                                                    setApiKeyCopied(true);
                                                                    setTimeout(() => setApiKeyCopied(false), 2000);
                                                                } catch {}
                                                            }}
                                                            className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium shrink-0"
                                                        >
                                                            {apiKeyCopied ? <Check size={16} /> : <Copy size={16} />}
                                                            {apiKeyCopied ? 'Copié' : 'Copier'}
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mb-4">Utilisez cette clé dans l’en-tête : <code className="bg-gray-200 px-1 rounded">Authorization: Bearer &lt;clé&gt;</code></p>
                                                    <button type="button" onClick={() => setViewApiKeyModal(null)} className="w-full py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Fermer</button>
                                                </div>
                                            </div>
                                        )}
                                        {newApiKey && <p className="mt-2 text-xs text-amber-700">Clé enregistrée. Vous pouvez la voir ou la régénérer plus tard.</p>}
                                        {apiKeyError === 'key_created_before_storage' && (
                                            <div className="mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                                                <p className="text-sm text-amber-800 mb-2">Cette clé a été créée avant l’enregistrement. Régénérez la clé pour pouvoir la consulter ensuite.</p>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (!window.confirm('Remplacer la clé actuelle ? L’ancienne ne fonctionnera plus.')) return;
                                                        setApiKeyError('');
                                                        setApiKeyGenerating(true);
                                                        try {
                                                            const res = await import('../src/utils/api').then(m => m.settingsAPI.generateApiKey());
                                                            setNewApiKey(res.apiKey);
                                                            setViewApiKeyModal(null);
                                                            await refreshSettings();
                                                        } catch (e: any) {
                                                            setApiKeyError(e?.message || 'Erreur lors de la régénération.');
                                                        } finally {
                                                            setApiKeyGenerating(false);
                                                        }
                                                    }}
                                                    disabled={apiKeyGenerating}
                                                    className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                                                >
                                                    {apiKeyGenerating ? 'Régénération...' : 'Régénérer la clé'}
                                                </button>
                                            </div>
                                        )}
                                        {apiKeyError && apiKeyError !== 'key_created_before_storage' && <p className="mt-2 text-xs text-red-600">{apiKeyError}</p>}
                                    </div>
                                </div>
                            </section>

                            {/* Section: Tracking (Pixels) */}
                            <section className="space-y-4">
                                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2">
                                    Tracking &amp; pixels
                                </h2>
                                <div className="space-y-4 rounded-xl bg-gray-50/80 p-4 border border-gray-100">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Code Facebook Pixel</label>
                                        <textarea
                                            value={facebookPixelCode}
                                            onChange={e => setFacebookPixelCode(e.target.value)}
                                            rows={5}
                                            className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-xs font-mono focus:ring-brand-500 focus:border-brand-500"
                                            placeholder="<!-- Facebook Pixel Code --> ..."
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Injecté dans le &lt;head&gt; des landing pages.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Code TikTok Pixel</label>
                                        <textarea
                                            value={tiktokPixelCode}
                                            onChange={e => setTiktokPixelCode(e.target.value)}
                                            rows={5}
                                            className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-xs font-mono focus:ring-brand-500 focus:border-brand-500"
                                            placeholder="Collez votre code TikTok Pixel (script + noscript)"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Injecté dans le &lt;head&gt; des landing pages.</p>
                                    </div>
                                </div>
                            </section>

                            {/* Section: Intégrations */}
                            <section className="space-y-4">
                                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-2">
                                    <ExternalLink size={18} className="text-gray-500" />
                                    Intégrations
                                </h2>
                                <div className="rounded-xl bg-gray-50/80 p-4 border border-gray-100">
                                    <Link
                                        to="/integrations/affiliate"
                                        className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 text-sm font-medium"
                                    >
                                        <ExternalLink size={16} />
                                        Connecter Azome Affiliate (ou autre plateforme)
                                    </Link>
                                </div>
                            </section>

                            {/* Save */}
                            <section className="pt-4 border-t border-gray-200 flex flex-wrap items-center gap-3">
                                <button
                                    type="submit"
                                    className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                                >
                                    <Save size={18} />
                                    Sauvegarder les paramètres
                                </button>
                                {saveMessage && (
                                    <span className="text-sm font-medium text-green-600">
                                        {saveMessage}
                                    </span>
                                )}
                            </section>
                        </form>
                    )}

                    {activeTab === 'users' && user?.role === 'admin' && (
                        <div className="space-y-6">
                            <section>
                                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Gestion des utilisateurs</h2>
                                    <button
                                        onClick={() => { setEditingUser(null); setUserForm({ name: '', email: '', password: '', role: 'user' }); setIsUserModalOpen(true); }}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
                                    >
                                        <Plus size={16} />
                                        Ajouter un utilisateur
                                    </button>
                                </div>
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                                                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                                                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {users.map((u) => (
                                                <tr key={u.id} className="hover:bg-gray-50/50">
                                                    <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.name}</td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                                            {u.role === 'admin' ? 'Admin' : 'Vendeur'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                                        <button type="button" onClick={() => openEditUser(u)} className="text-brand-600 hover:text-brand-800">Éditer</button>
                                                        {u.id !== user.id && (
                                                            <button type="button" onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:text-red-800 inline-flex items-center">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </div>

            {/* User Modal */}
            {isUserModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">{editingUser ? 'Modifier l’utilisateur' : 'Nouvel utilisateur'}</h3>
                        </div>
                        <form onSubmit={handleUserSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                                <input type="text" required value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-brand-500 focus:border-brand-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" required value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-brand-500 focus:border-brand-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                                <input type="password" required={!editingUser} value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-brand-500 focus:border-brand-500" placeholder={editingUser ? 'Laisser vide pour ne pas changer' : ''} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                                <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value as 'admin' | 'user' })} className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:ring-brand-500 focus:border-brand-500">
                                    <option value="user">Vendeur</option>
                                    <option value="admin">Administrateur</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">Annuler</button>
                                <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700">Sauvegarder</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};