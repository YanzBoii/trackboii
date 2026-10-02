import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useData } from '../data/DataContext.jsx';
import { MOMENTS, useUi } from '../data/UiContext.jsx';
import { EMPTY_RESULT } from '../screens/Add.jsx';
import { IC, Icon, Thumb } from './ui.jsx';

const label = it => it.name || it.ingredients?.slice(0, 40) || (it.photo ? 'Repas en photo' : 'Repas');

function PendingSheet({ item, onClose }) {
  const navigate = useNavigate();
  const { retryPending, removePending } = useData();
  const { patchDraft, showToast } = useUi();
  const manual = () => {
    // Bascule vers la saisie manuelle en gardant la photo et les infos déjà tapées
    patchDraft({
      mode: item.photo ? 'photo' : 'texte', photo: item.photo, moment: item.moment, name: item.name || '',
      weight: item.weight || '', ingredients: item.ingredients || '',
      result: { ...EMPTY_RESULT, name: item.name || '', weight: Number(item.weight) || 0 }
    });
    removePending(item.id);
    onClose();
    navigate('/resultat');
  };
  return createPortal(
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()} role="dialog" aria-label="Repas en attente">
        <div className="row between">
          <div className="h3">{label(item)}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer"><Icon d={IC.close} size={18} /></button>
        </div>
        <div className="sub" style={{ lineHeight: 1.45 }}>
          {item.status === 'error'
            ? `L'analyse n'a pas abouti : ${item.error}`
            : "Ce repas est gardé sur ton téléphone. Il sera analysé et ajouté automatiquement dès que la connexion le permet."}
        </div>
        <button className="btn btn-primary" onClick={() => { retryPending(item.id); showToast(navigator.onLine ? 'Nouvel essai en cours' : 'Toujours hors ligne'); onClose(); }}>Réessayer maintenant</button>
        <div className="row gap8">
          <button className="btn btn-ghost btn-sm grow" onClick={manual}><Icon d={IC.edit} size={16} />Saisir à la main</button>
          <button className="btn btn-ghost btn-sm btn-danger grow" onClick={() => { removePending(item.id); onClose(); }}><Icon d={IC.trash} size={16} />Supprimer</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function PendingList() {
  const { pending } = useData();
  const [open, setOpen] = useState(null);
  if (!pending.length) return null;
  return (
    <>
      {pending.map(it => (
        <button key={it.id} className="meal-row pending" onClick={() => setOpen(it)}>
          <Thumb src={it.photo?.thumb} />
          <div className="grow col" style={{ gap: 1 }}>
            <div className="small mute2">{MOMENTS[it.moment] || 'Repas'} · {it.status === 'error' ? 'À vérifier' : 'En attente'}</div>
            <div style={{ fontSize: 15, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label(it)}</div>
            <div className="small">{it.status === 'error' ? 'Analyse impossible, touche pour choisir' : 'Analyse dès que le réseau revient'}</div>
          </div>
          {it.status === 'error' ? <span className="tag over">!</span> : <div className="spinner" style={{ width: 22, height: 22, borderWidth: 3, flex: 'none' }} />}
        </button>
      ))}
      {open && <PendingSheet item={pending.find(p => p.id === open.id) || open} onClose={() => setOpen(null)} />}
    </>
  );
}
