import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { integrationsAPI } from '../src/utils/api';
import { ExternalLink, Plus, Trash2, Key, ArrowLeft } from 'lucide-react';

const AZOME_DEFAULT = {
  name: 'Azome Affiliate',
  loginUrl: 'https://azomeaffiliate.com/login',
};

type Connection = { id: string; name: string; loginUrl: string; createdAt: string };

export const AffiliateIntegrationsPage: React.FC = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    id: '' as string | undefined,
    name: AZOME_DEFAULT.name,
    loginUrl: AZOME_DEFAULT.loginUrl,
    email: '',
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState<string | null>(null);
  const [popupBlockedUrl, setPopupBlockedUrl] = useState<string | null>(null);

  const loadConnections = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await integrationsAPI.getAffiliateConnections();
      setConnections(res.connections || []);
    } catch (e: any) {
      setError(e?.message || 'Erreur lors du chargement.');
      setConnections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Email et mot de passe requis.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await integrationsAPI.saveAffiliateConnection({
        id: form.id || undefined,
        name: form.name,
        loginUrl: form.loginUrl,
        email: form.email,
        password: form.password,
      });
      setForm({ id: undefined, name: AZOME_DEFAULT.name, loginUrl: AZOME_DEFAULT.loginUrl, email: '', password: '' });
      await loadConnections();
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async (conn: Connection) => {
    setLaunching(conn.id);
    setError(null);
    setPopupBlockedUrl(null);
    try {
      const launchUrl = await integrationsAPI.createAffiliateLaunchUrl(conn.id);
      const newWindow = window.open(launchUrl, '_blank', 'noopener,noreferrer');
      if (!newWindow || newWindow.closed) {
        setPopupBlockedUrl(launchUrl);
      }
    } catch (e: any) {
      setError(e?.message || 'Impossible de créer le lien de connexion.');
    } finally {
      setLaunching(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette connexion ?')) return;
    try {
      await integrationsAPI.deleteAffiliateConnection(id);
      await loadConnections();
      if (form.id === id) setForm({ ...form, id: undefined, email: '', password: '' });
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de la suppression.');
    }
  };

  const fillForm = (conn: Connection) => {
    setForm({ ...form, id: conn.id, name: conn.name, loginUrl: conn.loginUrl, email: '', password: '' });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/settings" className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Réseau d'affiliation</h1>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Enregistrez vos identifiants (ex. Azome Affiliate). « Connecter » ouvre la plateforme sur ce même domaine. Si vous voyez « 419 Page Expired », utilisez « Ouvrir la page de connexion » et connectez-vous avec vos identifiants.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}
      {popupBlockedUrl && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
          <p className="font-medium mb-1">Ouvrez le lien dans un nouvel onglet</p>
          <p className="text-xs mb-2">Si la fenêtre ne s’est pas ouverte, copiez le lien ci-dessous et ouvrez-le dans un nouvel onglet :</p>
          <a href={popupBlockedUrl} target="_blank" rel="noopener noreferrer" className="break-all text-brand-600 hover:underline">
            {popupBlockedUrl}
          </a>
          <button type="button" onClick={() => setPopupBlockedUrl(null)} className="block mt-2 text-xs text-gray-500 hover:text-gray-700">Fermer</button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Key size={18} className="mr-2" />
          Ajouter ou modifier une connexion
        </h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="block w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:ring-brand-500 focus:border-brand-500"
              placeholder="Azome Affiliate"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL de connexion</label>
            <input
              type="url"
              value={form.loginUrl}
              onChange={(e) => setForm({ ...form, loginUrl: e.target.value })}
              className="block w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:ring-brand-500 focus:border-brand-500"
              placeholder="https://azomeaffiliate.com/login"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email / identifiant</label>
            <input
              type="text"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="block w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:ring-brand-500 focus:border-brand-500"
              placeholder="votre@email.com"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="block w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:ring-brand-500 focus:border-brand-500"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50"
            >
              <Plus size={16} className="mr-1" />
              {form.id ? 'Mettre à jour' : 'Enregistrer'}
            </button>
            {form.id && (
              <button
                type="button"
                onClick={() => setForm({ id: undefined, name: AZOME_DEFAULT.name, loginUrl: AZOME_DEFAULT.loginUrl, email: '', password: '' })}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="text-lg font-medium text-gray-900 p-4 border-b border-gray-200">Connexions enregistrées</h2>
        {loading ? (
          <p className="p-4 text-gray-500 text-sm">Chargement…</p>
        ) : connections.length === 0 ? (
          <p className="p-4 text-gray-500 text-sm">Aucune connexion. Ajoutez-en une ci-dessus.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {connections.map((conn) => (
              <li key={conn.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-gray-900">{conn.name}</p>
                  <p className="text-xs text-gray-500 truncate max-w-md">{conn.loginUrl}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fillForm(conn)}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Modifier
                  </button>
                  <a
                    href={conn.loginUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Ouvrir la page de connexion
                  </a>
                  <button
                    type="button"
                    onClick={() => handleConnect(conn)}
                    disabled={launching === conn.id}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50"
                  >
                    <ExternalLink size={14} className="mr-1" />
                    Connecter
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(conn.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
