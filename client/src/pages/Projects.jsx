import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useSocket } from '../context/SocketContext.jsx';
import Modal from '../components/Modal.jsx';
import Avatar from '../components/Avatar.jsx';

export default function Projects() {
  const nav = useNavigate();
  const socket = useSocket();
  const [projects, setProjects] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = () => api.get('/projects').then((r) => setProjects(r.data)).catch((e) => setError(errorMessage(e)));
  useEffect(() => { load(); }, []);

  // refresh the list when we're added to / removed from a project
  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    socket.on('notification', refresh);
    socket.on('project:removed', refresh);
    return () => { socket.off('notification', refresh); socket.off('project:removed', refresh); };
  }, [socket]);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/projects', form);
      nav(`/projects/${data._id}`);
    } catch (err) { setError(errorMessage(err)); }
  };

  const filteredProjects = projects?.filter((project) => `${project.name} ${project.description || ''}`.toLowerCase().includes(query.toLowerCase()));
  const totalTasks = projects?.reduce((sum, project) => sum + project.total, 0) || 0;
  const completedTasks = projects?.reduce((sum, project) => sum + project.done, 0) || 0;

  return (
    <main className="container">
      <section className="welcome-panel">
        <div>
          <p className="eyebrow">WORKSPACE / 2026</p>
          <h1>Make progress visible.</h1>
          <p className="muted">A calm command center for your team’s best work.</p>
        </div>
        <div className="hero-orbit" aria-hidden="true"><span>✦</span><i /><i /><i /></div>
      </section>
      <div className="row between page-head">
        <div>
          <h2>Your projects</h2>
          <p className="muted small">Everything your team is moving forward.</p>
        </div>
        <button className="btn" onClick={() => setCreating(true)}>New project</button>
      </div>
      <div className="insight-grid">
        <div className="insight"><span className="insight-icon">◈</span><div><strong>{projects?.length || 0}</strong><span>Active projects</span></div></div>
        <div className="insight"><span className="insight-icon purple">↗</span><div><strong>{completedTasks}<small> / {totalTasks}</small></strong><span>Tasks completed</span></div></div>
        <div className="insight"><span className="insight-icon orange">⚡</span><div><strong>{totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0}%</strong><span>Workspace momentum</span></div></div>
      </div>
      {projects?.length > 0 && <div className="search-wrap"><span>⌕</span><input aria-label="Search projects" placeholder="Search projects…" value={query} onChange={(e) => setQuery(e.target.value)} /><kbd>⌘ K</kbd></div>}
      {error && !creating && <p className="error">{error}</p>}
      {projects === null && <p className="muted">Loading…</p>}
      {projects?.length === 0 && (
        <div className="card center">
          <h2>No projects yet</h2>
          <p className="muted">Create your first project to start organising tasks with your team.</p>
          <button className="btn" onClick={() => setCreating(true)}>Create a project</button>
        </div>
      )}

      <div className="project-grid">
        {filteredProjects?.map((p) => {
          const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
          return (
            <Link to={`/projects/${p._id}`} className="card project-card" key={p._id}>
              <h2>{p.name}</h2>
              <p className="muted small desc">{p.description || 'No description'}</p>
              <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100">
                <span style={{ width: `${pct}%` }} />
              </div>
              {projects?.length > 0 && filteredProjects?.length === 0 && <div className="card center empty-search"><h3>No matching projects</h3><p className="muted">Try a different search term.</p></div>}
              <div className="row between small muted">
                <span>{p.done}/{p.total} tasks done</span>
                <span className="avatars">{p.members.slice(0, 4).map((m) => <Avatar key={m._id} name={m.name} size={24} />)}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {creating && (
        <Modal title="New project" onClose={() => setCreating(false)}>
          <form onSubmit={create}>
            <label>Project name
              <input value={form.name} maxLength={80} autoFocus required onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>Description (optional)
              <textarea rows={3} maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="btn wide">Create project</button>
          </form>
        </Modal>
      )}
    </main>
  );
}
