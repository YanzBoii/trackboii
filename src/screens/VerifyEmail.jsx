import { useEffect, useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { useData } from '../data/DataContext.jsx';
import { useUi } from '../data/UiContext.jsx';
import { Logo } from '../components/ui.jsx';

export default function VerifyEmail() {
  const { user, checkVerified, logout } = useData();
  const { showToast } = useUi();
  const [busy, setBusy] = useState(false);

  // Vérifie automatiquement quand on revient sur l'app après avoir cliqué le lien
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === 'visible') checkVerified().catch(() => {}); };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => { document.removeEventListener('visibilitychange', onFocus); window.removeEventListener('focus', onFocus); };
  }, [checkVerified]);

  const check = async () => {
    setBusy(true);
    try {
      if (!(await checkVerified())) showToast('Email pas encore vérifié');
    } catch {
      showToast('Pas de connexion internet');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      await sendEmailVerification(user);
      showToast('Email renvoyé');
    } catch (e) {
      showToast(e.code === 'auth/too-many-requests' ? 'Attends un peu avant de renvoyer' : 'Envoi impossible, réessaie');
    }
  };

  return (
    <div className="narrow full-h col gap16" style={{ justifyContent: 'center' }}>
      <Logo size={48} text={26} />
      <h1 className="big">Vérifie ton adresse email</h1>
      <div style={{ fontSize: 16, color: 'var(--mute)', lineHeight: 1.45 }}>
        On a envoyé un lien à <strong style={{ color: 'var(--ink)' }}>{user.email}</strong>. Clique dessus, puis reviens ici.
        Pense à regarder dans les spams.
      </div>
      <button className="btn btn-primary" onClick={check} disabled={busy}>{busy ? 'Vérification…' : "C'est fait, continuer"}</button>
      <button className="btn btn-ghost" onClick={resend}>Renvoyer l'email</button>
      <button className="link" style={{ alignSelf: 'center' }} onClick={logout}>Utiliser une autre adresse</button>
    </div>
  );
}
