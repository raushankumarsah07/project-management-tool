import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Projects from './pages/Projects.jsx';
import Board from './pages/Board.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="center muted pad">Loading…</p>;
  return user ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

export default function App() {
  const { user } = useAuth();
  const location = useLocation();
  const back = location.state?.from || '/';

  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to={back} replace /> : <AuthPage mode="login" />} />
        <Route path="/register" element={user ? <Navigate to={back} replace /> : <AuthPage mode="register" />} />
        <Route path="/" element={<Protected><Projects /></Protected>} />
        <Route path="/projects/:id" element={<Protected><Board /></Protected>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
