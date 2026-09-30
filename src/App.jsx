import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { DEMO, firebaseConfigured } from './firebase.js';
import { useData } from './data/DataContext.jsx';
import Shell from './components/Shell.jsx';
import Auth from './screens/Auth.jsx';
import Onboarding from './screens/Onboarding.jsx';
import Plan from './screens/Plan.jsx';
import Today from './screens/Today.jsx';
import Add from './screens/Add.jsx';
import Analyzing from './screens/Analyzing.jsx';
import Result from './screens/Result.jsx';
import Presets from './screens/Presets.jsx';
import Stats from './screens/Stats.jsx';
import History from './screens/History.jsx';
import Profile from './screens/Profile.jsx';

const Splash = () => <div className="center-screen"><div className="spinner" style={{ width: 48, height: 48, borderWidth: 5 }} /></div>;

const BARE = ['/bienvenue', '/plan'];

export default function App() {
  const { user, profile } = useData() || {};
  const { pathname } = useLocation();

  if (!firebaseConfigured && !DEMO) {
    return (
      <div className="center-screen"><div className="col gap8" style={{ maxWidth: 420 }}>
        <div className="h3">Configuration manquante</div>
        <div className="sub">Copie <code>.env.example</code> en <code>.env</code> et remplis les valeurs Firebase (voir SETUP.md).</div>
      </div></div>
    );
  }
  if (user === undefined) return <Splash />;
  if (!user) return <Shell bare><Auth /></Shell>;
  if (profile === undefined) return <Splash />;

  if (!profile?.onboarded) {
    return (
      <Shell bare>
        <Routes>
          <Route path="/bienvenue" element={<Onboarding />} />
          <Route path="/plan" element={profile?.targets ? <Plan /> : <Splash />} />
          <Route path="*" element={<Navigate to="/bienvenue" replace />} />
        </Routes>
      </Shell>
    );
  }

  return (
    <Shell bare={BARE.includes(pathname)}>
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/ajouter" element={<Add />} />
        <Route path="/analyse" element={<Analyzing />} />
        <Route path="/resultat" element={<Result />} />
        <Route path="/presets" element={<Presets />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/historique" element={<History />} />
        <Route path="/profil" element={<Profile />} />
        <Route path="/bienvenue" element={<Onboarding />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
