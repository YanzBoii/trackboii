import { useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../data/DataContext.jsx';
import { useUi } from '../data/UiContext.jsx';
import { sumMeals } from '../lib/stats.js';
import { Bar, IC, Icon, Logo, fmt, pct } from './ui.jsx';

const NAV = [['/', 'today', "Aujourd'hui"], ['/stats', 'stats', 'Statistiques'], ['/presets', 'presets', 'Presets'], ['/historique', 'history', 'Historique'], ['/profil', 'profile', 'Profil']];
const TABS_L = [['/', 'today', "Aujourd'hui"], ['/stats', 'stats', 'Statistiques']];
const TABS_R = [['/presets', 'presets', 'Presets'], ['/profil', 'profile', 'Profil']];
const TAB_PATHS = ['/', '/stats', '/presets', '/historique', '/profil'];

function Sidebar() {
  const navigate = useNavigate();
  const { todayMeals, profile } = useData();
  const tot = sumMeals(todayMeals);
  const kcal = profile?.targets?.kcal || 0;
  return (
    <aside className="side desk-only">
      <div style={{ padding: '0 12px 24px' }}><Logo /></div>
      {NAV.map(([to, ic, label]) => (
        <NavLink key={to} to={to} end className={({ isActive }) => `nav-item ${isActive ? 'on' : ''}`}>
          <Icon d={IC[ic]} /><span>{label}</span>
        </NavLink>
      ))}
      <button className="btn btn-primary" style={{ marginTop: 16, fontSize: 15, padding: '14px 18px' }} onClick={() => navigate('/ajouter')}>
        <Icon d={IC.plus} size={18} width={2.2} />Ajouter un repas
      </button>
      <div className="glass r20 col gap8" style={{ marginTop: 'auto', padding: 16 }}>
        <div className="small">Aujourd'hui</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{fmt(tot.kcal)}<span className="small" style={{ fontWeight: 400 }}> / {fmt(kcal)} kcal</span></div>
        <Bar pct={pct(tot.kcal, kcal)} />
      </div>
    </aside>
  );
}

function TabBar() {
  const navigate = useNavigate();
  const tab = ([to, ic, label]) => (
    <NavLink key={to} to={to} end aria-label={label} className={({ isActive }) => `tab ${isActive ? 'on' : ''}`}>
      <Icon d={IC[ic]} size={23} />
    </NavLink>
  );
  return (
    <nav className="tabbar mobile-only">
      {TABS_L.map(tab)}
      <button className="fab" aria-label="Ajouter un repas" onClick={() => navigate('/ajouter')}><Icon d={IC.plus} size={26} width={2.2} /></button>
      {TABS_R.map(tab)}
    </nav>
  );
}

export default function Shell({ children, bare = false }) {
  const { pathname } = useLocation();
  const { toast } = useUi();
  const scroll = useRef();
  const withTab = !bare && TAB_PATHS.includes(pathname);

  useEffect(() => { if (scroll.current) scroll.current.scrollTop = 0; }, [pathname]);

  return (
    <div className="app">
      <div className="blob1" /><div className="blob2" /><div className="grain" />
      <div className="layout">
        {!bare && <Sidebar />}
        <main className="main" ref={scroll}>
          <div className={`container ${withTab ? 'with-tab' : ''}`}>{children}</div>
        </main>
      </div>
      {withTab && <TabBar />}
      {toast && <div className="toast" role="status"><i />{toast}</div>}
    </div>
  );
}
