import { useEffect, useState } from 'react';

export const IC = {
  today: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 3a9 9 0 0 1 9 9',
  stats: 'M3 3v18h18M18 17V9M13 17V5M8 17v-3',
  presets: 'm19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z',
  history: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 7v5l3 2',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  plus: 'M5 12h14M12 5v14',
  back: 'm15 18-6-6 6-6',
  next: 'M5 12h14M13 6l6 6-6 6',
  chevron: 'm9 18 6-6-6-6',
  star: 'M12 3l1.9 5.8L20 10l-5 3.9L16.5 20 12 16.6 7.5 20 9 13.9 4 10l6.1-1.2z',
  camera: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  close: 'M6 6l12 12M18 6 6 18',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4h6v3'
};

export function Icon({ d, size = 20, width = 2, fill = 'none' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function Logo({ size = 36, text = 22 }) {
  return (
    <div className="logo">
      <div className="logo-mark" style={{ width: size, height: size, borderRadius: size * 0.31 }}><div><div /></div></div>
      <div className="logo-text" style={{ fontSize: text }}>TrackBoii</div>
    </div>
  );
}

export function Seg({ options, value, onChange, className = '' }) {
  return (
    <div className={`seg ${className}`} role="tablist">
      {options.map(([id, label]) => (
        <button key={id} type="button" role="tab" aria-selected={value === id} className={`seg-opt ${value === id ? 'on' : ''}`} onClick={() => onChange(id)}>{label}</button>
      ))}
    </div>
  );
}

export function BackButton({ onClick, label = 'Retour' }) {
  return <button type="button" className="icon-btn" onClick={onClick} aria-label={label}><Icon d={IC.back} /></button>;
}

export const Bar = ({ pct, className = '', color }) => (
  <div className={`bar ${className}`}><div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} /></div>
);

// Seules les images intégrées (data:image/…) sont affichées : aucune ressource externe ni injection CSS
const safeImage = src => typeof src === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src);

export const Thumb = ({ src, className = 'thumb', style }) => (
  <div className={`${className} ph`} style={{ ...style, ...(safeImage(src) ? { backgroundImage: `url(${src})` } : {}) }} />
);

export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true), down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return online;
}

export const fmt = n => Math.round(n || 0).toLocaleString('fr-FR');
export const macroLine = m => `P ${Math.round(m.p || 0)} g · G ${Math.round(m.c || 0)} g · L ${Math.round(m.f || 0)} g`;
export const pct = (v, t) => (t ? Math.round((v / t) * 100) : 0);
