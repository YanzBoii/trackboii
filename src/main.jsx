import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { DataProvider } from './data/DataContext.jsx';
import { UiProvider } from './data/UiContext.jsx';
import { DEMO, firebaseConfigured } from './firebase.js';
import App from './App.jsx';
import '@fontsource-variable/outfit';
import './styles.css';

const DemoProvider = DEMO ? lazy(() => import('./data/DemoProvider.jsx')) : null;

function Providers({ children }) {
  if (DEMO) return <Suspense><DemoProvider>{children}</DemoProvider></Suspense>;
  return firebaseConfigured ? <DataProvider>{children}</DataProvider> : children;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <UiProvider>
        <Providers>
          <App />
        </Providers>
      </UiProvider>
    </BrowserRouter>
  </StrictMode>
);
