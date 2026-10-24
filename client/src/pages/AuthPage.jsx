import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../api';

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { authenticate } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await authenticate(isLogin ? 'login' : 'register', form);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <h1 className="logo big">flowboard</h1>
      <p className="muted">Plan projects, assign tasks and talk it through, together and in real time.</p>
      <form className="card" onSubmit={submit}>
        <h2>{isLogin ? 'Log in' : 'Create your account'}</h2>
        {!isLogin && (
          <label>Your name
            <input value={form.name} onChange={set('name')} maxLength={50} required autoFocus />
          </label>
        )}
        <label>Email
          <input type="email" value={form.email} onChange={set('email')} required autoFocus={isLogin} />
        </label>
        <label>Password
          <input type="password" value={form.password} onChange={set('password')} required minLength={isLogin ? 1 : 8}
            placeholder={isLogin ? '' : 'At least 8 characters'} />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn wide" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}</button>
        <p className="muted center">
          {isLogin ? <>New here? <Link to="/register">Create an account</Link></> : <>Have an account? <Link to="/login">Log in</Link></>}
        </p>
      </form>
    </div>
  );
}
