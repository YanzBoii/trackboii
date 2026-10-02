import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../data/DataContext.jsx';
import { MOMENTS, useUi } from '../data/UiContext.jsx';
import { preparePhoto } from '../lib/image.js';
import { usePresetAdder } from './Today.jsx';
import { queueDraft } from './Analyzing.jsx';
import { BackButton, IC, Icon, Seg, fmt } from '../components/ui.jsx';

const EXAMPLES = ['2 œufs au plat et 2 tranches de jambon', 'Un kebab frites', 'Bol de céréales avec du lait'];

export const EMPTY_RESULT = { name: '', weight: 0, ingredients: [], kcal: 0, p: 0, c: 0, f: 0, confidence: null, comment: '' };

export default function Add() {
  const navigate = useNavigate();
  const { presets, queueMeal } = useData();
  const { draft, patchDraft, resetDraft, showToast } = useUi();
  const addPreset = usePresetAdder();
  const camera = useRef();
  const gallery = useRef();
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const onFile = async file => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return showToast('Ce fichier n\'est pas une image');
    setLoading(true);
    try {
      patchDraft({ photo: await preparePhoto(file) });
    } catch {
      showToast('Impossible de lire cette image');
    } finally {
      setLoading(false);
    }
  };

  const textMode = draft.mode === 'texte';
  const canAnalyze = (!textMode && draft.photo) || draft.name.trim() || draft.ingredients.trim();
  const analyze = () => {
    if (!canAnalyze) return showToast(textMode ? 'Décris ce que tu as mangé' : 'Ajoute une photo ou décris ton plat');
    if (textMode && draft.photo) patchDraft({ photo: null });
    if (!navigator.onLine) {
      // Hors ligne : pas la peine d'attendre, le repas part directement en file d'attente
      queueDraft(draft, queueMeal).then(() => {
        showToast('Hors ligne : ton repas sera analysé au retour du réseau');
        resetDraft();
        navigate('/');
      });
      return;
    }
    navigate('/analyse');
  };
  const manual = () => {
    patchDraft({ result: { ...EMPTY_RESULT, name: draft.name, weight: Number(draft.weight) || 0 } });
    navigate('/resultat');
  };
  const quickPreset = p => {
    addPreset(p, draft.moment);
    resetDraft();
    navigate('/');
  };

  return (
    <div className="stack">
      <div className="row" style={{ gap: 14 }}>
        <BackButton onClick={() => navigate('/')} />
        <div className="col">
          <h1 className="h2">Ajouter un repas</h1>
          <div className="sub">{textMode ? "Décris ton plat, l'IA fait le calcul." : 'Une photo suffit. Les précisions sont en option.'}</div>
        </div>
      </div>

      <Seg className="lg" options={[['photo', 'Avec photo'], ['texte', 'Sans photo']]} value={draft.mode} onChange={mode => patchDraft({ mode })} />

      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={e => { onFile(e.target.files[0]); e.target.value = ''; }} />
      <input ref={gallery} type="file" accept="image/*" hidden onChange={e => { onFile(e.target.files[0]); e.target.value = ''; }} />

      <div className="grid-main">
        <div className="col gap12">
          {textMode ? (
            <div className="glass col gap12" style={{ padding: 20, borderRadius: 30 }}>
              <div className="row gap12">
                <div className="coach-ic"><Icon d={IC.edit} size={17} /></div>
                <div style={{ fontSize: 19, fontWeight: 600 }}>Qu'est-ce que tu as mangé ?</div>
              </div>
              <textarea
                className="input" style={{ minHeight: 170, fontSize: 16 }} value={draft.ingredients}
                onChange={e => patchDraft({ ingredients: e.target.value })}
                placeholder="ex. Une assiette de pâtes bolognaise, environ 120 g de pâtes, avec du parmesan"
              />
              <div className="sub" style={{ fontSize: 13 }}>Quantités, cuisson, sauce : plus c'est précis, mieux c'est.</div>
              <div className="row wrap gap6">
                {EXAMPLES.map(ex => <button key={ex} className="chip" onClick={() => patchDraft({ ingredients: ex })}>{ex}</button>)}
              </div>
            </div>
          ) : draft.photo ? (
            <div className="photo" style={{ backgroundImage: `url(data:image/jpeg;base64,${draft.photo.ai})` }}>
              <div className="photo-top row gap8">
                <button className="chip" onClick={() => gallery.current.click()}>Changer</button>
                <button className="chip" onClick={() => patchDraft({ photo: null })}>Retirer</button>
              </div>
            </div>
          ) : (
            <div
              className="drop glass"
              style={dragOver ? { background: 'var(--accent-soft)' } : undefined}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); onFile(e.dataTransfer.files[0]); }}
            >
              <div className="drop-ic">{loading ? <div className="spinner" style={{ width: 34, height: 34, borderWidth: 4 }} /> : <Icon d={IC.camera} size={30} width={1.8} />}</div>
              <div className="col gap4">
                <div style={{ fontSize: 19, fontWeight: 600 }}>Prends ton plat en photo</div>
                <div className="sub">ou importe une image depuis ta galerie</div>
              </div>
              <div className="row wrap gap8" style={{ justifyContent: 'center' }}>
                <button className="btn btn-primary btn-sm" style={{ padding: '12px 20px' }} onClick={() => camera.current.click()}>Appareil photo</button>
                <button className="btn btn-ghost btn-sm" style={{ padding: '12px 20px' }} onClick={() => gallery.current.click()}>Galerie</button>
              </div>
            </div>
          )}
          {presets.length > 0 && (
            <div className="col gap8">
              <div className="sub">Ou reprends un preset</div>
              <div className="row wrap gap8">
                {presets.map(p => <button key={p.id} className="chip" onClick={() => quickPreset(p)}>{p.name} <span className="mute2">{fmt(p.kcal)}</span></button>)}
              </div>
            </div>
          )}
        </div>

        <div className="glass col gap16" style={{ padding: 20, borderRadius: 28 }}>
          <div className="field"><span className="field-label">Moment</span>
            <Seg options={Object.entries(MOMENTS)} value={draft.moment} onChange={v => patchDraft({ moment: v })} />
          </div>
          <label className="field"><span className="field-label">Nom du plat</span>
            <input className="input" value={draft.name} onChange={e => patchDraft({ name: e.target.value })} placeholder="ex. Bowl poulet, riz, avocat" />
          </label>
          <label className="field"><span className="field-label">Poids total</span>
            <div className="input-unit"><input className="input" inputMode="numeric" value={draft.weight} onChange={e => patchDraft({ weight: e.target.value.replace(/[^\d]/g, '') })} placeholder="ex. 420" /><span>g</span></div>
          </label>
          {!textMode && (
            <label className="field"><span className="field-label">Ingrédients</span>
              <textarea className="input" value={draft.ingredients} onChange={e => patchDraft({ ingredients: e.target.value })} placeholder="ex. 150 g de poulet, riz basmati, un demi avocat, sauce soja" />
            </label>
          )}
          <div className="sub" style={{ fontSize: 13, lineHeight: 1.4 }}>Plus tu donnes de détails, plus l'estimation est précise.</div>
          <button className="btn btn-primary" onClick={analyze} disabled={loading}>Analyser avec l'IA</button>
          <button className="link" style={{ alignSelf: 'center' }} onClick={manual}>Saisir les valeurs à la main</button>
        </div>
      </div>
    </div>
  );
}
