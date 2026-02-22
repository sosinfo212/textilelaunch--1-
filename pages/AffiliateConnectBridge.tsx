import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { integrationsAPI } from '../src/utils/api';

/**
 * Bridge page: opened in new tab with ?token=xxx.
 * Fetches credentials from API and auto-submits form to affiliate login URL.
 */
export const AffiliateConnectBridge: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Lien invalide (token manquant).');
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const creds = await integrationsAPI.getLaunchCredentials(token);
        if (cancelled) return;

        setStatus('redirecting');

        const loginUrl = creds.loginUrl;
        const emailField = creds.loginFieldName || 'email';
        const passwordField = creds.passwordFieldName || 'password';

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = loginUrl;
        form.style.display = 'none';

        const inputEmail = document.createElement('input');
        inputEmail.type = 'text';
        inputEmail.name = emailField;
        inputEmail.value = creds.email;
        form.appendChild(inputEmail);

        const inputPassword = document.createElement('input');
        inputPassword.type = 'password';
        inputPassword.name = passwordField;
        inputPassword.value = creds.password;
        form.appendChild(inputPassword);

        document.body.appendChild(form);
        form.submit();
      } catch (e: any) {
        if (!cancelled) {
          setStatus('error');
          setErrorMessage(e?.message || 'Lien expiré ou invalide.');
        }
      }
    };

    run();
    return () => { cancelled = true; };
  }, [token]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow p-6 max-w-md w-full text-center">
          <p className="text-red-600 font-medium mb-2">Connexion impossible</p>
          <p className="text-gray-600 text-sm mb-4">{errorMessage}</p>
          <Link to="/integrations/affiliate" className="text-brand-600 hover:underline text-sm">
            Retour aux intégrations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow p-6 max-w-sm w-full text-center">
        <div className="animate-pulse flex justify-center mb-4">
          <div className="h-8 w-8 rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
        <p className="text-gray-700 font-medium">
          {status === 'loading' ? 'Chargement…' : 'Redirection vers la plateforme…'}
        </p>
        <p className="text-gray-500 text-sm mt-1">
          Vous allez être connecté automatiquement.
        </p>
      </div>
    </div>
  );
};
