import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import CapturePage from './pages/CapturePage';
import TodaySheetPage from './pages/TodaySheetPage';
import InboxPage from './pages/InboxPage';
import NotesPage from './pages/NotesPage';
import NewNotePage from './pages/NewNotePage';
import TodosPage from './pages/TodosPage';
import TemplatesPage from './pages/TemplatesPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<CapturePage />} />
          <Route path="/today" element={<TodaySheetPage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/notes/new" element={<NewNotePage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/todos" element={<TodosPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
