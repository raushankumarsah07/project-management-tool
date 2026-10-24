import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import NotificationBell from './NotificationBell.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [dark, setDark] = useState(() => localStorage.getItem('flowboard-theme') === 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('flowboard-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <header className="nav">
      <Link to="/" className="logo"><span className="logo-mark">✦</span> flowboard</Link>
      <div className="row">
        <button className="icon-btn theme-toggle" onClick={() => setDark((value) => !value)} aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}>
          {dark ? '☀' : '☾'}
        </button>
        <NotificationBell />
        <Avatar name={user.name} size={30} />
        <span className="nav-name">{user.name}</span>
        <button className="btn ghost small" onClick={logout}>Log out</button>
      </div>
    </header>
  );
}
