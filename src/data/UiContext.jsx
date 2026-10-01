import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { momentForNow } from '../lib/dates.js';

const UiContext = createContext(null);
export const useUi = () => useContext(UiContext);

export const MOMENTS = { pdj: 'Petit-déj', dej: 'Déjeuner', din: 'Dîner', col: 'Collation' };
export const MOMENT_PHRASE = { pdj: 'au petit-déj', dej: 'au déjeuner', din: 'au dîner', col: 'aux collations' };
export const MOMENT_ADD = { pdj: 'le petit-déj', dej: 'le déjeuner', din: 'le dîner', col: 'une collation' };

const emptyDraft = () => ({ mode: 'photo', photo: null, name: '', weight: '', ingredients: '', moment: momentForNow(), result: null });

function readTheme() {
  try { return localStorage.getItem('tb-theme') || document.documentElement.dataset.theme || 'light'; } catch { return 'light'; }
}

export function UiProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [theme, setThemeState] = useState(readTheme);
  const [draft, setDraft] = useState(emptyDraft);
  const timer = useRef();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0a0f1e' : '#eef1f6');
  }, [theme]);

  const showToast = useCallback(msg => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const value = useMemo(() => ({
    toast, showToast, theme,
    setTheme: t => { setThemeState(t); try { localStorage.setItem('tb-theme', t); } catch { /* stockage indisponible */ } },
    draft,
    patchDraft: patch => setDraft(d => ({ ...d, ...patch })),
    resetDraft: () => setDraft(emptyDraft())
  }), [toast, showToast, theme, draft]);

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}
