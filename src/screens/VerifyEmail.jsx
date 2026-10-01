import { useEffect, useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { useData } from '../data/DataContext.jsx';
import { useUi } from '../data/UiContext.jsx';
import { IC, Icon } from '../components/ui.jsx';

const MAIL = 'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm-1 1 9 6 9-6';
const COOLDOWN = 60;
const STEPS = ['Ouvre le mail de TrackBoii (regarde aussi dans les spams)', 'Clique sur le lien de validation', 'Reviens ici : ça continue tout seul'];

export default function VerifyEmail() {
  const { user, checkVerified, logout } = useData();
  const { showToast } = useUi();
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  // Vérifie en arrière-plan : au retour sur l'onglet et toutes les 5 s
  useEffect(() => {
    const poll = () => { if (document.visibilityState === 'visible') checkVerified().catch(() => {}); };
    const id = setInterval(poll, 5000);
    document.addEventListener('visibilitychange', poll);
    window.addEventListener('focus', poll);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', poll); window.removeEventListener('focus', poll); };
  }, [checkVerified]);

  useEffect(() => {
    if (!wait) return;
    const id = setTimeout(() => setWait(w => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const check = async () => {
    setBusy(true);
    try {
      if (!(await checkVerified())) showToast("Email pas encore validé");
    } catch {
      showToast('Pas de connexion internet');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      await sendEmailVerification(user);
      setWait(COOLDOWN);
      showToast('Email renvoyé');
    } catch (e) {
      if (e.code === 'auth/too-many-requests') setWait(COOLDOWN);
      showToast(e.code === 'auth/too-many-requests' ? 'Attends un peu avant de renvoyer' : 'Envoi impossible, réessaie');
    }
  };

  return (
    <div className="narrow full-h col gap16" style={{ justifyContent: 'center' }}>
      <div className="welcome-art glass" style={{ height: 230 }}>
        <div className='glow' />
        <div className="plate" style={{ width: 150, height: 150 }}>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
            <div className="verify-mail"><Icon d={MAIL} size={40} width={1.6} /><span className="verify-dot" /></div>
          </div>
        </div>
      </div>

      <div className="col gap6">
        <h1 className="big">Vérifie ton adresse email</h1>
        <div style={{ fontSize: 16, color: 'var(--mute)', lineHeight: 1.45 }}>Un lien de validation vient de partir. Un clic dessus et c'est bon.</div>
      </div>

      <div className="glass r20 row gap12" style={{ padding: '12px 14px' }}>
        <div className="coach-ic"><Icon d={MAIL} size={17} /></div>
        <div className="grow" style={{ fontSize: 15, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
        <div className="row gap6 small nowrap"><span className="pulse" />En attente</div>
      </div>

      <div className="glass col gap12" style={{ padding: '16px 18px', borderRadius: 22 }}>
        {STEPS.map((s, i) => (
          <div key={s} className="row gap12" style={{ fontSize: 14, lineHeight: 1.35 }}>
            <div className="step-num">{i + 1}</div>{s}
          </div>
        ))}
      </div>

      <button className="btn btn-primary split" style={{ padding: '18px 24px' }} onClick={check} disabled={busy}>
        <span>{busy ? 'Vérification…' : "J'ai validé mon email"}</span><Icon d={IC.next} />
      </button>
      <button className="btn btn-ghost" onClick={resend} disabled={wait > 0}>
        {wait > 0 ? `Renvoyer l'email (${wait} s)` : "Renvoyer l'email"}
      </button>
      <button className="link" style={{ alignSelf: 'center', color: 'var(--mute)' }} onClick={logout}>Utiliser une autre adresse</button>
    </div>
  );
}
