import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { Save, User, Settings as SettingsIcon, Plus, Trash2, Shield, Key, Image } from 'lucide-react';
import { User as UserType } from '../types';

export const SettingsPage: React.FC = () => {
    const { settings, updateSettings } = useStore();
    const { user, users, addUser, updateUser, deleteUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'general' | 'users'>('general');

    // Settings Form
    const [shopName, setShopName] = useState(settings.shopName);
    const [logoUrl, setLogoUrl] = useState(settings.logoUrl);
    const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey);
    const [facebookPixelCode, setFacebookPixelCode] = useState(settings.facebookPixelCode || '');
    const [tiktokPixelCode, setTiktokPixelCode] = useState(settings.tiktokPixelCode || '');
    const [saveMessage, setSaveMessage] = useState('');

    // Update form when settings change
    useEffect(() => {
        setShopName(settings.shopName);
        setLogoUrl(settings.logoUrl);
        setGeminiApiKey(settings.geminiApiKey);
        setFacebookPixelCode(settings.facebookPixelCode || '');
        setTiktokPixelCode(settings.tiktokPixelCode || '');
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
                    tiktokPixelCode
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
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
            
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`py-4 px-6 text-sm font-medium border-b-2 flex items-center ${activeTab === 'general' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            <SettingsIcon size={18} className="mr-2" />
                            Général
                        </button>
                        {user?.role === 'admin' && (
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`py-4 px-6 text-sm font-medium border-b-2 flex items-center ${activeTab === 'users' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            >
                                <User size={18} className="mr-2" />
                                Utilisateurs
                            </button>
                        )}
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'general' && (
                        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-lg">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nom de la boutique</label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <input
                                        type="text"
                                        value={shopName}
                                        onChange={e => setShopName(e.target.value)}
                                        className="focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700">URL du Logo</label>
                                <div className="mt-1 flex rounded-md shadow-sm">
                                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                        <Image size={16} />
                                    </span>
                                    <input
                                        type="text"
                                        value={logoUrl}
                                        onChange={e => setLogoUrl(e.target.value)}
                                        className="focus:ring-brand-500 focus:border-brand-500 flex-1 block w-full rounded-none rounded-r-md sm:text-sm border-gray-300 py-2 px-3"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Clé API Gemini</label>
                                <div className="mt-1 flex rounded-md shadow-sm">
                                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                        <Key size={16} />
                                    </span>
                                    <input
                                        type="password"
                                        value={geminiApiKey}
                                        onChange={e => setGeminiApiKey(e.target.value)}
                                        className="focus:ring-brand-500 focus:border-brand-500 flex-1 block w-full rounded-none rounded-r-md sm:text-sm border-gray-300 py-2 px-3"
                                        placeholder="AIzaSy..."
                                    />
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                    Nécessaire pour la génération automatique de descriptions.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Code Facebook Pixel</label>
                                <div className="mt-1">
                                    <textarea
                                        value={facebookPixelCode}
                                        onChange={e => setFacebookPixelCode(e.target.value)}
                                        rows={6}
                                        className="focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 font-mono text-xs"
                                        placeholder="<!-- Facebook Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'YOUR_PIXEL_ID');
fbq('track', 'PageView');
</script>
<noscript><img height='1' width='1' style='display:none'
src='https://www.facebook.com/tr?id=YOUR_PIXEL_ID&ev=PageView&noscript=1'
/></noscript>"
                                    />
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                    Code Facebook Pixel à injecter dans le &lt;head&gt; des pages de landing page. Sera ajouté automatiquement.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Code TikTok Pixel</label>
                                <div className="mt-1">
                                    <textarea
                                        value={tiktokPixelCode}
                                        onChange={e => setTiktokPixelCode(e.target.value)}
                                        rows={6}
                                        className="focus:ring-brand-500 focus:border-brand-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 font-mono text-xs"
                                        placeholder={'Collez votre code TikTok Pixel (script + noscript) ici'}
                                    />
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                    Code TikTok Pixel à injecter dans le &lt;head&gt; des pages de landing page. Sera ajouté automatiquement.
                                </p>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none"
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    Sauvegarder les paramètres
                                </button>
                                {saveMessage && (
                                    <span className="ml-4 text-green-600 text-sm font-medium animate-fade-in">
                                        {saveMessage}
                                    </span>
                                )}
                            </div>
                        </form>
                    )}

                    {activeTab === 'users' && user?.role === 'admin' && (
                        <div>
                            <div className="flex justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">Gestion des utilisateurs</h3>
                                <button
                                    onClick={() => { setEditingUser(null); setUserForm({name:'', email:'', password:'', role:'user'}); setIsUserModalOpen(true); }}
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700"
                                >
                                    <Plus className="mr-1 h-3 w-3" /> Ajouter
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {users.map((u) => (
                                            <tr key={u.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                                        {u.role === 'admin' ? 'Admin' : 'Vendeur'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button onClick={() => openEditUser(u)} className="text-brand-600 hover:text-brand-900 mr-4">Éditer</button>
                                                    {u.id !== user.id && (
                                                        <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:text-red-900">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* User Modal */}
            {isUserModalOpen && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">{editingUser ? 'Modifier Utilisateur' : 'Nouvel Utilisateur'}</h3>
                        <form onSubmit={handleUserSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nom</label>
                                <input type="text" required value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-brand-500 focus:border-brand-500 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input type="email" required value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-brand-500 focus:border-brand-500 sm:text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
                                <input type="text" required={!editingUser} value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-brand-500 focus:border-brand-500 sm:text-sm" placeholder={editingUser ? "Laisser vide pour ne pas changer" : ""} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Rôle</label>
                                <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as any})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-brand-500 focus:border-brand-500 sm:text-sm">
                                    <option value="user">Vendeur</option>
                                    <option value="admin">Administrateur</option>
                                </select>
                            </div>
                            <div className="flex justify-end pt-4">
                                <button type="button" onClick={() => setIsUserModalOpen(false)} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 mr-3">Annuler</button>
                                <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700">Sauvegarder</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};