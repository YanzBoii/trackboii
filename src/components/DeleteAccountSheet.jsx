import { useState } from 'react';
import { createPortal } from 'react-dom';
import { EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup } from 'firebase/auth';
import { useData } from '../data/DataContext.jsx';
import { IC, Icon } from './ui.jsx';

const ERRORS = {
  'auth/invalid-credential': 'Mot de passe incorrect.',
  'auth/wrong-password': 'Mot de passe incorrect.',
  'auth/too-many-requests': 'Trop de tentatives, réessaie plus tard.',
  'auth/network-request-failed': 'Pas de connexion internet.',
  'auth/user-mismatch': 'Ce n\'est pas le même compte Google.'
};

/** Suppression définitive du compte : on reconfirme l'identité, puis tout est effacé. */
export default function DeleteAccountSheet({ onClose }) {
  const { user, deleteAccount } = useData();
  const isPassword = user.providerData.some(p => p.providerId === 'password');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setError('');
    if (confirm.trim().toUpperCase() !== 'SUPPRIMER') return setError('Écris SUPPRIMER pour confirmer.');
    if (!navigator.onLine) return setError('Pas de connexion internet.');
    setBusy(true);
    try {
      if (isPassword) await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
      else await reauthenticateWithPopup(user, new GoogleAuthProvider());
      await deleteAccount();
    } catch (e) {
      setError(ERRORS[e.code] || 'La suppression a échoué, réessaie.');
      setBusy(false);
    }
  };

  return createPortal(
    <div className="overlay" onClick={busy ? undefined : onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()} role="dialog" aria-label="Supprimer mon compte">
        <div className="row between">
          <div className="h3">Supprimer mon compte</div>
          <button className="icon-btn" onClick={onClose} disabled={busy} aria-label="Fermer"><Icon d={IC.close} size={18} /></button>
        </div>
        <div className="sub" style={{ lineHeight: 1.45 }}>
          Ton compte, tes repas, tes presets et tes pesées seront <strong style={{ color: 'var(--danger)' }}>définitivement effacés</strong>. Impossible de revenir en arrière.
        </div>
        {isPassword && (
          <label className="field"><span className="field-label">Ton mot de passe</span>
            <input className="input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
          </label>
        )}
        <label className="field"><span className="field-label">Écris SUPPRIMER pour confirmer</span>
          <input className="input" autoCapitalize="characters" autoComplete="off" value={confirm} onChange={e => setConfirm(e.target.value)} />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="btn btn-primary" style={{ background: 'var(--danger)', boxShadow: 'none' }} onClick={run} disabled={busy}>
          {busy ? 'Suppression…' : isPassword ? 'Supprimer définitivement' : 'Confirmer avec Google et supprimer'}
        </button>
      </div>
    </div>,
    document.body
  );
}
