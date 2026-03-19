import { useAuth } from './hooks/useAuth.js';
import LoginScreen from './components/LoginScreen.jsx';
import AppShell from './components/AppShell.jsx';
import { mockSession, MOCK_WEB_ID } from './utils/mockStorage.js';
import './app.css';

const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true';

function App() {
  const { session, isLoggedIn, webId, loading, login, logout } = useAuth();

  // Mock mode: skip auth entirely, render app with localStorage-backed session
  if (MOCK_MODE) {
    return (
      <AppShell
        session={mockSession}
        webId={MOCK_WEB_ID}
        onLogout={() => {}}
      />
    );
  }

  if (loading) {
    return (
      <div className="app-loading">
        <span className="spinner-lg" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <AppShell
      session={session}
      webId={webId}
      onLogout={logout}
    />
  );
}

export default App;
