import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import CapturePage from './pages/CapturePage';
import TodaySheetPage from './pages/TodaySheetPage';
import InboxPage from './pages/InboxPage';
import NotesPage from './pages/NotesPage';
import TodosPage from './pages/TodosPage';
import TemplatesPage from './pages/TemplatesPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<CapturePage />} />
          <Route path="/today" element={<TodaySheetPage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/todos" element={<TodosPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
