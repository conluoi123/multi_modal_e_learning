import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Chat } from './pages/Chat';
import { Documents } from './pages/Documents';
import { Quiz } from './pages/Quiz';
import { CreateLecture } from './pages/CreateLecture';
import { Sidebar } from './components/Sidebar';

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-[#FFF8F6]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/slides" element={<CreateLecture />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
