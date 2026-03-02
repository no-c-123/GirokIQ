import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { LandingPage } from './landing/LandingPage.tsx'
import { LoginPage } from './components/LoginPage.tsx'
import App from './app/App.tsx'
import { useAuthStore } from './store/useAuthStore'

function Root() {
  const [view, setView] = useState<'landing' | 'login' | 'app'>('landing');
  const { session, initialize, loading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (session) {
      setView('app');
    }
  }, [session]);

  if (loading) {
    return <div className="h-screen w-screen bg-black" />; // Or a spinner
  }

  if (view === 'app') {
    return <App />;
  }

  if (view === 'login') {
    return <LoginPage onBack={() => setView('landing')} />;
  }

  return (
    <LandingPage 
      onGetStarted={() => setView('app')} 
      onSignIn={() => setView('login')} 
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
