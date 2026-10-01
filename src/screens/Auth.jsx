import { useState } from 'react';
import {
  GoogleAuthProvider, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail,
  signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, updateProfile
} from 'firebase/auth';
import { auth } from '../firebase.js';
import { useUi } from '../data/UiContext.jsx';
import { IC, Icon, Logo, Seg } from '../components/ui.jsx';

const ERRORS = {
  'auth/invalid-credential': 'Email ou mot de passe incorrect.',
  'auth/invalid-email': 'Adresse email invalide.',
  'auth/email-already-in-use': 'Un compte existe déjà avec cet email.',
  'auth/weak-password': 'Mot de passe trop court (6 caractères minimum).',
  'auth/too-many-requests': 'Trop de tentatives, réessaie dans quelques minutes.',
  'auth/network-request-failed': 'Pas de connexion internet.',
  'auth/missing-password': 'Entre ton mot de passe.'
};
const message = e => ERRORS[e.code] || 'Une erreur est survenue, réessaie.';

export default function Auth() {
  const { showToast } = useUi();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (mode === 'signup' && !name.trim()) return setError('Dis-nous comment tu t\'appelles.');
    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(user, { displayName: name.trim() });
        await sendEmailVerification(user);
      }
    } catch (err) {
      setError(message(err));
      setBusy(false);
    }
  };

  const google = async () => {
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, provider);
      } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError(message(err));
      }
    }
  };

  const reset = async () => {
    if (!email.trim()) return setError('Entre ton email, puis clique à nouveau sur « Mot de passe oublié ».');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      showToast('Email de réinitialisation envoyé');
    } catch (err) {
      setError(message(err));
    }
  };

  return (
    <div className="narrow full-h col gap16" style={{ justifyContent: 'center' }}>
      <div className="welcome-art glass" style={{ height: 200 }}>
        <div className='glow' />
        <div className="plate" style={{ width: 130, height: 130 }} />
      </div>
      <Logo size={48} text={26} />
      <h1 className="big" style={{ fontSize: 30 }}>Prends ton plat en photo. On s'occupe du reste.</h1>

      <Seg className="lg" options={[['login', 'Connexion'], ['signup', 'Inscription']]} value={mode} onChange={m => { setMode(m); setError(''); }} />

      <form className="col gap12" onSubmit={submit}>
        {mode === 'signup' && (
          <label className="field"><span className="field-label">Prénom</span>
            <input className="input" autoComplete="given-name" value={name} onChange={e => setName(e.target.value)} placeholder="ex. Léo" />
          </label>
        )}
        <label className="field"><span className="field-label">Email</span>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="toi@exemple.com" />
        </label>
        <label className="field"><span className="field-label">Mot de passe</span>
          <input className="input" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="6 caractères minimum" />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="btn btn-primary split" disabled={busy} type="submit">
          <span>{busy ? 'Un instant…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</span><Icon d={IC.next} />
        </button>
      </form>
      <button className="btn btn-ghost" type="button" onClick={google}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        Continuer avec Google
      </button>
      {mode === 'login' && <button className="link" type="button" onClick={reset} style={{ alignSelf: 'center' }}>Mot de passe oublié ?</button>}
    </div>
  );
}
