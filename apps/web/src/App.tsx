import { useState, useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import CapturePage from './pages/CapturePage';
import TodaySheetPage from './pages/TodaySheetPage';
import InboxPage from './pages/InboxPage';
import NotesPage from './pages/NotesPage';
import NewNotePage from './pages/NewNotePage';
import NoteDetailPage from './pages/NoteDetailPage';
import TodosPage from './pages/TodosPage';
import TemplatesPage from './pages/TemplatesPage';
import SettingsPage from './pages/SettingsPage';
import SetupPage from './pages/SetupPage';
import QuickCapturePage from './pages/QuickCapturePage';
import RecordingPage from './pages/RecordingPage';
import { isApiConfigured } from './api/config';

const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<CapturePage />} />
      <Route path="/today" element={<TodaySheetPage />} />
      <Route path="/inbox" element={<InboxPage />} />
      <Route path="/notes/new" element={<NewNotePage />} />
      <Route path="/notes/:id" element={<NoteDetailPage />} />
      <Route path="/notes" element={<NotesPage />} />
      <Route path="/todos" element={<TodosPage />} />
      <Route path="/templates" element={<TemplatesPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}

function App() {
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Only check setup for Electron
    if (isElectron) {
      setNeedsSetup(!isApiConfigured());
    }
    setIsChecking(false);
  }, []);

  // Show loading while checking setup status
  if (isChecking) {
    return null;
  }

  // Use HashRouter for Electron (file:// protocol), BrowserRouter for web
  const Router = isElectron ? HashRouter : BrowserRouter;

  // Electron with setup needed
  if (isElectron && needsSetup) {
    return (
      <Router>
        <Routes>
          <Route path="/quick-capture" element={<QuickCapturePage />} />
          <Route path="/recording" element={<RecordingPage />} />
          <Route path="*" element={<SetupPage onComplete={() => setNeedsSetup(false)} />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Quick capture window - no Layout wrapper */}
        <Route path="/quick-capture" element={<QuickCapturePage />} />
        {/* Recording window - no Layout wrapper */}
        <Route path="/recording" element={<RecordingPage />} />

        {/* Main app with Layout */}
        <Route
          path="*"
          element={
            <Layout>
              <AppRoutes />
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
