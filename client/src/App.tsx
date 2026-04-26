import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './auth/Auth';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { EventBuilder } from './pages/EventBuilder';
import type { EventDraft } from './event_types/event';
import API from './lib/server';
type Page = 'landing' | 'login' | 'register' | 'dashboard' | 'event-builder';

function AppInner() {
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState<Page>('landing');
  const [eventData, setEventData] = useState<EventDraft | null>(null);

  useEffect(() => {
    if (isAuthenticated && (page === 'landing' || page === 'login' || page === 'register')) {
      setPage('dashboard');
    }
  }, [isAuthenticated]);

  const navigate = (target: string, data?: unknown) => {
    // The app uses a simple page state instead of a router because the flow is
    // small and the event-builder needs to receive the selected event draft.
    setPage(target as Page);
    if (target === 'event-builder') {
      setEventData((data as EventDraft) ?? null);
    }
  };

  const showNavbar = page !== 'login' && page !== 'register';
  console.log("API server: ", API);
  return (
    <div className="font-sans antialiased">
      {showNavbar && <Navbar onNavigate={navigate} currentPage={page} />}

      {page === 'landing' && <LandingPage onNavigate={navigate} />}
      {page === 'login' && <AuthPage mode="login" onNavigate={navigate} />}
      {page === 'register' && <AuthPage mode="register" onNavigate={navigate} />}
      {page === 'dashboard' && isAuthenticated && <Dashboard onNavigate={navigate} />}
      {page === 'event-builder' && isAuthenticated && (
        <EventBuilder initialEvent={eventData} onNavigate={navigate} />
      )}
      {!isAuthenticated && page !== 'landing' && page !== 'login' && page !== 'register' && (
        <AuthPage mode="login" onNavigate={navigate} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
